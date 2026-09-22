import {
  INTERVIEW_SESSION_ERROR_MESSAGES,
  answerTurnsOf,
  coverageGuides,
  createPendingCard,
  isRoundClosingText,
  joinAnswerTurns,
  type AnswerCoverage,
  type CardRelation,
  type InterviewDeck,
  type QuestionCard,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { ExamSessionStore } from '../data/exam-session-store.js';
import { saveExamRecord, type WorkspaceArchive } from '../data/workspace-archive.js';
import { assignCardId } from './card-id.js';
import {
  persistDeck,
  assembleCoachBriefPrompt,
  parseCoachBriefOutput,
  type ChainHooks,
  type CoachRuntime,
} from './coach-brief.js';
import { clipChain, fallbackChain, type ChainMove } from './knowledge-chain.js';
import { applyScoreToCard, assembleCoachScorePrompt, parseCoachScoreOutput } from './coach-score.js';

export const WATCH_COACH_TURN_TIMEOUT_MS = 20_000;

export interface WatchCoachTurnClock {
  readonly timeoutMs?: number;
  readonly pollMs?: number;
}

const followUpFailed = (deck?: InterviewDeck): Extract<WatchCoachTurnResponse, { ok: false }> => ({
  ok: false,
  code: 'follow_up_failed',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
  ...(deck ? { deck } : {}),
});

const coverageUnavailable = (deck?: InterviewDeck): Extract<WatchCoachTurnResponse, { ok: false }> => ({
  ok: false,
  code: 'coverage_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coverage_unavailable,
  ...(deck ? { deck } : {}),
});

const chainUnavailable = (deck?: InterviewDeck): Extract<WatchCoachTurnResponse, { ok: false }> => ({
  ok: false,
  code: 'chain_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.chain_unavailable,
  ...(deck ? { deck } : {}),
});

const injectUnavailable = (deck?: InterviewDeck): Extract<WatchCoachTurnResponse, { ok: false }> => ({
  ok: false,
  code: 'inject_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
  ...(deck ? { deck } : {}),
});

const coachUnavailable = (deck?: InterviewDeck): Extract<WatchCoachTurnResponse, { ok: false }> => ({
  ok: false,
  code: 'coach_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
  ...(deck ? { deck } : {}),
});

const lastPending = (deck: InterviewDeck): QuestionCard | undefined =>
  [...deck.cards].reverse().find((card) => card.status === 'pending');

const pendingToScore = (deck: InterviewDeck, humanText: string): QuestionCard | undefined =>
  [...deck.cards]
    .reverse()
    .find((card) => card.status === 'pending' && humanText.length > 0 && humanText !== card.seedUserText);

const guideToScore = (deck: InterviewDeck, humanText: string): QuestionCard | undefined =>
  [...deck.cards].reverse().find((card) => {
    if (card.status !== 'scored' || !coverageGuides(card.coverage) || (card.guideCount ?? 0) >= 2) {
      return false;
    }
    return humanText.length > 0 && humanText !== card.seedUserText && !answerTurnsOf(card).includes(humanText);
  });

const cardToScore = (deck: InterviewDeck, humanText: string): QuestionCard | undefined =>
  pendingToScore(deck, humanText) ?? guideToScore(deck, humanText);

const stillGuiding = (deck: InterviewDeck): boolean => {
  const latest = deck.cards[deck.cards.length - 1];
  return latest !== undefined && coverageGuides(latest.coverage) && (latest.guideCount ?? 0) < 2;
};

const relationForOpenedCard = (
  coverage: AnswerCoverage | null | undefined,
  matchedMove: ChainMove | undefined,
): CardRelation => {
  if (coverage === 'next') {
    return 'next_topic';
  }
  if (coverage === 'deepen' || coverage === 'reask') {
    return 'followup';
  }
  return matchedMove === 'switch' ? 'next_topic' : 'followup';
};

const replaceCard = (deck: InterviewDeck, next: QuestionCard, currentCardId = deck.currentCardId): InterviewDeck => ({
  ...deck,
  currentCardId,
  cards: deck.cards.map((card) => (card.id === next.id ? next : card)),
});

const appendCard = (deck: InterviewDeck, card: QuestionCard): InterviewDeck => ({
  ...deck,
  currentCardId: card.id,
  cards: [...deck.cards, card],
});

export const watchCoachTurnSession = async (
  runtime: CoachRuntime,
  examSessions: ExamSessionStore,
  request: WatchCoachTurnRequest,
  clock: WatchCoachTurnClock = {},
  archive?: WorkspaceArchive,
  hooks?: ChainHooks,
): Promise<WatchCoachTurnResponse> => {
  const record = examSessions.load(request.sessionId);
  if (record === undefined) {
    return followUpFailed();
  }
  if (record.ended === true) {
    return { ok: true, status: 'unchanged' };
  }

  const pollMs = clock.pollMs ?? 300;
  let deck = record.deck;
  let lastQuestionText = record.lastQuestionText;
  let briefError: Extract<WatchCoachTurnResponse, { ok: false }> | undefined;
  let scoreError: Extract<WatchCoachTurnResponse, { ok: false }> | undefined;
  let changed = false;
  let sealedGuide = false;

  const persistAndReturn = async (): Promise<
    | { readonly ok: true; readonly status: 'updated'; readonly deck: InterviewDeck }
    | Extract<WatchCoachTurnResponse, { ok: false }>
  > => {
    saveExamRecord(examSessions, deck, lastQuestionText);
    const persisted = await persistDeck(archive, deck);
    if (!persisted.ok) {
      if (persisted.deck) {
        deck = persisted.deck;
        saveExamRecord(examSessions, deck, lastQuestionText);
      }
      return persisted;
    }
    deck = persisted.deck;
    saveExamRecord(examSessions, deck, lastQuestionText);
    return { ok: true, status: 'updated', deck };
  };

  const scorePendingIfAnswered = async (): Promise<void> => {
    const human = await runtime.readLatestHuman(request.sessionId);
    if (!human.ok) {
      scoreError = human;
      return;
    }
    if (isRoundClosingText(human.text) || human.text === record.closingSeed) {
      return;
    }
    const pending = cardToScore(deck, human.text);
    if (pending === undefined) {
      return;
    }
    const turns = answerTurnsOf(pending).includes(human.text)
      ? answerTurnsOf(pending)
      : [...answerTurnsOf(pending), human.text];
    const { system, user } = assembleCoachScorePrompt({
      topic: record.topic,
      difficulty: record.difficulty,
      questionText: pending.questionText,
      questionBrief: pending.questionBrief,
      keyPoints: pending.keyPoints,
      answer: joinAnswerTurns(turns),
      ...(pending.layer !== undefined ? { layer: pending.layer } : {}),
      ...(pending.intent !== undefined ? { intent: pending.intent } : {}),
    });
    const raw = await runtime.complete(system, user);
    if (raw === null) {
      scoreError = coachUnavailable(deck);
      return;
    }
    const parsed = parseCoachScoreOutput(raw);
    if (parsed === null) {
      scoreError = coachUnavailable(deck);
      return;
    }
    const beforeGuide = pending.guideCount ?? 0;
    deck = replaceCard(deck, applyScoreToCard(pending, parsed, human.text), pending.id);
    changed = true;
    if (parsed.coverage === null) {
      scoreError = coverageUnavailable(deck);
      return;
    }
    if (coverageGuides(parsed.coverage) && beforeGuide < 2 && beforeGuide + 1 >= 2) {
      sealedGuide = true;
    }
  };

  const briefQuestion = async (questionText: string): Promise<ReturnType<typeof parseCoachBriefOutput> | null> => {
    let pendingText = questionText;
    let parsed: ReturnType<typeof parseCoachBriefOutput> = null;
    let repairChain = false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { system, user } = assembleCoachBriefPrompt({
        topic: record.topic,
        difficulty: record.difficulty,
        questionText: pendingText,
        previousChain: hooks?.memory.recall(request.sessionId),
        repairChain,
      });
      const raw = await runtime.complete(system, user);
      if (raw === null) {
        briefError = coachUnavailable(deck);
        return null;
      }
      parsed = parseCoachBriefOutput(raw);
      if (parsed === null) {
        briefError = coachUnavailable(deck);
        return null;
      }
      if (parsed.chain === undefined && !repairChain) {
        repairChain = true;
        continue;
      }
      repairChain = false;
      if (attempt < 3) {
        const caught = await runtime.awaitNewQuestion(request.sessionId, pendingText, {
          timeoutMs: pollMs,
          pollMs,
        });
        if (caught.ok && caught.status === 'ready' && caught.text !== pendingText) {
          pendingText = caught.text;
          continue;
        }
      }
      break;
    }
    if (parsed !== null && parsed.chain === undefined) {
      parsed = {
        ...parsed,
        chain: fallbackChain({
          difficulty: record.difficulty,
          questionBrief: parsed.questionBrief,
          keyPoints: parsed.keyPoints,
        }),
      };
    }
    lastQuestionText = pendingText;
    return parsed;
  };

  const acceptChain = (
    parsed: NonNullable<ReturnType<typeof parseCoachBriefOutput>>,
    cardIds: readonly string[],
  ) => {
    if (parsed.chain === undefined) {
      briefError = chainUnavailable(deck);
      hooks?.memory.forget(request.sessionId);
      hooks?.port?.clear(request.sessionId);
      return undefined;
    }
    const clipped = clipChain({
      difficulty: record.difficulty,
      chain: parsed.chain,
      cardIds,
    });
    hooks?.memory.remember(request.sessionId, clipped);
    if (hooks?.port !== undefined) {
      const mounted = hooks.port.install(request.sessionId, clipped.sectionText);
      if (!mounted.ok) {
        briefError = injectUnavailable(deck);
      }
    }
    return clipped;
  };

  const appendNewCard = async (questionText: string): Promise<boolean> => {
    const parsed = await briefQuestion(questionText);
    if (parsed === null) {
      return false;
    }
    const previous = deck.cards[deck.cards.length - 1];
    const relation = relationForOpenedCard(previous?.coverage, parsed.chain?.matchedMove);
    const id = assignCardId(deck.cards.map((item) => item.id), {
      relation,
      previousId: previous?.id,
    });
    const clipped = acceptChain(parsed, [...deck.cards.map((item) => item.id), id]);
    const seed = await runtime.readLatestHuman(request.sessionId);
    const card = createPendingCard({
      id,
      questionText: lastQuestionText,
      questionBrief: parsed.questionBrief,
      keyPoints: parsed.keyPoints,
      seedUserText: seed.ok ? seed.text : '',
      ...(clipped !== undefined ? { layer: clipped.layer, intent: clipped.intent } : {}),
    });
    deck = appendCard(deck, card);
    changed = true;
    return true;
  };

  const publishIfWaitingForNextBrief = async () => {
    if (scoreError !== undefined) {
      return undefined;
    }
    const latest = deck.cards[deck.cards.length - 1];
    if (!changed || latest?.status !== 'scored' || lastPending(deck) !== undefined) {
      return undefined;
    }
    return persistAndReturn();
  };

  const holdGuideSpeech = async (questionText: string) => {
    lastQuestionText = questionText;
    changed = true;
    return persistAndReturn();
  };

  const briefNewQuestion = async (questionText: string) => {
    if (isRoundClosingText(questionText)) {
      return { ok: true as const, status: 'unchanged' as const };
    }
    await scorePendingIfAnswered();
    if (scoreError !== undefined) {
      return undefined;
    }
    if (stillGuiding(deck) || sealedGuide) {
      return holdGuideSpeech(questionText);
    }
    const published = await publishIfWaitingForNextBrief();
    if (published !== undefined) {
      return published;
    }
    await appendNewCard(questionText);
    return undefined;
  };

  await scorePendingIfAnswered();
  const scoredOnly = await publishIfWaitingForNextBrief();
  if (scoredOnly !== undefined) {
    return scoredOnly;
  }

  if (request.force === true) {
    const latest = await runtime.readLatestQuestion(request.sessionId);
    if (!latest.ok) {
      return { ...latest, deck };
    }
    if (isRoundClosingText(latest.text)) {
      return { ok: true, status: 'unchanged' };
    }
    const pending = lastPending(deck);
    if (pending !== undefined && latest.text === pending.questionText) {
      const parsed = await briefQuestion(latest.text);
      if (parsed !== null) {
        const clipped = acceptChain(
          parsed,
          deck.cards.map((item) => item.id),
        );
        deck = replaceCard(
          deck,
          {
            ...pending,
            questionBrief: parsed.questionBrief,
            keyPoints: parsed.keyPoints,
            ...(clipped !== undefined ? { layer: clipped.layer, intent: clipped.intent } : {}),
          },
          pending.id,
        );
        changed = true;
      }
    } else if (latest.text !== lastQuestionText) {
      const published = await briefNewQuestion(latest.text);
      if (published !== undefined) {
        return published;
      }
    }
  } else {
    const timeoutMs = clock.timeoutMs ?? WATCH_COACH_TURN_TIMEOUT_MS;
    const sliceMs = Math.min(pollMs, timeoutMs);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const waitMs = Math.min(sliceMs, remaining);
      if (waitMs <= 0) {
        break;
      }
      const started = Date.now();
      const waited = await runtime.awaitNewQuestion(request.sessionId, lastQuestionText, {
        timeoutMs: waitMs,
        pollMs: clock.pollMs,
      });
      if (!waited.ok) {
        return { ...waited, deck };
      }
      if (waited.status === 'ready') {
        const published = await briefNewQuestion(waited.text);
        if (published !== undefined) {
          return published;
        }
        break;
      }
      await scorePendingIfAnswered();
      const published = await publishIfWaitingForNextBrief();
      if (published !== undefined) {
        return published;
      }
      if (Date.now() - started < Math.min(50, waitMs)) {
        break;
      }
    }
  }

  if (changed) {
    const persisted = await persistAndReturn();
    if (!persisted.ok) {
      return persisted;
    }
    if (scoreError !== undefined && briefError === undefined) {
      return { ...scoreError, deck: persisted.deck };
    }
    if (briefError !== undefined) {
      return { ...briefError, deck: persisted.deck };
    }
    return persisted;
  }

  if (scoreError !== undefined) {
    return { ...scoreError, deck };
  }
  if (briefError !== undefined) {
    return { ...briefError, deck };
  }
  return { ok: true, status: 'unchanged' };
};
