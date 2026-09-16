/**
 * @jest-environment node
 */

import { createHostCoachRuntime } from '../src/infra/dsh/coach.js';

const assistantEvent = {
  type: 'assistant/message',
  data: {
    message: {
      content: [{ type: 'text', text: '请说明 InnoDB 聚簇索引和二级索引的区别。' }],
    },
  },
};

describe('createHostCoachRuntime', () => {
  it('reads the first assistant message after the agent is idle', async () => {
    const append = jest.fn();
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          session: {
            snapshotEvents: () => [assistantEvent],
            append,
          },
        }),
      },
    });

    const question = await runtime.readFirstQuestion('session-exam');
    expect(question).toEqual({
      ok: true,
      text: '请说明 InnoDB 聚簇索引和二级索引的区别。',
    });
    expect(append).not.toHaveBeenCalled();
  });

  it('reads the first assistant from deriveMessages when snapshotEvents is absent', async () => {
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          session: {
            deriveMessages: () => [
              {
                role: 'assistant',
                content: [{ type: 'text', text: '请对比聚簇索引和二级索引。' }],
              },
            ],
          },
        }),
      },
    });

    await expect(runtime.readFirstQuestion('session-exam')).resolves.toEqual({
      ok: true,
      text: '请对比聚簇索引和二级索引。',
    });
  });

  it('maps a throwing session log read to first_question_failed', async () => {
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          session: {
            snapshotEvents: () => {
              throw new Error('agent.session.snapshotEvents is not a function');
            },
          },
        }),
      },
    });

    const question = await runtime.readFirstQuestion('session-exam');
    expect(question.ok).toBe(false);
    if (!question.ok) {
      expect(question.code).toBe('first_question_failed');
    }
  });

  it('returns coach_unavailable text as null when llm.stream is missing', async () => {
    const runtime = createHostCoachRuntime({
      agents: { get: () => undefined },
    });
    expect(await runtime.complete('system', 'user')).toBeNull();
  });

  it('streams coach text without appending to the exam session', async () => {
    const append = jest.fn();
    const stream = jest.fn(async function* () {
      yield { type: 'text-delta', text: '{"questionBrief":"聚簇 vs 二级","keyPoints":["回表"]}' };
      yield { type: 'finish', reason: { kind: 'stop' } };
    });
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          session: { snapshotEvents: () => [assistantEvent], append },
        }),
      },
      llm: { stream },
      agentDefaultModel: {
        currentSelection: () => ({ provider: 'local', model: 'step-3.7-flash' }),
      },
    });

    const text = await runtime.complete('教练 system', '教练 user');
    expect(text).toContain('questionBrief');
    expect(append).not.toHaveBeenCalled();
    expect(stream).toHaveBeenCalledTimes(1);
    const options = stream.mock.calls[0][0];
    expect(options.system).toBe('教练 system');
    expect(options.model).toBe('step-3.7-flash');
  });
});
