/**
 * @jest-environment node
 */

import { createInterviewDeck, createPendingCard, INTERVIEW_ROUND_CLOSING_LINE, INTERVIEW_ROUND_END_TRIGGER } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import { watchCoachTurnSession } from '../src/services/watch-coach-turn.js';
import { stubCoach } from './coach-stub.js';

const q1 = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '第一问摘要',
  keyPoints: ['要点一'],
  seedUserText: '开始本场八股专项模拟面试。',
});

const deck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [q1],
  currentCardId: 'Q1',
});

const seedStore = () => {
  const examSessions = createExamSessionStore();
  examSessions.save({
    sessionId: 'session-exam',
    topic: 'MySQL 索引与优化',
    difficulty: 'mid',
    lastQuestionText: '请说明聚簇索引。',
    deck,
  });
  return examSessions;
};

describe('watchCoachTurnSession', () => {
  it('returns follow_up_failed when the exam session is unknown', async () => {
    const result = await watchCoachTurnSession(stubCoach(), createExamSessionStore(), {
      sessionId: 'missing',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('follow_up_failed');
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('returns unchanged when the latest assistant text does not change', async () => {
    const complete = jest.fn(async () => '{"questionBrief":"不该调用","keyPoints":["x"]}');
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
        readLatestHuman: async () => ({ ok: true, text: '开始本场八股专项模拟面试。' }),
        complete,
      }),
      seedStore(),
      { sessionId: 'session-exam' },
    );
    expect(result).toEqual({ ok: true, status: 'unchanged' });
    expect(complete).not.toHaveBeenCalled();
  });

  it('appends a new card when the pending question changes', async () => {
    const complete = jest.fn(async (_system: string, user: string) => {
      expect(user).toContain('面试官当前问题：');
      expect(user).toContain('二级索引如何回表？');
      expect(user).not.toContain('扮演面试官');
      return '{"questionBrief":"二级索引回表","keyPoints":["先查二级再回聚簇"],"cardId":"Q2","relation":"next_topic"}';
    });
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
        readLatestHuman: async () => ({ ok: true, text: '开始本场八股专项模拟面试。' }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: '二级索引如何回表？',
        }),
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards).toHaveLength(2);
      expect(result.deck.cards[0]?.id).toBe('Q1');
      expect(result.deck.cards[0]?.questionBrief).toBe('第一问摘要');
      expect(result.deck.cards[1]?.id).toBe('Q2');
      expect(result.deck.cards[1]?.questionBrief).toBe('二级索引回表');
      expect(result.deck.cards[1]?.keyPoints).toEqual(['先查二级再回聚簇']);
      expect(result.deck.currentCardId).toBe('Q2');
    }
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe('二级索引如何回表？');
  });

  it('briefs the newer question if it arrives while the previous brief is running', async () => {
    const complete = jest.fn(async (_system: string, user: string) => {
      if (user.includes('Redisson 看门狗')) {
        return '{"questionBrief":"Redisson看门狗续期","keyPoints":["客户端续期"]}';
      }
      return '{"questionBrief":"WATCH与Lua","keyPoints":["单条命令原子"]}';
    });
    const awaitNewQuestion = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 'ready',
        text: '客户端 GET+SET 为何必须 WATCH 或 Lua？',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 'ready',
        text: 'Redisson 看门狗为什么在客户端续期？',
      })
      .mockResolvedValue({ ok: true, status: 'unchanged' });
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
        readLatestHuman: async () => ({ ok: true, text: '开始本场八股专项模拟面试。' }),
        awaitNewQuestion,
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.deck.cards).toHaveLength(2);
      expect(result.deck.cards[0]?.questionBrief).toBe('第一问摘要');
      expect(result.deck.cards[1]?.questionBrief).toBe('Redisson看门狗续期');
      expect(result.deck.cards[1]?.keyPoints).toEqual(['客户端续期']);
    }
    expect(complete).toHaveBeenCalledTimes(2);
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe(
      'Redisson 看门狗为什么在客户端续期？',
    );
  });

  it('keeps the previous cards when coach completion fails', async () => {
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
        readLatestHuman: async () => ({ ok: true, text: '开始本场八股专项模拟面试。' }),
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
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('coach_unavailable');
    }
    expect(examSessions.load('session-exam')?.deck.cards).toEqual(deck.cards);
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe('请说明聚簇索引。');
  });

  it('force-briefs the current pending card even when the fingerprint is unchanged', async () => {
    const complete = jest.fn(async () => '{"questionBrief":"强制刷新摘要","keyPoints":["强制刷新要点"]}');
    const awaitNewQuestion = jest.fn(async () => ({ ok: true as const, status: 'unchanged' as const }));
    const runtime = stubCoach({
      readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
      readLatestHuman: async () => ({ ok: true, text: '开始本场八股专项模拟面试。' }),
      awaitNewQuestion,
      complete,
    });
    const examSessions = seedStore();
    const watched = await watchCoachTurnSession(runtime, examSessions, { sessionId: 'session-exam' });
    expect(watched).toEqual({ ok: true, status: 'unchanged' });
    expect(complete).not.toHaveBeenCalled();

    const forced = await watchCoachTurnSession(runtime, examSessions, {
      sessionId: 'session-exam',
      force: true,
    });
    expect(forced.ok).toBe(true);
    if (forced.ok && forced.status === 'updated') {
      expect(forced.deck.cards).toHaveLength(1);
      expect(forced.deck.cards[0]?.id).toBe('Q1');
      expect(forced.deck.cards[0]?.questionBrief).toBe('强制刷新摘要');
      expect(forced.deck.cards[0]?.keyPoints).toEqual(['强制刷新要点']);
    }
    expect(complete).toHaveBeenCalledTimes(1);
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe('请说明聚簇索引。');
  });

  it('does not card the closing line and stays unchanged after the round ended', async () => {
    const complete = jest.fn(async () => '{"questionBrief":"不该调用","keyPoints":["x"]}');
    const examSessions = seedStore();
    const current = examSessions.load('session-exam');
    if (current === undefined) {
      throw new Error('missing exam record');
    }
    examSessions.save({
      ...current,
      ended: true,
      closingSeed: INTERVIEW_ROUND_END_TRIGGER,
    });
    const ended = await watchCoachTurnSession(
      stubCoach({
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: INTERVIEW_ROUND_CLOSING_LINE,
        }),
        complete,
      }),
      examSessions,
      { sessionId: 'session-exam' },
    );
    expect(ended).toEqual({ ok: true, status: 'unchanged' });
    expect(complete).not.toHaveBeenCalled();

    const live = seedStore();
    const closing = await watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({
          ok: true,
          text: INTERVIEW_ROUND_END_TRIGGER,
        }),
        awaitNewQuestion: async () => ({
          ok: true,
          status: 'ready',
          text: `好的，${INTERVIEW_ROUND_CLOSING_LINE}`,
        }),
        complete,
      }),
      live,
      { sessionId: 'session-exam' },
    );
    expect(closing).toEqual({ ok: true, status: 'unchanged' });
    expect(live.load('session-exam')?.deck.cards).toHaveLength(1);
    expect(complete).not.toHaveBeenCalled();
  });
});
