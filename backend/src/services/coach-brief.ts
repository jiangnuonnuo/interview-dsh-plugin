import {
  DIFFICULTY_LABELS,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  createInterviewDeck,
  createPendingCard,
  isExamLayer,
  type BriefCoachRequest,
  type BriefCoachResponse,
  type CardRelation,
  type Difficulty,
  type InterviewDeck,
  type InterviewSessionErrorCode,
} from 'interview-dsh-shared';
import type { ExamSessionStore } from '../data/exam-session-store.js';
import type { WorkspaceArchive } from '../data/workspace-archive.js';
import { persistUnavailable, saveExamRecord } from '../data/workspace-archive.js';
import { assignCardId } from './card-id.js';
import {
  clipChain,
  fallbackChain,
  isChainMove,
  previousChainLines,
  type ChainMemory,
  type ChainSectionPort,
  type ClippedChain,
  type ParsedChain,
} from './knowledge-chain.js';
import { extractPendingQuestion } from './pending-question.js';

export interface CoachBriefInput {
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly questionText: string;
  readonly previousChain?: ClippedChain;
  readonly repairChain?: boolean;
}

export interface ChainHooks {
  readonly memory: ChainMemory;
  readonly port?: ChainSectionPort;
}

export interface CoachBriefInput {
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly questionText: string;
}

export interface CoachBriefParts {
  readonly system: string;
  readonly user: string;
}

export interface ParsedCoachBrief {
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
  readonly cardId?: string;
  readonly relation?: CardRelation;
  readonly chain?: ParsedChain;
}

export type CoachQuestionFailure = {
  readonly ok: false;
  readonly code: Extract<InterviewSessionErrorCode, 'inject_unavailable' | 'first_question_failed' | 'follow_up_failed'>;
  readonly message: string;
};

export type AwaitNewQuestionResult =
  | { readonly ok: true; readonly status: 'ready'; readonly text: string }
  | { readonly ok: true; readonly status: 'unchanged' }
  | CoachQuestionFailure;

/**
 * Panel-only coach brief. Must not be mounted on session A.
 */
export const assembleCoachBriefPrompt = ({
  topic,
  difficulty,
  questionText,
  previousChain,
  repairChain = false,
}: CoachBriefInput): CoachBriefParts => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  return {
    system: [
      '你是本场模拟面试的面板教练，只为右侧面板产出对照材料。',
      '不要扮演面试官，不要向候选人发问，不要输出分数或通过/不通过判定。',
      '只针对当前待答问写摘要和要点；忽略同一段里对上一问的点评、纠正或揭晓。',
      'keyPoints 必须从考察意图拆出，3 到 6 条，不要另考一套。',
      '根据本场主题、难度和面试官已经问出的待答问，只返回一个 JSON 对象：',
      '{"questionBrief":"题干摘要","keyPoints":["标准答要点1","标准答要点2"],"cardId":"Q1","pointName":"知识点","layer":"why","intent":"这一问要听到的那一句","moves":{"deep":"答到了的下一问约束","partial":"有缺口的下一问约束","miss":"没答上的下一问约束"},"matchedMove":"switch"}',
      'questionBrief 是本题题干的短摘要。',
      'layer 只能是 define、why、scene、boundary。',
      'matchedMove 只能是 deep、partial、miss、switch。同一题拆开、追深或换方面用前三个。只有换了知识点才用 switch。',
      repairChain
        ? '上一次要点可以保留，但知识链不合法。这次必须返回完整 JSON，包含 pointName、layer、intent、moves。layer 只能是 define、why、scene、boundary。moves 的 deep、partial、miss 都必须是非空字符串。不要换题。'
        : '',
      '不要使用 Markdown 代码围栏，不要附加解释。',
    ]
      .filter((line) => line.length > 0)
      .join('\n'),
    user: [
      `主题：${topic}`,
      `难度：${difficultyLabel}`,
      ...previousChainLines(previousChain),
      '面试官当前问题：',
      pendingQuestion,
    ].join('\n'),
  };
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
};

const extractJsonObject = (raw: string): string | null => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\{[\s\S]*\}/);
  return fenced ? fenced[0] : null;
};

const asRelation = (value: unknown): CardRelation | undefined =>
  value === 'followup' || value === 'next_topic' ? value : undefined;

const asMoves = (value: unknown): ParsedChain['moves'] | null => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const deep = asNonEmptyString(row.deep);
  const partial = asNonEmptyString(row.partial);
  const miss = asNonEmptyString(row.miss);
  if (deep === null || partial === null || miss === null) {
    return null;
  }
  return { deep, partial, miss };
};

const asChain = (record: Record<string, unknown>): ParsedChain | undefined => {
  const pointName = asNonEmptyString(record.pointName);
  const intent = asNonEmptyString(record.intent);
  const moves = asMoves(record.moves);
  if (pointName === null || intent === null || !isExamLayer(record.layer) || moves === null) {
    return undefined;
  }
  const matchedMove = isChainMove(record.matchedMove) ? record.matchedMove : undefined;
  return {
    pointName,
    layer: record.layer,
    intent,
    moves,
    ...(matchedMove !== undefined ? { matchedMove } : {}),
  };
};

export const parseCoachBriefOutput = (raw: string): ParsedCoachBrief | null => {
  const json = extractJsonObject(raw);
  if (json === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const questionBrief = asNonEmptyString(record.questionBrief);
    if (questionBrief === null || !Array.isArray(record.keyPoints)) {
      return null;
    }
    const keyPoints = record.keyPoints
      .map((item) => asNonEmptyString(item))
      .filter((item): item is string => item !== null);
    if (keyPoints.length === 0) {
      return null;
    }
    const cardId = asNonEmptyString(record.cardId) ?? undefined;
    const relation = asRelation(record.relation);
    const chain = asChain(record);
    return {
      questionBrief,
      keyPoints,
      ...(cardId ? { cardId } : {}),
      ...(relation ? { relation } : {}),
      ...(chain ? { chain } : {}),
    };
  } catch {
    return null;
  }
};

export interface AwaitNewQuestionOptions {
  readonly timeoutMs?: number;
  readonly pollMs?: number;
}

export interface CoachRuntime {
  readLatestQuestion(
    sessionId: string,
  ): Promise<{ ok: true; text: string } | CoachQuestionFailure>;
  readLatestHuman(
    sessionId: string,
  ): Promise<{ ok: true; text: string } | CoachQuestionFailure>;
  awaitNewQuestion(
    sessionId: string,
    baselineText: string,
    options?: AwaitNewQuestionOptions,
  ): Promise<AwaitNewQuestionResult>;
  complete(system: string, user: string): Promise<string | null>;
  whenIdle?(sessionId: string): Promise<void>;
}

const coachUnavailable = (deck?: InterviewDeck): BriefCoachResponse => ({
  ok: false,
  code: 'coach_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
  ...(deck ? { deck } : {}),
});

const chainUnavailable = (deck: InterviewDeck): BriefCoachResponse => ({
  ok: false,
  code: 'chain_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.chain_unavailable,
  deck,
});

export const finishBrief = async (
  archive: WorkspaceArchive | undefined,
  examSessions: ExamSessionStore | undefined,
  deck: InterviewDeck,
  questionText: string,
  chain: ClippedChain | undefined,
  hooks: ChainHooks | undefined,
): Promise<BriefCoachResponse> => {
  const persisted = await persistDeck(archive, deck);
  const saved = persisted.deck ?? deck;
  if (examSessions) {
    saveExamRecord(examSessions, saved, questionText);
  }
  if (!persisted.ok) {
    return persisted;
  }
  if (chain === undefined) {
    hooks?.memory.forget(saved.sessionId);
    hooks?.port?.clear(saved.sessionId);
    return chainUnavailable(saved);
  }
  hooks?.memory.remember(saved.sessionId, chain);
  if (hooks?.port !== undefined) {
    const mounted = hooks.port.install(saved.sessionId, chain.sectionText);
    if (!mounted.ok) {
      return {
        ok: false,
        code: 'inject_unavailable',
        message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
        deck: saved,
      };
    }
  }
  return persisted;
};

export const persistDeck = async (
  archive: WorkspaceArchive | undefined,
  deck: InterviewDeck,
): Promise<BriefCoachResponse> => {
  if (archive === undefined) {
    return { ok: true, deck };
  }
  const written = await archive.writeDeck(deck);
  if (!written.ok) {
    return { ...persistUnavailable(), deck };
  }
  return { ok: true, deck: { ...deck, archiveDir: written.archiveDir } };
};

export const briefCoachSession = async (
  runtime: CoachRuntime,
  request: BriefCoachRequest,
  examSessions?: ExamSessionStore,
  archive?: WorkspaceArchive,
  hooks?: ChainHooks,
): Promise<BriefCoachResponse> => {
  hooks?.memory.forget(request.sessionId);
  const question = await runtime.readLatestQuestion(request.sessionId);
  if (!question.ok) {
    return question;
  }
  const human = await runtime.readLatestHuman(request.sessionId);
  if (!human.ok) {
    return human;
  }

  const firstPrompt = assembleCoachBriefPrompt({
    topic: request.topic,
    difficulty: request.difficulty,
    questionText: question.text,
  });
  const raw = await runtime.complete(firstPrompt.system, firstPrompt.user);
  if (raw === null) {
    return coachUnavailable();
  }

  let parsed = parseCoachBriefOutput(raw);
  if (parsed === null) {
    return coachUnavailable();
  }
  if (parsed.chain === undefined) {
    const repairPrompt = assembleCoachBriefPrompt({
      topic: request.topic,
      difficulty: request.difficulty,
      questionText: question.text,
      repairChain: true,
    });
    const repairedRaw = await runtime.complete(repairPrompt.system, repairPrompt.user);
    const repaired = repairedRaw === null ? null : parseCoachBriefOutput(repairedRaw);
    if (repaired !== null) {
      parsed = repaired;
    }
  }
  if (parsed.chain === undefined) {
    parsed = {
      ...parsed,
      chain: fallbackChain({
        difficulty: request.difficulty,
        questionBrief: parsed.questionBrief,
        keyPoints: parsed.keyPoints,
      }),
    };
  }

  const previous = examSessions?.load(request.sessionId);
  let archiveDir = '';
  if (archive?.beginRound !== undefined) {
    const begun = await archive.beginRound(request.sessionId, request.topic, {
      forceNext: previous?.ended === true,
    });
    if (!begun.ok) {
      const failedCard = createPendingCard({
        id: assignCardId([], { suggestedId: 'Q1' }),
        questionText: question.text,
        questionBrief: parsed.questionBrief,
        keyPoints: parsed.keyPoints,
        seedUserText: human.text,
      });
      const failedDeck = createInterviewDeck({
        sessionId: request.sessionId,
        topic: request.topic,
        difficulty: request.difficulty,
        cards: [failedCard],
        currentCardId: failedCard.id,
      });
      examSessions && saveExamRecord(examSessions, failedDeck, question.text);
      return { ...begun, deck: failedDeck };
    }
    archiveDir = begun.archiveDir;
  }

  const cardId = assignCardId([], { suggestedId: 'Q1' });
  const clipped =
    parsed.chain === undefined
      ? undefined
      : clipChain({
          difficulty: request.difficulty,
          chain: parsed.chain,
          cardIds: [cardId],
        });
  const card = createPendingCard({
    id: cardId,
    questionText: question.text,
    questionBrief: parsed.questionBrief,
    keyPoints: parsed.keyPoints,
    seedUserText: human.text,
    ...(clipped !== undefined ? { layer: clipped.layer, intent: clipped.intent } : {}),
  });
  const deck = createInterviewDeck({
    sessionId: request.sessionId,
    topic: request.topic,
    difficulty: request.difficulty,
    cards: [card],
    currentCardId: card.id,
    archiveDir,
  });
  await runtime.whenIdle?.(request.sessionId);
  return finishBrief(archive, examSessions, deck, question.text, clipped, hooks);
};
