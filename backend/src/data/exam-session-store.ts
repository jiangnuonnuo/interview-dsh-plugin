import type { Difficulty, InterviewDeck } from 'interview-dsh-shared';

export interface ExamSessionRecord {
  readonly sessionId: string;
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly lastQuestionText: string;
  readonly deck: InterviewDeck;
  readonly ended?: boolean;
  readonly closingSeed?: string;
}

export interface ExamSessionStore {
  save(record: ExamSessionRecord): void;
  load(sessionId: string): ExamSessionRecord | undefined;
}

export const createExamSessionStore = (): ExamSessionStore => {
  const records = new Map<string, ExamSessionRecord>();
  return {
    save(record) {
      records.set(record.sessionId, record);
    },
    load(sessionId) {
      return records.get(sessionId);
    },
  };
};
