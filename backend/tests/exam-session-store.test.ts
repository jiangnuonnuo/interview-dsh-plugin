/**
 * @jest-environment node
 */

import { emptyBaguaScores } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';

const snapshot = {
  phase: 'in_progress' as const,
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid' as const,
  questionBrief: '聚簇 vs 二级',
  keyPoints: ['回表'],
  scores: emptyBaguaScores(),
};

describe('exam-session-store', () => {
  it('returns a saved record by session id', () => {
    const store = createExamSessionStore();
    store.save({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      lastQuestionText: '请说明聚簇索引。',
      snapshot,
    });

    expect(store.load('session-exam')).toEqual({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      lastQuestionText: '请说明聚簇索引。',
      snapshot,
    });
  });

  it('returns undefined for an unknown session', () => {
    const store = createExamSessionStore();
    expect(store.load('missing')).toBeUndefined();
  });
});
