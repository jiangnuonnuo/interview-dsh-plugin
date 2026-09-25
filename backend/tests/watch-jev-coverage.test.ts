/**
 * @jest-environment node
 */

import { BAGUA_SCORE_DIMENSIONS, createInterviewDeck, createPendingCard, type InterviewDeck } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import { createChainMemory } from '../src/services/knowledge-chain.js';
import { watchCoachTurnSession } from '../src/services/watch-coach-turn.js';
import { chainBrief } from './chain-json.js';
import { stubCoach } from './coach-stub.js';

const scoreBody = (coverage: string, comment = '只讲了聚簇叶子') =>
  JSON.stringify({
    coverage,
    covered: ['叶子即行'],
    missed: ['回表代价'],
    comment,
    scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 3.5, reason: '尚可' })),
  });

const pending = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '聚簇 vs 二级',
  keyPoints: ['叶子即行', '回表代价'],
  seedUserText: '开始本场八股专项模拟面试。',
});

const seedStore = (cards: InterviewDeck['cards'] = [pending]) => {
  const examSessions = createExamSessionStore();
  examSessions.save({
    sessionId: 'session-exam',
    topic: 'MySQL 索引与优化',
    difficulty: 'mid',
    lastQuestionText: cards[cards.length - 1]?.questionText ?? '请说明聚簇索引。',
    deck: createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      cards,
      currentCardId: cards[cards.length - 1]?.id ?? 'Q1',
    }),
  });
  return examSessions;
};

const scoredReask = (id: string, questionText: string): InterviewDeck['cards'][number] => ({
  ...createPendingCard({
    id,
    questionText,
    questionBrief: questionText,
    keyPoints: ['要点'],
  }),
  status: 'scored',
  coverage: 'reask',
  answer: '还差一点',
  answerTurns: ['还差一点'],
  comparison: { covered: ['要点'], missed: [], comment: '再拆' },
  scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 3, reason: '尚可' })),
});

describe('watchCoachTurnSession jev coverage', () => {
  it('keeps comparison coverage when the port is missing or unavailable', async () => {
    const examSessions = seedStore();
    const complete = jest.fn(async () => scoreBody('miss', '对照 miss'));
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '不会。' }),
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'unavailable' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards[0]?.coverage).toBe('miss');
      expect(result.deck.cards[0]?.comparison?.comment).toBe('对照 miss');
    }
    expect(result.jevAccelerated).toBeUndefined();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('opens Qn.m from a jev deepen even when comparison json says miss', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '二级索引如何回表？',
        }),
        complete: async (_system, user) => {
          if (user.includes('候选人作答')) {
            return scoreBody('miss', '对照想留在原卡');
          }
          return chainBrief({
            questionBrief: '回表',
            keyPoints: ['先查二级'],
            cardId: 'Q1.1',
            relation: 'followup',
          });
        },
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'deepen' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards.map((card) => card.id)).toEqual(['Q1', 'Q1.1']);
      expect(result.deck.cards[0]?.coverage).toBe('deepen');
      expect(result.deck.cards[0]?.comparison?.comment).toBe('对照想留在原卡');
      expect(result.jevAccelerated).toBe(true);
    }
  });

  it('waits for the interviewer to go idle before installing the next chain', async () => {
    const examSessions = seedStore();
    const order: string[] = [];
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '二级索引如何回表？',
        }),
        whenIdle: async () => {
          order.push('idle');
        },
        complete: async (_system, user) => {
          if (user.includes('候选人作答')) {
            return scoreBody('miss', '对照想留在原卡');
          }
          return chainBrief({
            questionBrief: '回表',
            keyPoints: ['先查二级'],
            cardId: 'Q1.1',
            relation: 'followup',
          });
        },
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      {
        memory: createChainMemory(),
        port: {
          install() {
            order.push('install');
            return { ok: true };
          },
          clear() {
            return undefined;
          },
        },
      },
      { settle: async () => 'deepen' },
    );
    expect(result.ok).toBe(true);
    expect(order[0]).toBe('idle');
    expect(order).toContain('install');
    expect(order.indexOf('idle')).toBeLessThan(order.indexOf('install'));
  });

  it('falls back to comparison coverage when jev fails and does not surface a jev error', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        complete: async () => scoreBody('next', '对照 next'),
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'unavailable' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards).toHaveLength(1);
      expect(result.deck.cards[0]?.coverage).toBe('next');
      expect(result.deck.cards[0]?.comparison?.comment).toBe('对照 next');
    }
    expect(JSON.stringify(result)).not.toContain('Jev');
    expect(JSON.stringify(result)).not.toContain('未开启');
  });

  it('keeps coverage_unavailable when both sources fail', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        complete: async () =>
          JSON.stringify({
            covered: ['叶子即行'],
            missed: ['回表代价'],
            comment: '缺档',
            scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 3.5, reason: '尚可' })),
          }),
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'unavailable' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('coverage_unavailable');
      expect(result.deck?.cards).toHaveLength(1);
    }
  });

  it('prepares the next card while comparison complete is still pending', async () => {
    const examSessions = seedStore();
    let release: (value: string) => void = () => undefined;
    const complete = jest.fn(
      (system: string, user: string) =>
        new Promise<string | null>((resolve) => {
          if (!user.includes('候选人作答')) {
            resolve(
              chainBrief({
                questionBrief: '回表',
                keyPoints: ['先查二级'],
                cardId: 'Q1.1',
                relation: 'followup',
              }),
            );
            return;
          }
          release = (value) => {
            resolve(value);
          };
        }),
    );
    const done = watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '二级索引如何回表？',
        }),
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'deepen' },
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    expect(examSessions.load('session-exam')?.deck.cards.map((card) => card.id)).toEqual(['Q1', 'Q1.1']);
    release(scoreBody('miss', '后到的评语'));
    const result = await done;
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards[0]?.coverage).toBe('deepen');
      expect(result.deck.cards[0]?.comparison?.comment).toBe('后到的评语');
      expect(result.deck.cards[1]?.id).toBe('Q1.1');
    }
  });

  it('does not open a card or show a next slot on jev miss', async () => {
    const examSessions = seedStore();
    const awaitNewQuestion = jest.fn(async () => ({
      ok: true as const,
      status: 'ready' as const,
      text: '那我们先看锁升级。',
    }));
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '不会。' }),
        awaitNewQuestion,
        complete: async () => scoreBody('next', '对照想换题'),
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'miss' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards).toHaveLength(1);
      expect(result.deck.cards[0]?.coverage).toBe('miss');
      expect(result.deck.cards[0]?.comparison?.comment).toBe('对照想换题');
    }
  });

  it('opens the next Qn after three reasks even if jev returns reask', async () => {
    const examSessions = seedStore([
      scoredReask('Q1', '请说明聚簇索引。'),
      scoredReask('Q1.1', '二级索引如何回表？'),
      scoredReask('Q1.2', '回表代价是什么？'),
      createPendingCard({
        id: 'Q1.3',
        questionText: '还有哪一块？',
        questionBrief: '再拆',
        keyPoints: ['下一块'],
        seedUserText: '还差一点',
      }),
    ]);
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '还是不会。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '换一个方向：事务隔离级别。',
        }),
        complete: async (_system, user) => {
          if (user.includes('候选人作答')) {
            return scoreBody('reask', '还想拆');
          }
          return chainBrief({
            questionBrief: '隔离级别',
            keyPoints: ['RR'],
            matchedMove: 'switch',
          });
        },
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'reask' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards[result.deck.cards.length - 1]?.id).toBe('Q2');
      expect(result.deck.cards.find((card) => card.id === 'Q1.3')?.coverage).toBe('next');
    }
  });

  it('applies the reask cap on the comparison fallback path', async () => {
    const examSessions = seedStore([
      scoredReask('Q1', '请说明聚簇索引。'),
      scoredReask('Q1.1', '二级索引如何回表？'),
      scoredReask('Q1.2', '回表代价是什么？'),
      createPendingCard({
        id: 'Q1.3',
        questionText: '还有哪一块？',
        questionBrief: '再拆',
        keyPoints: ['下一块'],
        seedUserText: '还差一点',
      }),
    ]);
    const scored = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '还是不会。' }),
        complete: async () => scoreBody('reask', '对照还想拆'),
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(scored.ok).toBe(true);
    if (scored.ok && scored.status === 'updated') {
      expect(scored.deck.cards.find((card) => card.id === 'Q1.3')?.coverage).toBe('next');
    }
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '还是不会。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '换一个方向：事务隔离级别。',
        }),
        complete: async () =>
          chainBrief({
            questionBrief: '隔离级别',
            keyPoints: ['RR'],
            matchedMove: 'switch',
          }),
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards[result.deck.cards.length - 1]?.id).toBe('Q2');
    }
  });

  it('opens a jev card and still reports coach_unavailable when comparison fails', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '二级索引如何回表？',
        }),
        complete: async (_system, user) => {
          if (user.includes('候选人作答')) {
            return null;
          }
          return chainBrief({
            questionBrief: '回表',
            keyPoints: ['先查二级'],
            cardId: 'Q1.1',
            relation: 'followup',
          });
        },
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'deepen' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('coach_unavailable');
      expect(result.deck?.cards.map((card) => card.id)).toEqual(['Q1', 'Q1.1']);
      expect(result.deck?.cards[0]?.coverage).toBe('deepen');
      expect(result.deck?.cards[0]?.comparison).toBeNull();
    }
  });

  it('allows a third reask to open Qn.m', async () => {
    const examSessions = seedStore([
      scoredReask('Q1', '请说明聚簇索引。'),
      scoredReask('Q1.1', '二级索引如何回表？'),
      createPendingCard({
        id: 'Q1.2',
        questionText: '回表代价是什么？',
        questionBrief: '代价',
        keyPoints: ['回表'],
        seedUserText: '还差一点',
      }),
    ]);
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '这块还没讲。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '那再拆一块。',
        }),
        complete: async (_system, user) => {
          if (user.includes('候选人作答')) {
            return scoreBody('reask', '第三次');
          }
          return chainBrief({
            questionBrief: '下一块',
            keyPoints: ['下一块'],
            cardId: 'Q1.3',
            relation: 'followup',
          });
        },
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      { settle: async () => 'reask' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards[result.deck.cards.length - 1]?.id).toBe('Q1.3');
    }
  });
});
