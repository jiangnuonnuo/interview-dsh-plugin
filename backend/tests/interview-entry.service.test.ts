/**
 * @jest-environment node
 */

import { BAGUA_SCORE_DIMENSIONS, JEV_CONFIG_ERROR_MESSAGES } from 'interview-dsh-shared';
import { createEntryConfigStore } from '../src/data/entry-config-store.js';
import { emptyJevSecret, type JevConfigStore, type JevSecretConfig } from '../src/data/jev-config.js';
import { createInterviewEntryService } from '../src/services/interview-entry.service.js';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import { createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import { chainBrief } from './chain-json.js';

const memoryJev = (secret: JevSecretConfig, writes: unknown[] = []): JevConfigStore => ({
  async loadPublic() {
    return { ok: true, enabled: secret.enabled, apiKeySet: secret.apiKey.length > 0 };
  },
  async loadSecret() {
    return secret;
  },
  async save(input) {
    writes.push(input);
    return { ok: true, enabled: input.enabled, apiKeySet: (input.apiKey ?? secret.apiKey).length > 0 };
  },
});

const mysqlRequest = {
  topicId: 'mysql',
  customTopic: '',
  difficulty: 'mid' as const,
};

describe('interview-entry.service', () => {
  it('shares one in-flight watch task for concurrent callers', async () => {
    let release: (value: string) => void = () => undefined;
    const complete = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
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
        cards: [
          createPendingCard({
            id: 'Q1',
            questionText: '请说明聚簇索引。',
            questionBrief: '聚簇',
            keyPoints: ['叶子即行'],
            seedUserText: '开始本场八股专项模拟面试。',
          }),
        ],
        currentCardId: 'Q1',
      }),
    });
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      { install: () => ({ ok: true as const }) },
      {
        readLatestQuestion: async () => ({ ok: true as const, text: '请说明聚簇索引。' }),
        readLatestHuman: async () => ({ ok: true as const, text: '叶子节点存整行。' }),
        awaitNewQuestion: async () => ({ ok: true as const, status: 'ready' as const, text: '二级索引如何回表？' }),
        complete,
      },
      examSessions,
    );
    const first = service.watchCoachTurn({ sessionId: 'session-exam' });
    const second = service.watchCoachTurn({ sessionId: 'session-exam' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(complete).toHaveBeenCalledTimes(1);
    release(
      JSON.stringify({
        coverage: 'next',
        covered: ['叶子即行'],
        missed: [],
        comment: '已覆盖',
        scores: ['基础扎实度', '原理理解', '场景迁移', '深度边界', '表达清晰度'].map((dimension) => ({
          dimension,
          score: 3,
        })),
      }),
    );
    await Promise.all([first, second]);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('reuses a completed result briefly but starts a new version for a new guided answer', async () => {
    let human = '不会。';
    const complete = jest.fn(async () => JSON.stringify({
      coverage: 'miss',
      covered: [],
      missed: ['叶子即行'],
      comment: '继续引导',
      scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 1 })),
    }));
    const examSessions = createExamSessionStore();
    examSessions.save({
      sessionId: 'session-exam',
      topic: 'MySQL',
      difficulty: 'mid',
      lastQuestionText: '请说明聚簇索引。',
      deck: createInterviewDeck({
        sessionId: 'session-exam',
        topic: 'MySQL',
        difficulty: 'mid',
        cards: [createPendingCard({
          id: 'Q1',
          questionText: '请说明聚簇索引。',
          questionBrief: '聚簇',
          keyPoints: ['叶子即行'],
          seedUserText: '开始本场八股专项模拟面试。',
        })],
        currentCardId: 'Q1',
      }),
    });
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      { install: () => ({ ok: true as const }) },
      {
        readLatestQuestion: async () => ({ ok: true as const, text: '请说明聚簇索引。' }),
        readLatestHuman: async () => ({ ok: true as const, text: human }),
        awaitNewQuestion: async () => ({ ok: true as const, status: 'unchanged' as const }),
        complete,
      },
      examSessions,
    );
    await service.watchCoachTurn({ sessionId: 'session-exam' });
    await service.watchCoachTurn({ sessionId: 'session-exam' });
    expect(complete).toHaveBeenCalledTimes(1);
    human = '还是不会。';
    await service.watchCoachTurn({ sessionId: 'session-exam' });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('caches a completed brief for the same question fingerprint', async () => {
    const complete = jest.fn(async () => JSON.stringify({
      questionBrief: '聚簇索引',
      keyPoints: ['叶子即行'],
      pointName: '聚簇索引',
      layer: 'define',
      intent: '说明叶子节点内容',
      moves: { deep: '继续', partial: '补充', miss: '提示' },
    }));
    const examSessions = createExamSessionStore();
    examSessions.save({
      sessionId: 'session-exam',
      topic: 'MySQL',
      difficulty: 'mid',
      lastQuestionText: '请说明聚簇索引。',
      deck: createInterviewDeck({
        sessionId: 'session-exam',
        topic: 'MySQL',
        difficulty: 'mid',
        cards: [createPendingCard({
          id: 'Q1',
          questionText: '请说明聚簇索引。',
          questionBrief: '旧摘要',
          keyPoints: ['旧要点'],
        })],
        currentCardId: 'Q1',
      }),
    });
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      { install: () => ({ ok: true as const }) },
      {
        readLatestQuestion: async () => ({ ok: true as const, text: '请说明聚簇索引。' }),
        readLatestHuman: async () => ({ ok: true as const, text: '' }),
        awaitNewQuestion: async () => ({ ok: true as const, status: 'unchanged' as const }),
        complete,
      },
      examSessions,
    );
    await service.watchCoachTurn({ sessionId: 'session-exam', force: true });
    await service.watchCoachTurn({ sessionId: 'session-exam' });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('aborts the active evaluation when the round ends', async () => {
    let release: (value: string) => void = () => undefined;
    let completeCalls = 0;
    const examSessions = createExamSessionStore();
    examSessions.save({
      sessionId: 'session-exam',
      topic: 'MySQL',
      difficulty: 'mid',
      lastQuestionText: '题目',
      deck: createInterviewDeck({
        sessionId: 'session-exam',
        topic: 'MySQL',
        difficulty: 'mid',
        cards: [createPendingCard({ id: 'Q1', questionText: '题目', questionBrief: '题目', keyPoints: [] })],
        currentCardId: 'Q1',
      }),
    });
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      { install: () => ({ ok: true as const }) },
      {
        readLatestQuestion: async () => ({ ok: true as const, text: '题目' }),
        readLatestHuman: async () => ({ ok: true as const, text: '回答' }),
        awaitNewQuestion: async () => ({ ok: true as const, status: 'unchanged' as const }),
        complete: async () => {
          completeCalls += 1;
          if (completeCalls > 1) return '继续复习基础知识。';
          return new Promise((resolve) => { release = resolve; });
        },
      },
      examSessions,
    );
    const watching = service.watchCoachTurn({ sessionId: 'session-exam' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const ended = await service.endRound({ sessionId: 'session-exam' });
    expect(ended.ended).toBe(true);
    release('{}');
    const result = await watching;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('evaluation_cancelled');
    expect(examSessions.load('session-exam')?.ended).toBe(true);
  });

  it('returns a preview immediately and force refresh replaces a stuck enrichment', async () => {
    const examSessions = createExamSessionStore();
    examSessions.save({
      sessionId: 'session-exam',
      topic: 'MySQL',
      difficulty: 'mid',
      lastQuestionText: '旧题',
      deck: createInterviewDeck({
        sessionId: 'session-exam',
        topic: 'MySQL',
        difficulty: 'mid',
        cards: [{
          ...createPendingCard({ id: 'Q1', questionText: '旧题', questionBrief: '旧题', keyPoints: ['旧要点'] }),
          status: 'scored',
          coverage: 'next',
          answer: '已答',
          answerTurns: ['已答'],
          comparison: { covered: [], missed: [], comment: '已评' },
        }],
        currentCardId: 'Q1',
      }),
    });
    let calls = 0;
    const complete = jest.fn(async (_system: string, user: string, signal?: AbortSignal) => {
      calls += 1;
      if (calls === 1) {
        return new Promise<string | null>((resolve) => {
          signal?.addEventListener('abort', () => resolve(null), { once: true });
        });
      }
      return chainBrief({ questionBrief: '新题摘要', keyPoints: ['新题要点'] });
    });
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      { install: () => ({ ok: true as const }) },
      {
        readLatestQuestion: async () => ({ ok: true as const, text: '新题' }),
        readLatestHuman: async () => ({ ok: true as const, text: '已答' }),
        awaitNewQuestion: async () => ({ ok: true as const, status: 'ready' as const, text: '新题' }),
        complete,
      },
      examSessions,
    );

    const preview = await service.watchCoachTurn({ sessionId: 'session-exam' });
    expect(preview.ok).toBe(true);
    if (preview.ok && preview.status === 'updated') {
      expect(preview.deck.cards[1]?.evaluation?.stage).toBe('preview_ready');
    }
    const retried = await service.watchCoachTurn({ sessionId: 'session-exam', force: true });
    expect(retried.ok).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(complete).toHaveBeenCalledTimes(2);
    expect(examSessions.load('session-exam')?.deck.cards[1]?.evaluation?.stage).toBe('brief_ready');
  });

  it('saves a preset topic and mid difficulty', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig(mysqlRequest);
    expect(result).toEqual({
      ok: true,
      config: {
        topic: 'MySQL 索引与优化',
        difficulty: 'mid',
        topicKind: 'preset',
        topicId: 'mysql',
      },
    });
    expect(service.getEntryConfig().config).toEqual(result.ok ? result.config : null);
  });

  it('returns topic_required when no topic is selected', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig({
      topicId: null,
      customTopic: '',
      difficulty: 'mid',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('topic_required');
      expect(result.message.length).toBeGreaterThan(0);
    }
    expect(service.getEntryConfig().config).toBeNull();
  });

  it('returns custom_topic_empty when custom topic is blank', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig({
      topicId: 'custom',
      customTopic: '   ',
      difficulty: 'senior',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('custom_topic_empty');
    }
    expect(service.getEntryConfig().config).toBeNull();
  });

  it('returns invalid_difficulty for an unknown difficulty', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig({
      topicId: 'mysql',
      customTopic: '',
      difficulty: 'expert' as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_difficulty');
    }
  });

  it('attaches assembled persona text through the installer', () => {
    const install = jest.fn(() => ({ ok: true as const }));
    const service = createInterviewEntryService(createEntryConfigStore(), {
      install,
    });
    const result = service.attachInterviewer({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
    });
    expect(result).toEqual({ ok: true });
    expect(install).toHaveBeenCalledTimes(1);
    const [sessionId, text] = install.mock.calls[0];
    expect(sessionId).toBe('session-exam');
    expect(text).toContain('MySQL 索引与优化');
    expect(text).toContain('八股专项');
    expect(text).not.toMatch(/标准答要点/);
  });

  it('does not write the key when Jev probe fails', async () => {
    const writes: unknown[] = [];
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      {
        jevConfig: memoryJev(emptyJevSecret(), writes),
        probeJev: async () => false,
      },
    );
    const result = await service.saveJevConfig({ enabled: true, apiKey: 'sk-bad' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('jev_unreachable');
      expect(result.message).toBe(JEV_CONFIG_ERROR_MESSAGES.jev_unreachable);
    }
    expect(writes).toHaveLength(0);
  });

  it('writes the key only after a successful probe', async () => {
    const writes: unknown[] = [];
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      {
        jevConfig: memoryJev(emptyJevSecret(), writes),
        probeJev: async () => true,
      },
    );
    const result = await service.saveJevConfig({ enabled: true, apiKey: 'sk-live' });
    expect(result).toEqual({ ok: true, enabled: true, apiKeySet: true });
    expect(writes).toEqual([{ enabled: true, apiKey: 'sk-live' }]);
  });

  it('reuses a successful Jev probe for the same configuration', async () => {
    const writes: unknown[] = [];
    const probeJev = jest.fn(async () => true);
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      {
        jevConfig: memoryJev(emptyJevSecret(), writes),
        probeJev,
      },
    );
    await service.saveJevConfig({ enabled: true, apiKey: 'sk-live' });
    await service.saveJevConfig({ enabled: true, apiKey: 'sk-live' });
    expect(probeJev).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(2);
  });

  it('does not probe when turning Jev off', async () => {
    const writes: unknown[] = [];
    const probeJev = jest.fn(async () => true);
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      {
        jevConfig: memoryJev({ enabled: true, apiKey: 'sk-kept' }, writes),
        probeJev,
      },
    );
    const result = await service.saveJevConfig({ enabled: false });
    expect(result).toEqual({ ok: true, enabled: false, apiKeySet: true });
    expect(probeJev).not.toHaveBeenCalled();
    expect(writes).toEqual([{ enabled: false, apiKey: 'sk-kept' }]);
  });
});
