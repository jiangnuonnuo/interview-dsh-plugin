import {
  INTERVIEW_SESSION_ERROR_MESSAGES,
  answerTurnsOf,
  coverageGuides,
  createPendingCard,
  isAnswerCoverage,
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
import {
  applyCoverageToCard,
  applyProseToCard,
  applyScoreToCard,
  assembleCoachScorePrompt,
  parseCoachScoreOutput,
} from './coach-score.js';
import {
  applyReaskCap,
  buildCoverageSettleInput,
  countReasksOnThread,
  type CoveragePort,
} from './coverage-port.js';

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
  coveragePort?: CoveragePort,
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
  let jevAccelerated = record.jevAccelerated === true;
  let openedAfterJev = false;
  let pendingProse:
    | {
        readonly cardId: string;
        readonly completePromise: Promise<string | null>;
      }
    | undefined;

  const withAccel = <T extends object>(value: T): T & { jevAccelerated?: boolean } =>
    jevAccelerated ? { ...value, jevAccelerated: true } : value;

  const persistAndReturn = async (): Promise<
    | { readonly ok: true; readonly status: 'updated'; readonly deck: InterviewDeck; readonly jevAccelerated?: boolean }
    | Extract<WatchCoachTurnResponse, { ok: false }>
  > => {
    saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
    const persisted = await persistDeck(archive, deck);
    if (!persisted.ok) {
      if (persisted.deck) {
        deck = persisted.deck;
        saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
      }
      return withAccel(persisted);
    }
    deck = persisted.deck;
    saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
    return withAccel({ ok: true as const, status: 'updated' as const, deck });
  };

  const rememberDeck = () => {
    saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
  };

  const applySettledCoverage = (pending: QuestionCard, coverage: AnswerCoverage, answer: string) => {
    const beforeGuide = pending.guideCount ?? 0;
    const next = applyCoverageToCard(pending, coverage, answer);
    deck = replaceCard(deck, next, pending.id);
    changed = true;
    if (coverageGuides(coverage) && beforeGuide < 2 && beforeGuide + 1 >= 2) {
      sealedGuide = true;
    }
    rememberDeck();
  };

  const fillPendingProse = async (): Promise<void> => {
    if (pendingProse === undefined) {
      return;
    }
    const job = pendingProse;
    pendingProse = undefined;
    const raw = await job.completePromise;
    const card = deck.cards.find((item) => item.id === job.cardId);
    if (card === undefined) {
      return;
    }
    if (raw === null) {
      scoreError = coachUnavailable(deck);
      return;
    }
    const parsed = parseCoachScoreOutput(raw);
    if (parsed === null) {
      scoreError = coachUnavailable(deck);
      return;
    }
    deck = replaceCard(deck, applyProseToCard(card, parsed));
    changed = true;
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
    const completePromise = runtime.complete(system, user);
    const reaskCount = countReasksOnThread(deck.cards, pending.id);
    let decided: AnswerCoverage | 'unavailable' = 'unavailable';
    if (coveragePort !== undefined) {
      decided = await coveragePort.settle(
        buildCoverageSettleInput(deck, pending, record.topic, record.difficulty, human.text),
      );
    }
    if (isAnswerCoverage(decided)) {
      applySettledCoverage(pending, applyReaskCap(decided, reaskCount), human.text);
      jevAccelerated = true;
      pendingProse = { cardId: pending.id, completePromise };
      return;
    }
    const raw = await completePromise;
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
    const coverage =
      parsed.coverage === null ? null : applyReaskCap(parsed.coverage, reaskCount);
    deck = replaceCard(deck, applyScoreToCard(pending, { ...parsed, coverage }, human.text), pending.id);
    changed = true;
    if (coverage === null) {
      scoreError = coverageUnavailable(deck);
      return;
    }
    if (coverageGuides(coverage) && beforeGuide < 2 && beforeGuide + 1 >= 2) {
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

  const waitUntilExamIdle = async () => {
    if (runtime.whenIdle === undefined) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        runtime.whenIdle(request.sessionId),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, WATCH_COACH_TURN_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  };

  const acceptChain = async (
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
      await waitUntilExamIdle();
      const mounted = hooks.port.install(request.sessionId, clipped.sectionText);
      if (!mounted.ok) {
        briefError = injectUnavailable(deck);
      }
    }
    return clipped;
  };

  const appendNewCard = async (questionText: string): Promise<boolean> => {
    await waitUntilExamIdle();
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
    const clipped = await acceptChain(parsed, [...deck.cards.map((item) => item.id), id]);
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
    rememberDeck();
    return true;
  };

  const openAfterJevCoverage = async (knownQuestion?: string) => {
    const latest = deck.cards[deck.cards.length - 1];
    const canOpen =
      pendingProse !== undefined &&
      latest?.status === 'scored' &&
      lastPending(deck) === undefined &&
      !coverageGuides(latest.coverage) &&
      !sealedGuide;
    if (canOpen) {
      if (
        knownQuestion !== undefined &&
        !isRoundClosingText(knownQuestion) &&
        knownQuestion !== lastQuestionText
      ) {
        openedAfterJev = (await appendNewCard(knownQuestion)) || openedAfterJev;
      } else if (knownQuestion === undefined) {
        const waited = await runtime.awaitNewQuestion(request.sessionId, lastQuestionText, {
          timeoutMs: pollMs,
          pollMs,
        });
        if (waited.ok && waited.status === 'ready' && !isRoundClosingText(waited.text)) {
          openedAfterJev = (await appendNewCard(waited.text)) || openedAfterJev;
        }
      }
    }
    await fillPendingProse();
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
    await fillPendingProse();
    return persistAndReturn();
  };

  const briefNewQuestion = async (questionText: string) => {
    if (isRoundClosingText(questionText)) {
      return withAccel({ ok: true as const, status: 'unchanged' as const });
    }
    await scorePendingIfAnswered();
    await openAfterJevCoverage(questionText);
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
    if (openedAfterJev) {
      return undefined;
    }
    await appendNewCard(questionText);
    return undefined;
  };

  await scorePendingIfAnswered();
  await openAfterJevCoverage();
  if (!openedAfterJev) {
    const scoredOnly = await publishIfWaitingForNextBrief();
    if (scoredOnly !== undefined) {
      return scoredOnly;
    }
  }

  if (!openedAfterJev) {
    if (request.force === true) {
    const latest = await runtime.readLatestQuestion(request.sessionId);
    if (!latest.ok) {
      return withAccel({ ...latest, deck });
    }
    if (isRoundClosingText(latest.text)) {
      return withAccel({ ok: true, status: 'unchanged' });
    }
    const pending = lastPending(deck);
    if (pending !== undefined && latest.text === pending.questionText) {
      const parsed = await briefQuestion(latest.text);
      if (parsed !== null) {
        const clipped = await acceptChain(
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
        return withAccel({ ...waited, deck });
      }
      if (waited.status === 'ready') {
        const published = await briefNewQuestion(waited.text);
        if (published !== undefined) {
          return published;
        }
        break;
      }
      await scorePendingIfAnswered();
      await openAfterJevCoverage();
      if (openedAfterJev) {
        break;
      }
      const published = await publishIfWaitingForNextBrief();
      if (published !== undefined) {
        return published;
      }
      if (Date.now() - started < Math.min(50, waitMs)) {
        break;
      }
    }
    }
  }

  if (changed) {
    const persisted = await persistAndReturn();
    if (!persisted.ok) {
      return persisted;
    }
    if (scoreError !== undefined && briefError === undefined) {
      return withAccel({ ...scoreError, deck: persisted.deck });
    }
    if (briefError !== undefined) {
      return withAccel({ ...briefError, deck: persisted.deck });
    }
    return persisted;
  }

  if (scoreError !== undefined) {
    return withAccel({ ...scoreError, deck });
  }
  if (briefError !== undefined) {
    return withAccel({ ...briefError, deck });
  }
  return withAccel({ ok: true, status: 'unchanged' });
};
