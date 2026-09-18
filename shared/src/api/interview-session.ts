import { DIFFICULTY_LABELS, type Difficulty, type EntryErrorCode } from './interview-entry.js';

export type InterviewSessionErrorCode =
  | 'inject_unavailable'
  | 'coach_unavailable'
  | 'first_question_failed'
  | 'follow_up_failed'
  | 'persist_unavailable';

export const INTERVIEW_SESSION_ERROR_MESSAGES: Record<InterviewSessionErrorCode, string> = {
  inject_unavailable: '无法在新对话上挂载面试官人设：当前 Host 没有可寻址的 Agent。',
  coach_unavailable: '无法生成本题要点：当前 Host 没有可用的同模型补全。',
  first_question_failed: '面试官开口失败。',
  follow_up_failed: '无法看守下一问：本场记录不存在，或当前 Host 读不到最新题干。',
  persist_unavailable: '无法写入工作区练习记录：当前没有可用的工作区目录或文件系统。',
};

export const INTERVIEW_OPENING_PROMPT =
  '开始本场八股专项模拟面试。请按人设先说明主题与难度，然后只问第一个问题。';

export const BAGUA_SCORE_DIMENSIONS = [
  '基础扎实度',
  '原理理解',
  '场景迁移',
  '深度边界',
  '表达清晰度',
] as const;

export type BaguaScoreDimension = (typeof BAGUA_SCORE_DIMENSIONS)[number];

export type CardStatus = 'pending' | 'scored';

export type CardRelation = 'followup' | 'next_topic';

export interface CardScore {
  readonly dimension: BaguaScoreDimension;
  readonly score: number | null;
  readonly reason?: string;
}

export const emptyBaguaScores = (): readonly CardScore[] =>
  BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: null }));

export interface CardComparison {
  readonly covered: readonly string[];
  readonly missed: readonly string[];
  readonly comment: string;
}

export interface QuestionCard {
  readonly id: string;
  readonly questionText: string;
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
  readonly answer: string | null;
  readonly comparison: CardComparison | null;
  readonly scores: readonly CardScore[];
  readonly status: CardStatus;
  readonly seedUserText: string;
}

export type InterviewPhase = 'in_progress';

export interface InterviewDeck {
  readonly phase: InterviewPhase;
  readonly sessionId: string;
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly archiveDir: string;
  readonly cards: readonly QuestionCard[];
  readonly currentCardId: string;
}

export const createPendingCard = (input: {
  readonly id: string;
  readonly questionText: string;
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
  readonly seedUserText?: string;
}): QuestionCard => ({
  id: input.id,
  questionText: input.questionText,
  questionBrief: input.questionBrief,
  keyPoints: input.keyPoints,
  answer: null,
  comparison: null,
  scores: emptyBaguaScores(),
  status: 'pending',
  seedUserText: input.seedUserText ?? '',
});

export const createInterviewDeck = (input: {
  readonly sessionId: string;
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly cards: readonly QuestionCard[];
  readonly currentCardId: string;
  readonly archiveDir?: string;
}): InterviewDeck => ({
  phase: 'in_progress',
  sessionId: input.sessionId,
  topic: input.topic,
  difficulty: input.difficulty,
  archiveDir: input.archiveDir ?? '',
  cards: input.cards,
  currentCardId: input.currentCardId,
});

export const findCard = (deck: InterviewDeck, cardId: string): QuestionCard | undefined =>
  deck.cards.find((card) => card.id === cardId);

export interface AttachInterviewerRequest {
  readonly sessionId: string;
  readonly topic: string;
  readonly difficulty: Difficulty;
}

export type AttachInterviewerResponse =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: InterviewSessionErrorCode; readonly message: string };

export interface BriefCoachRequest {
  readonly sessionId: string;
  readonly topic: string;
  readonly difficulty: Difficulty;
}

export type BriefCoachResponse =
  | { readonly ok: true; readonly deck: InterviewDeck }
  | {
      readonly ok: false;
      readonly code: InterviewSessionErrorCode;
      readonly message: string;
      readonly deck?: InterviewDeck;
    };

export interface StartExamRoomInput {
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly cwd?: string;
  readonly workspaceId?: string;
}

export type StartExamRoomResponse =
  | { readonly ok: true; readonly sessionId: string }
  | { readonly ok: false; readonly code: InterviewSessionErrorCode; readonly message: string };

export type StartInterviewResponse =
  | { readonly ok: true; readonly deck: InterviewDeck }
  | {
      readonly ok: false;
      readonly code: EntryErrorCode | InterviewSessionErrorCode;
      readonly message: string;
      readonly deck?: InterviewDeck;
    };

export interface WatchCoachTurnRequest {
  readonly sessionId: string;
  readonly force?: boolean;
}

export type WatchCoachTurnResponse =
  | { readonly ok: true; readonly status: 'updated'; readonly deck: InterviewDeck }
  | { readonly ok: true; readonly status: 'unchanged' }
  | {
      readonly ok: false;
      readonly code: InterviewSessionErrorCode;
      readonly message: string;
      readonly deck?: InterviewDeck;
    };

export interface LoadDeckRequest {
  readonly sessionId: string;
}

export type LoadDeckResponse =
  | { readonly ok: true; readonly deck: InterviewDeck }
  | { readonly ok: false; readonly code: InterviewSessionErrorCode; readonly message: string };

export { DIFFICULTY_LABELS };
