/**
 * @jest-environment node
 */

import { createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import { emptyJevSecret, type JevConfigStore, type JevSecretConfig } from '../src/data/jev-config.js';
import { createJevCoveragePort, probeJevKey, JEV_ENDPOINT, JEV_MODEL } from '../src/infra/dsh/jev-coverage.js';
import { buildCoverageSettleInput } from '../src/services/coverage-port.js';

const memoryStore = (secret: JevSecretConfig): JevConfigStore => ({
  async loadPublic() {
    return {
      ok: true,
      enabled: secret.enabled,
      apiKeySet: secret.apiKey.length > 0,
    };
  },
  async loadSecret() {
    return secret;
  },
  async save() {
    return { ok: true, enabled: secret.enabled, apiKeySet: secret.apiKey.length > 0 };
  },
});

const pending = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '聚簇',
  keyPoints: ['叶子即行'],
});
const deck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [pending],
  currentCardId: 'Q1',
});
const input = buildCoverageSettleInput(deck, pending, deck.topic, deck.difficulty, '叶子存整行');

describe('jev coverage adapter', () => {
  it('does not fetch when the file is disabled even if an env key exists', async () => {
    process.env.TYPESAFE_API_KEY = 'env-secret';
    const fetch = jest.fn();
    const port = createJevCoveragePort(memoryStore(emptyJevSecret()), { fetch });
    await expect(port.settle(input)).resolves.toBe('unavailable');
    expect(fetch).not.toHaveBeenCalled();
    delete process.env.TYPESAFE_API_KEY;
  });

  it('posts jev-1.13.0 choice questions and maps a legal five-band', async () => {
    const fetch = jest.fn(async (url: string, init: { body: string; headers: Record<string, string> }) => {
      expect(url).toBe(JEV_ENDPOINT);
      const body = JSON.parse(init.body) as { model: string; state: { 当前卡: string } };
      expect(body.model).toBe(JEV_MODEL);
      expect(body.state.当前卡).toBe('Q1');
      expect(init.headers.Authorization).toBe('Bearer sk-live');
      expect(init.body).not.toContain('sk-live');
      return {
        ok: true,
        status: 200,
        async json() {
          return { answers: { coverage: { choice: 'deepen' } } };
        },
        async text() {
          return '';
        },
      };
    });
    const port = createJevCoveragePort(memoryStore({ enabled: true, apiKey: 'sk-live' }), { fetch });
    await expect(port.settle(input)).resolves.toBe('deepen');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable on http errors, illegal json, and abort', async () => {
    const httpPort = createJevCoveragePort(memoryStore({ enabled: true, apiKey: 'sk' }), {
      fetch: async () => ({
        ok: false,
        status: 401,
        async json() {
          return {};
        },
        async text() {
          return 'denied';
        },
      }),
    });
    await expect(httpPort.settle(input)).resolves.toBe('unavailable');

    const badPort = createJevCoveragePort(memoryStore({ enabled: true, apiKey: 'sk' }), {
      fetch: async () => ({
        ok: true,
        status: 200,
        async json() {
          return { answers: { coverage: { choice: 'nope' } } };
        },
        async text() {
          return '';
        },
      }),
    });
    await expect(badPort.settle(input)).resolves.toBe('unavailable');

    const late = new AbortController();
    const latePort = createJevCoveragePort(memoryStore({ enabled: true, apiKey: 'sk' }), {
      fetch: async (_url, init) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 40);
        });
        if (init.signal?.aborted) {
          throw new Error('AbortError');
        }
        return {
          ok: true,
          status: 200,
          async json() {
            return { answers: { coverage: { choice: 'deepen' } } };
          },
          async text() {
            return '';
          },
        };
      },
    });
    const pending = latePort.settle(input, late.signal);
    late.abort();
    await expect(pending).resolves.toBe('unavailable');
  });

  it('puts Q1 and Q1.1 into the request state when the current card is Q1.2', async () => {
    const q1 = createPendingCard({
      id: 'Q1',
      questionText: 'Q1 题干',
      questionBrief: 'Q1',
      keyPoints: ['一'],
    });
    const q1_1 = {
      ...createPendingCard({
        id: 'Q1.1',
        questionText: 'Q1.1 题干',
        questionBrief: 'Q1.1',
        keyPoints: ['二'],
      }),
      coverage: 'reask' as const,
      status: 'scored' as const,
      answer: '第一轮',
      answerTurns: ['第一轮'],
    };
    const q1_2 = createPendingCard({
      id: 'Q1.2',
      questionText: 'Q1.2 题干',
      questionBrief: 'Q1.2',
      keyPoints: ['三'],
    });
    const threadDeck = createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      cards: [{ ...q1, coverage: 'reask', status: 'scored', answer: 'a', answerTurns: ['a'] }, q1_1, q1_2],
      currentCardId: 'Q1.2',
    });
    const threadInput = buildCoverageSettleInput(
      threadDeck,
      q1_2,
      threadDeck.topic,
      threadDeck.difficulty,
      '当前作答',
    );
    const fetch = jest.fn(async (_url: string, init: { body: string }) => {
      const payload = JSON.parse(init.body) as {
        state: { 当前卡: string; 知识链: Array<{ 编号: string }> };
      };
      expect(payload.state.当前卡).toBe('Q1.2');
      expect(payload.state.知识链.map((card) => card.编号)).toEqual(['Q1', 'Q1.1', 'Q1.2']);
      return {
        ok: true,
        status: 200,
        async json() {
          return { answers: { coverage: { choice: 'next' } } };
        },
        async text() {
          return '';
        },
      };
    });
    const port = createJevCoveragePort(memoryStore({ enabled: true, apiKey: 'sk' }), { fetch });
    await expect(port.settle(threadInput)).resolves.toBe('next');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('probes connectivity without treating http errors as saved', async () => {
    const ok = jest.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {};
      },
      async text() {
        return '';
      },
    }));
    await expect(probeJevKey('sk-live', { fetch: ok })).resolves.toBe(true);
    expect(ok).toHaveBeenCalledTimes(1);

    const denied = jest.fn(async () => ({
      ok: false,
      status: 401,
      async json() {
        return {};
      },
      async text() {
        return 'denied';
      },
    }));
    await expect(probeJevKey('sk-bad', { fetch: denied })).resolves.toBe(false);
    await expect(probeJevKey('')).resolves.toBe(false);
  });
});
