import { DIFFICULTY_LABELS, type Difficulty, type EntryErrorCode } from './interview-entry.js';

export type InterviewSessionErrorCode =
  | 'inject_unavailable'
  | 'coach_unavailable'
  | 'first_question_failed'
  | 'follow_up_failed';

export const INTERVIEW_SESSION_ERROR_MESSAGES: Record<InterviewSessionErrorCode, string> = {
  inject_unavailable: '无法在新对话上挂载面试官人设：当前 Host 没有可寻址的 Agent。',
  coach_unavailable: '无法生成本题要点：当前 Host 没有可用的同模型补全。',
  first_question_failed: '面试官开口失败。',
  follow_up_failed: '无法看守下一问：本场记录不存在，或当前 Host 读不到最新题干。',
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

export interface ScorePlaceholder {
  readonly dimension: BaguaScoreDimension;
  readonly score: null;
}

export const emptyBaguaScores = (): readonly ScorePlaceholder[] =>
  BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: null }));

export type InterviewPhase = 'in_progress';

export interface InProgressSnapshot {
  readonly phase: InterviewPhase;
  readonly sessionId: string;
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
  readonly scores: readonly ScorePlaceholder[];
}

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
  | { readonly ok: true; readonly snapshot: InProgressSnapshot }
  | { readonly ok: false; readonly code: InterviewSessionErrorCode; readonly message: string };

export interface StartExamRoomInput {
  readonly topic: string;
  readonly difficulty: Difficulty;
}

export type StartExamRoomResponse =
  | { readonly ok: true; readonly sessionId: string }
  | { readonly ok: false; readonly code: InterviewSessionErrorCode; readonly message: string };

export type StartInterviewResponse =
  | { readonly ok: true; readonly snapshot: InProgressSnapshot }
  | { readonly ok: false; readonly code: EntryErrorCode | InterviewSessionErrorCode; readonly message: string };

export interface WatchCoachTurnRequest {
  readonly sessionId: string;
}

export type WatchCoachTurnResponse =
  | { readonly ok: true; readonly status: 'updated'; readonly snapshot: InProgressSnapshot }
  | { readonly ok: true; readonly status: 'unchanged' }
  | { readonly ok: false; readonly code: InterviewSessionErrorCode; readonly message: string };

export { DIFFICULTY_LABELS };
