/**
 * @jest-environment node
 */

import { createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';

const deck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [
    createPendingCard({
      id: 'Q1',
      questionText: '请说明聚簇索引。',
      questionBrief: '聚簇 vs 二级',
      keyPoints: ['回表'],
    }),
  ],
  currentCardId: 'Q1',
});

describe('exam-session-store', () => {
  it('returns a saved record by session id', () => {
    const store = createExamSessionStore();
    store.save({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      lastQuestionText: '请说明聚簇索引。',
      deck,
    });

    expect(store.load('session-exam')).toEqual({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      lastQuestionText: '请说明聚簇索引。',
      deck,
    });
  });

  it('returns undefined for an unknown session', () => {
    const store = createExamSessionStore();
    expect(store.load('missing')).toBeUndefined();
  });
});
