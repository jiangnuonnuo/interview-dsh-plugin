/**
 * @jest-environment node
 */

import { emptyBaguaScores } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import type { CoachRuntime } from '../src/services/coach-brief.js';
import { watchCoachTurnSession } from '../src/services/watch-coach-turn.js';

const snapshot = {
  phase: 'in_progress' as const,
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid' as const,
  questionBrief: '第一问摘要',
  keyPoints: ['要点一'],
  scores: emptyBaguaScores(),
};

const seedStore = () => {
  const examSessions = createExamSessionStore();
  examSessions.save({
    sessionId: 'session-exam',
    topic: 'MySQL 索引与优化',
    difficulty: 'mid',
    lastQuestionText: '请说明聚簇索引。',
    snapshot,
  });
  return examSessions;
};

describe('watchCoachTurnSession', () => {
  it('returns follow_up_failed when the exam session is unknown', async () => {
    const runtime: CoachRuntime = {
      readLatestQuestion: async () => ({ ok: true, text: 'x' }),
      awaitNewQuestion: async () => ({ ok: true, status: 'unchanged' }),
      complete: async () => null,
    };
    const result = await watchCoachTurnSession(runtime, createExamSessionStore(), {
      sessionId: 'missing',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('follow_up_failed');
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('returns unchanged when the latest assistant text does not change', async () => {
    const runtime: CoachRuntime = {
      readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
      awaitNewQuestion: async () => ({ ok: true, status: 'unchanged' }),
      complete: async () => '{"questionBrief":"不该调用","keyPoints":["x"]}',
    };
    const result = await watchCoachTurnSession(runtime, seedStore(), { sessionId: 'session-exam' });
    expect(result).toEqual({ ok: true, status: 'unchanged' });
    expect(runtime.complete).toBeDefined();
  });

  it('briefs the new question and returns an updated snapshot', async () => {
    const complete = jest.fn(async (_system: string, user: string) => {
      expect(user).toContain('面试官当前问题：');
      expect(user).toContain('二级索引如何回表？');
      expect(user).not.toContain('扮演面试官');
      return '{"questionBrief":"二级索引回表","keyPoints":["先查二级再回聚簇"]}';
    });
    const runtime: CoachRuntime = {
      readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
      awaitNewQuestion: async () => ({
        ok: true,
        status: 'ready',
        text: '二级索引如何回表？',
      }),
      complete,
    };
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(runtime, examSessions, { sessionId: 'session-exam' });
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.snapshot.questionBrief).toBe('二级索引回表');
      expect(result.snapshot.keyPoints).toEqual(['先查二级再回聚簇']);
      expect(result.snapshot.scores.every((item) => item.score === null)).toBe(true);
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
    const runtime: CoachRuntime = {
      readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
      awaitNewQuestion,
      complete,
    };
    const examSessions = seedStore();
    const result = await watchCoachTurnSession(runtime, examSessions, { sessionId: 'session-exam' });
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'updated') {
      expect(result.snapshot.questionBrief).toBe('Redisson看门狗续期');
      expect(result.snapshot.keyPoints).toEqual(['客户端续期']);
    }
    expect(complete).toHaveBeenCalledTimes(2);
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe(
      'Redisson 看门狗为什么在客户端续期？',
    );
  });

  it('keeps the previous snapshot when coach completion fails', async () => {
    const examSessions = seedStore();
    const runtime: CoachRuntime = {
      readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
      awaitNewQuestion: async () => ({
        ok: true,
        status: 'ready',
        text: '二级索引如何回表？',
      }),
      complete: async () => null,
    };
    const result = await watchCoachTurnSession(runtime, examSessions, { sessionId: 'session-exam' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('coach_unavailable');
    }
    expect(examSessions.load('session-exam')?.snapshot).toEqual(snapshot);
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe('请说明聚簇索引。');
  });

  it('force-briefs the current pending question even when the fingerprint is unchanged', async () => {
    const complete = jest.fn(async () => '{"questionBrief":"强制刷新摘要","keyPoints":["强制刷新要点"]}');
    const awaitNewQuestion = jest.fn(async () => ({ ok: true as const, status: 'unchanged' as const }));
    const runtime: CoachRuntime = {
      readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
      awaitNewQuestion,
      complete,
    };
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
      expect(forced.snapshot.questionBrief).toBe('强制刷新摘要');
      expect(forced.snapshot.keyPoints).toEqual(['强制刷新要点']);
    }
    expect(complete).toHaveBeenCalledTimes(1);
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe('请说明聚簇索引。');
    expect(examSessions.load('session-exam')?.snapshot.questionBrief).toBe('强制刷新摘要');
  });
});
