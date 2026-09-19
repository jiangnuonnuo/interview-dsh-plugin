import {
  DIFFICULTY_LABELS,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  createInterviewDeck,
  createPendingCard,
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
import { extractPendingQuestion } from './pending-question.js';

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
}: CoachBriefInput): CoachBriefParts => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  return {
    system: [
      '你是本场模拟面试的面板教练，只为右侧面板产出对照材料。',
      '不要扮演面试官，不要向候选人发问，不要输出分数或通过/不通过判定。',
      '只针对当前待答问写摘要和要点；忽略同一段里对上一问的点评、纠正或揭晓。',
      '根据本场主题、难度和面试官已经问出的待答问，只返回一个 JSON 对象：',
      '{"questionBrief":"题干摘要","keyPoints":["标准答要点1","标准答要点2"],"cardId":"Q1","relation":"followup"}',
      'questionBrief 是本题题干的短摘要；keyPoints 是本题标准答要点，3 到 6 条。',
      'cardId 必须是 Qn 或 Qn.m；relation 只能是 followup 或 next_topic。',
      '不要使用 Markdown 代码围栏，不要附加解释。',
    ].join('\n'),
    user: [
      `主题：${topic}`,
      `难度：${difficultyLabel}`,
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
    return {
      questionBrief,
      keyPoints,
      ...(cardId ? { cardId } : {}),
      ...(relation ? { relation } : {}),
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
}

const coachUnavailable = (deck?: InterviewDeck): BriefCoachResponse => ({
  ok: false,
  code: 'coach_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
  ...(deck ? { deck } : {}),
});

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
): Promise<BriefCoachResponse> => {
  const question = await runtime.readLatestQuestion(request.sessionId);
  if (!question.ok) {
    return question;
  }
  const human = await runtime.readLatestHuman(request.sessionId);
  if (!human.ok) {
    return human;
  }

  const { system, user } = assembleCoachBriefPrompt({
    topic: request.topic,
    difficulty: request.difficulty,
    questionText: question.text,
  });
  const raw = await runtime.complete(system, user);
  if (raw === null) {
    return coachUnavailable();
  }

  const parsed = parseCoachBriefOutput(raw);
  if (parsed === null) {
    return coachUnavailable();
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

  const card = createPendingCard({
    id: assignCardId([], { suggestedId: 'Q1' }),
    questionText: question.text,
    questionBrief: parsed.questionBrief,
    keyPoints: parsed.keyPoints,
    seedUserText: human.text,
  });
  const deck = createInterviewDeck({
    sessionId: request.sessionId,
    topic: request.topic,
    difficulty: request.difficulty,
    cards: [card],
    currentCardId: card.id,
    archiveDir,
  });
  examSessions && saveExamRecord(examSessions, deck, question.text);

  const persisted = await persistDeck(archive, deck);
  if (persisted.ok) {
    examSessions && saveExamRecord(examSessions, persisted.deck, question.text);
  } else if (examSessions) {
    saveExamRecord(examSessions, persisted.deck ?? deck, question.text);
  }
  return persisted;
};
