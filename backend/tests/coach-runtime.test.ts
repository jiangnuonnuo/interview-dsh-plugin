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

    const question = await runtime.readLatestQuestion('session-exam');
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

    await expect(runtime.readLatestQuestion('session-exam')).resolves.toEqual({
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

    const question = await runtime.readLatestQuestion('session-exam');
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

  it('reads the latest assistant when two questions are in the log', async () => {
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: {
            deriveMessages: () => [
              {
                role: 'assistant',
                content: [{ type: 'text', text: '请说明聚簇索引。' }],
              },
              {
                role: 'user',
                content: [{ type: 'text', text: '叶子节点存行。' }],
              },
              {
                role: 'assistant',
                content: [{ type: 'text', text: '二级索引如何回表？' }],
              },
            ],
          },
        }),
      },
    });

    await expect(runtime.readLatestQuestion('session-exam')).resolves.toEqual({
      ok: true,
      text: '二级索引如何回表？',
    });
  });

  it('prefers session events when deriveMessages is still the first question', async () => {
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: {
            deriveMessages: () => [
              {
                role: 'assistant',
                content: [{ type: 'text', text: '请说明聚簇索引。' }],
              },
            ],
            events: [
              {
                type: 'assistant/message',
                data: {
                  message: {
                    content: [{ type: 'text', text: '请说明聚簇索引。' }],
                  },
                },
              },
              {
                type: 'assistant/message',
                data: {
                  message: {
                    content: [{ type: 'text', text: '覆盖索引如何避免回表？' }],
                  },
                },
              },
            ],
          },
        }),
      },
    });

    await expect(runtime.readLatestQuestion('session-exam')).resolves.toEqual({
      ok: true,
      text: '覆盖索引如何避免回表？',
    });
  });

  it('does not treat a running partial as the next question', async () => {
    const runtime = createHostCoachRuntime(
      {
        agents: {
          get: () => ({
            whenIdle: async () => undefined,
            status: 'running',
            session: {
              deriveMessages: () => [
                {
                  role: 'assistant',
                  content: [{ type: 'text', text: '请说明聚簇索引。' }],
                },
                {
                  role: 'assistant',
                  content: [{ type: 'text', text: '二级索引半句' }],
                },
              ],
            },
          }),
        },
      },
      { timeoutMs: 80, pollMs: 20 },
    );

    await expect(runtime.awaitNewQuestion('session-exam', '请说明聚簇索引。')).resolves.toEqual({
      ok: true,
      status: 'unchanged',
    });
  });

  it('reads the third question after two user answers', async () => {
    const q1 = 'Redis 单条命令为何天然原子？';
    const q2 = '客户端 GET+SET 为何必须 WATCH 或 Lua？';
    const q3 = 'Redisson 看门狗为什么在客户端续期？';
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: {
            events: [
              { type: 'user/message', data: { role: 'user', content: [{ type: 'text', text: '开始' }], source: { kind: 'user' } } },
              { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: q1 }], source: { kind: 'model' } } } },
              { type: 'user/message', data: { role: 'user', content: [{ type: 'text', text: '因为单线程。' }], source: { kind: 'user' } } },
              { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: q2 }], source: { kind: 'model' } } } },
              { type: 'user/message', data: { role: 'user', content: [{ type: 'text', text: '不知道，下一题' }], source: { kind: 'user' } } },
              { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: q3 }], source: { kind: 'model' } } } },
            ],
          },
        }),
      },
    });

    await expect(runtime.readLatestQuestion('session-exam')).resolves.toEqual({ ok: true, text: q3 });
    await expect(runtime.awaitNewQuestion('session-exam', q2)).resolves.toEqual({
      ok: true,
      status: 'ready',
      text: q3,
    });
  });

  it('uses streamed text-delta after the last user when deriveMessages is still the previous question', async () => {
    const q2 = '客户端 GET+SET 为何必须 WATCH 或 Lua？';
    const q3 = 'Redisson 看门狗为什么在客户端续期？';
    const runtime = createHostCoachRuntime(
      {
        agents: {
          get: () => ({
            whenIdle: async () => undefined,
            status: 'idle',
            session: {
              deriveMessages: () => [
                { role: 'assistant', content: [{ type: 'text', text: q2 }] },
              ],
              events: [
                { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: q2 }], source: { kind: 'model' } } } },
                { type: 'user/message', data: { role: 'user', content: [{ type: 'text', text: '不知道，下一题' }], source: { kind: 'user' } } },
                { type: 'assistant/chunk', data: { chunk: { type: 'text-delta', text: q3 } } },
              ],
            },
          }),
        },
      },
      { timeoutMs: 80, pollMs: 20 },
    );

    await expect(runtime.awaitNewQuestion('session-exam', q2)).resolves.toEqual({
      ok: true,
      status: 'ready',
      text: q3,
    });
  });

  it('ignores a later plugin assistant and keeps the interviewer question', async () => {
    const q3 = 'Redisson 看门狗为什么在客户端续期？';
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: {
            events: [
              { type: 'user/message', data: { role: 'user', content: [{ type: 'text', text: '不知道' }], source: { kind: 'user' } } },
              {
                type: 'assistant/message',
                data: {
                  message: {
                    role: 'assistant',
                    content: [{ type: 'text', text: q3 }],
                    source: { kind: 'model' },
                  },
                },
              },
              {
                type: 'assistant/message',
                data: {
                  message: {
                    role: 'assistant',
                    content: [{ type: 'text', text: '{"questionBrief":"旧题"}' }],
                    source: { kind: 'plugin', plugin: 'interview-dsh' },
                  },
                },
              },
            ],
          },
        }),
      },
    });

    await expect(runtime.readLatestQuestion('session-exam')).resolves.toEqual({ ok: true, text: q3 });
  });

  it('waits until idle after a new streamed question appears', async () => {
    const q2 = '客户端 GET+SET 为何必须 WATCH 或 Lua？';
    const q3 = 'Redisson 看门狗为什么在客户端续期？';
    let status: 'idle' | 'running' = 'running';
    const events: unknown[] = [
      { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: q2 }], source: { kind: 'model' } } } },
      { type: 'user/message', data: { role: 'user', content: [{ type: 'text', text: '不知道，下一题' }], source: { kind: 'user' } } },
      { type: 'assistant/chunk', data: { chunk: { type: 'text-delta', text: q3 } } },
    ];
    const runtime = createHostCoachRuntime(
      {
        agents: {
          get: () => ({
            whenIdle: async () => {
              await new Promise((resolve) => {
                setTimeout(resolve, 30);
              });
              status = 'idle';
              events.push({
                type: 'assistant/message',
                data: {
                  message: { role: 'assistant', content: [{ type: 'text', text: q3 }], source: { kind: 'model' } },
                },
              });
            },
            get status() {
              return status;
            },
            session: { events },
          }),
        },
      },
      { timeoutMs: 200, pollMs: 20 },
    );

    await expect(runtime.awaitNewQuestion('session-exam', q2)).resolves.toEqual({
      ok: true,
      status: 'ready',
      text: q3,
    });
  });

  it('maps a missing question log reader to follow_up_failed', async () => {
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: {},
        }),
      },
    });

    const result = await runtime.awaitNewQuestion('session-exam', 'Q1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('follow_up_failed');
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  /**
   * Desktop 第 5 轮：面试官同一气泡先点评页分裂/磁盘 I/O，再抛出联合索引待答问。
   * 现行实现把整段助手文本当题干，教练会跟着讲评走；面板必须只对齐待答问。
   */
  it('uses only the pending question when the interviewer lectures then asks', async () => {
    const previous = 'InnoDB 页分裂后物理数据如何存储，对磁盘 I/O 有什么影响？';
    const pending = '联合索引 (col_a, col_b) 在什么查询条件下最左匹配会失效？';
    const mixed = [
      '你刚才说没影响，这个判断不准确。',
      'InnoDB 页分裂后新页往往不与原页连续，范围扫描会变成更多随机读，放大磁盘 I/O。',
      pending,
    ].join('\n\n');
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: {
            events: [
              {
                type: 'user/message',
                data: { role: 'user', content: [{ type: 'text', text: '没影响' }], source: { kind: 'user' } },
              },
              {
                type: 'assistant/message',
                data: {
                  message: {
                    role: 'assistant',
                    content: [{ type: 'text', text: mixed }],
                    source: { kind: 'model' },
                  },
                },
              },
            ],
          },
        }),
      },
    });

    await expect(runtime.readLatestQuestion('session-exam')).resolves.toEqual({
      ok: true,
      text: pending,
    });
    await expect(runtime.awaitNewQuestion('session-exam', previous)).resolves.toEqual({
      ok: true,
      status: 'ready',
      text: pending,
    });
  });

  it('reads the opening seed then the later human answer', async () => {
    const events = [
      {
        type: 'user/message',
        data: {
          role: 'user',
          content: [{ type: 'text', text: '开始本场八股专项模拟面试。请按人设先说明主题与难度，然后只问第一个问题。' }],
          source: { kind: 'user' },
        },
      },
      {
        type: 'assistant/message',
        data: {
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: '请说明 InnoDB 聚簇索引和二级索引的区别。' }],
            source: { kind: 'model' },
          },
        },
      },
    ];
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: { events },
        }),
      },
    });
    await expect(runtime.readLatestHuman('session-exam')).resolves.toEqual({
      ok: true,
      text: '开始本场八股专项模拟面试。请按人设先说明主题与难度，然后只问第一个问题。',
    });
    events.push({
      type: 'user/message',
      data: {
        role: 'user',
        content: [{ type: 'text', text: '叶子节点存行。' }],
        source: { kind: 'user' },
      },
    });
    await expect(runtime.readLatestHuman('session-exam')).resolves.toEqual({
      ok: true,
      text: '叶子节点存行。',
    });
  });

  it('skips plugin-sourced user text when reading the latest human', async () => {
    const runtime = createHostCoachRuntime({
      agents: {
        get: () => ({
          whenIdle: async () => undefined,
          status: 'idle',
          session: {
            events: [
              {
                type: 'user/message',
                data: {
                  role: 'user',
                  content: [{ type: 'text', text: '插件催问' }],
                  source: { kind: 'plugin' },
                },
              },
              {
                type: 'user/message',
                data: {
                  role: 'user',
                  content: [{ type: 'text', text: '叶子节点存行。' }],
                  source: { kind: 'user' },
                },
              },
            ],
          },
        }),
      },
    });
    await expect(runtime.readLatestHuman('session-exam')).resolves.toEqual({
      ok: true,
      text: '叶子节点存行。',
    });
  });
});
