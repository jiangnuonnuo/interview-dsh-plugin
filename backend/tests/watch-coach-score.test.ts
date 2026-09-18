/**
 * @jest-environment node
 */

import { BAGUA_SCORE_DIMENSIONS, createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import { watchCoachTurnSession } from '../src/services/watch-coach-turn.js';
import { stubCoach } from './coach-stub.js';

const scoredJson = JSON.stringify({
  covered: ['叶子即行'],
  missed: ['回表代价'],
  comment: '只讲了聚簇叶子',
  scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 3.5, reason: '尚可' })),
});

const pending = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '聚簇 vs 二级',
  keyPoints: ['叶子即行', '回表代价'],
  seedUserText: '开始本场八股专项模拟面试。',
});

const seedStore = () => {
  const examSessions = createExamSessionStore();
  examSessions.save({
    sessionId: 'session-exam',
    topic: 'MySQL 索引与优化',
    difficulty: 'mid',
    lastQuestionText: '请说明聚簇索引。',
    deck: createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      cards: [pending],
      currentCardId: 'Q1',
    }),
  });
  return examSessions;
};

describe('watchCoachTurnSession scoring', () => {
  it('does not treat the opening seed as an answer', async () => {
    const complete = jest.fn();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '开始本场八股专项模拟面试。' }),
        complete,
      }),
      seedStore(),
      { sessionId: 'session-exam' },
    );
    expect(result).toEqual({ ok: true, status: 'unchanged' });
    expect(complete).not.toHaveBeenCalled();
  });

  it('scores the pending card when a later human answer appears', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        complete: async () => scoredJson,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      const card = result.deck.cards[0];
      expect(card?.status).toBe('scored');
      expect(card?.answer).toBe('叶子节点存的是整行。');
      expect(card?.comparison?.comment).toBe('只讲了聚簇叶子');
      expect(card?.scores.every((item) => item.score === 3.5)).toBe(true);
      expect(card?.questionBrief).toBe('聚簇 vs 二级');
    }
  });

  it('keeps the card pending when scores are incomplete', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        complete: async () =>
          JSON.stringify({
            covered: [],
            missed: [],
            comment: '缺维',
            scores: [{ dimension: '基础扎实度', score: 4 }],
          }),
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('coach_unavailable');
    }
    const card = examSessions.load('session-exam')?.deck.cards[0];
    expect(card?.status).toBe('pending');
    expect(card?.questionBrief).toBe('聚簇 vs 二级');
    expect(card?.scores.every((item) => item.score === null)).toBe(true);
  });

  it('keeps a scored card when a later brief fails', async () => {
    const examSessions = seedStore();
    const scored = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        complete: async () => scoredJson,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(scored.ok).toBe(true);

    const failed = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '二级索引如何回表？',
        }),
        complete: async () => null,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(failed.ok).toBe(false);
    const cards = examSessions.load('session-exam')?.deck.cards;
    expect(cards).toHaveLength(1);
    expect(cards?.[0]?.status).toBe('scored');
    expect(cards?.[0]?.scores[0]?.score).toBe(3.5);
  });

  it('scores the pending card before appending the next question in the same watch', async () => {
    const examSessions = seedStore();
    let human = '';
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: human }),
        awaitNewQuestion: async () => {
          human = '叶子节点存的是整行。';
          return {
            ok: true,
            status: 'ready',
            text: '二级索引如何回表？',
          };
        },
        complete: async (_system, user) => {
          if (user.includes('候选人作答')) {
            return scoredJson;
          }
          return '{"questionBrief":"二级索引回表","keyPoints":["先查二级再回聚簇"],"cardId":"Q1.1","relation":"followup"}';
        },
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards).toHaveLength(2);
      expect(result.deck.cards[0]?.id).toBe('Q1');
      expect(result.deck.cards[0]?.status).toBe('scored');
      expect(result.deck.cards[0]?.answer).toBe('叶子节点存的是整行。');
      expect(result.deck.cards[0]?.scores[0]?.score).toBe(3.5);
      expect(result.deck.cards[1]?.id).toBe('Q1.1');
      expect(result.deck.cards[1]?.status).toBe('pending');
      expect(result.deck.currentCardId).toBe('Q1.1');
    }
  });

  it('scores an earlier pending card when a later card already seeded the same answer', async () => {
    const examSessions = createExamSessionStore();
    const q1 = createPendingCard({
      id: 'Q1',
      questionText: '请说明聚簇索引。',
      questionBrief: '聚簇 vs 二级',
      keyPoints: ['叶子即行', '回表代价'],
      seedUserText: '开始本场八股专项模拟面试。',
    });
    const q1_1 = createPendingCard({
      id: 'Q1.1',
      questionText: '二级索引如何回表？',
      questionBrief: '回表',
      keyPoints: ['先查二级'],
      seedUserText: '叶子节点存的是整行。',
    });
    examSessions.save({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      lastQuestionText: '二级索引如何回表？',
      deck: createInterviewDeck({
        sessionId: 'session-exam',
        topic: 'MySQL 索引与优化',
        difficulty: 'mid',
        cards: [q1, q1_1],
        currentCardId: 'Q1.1',
      }),
    });
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        complete: async () => scoredJson,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards[0]?.status).toBe('scored');
      expect(result.deck.cards[0]?.scores[0]?.score).toBe(3.5);
      expect(result.deck.cards[1]?.status).toBe('pending');
      expect(result.deck.currentCardId).toBe('Q1');
    }
  });
});
