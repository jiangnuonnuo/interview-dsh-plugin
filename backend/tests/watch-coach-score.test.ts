/**
 * @jest-environment node
 */

import { BAGUA_SCORE_DIMENSIONS, createInterviewDeck, createPendingCard, type InterviewDeck } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import { renderCardMarkdown, type WorkspaceArchive } from '../src/data/workspace-archive.js';
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

const scoredJson = scoreBody('next');

const rememberingArchive = () => {
  const decks: InterviewDeck[] = [];
  const archive: WorkspaceArchive = {
    writeDeck: async (deck) => {
      decks.push(deck);
      return { ok: true, archiveDir: deck.archiveDir };
    },
    readDeck: async () => undefined,
  };
  return { archive, decks };
};

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
    const awaitNewQuestion = jest.fn(async () => ({
      ok: true as const,
      status: 'ready' as const,
      text: '二级索引如何回表？',
    }));
    const complete = jest.fn(async () => scoredJson);
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        awaitNewQuestion,
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      const card = result.deck.cards[0];
      expect(result.deck.cards).toHaveLength(1);
      expect(card?.status).toBe('scored');
      expect(card?.answer).toBe('叶子节点存的是整行。');
      expect(card?.comparison?.comment).toBe('只讲了聚簇叶子');
      expect(card?.scores.every((item) => item.score === 3.5)).toBe(true);
      expect(card?.questionBrief).toBe('聚簇 vs 二级');
    }
    expect(awaitNewQuestion).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
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

  it('scores an answer that arrives while waiting for the next question', async () => {
    const examSessions = seedStore();
    let human = '';
    let waits = 0;
    const complete = jest.fn(async () => scoredJson);
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: human }),
        awaitNewQuestion: async () => {
          waits += 1;
          if (waits === 1) {
            await new Promise((resolve) => {
              setTimeout(resolve, 60);
            });
            human = '叶子节点存的是整行。';
          }
          return { ok: true as const, status: 'unchanged' as const };
        },
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards).toHaveLength(1);
      expect(result.deck.cards[0]?.status).toBe('scored');
      expect(result.deck.cards[0]?.answer).toBe('叶子节点存的是整行。');
    }
    expect(complete).toHaveBeenCalledTimes(1);
    expect(waits).toBe(1);
  });

  it('publishes the scored card before briefing the next question', async () => {
    const examSessions = seedStore();
    let human = '';
    const runtime = stubCoach({
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
          return scoreBody('deepen');
        }
        return chainBrief({
          questionBrief: '二级索引回表',
          keyPoints: ['先查二级再回聚簇'],
          cardId: 'Q1.1',
          relation: 'followup',
        });
      },
    });
    const scored = await watchCoachTurnSession(runtime, examSessions, { sessionId: 'session-exam' });
    expect(scored.ok).toBe(true);
    if (scored.ok && scored.status === 'updated') {
      expect(scored.deck.cards).toHaveLength(1);
      expect(scored.deck.cards[0]?.id).toBe('Q1');
      expect(scored.deck.cards[0]?.status).toBe('scored');
      expect(scored.deck.cards[0]?.answer).toBe('叶子节点存的是整行。');
      expect(scored.deck.cards[0]?.scores[0]?.score).toBe(3.5);
    }

    const next = await watchCoachTurnSession(runtime, examSessions, { sessionId: 'session-exam' });
    expect(next.ok).toBe(true);
    if (next.ok && next.status === 'updated') {
      expect(next.deck.cards).toHaveLength(2);
      expect(next.deck.cards[0]?.status).toBe('scored');
      expect(next.deck.cards[1]?.id).toBe('Q1.1');
      expect(next.deck.cards[1]?.status).toBe('pending');
      expect(next.deck.currentCardId).toBe('Q1.1');
      expect(next.deck.cards[0]?.questionText).toBe('请说明聚簇索引。');
      expect(next.deck.cards[0]?.keyPoints).toEqual(['叶子即行', '回表代价']);
      expect(next.deck.cards[0]?.answer).toBe('叶子节点存的是整行。');
      expect(next.deck.cards[0]?.scores[0]?.score).toBe(3.5);
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

  it('stacks two guided answers on the same card and does not open a child', async () => {
    const examSessions = seedStore();
    const { archive, decks } = rememberingArchive();
    const first = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '不会。' }),
        complete: async () => scoreBody('miss', '第一轮没答上'),
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      archive,
    );
    expect(first.ok).toBe(true);
    if (first.ok && first.status === 'updated') {
      expect(first.deck.cards).toHaveLength(1);
      expect(first.deck.cards[0]?.guideCount).toBe(1);
      expect(first.deck.cards[0]?.answerTurns).toEqual(['不会。']);
    }

    const spoken = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '不会。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '那我们先看锁升级。',
        }),
        complete: jest.fn(),
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      archive,
    );
    expect(spoken.ok).toBe(true);
    if (spoken.ok && spoken.status === 'updated') {
      expect(spoken.deck.cards).toHaveLength(1);
    }

    const complete = jest.fn(async (_system: string, user: string) => {
      expect(user).toContain('不会。');
      expect(user).toContain('还是不会。');
      return scoreBody('wide_gap', '第二轮仍缺要点');
    });
    const second = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '还是不会。' }),
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
      {},
      archive,
    );
    expect(second.ok).toBe(true);
    if (second.ok && second.status === 'updated') {
      expect(second.deck.cards).toHaveLength(1);
      expect(second.deck.cards[0]?.id).toBe('Q1');
      expect(second.deck.cards[0]?.guideCount).toBe(2);
      expect(second.deck.cards[0]?.answerTurns).toEqual(['不会。', '还是不会。']);
      expect(second.deck.cards[0]?.comparison?.comment).toBe('第二轮仍缺要点');
      const markdown = renderCardMarkdown(second.deck, 'Q1');
      expect(markdown).toContain('a1');
      expect(markdown).toContain('a2');
      expect(markdown).toContain('第二轮仍缺要点');
    }
    expect(decks.every((deck) => deck.cards.every((card) => card.id !== 'Q1.1'))).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('opens a child card when a guided question is split, and a new topic only on switch', async () => {
    const examSessions = seedStore();
    await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '不会。' }),
        complete: async () => scoreBody('miss', '第一轮'),
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '还是不会。' }),
        complete: async () => scoreBody('miss', '第二轮'),
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    const complete = jest.fn(async () =>
      chainBrief({
        questionBrief: '锁升级',
        keyPoints: ['偏向锁'],
        cardId: 'Q1.1',
        relation: 'followup',
      }),
    );
    const next = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '第三句也不知道。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: 'synchronized 锁升级怎么走？',
        }),
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(next.ok).toBe(true);
    if (next.ok && next.status === 'updated') {
      expect(next.deck.cards.map((card) => card.id)).toEqual(['Q1', 'Q1.1']);
      expect(next.deck.cards[0]?.guideCount).toBe(2);
      expect(next.deck.cards[0]?.answerTurns).toEqual(['不会。', '还是不会。']);
      expect(next.deck.cards[1]?.status).toBe('pending');
    }

    const switchedSessions = seedStore();
    await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '不会。' }),
        complete: async () => scoreBody('miss', '第一轮'),
      }),
      switchedSessions,
      { sessionId: 'session-exam' },
    );
    await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '还是不会。' }),
        complete: async () => scoreBody('miss', '第二轮'),
      }),
      switchedSessions,
      { sessionId: 'session-exam' },
    );
    const switched = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '第三句也不知道。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '换一个知识点：Redis 持久化怎么选？',
        }),
        complete: async () =>
          chainBrief({
            questionBrief: '持久化',
            keyPoints: ['RDB'],
            matchedMove: 'switch',
          }),
      }),
      switchedSessions,
      { sessionId: 'session-exam' },
    );
    expect(switched.ok).toBe(true);
    if (switched.ok && switched.status === 'updated') {
      expect(switched.deck.cards.map((card) => card.id)).toEqual(['Q1', 'Q2']);
    }
  });

  it('opens Qn.m for deepen and reask, and the next Qn for next', async () => {
    const openChild = async (coverage: 'deepen' | 'reask' | 'next', expectedId: string) => {
      const examSessions = seedStore();
      await watchCoachTurnSession(
        stubCoach({
          readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
          complete: async () => scoreBody(coverage),
        }),
        examSessions,
        { sessionId: 'session-exam' },
      );
      const result = await watchCoachTurnSession(
        stubCoach({
          readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
          awaitNewQuestion: async () => ({
            ok: true,
            status: 'ready',
            text: '再问一层。',
          }),
          complete: async () =>
            chainBrief({
              questionBrief: '下一问',
              keyPoints: ['一个要点'],
              cardId: 'Q1.1',
              relation: 'followup',
              matchedMove: 'switch',
            }),
        }),
        examSessions,
        { sessionId: 'session-exam' },
      );
      expect(result.ok).toBe(true);
      if (result.ok && result.status === 'updated') {
        expect(result.deck.cards[1]?.id).toBe(expectedId);
        expect(result.deck.cards[0]?.questionText).toBe('请说明聚簇索引。');
        expect(result.deck.cards[0]?.answer).toBe('叶子节点存的是整行。');
        expect(result.deck.cards[0]?.scores[0]?.score).toBe(3.5);
      }
    };
    await openChild('deepen', 'Q1.1');
    await openChild('reask', 'Q1.1');
    await openChild('next', 'Q2');
  });

  it('keeps the answer on the card when coverage is missing and does not open another card', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '叶子节点存的是整行。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '二级索引如何回表？',
        }),
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
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('coverage_unavailable');
      expect(result.deck?.cards).toHaveLength(1);
      expect(result.deck?.cards[0]?.answer).toBe('叶子节点存的是整行。');
      expect(result.deck?.cards[0]?.status).toBe('scored');
    }
  });
});
