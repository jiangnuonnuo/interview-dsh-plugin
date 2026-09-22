/**
 * @jest-environment node
 */

import { attachInterviewerPersona, clearChainSection, clearRoundClosingSection, installChainSection, installRoundClosingSection } from '../src/infra/dsh/interviewer-persona.js';
import type { HostContext } from '../src/infra/dsh/adapter.js';

const createLiveSystemPrompt = () => {
  const section = jest.fn(function (this: { layers: { kind: string } }, payload: unknown) {
    if (this?.layers === undefined) {
      throw new TypeError("Cannot read properties of undefined (reading 'layers')");
    }
    return () => undefined;
  });
  return {
    layers: { kind: 'agent' },
    section,
  };
};

describe('attachInterviewerPersona', () => {
  it('installs deployment:persona on the created agent ctx, not the plugin root', () => {
    const systemPrompt = createLiveSystemPrompt();
    const pluginRootSection = jest.fn();
    const ctx = {
      provide: jest.fn(),
      agents: {
        get: (id: string) =>
          id === 'session-exam' ? { ctx: { systemPrompt } } : undefined,
      },
      systemPrompt: { section: pluginRootSection },
    } as unknown as HostContext;

    const result = attachInterviewerPersona(ctx, {
      sessionId: 'session-exam',
      text: '你是八股面试官。',
    });

    expect(result).toEqual({ ok: true });
    expect(systemPrompt.section).toHaveBeenCalledTimes(1);
    expect(systemPrompt.section).toHaveBeenCalledWith({
      name: 'deployment:persona',
      order: 0,
      text: '你是八股面试官。',
    });
    expect(pluginRootSection).not.toHaveBeenCalled();
  });

  it('returns inject_unavailable when the agent is not live', () => {
    const ctx = {
      provide: jest.fn(),
      agents: {
        get: () => undefined,
      },
    } as unknown as HostContext;

    const result = attachInterviewerPersona(ctx, {
      sessionId: 'missing',
      text: '你是八股面试官。',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('maps a Host section throw to inject_unavailable', () => {
    const ctx = {
      provide: jest.fn(),
      agents: {
        get: () => ({
          ctx: {
            systemPrompt: {
              section() {
                throw new TypeError("Cannot read properties of undefined (reading 'layers')");
              },
            },
          },
        }),
      },
    } as unknown as HostContext;

    const result = attachInterviewerPersona(ctx, {
      sessionId: 'session-exam',
      text: '你是八股面试官。',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
    }
  });

  it('installs deployment:round-close on the agent and disposes the previous closer', () => {
    const firstDispose = jest.fn();
    const secondDispose = jest.fn();
    const section = jest.fn(function (this: { layers?: { kind: string } }) {
      if (this?.layers === undefined) {
        throw new TypeError("Cannot read properties of undefined (reading 'layers')");
      }
    });
    section.mockReturnValueOnce(firstDispose);
    section.mockReturnValueOnce(secondDispose);
    const systemPrompt = {
      layers: { kind: 'agent' },
      section,
    };
    const ctx = {
      provide: jest.fn(),
      agents: {
        get: (id: string) =>
          id === 'session-exam' ? { ctx: { systemPrompt } } : undefined,
      },
    } as unknown as HostContext;

    const first = installRoundClosingSection(ctx, {
      sessionId: 'session-exam',
      text: '第一段收尾。',
    });
    const second = installRoundClosingSection(ctx, {
      sessionId: 'session-exam',
      text: '第二段收尾。',
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(systemPrompt.section).toHaveBeenCalledWith({
      name: 'deployment:round-close',
      order: 1,
      text: '第二段收尾。',
    });
    expect(firstDispose).toHaveBeenCalledTimes(1);
    clearRoundClosingSection('session-exam');
    expect(secondDispose).toHaveBeenCalledTimes(1);
  });

  it('installs interview:chain with the clipped text and disposes the previous chain', () => {
    const firstDispose = jest.fn();
    const secondDispose = jest.fn();
    const section = jest.fn(function (this: { layers?: { kind: string } }) {
      if (this?.layers === undefined) {
        throw new TypeError("Cannot read properties of undefined (reading 'layers')");
      }
    });
    section.mockReturnValueOnce(firstDispose);
    section.mockReturnValueOnce(secondDispose);
    const systemPrompt = {
      layers: { kind: 'agent' },
      section,
    };
    const ctx = {
      provide: jest.fn(),
      agents: {
        get: (id: string) =>
          id === 'session-exam' ? { ctx: { systemPrompt } } : undefined,
      },
    } as unknown as HostContext;

    const first = installChainSection(ctx, { sessionId: 'session-exam', text: '裁剪后的链' });
    const second = installChainSection(ctx, { sessionId: 'session-exam', text: '下一题的链' });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(systemPrompt.section).toHaveBeenLastCalledWith({
      name: 'interview:chain',
      order: 2,
      text: '下一题的链',
    });
    expect(firstDispose).toHaveBeenCalledTimes(1);
    clearChainSection('session-exam');
    expect(secondDispose).toHaveBeenCalledTimes(1);
  });

  it('maps a missing chain section host to inject_unavailable', () => {
    const ctx = {
      provide: jest.fn(),
      agents: { get: () => undefined },
    } as unknown as HostContext;
    const result = installChainSection(ctx, { sessionId: 'missing', text: '裁剪后的链' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
    }
  });
});
