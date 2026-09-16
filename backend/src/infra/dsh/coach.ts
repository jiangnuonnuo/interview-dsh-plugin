import { INTERVIEW_SESSION_ERROR_MESSAGES } from 'interview-dsh-shared';
import type { CoachRuntime } from '../../services/coach-brief.js';

const PLUGIN_ID = 'interview-dsh';
const FIRST_QUESTION_TIMEOUT_MS = 90_000;
const FIRST_QUESTION_POLL_MS = 300;

interface CoachHostSession {
  snapshotEvents?: () => readonly unknown[];
  deriveMessages?: () => readonly unknown[];
}

interface CoachHostAgent {
  whenIdle(): Promise<void>;
  readonly session: CoachHostSession;
}

export interface CoachHostContext {
  readonly agents?: {
    get(sessionId: string): unknown;
  };
  readonly llm?: {
    stream(options: {
      provider: string;
      model: string;
      system: string;
      messages: readonly unknown[];
    }): AsyncIterable<{ type?: string; text?: string; reason?: { kind?: string; failure?: { message?: string } } }>;
  };
  readonly agentDefaultModel?: {
    currentSelection(): { provider?: string; model?: string };
  };
}

const firstQuestionFailed = () =>
  ({
    ok: false as const,
    code: 'first_question_failed' as const,
    message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed,
  });

const textFromContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((block) => {
      if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block) {
        return String(block.text ?? '');
      }
      return '';
    })
    .join('')
    .trim();
};

const firstAssistantText = (items: readonly unknown[]): string => {
  for (const item of items) {
    if (item === null || typeof item !== 'object') {
      continue;
    }
    const record = item as { type?: string; role?: string; content?: unknown; data?: Record<string, unknown> };
    if (record.role === 'assistant') {
      const text = textFromContent(record.content);
      if (text.length > 0) {
        return text;
      }
    }
    if (record.type !== 'assistant/message') {
      continue;
    }
    const data = record.data ?? {};
    const message = data.message as { content?: unknown } | undefined;
    const text = textFromContent(message?.content ?? data.content);
    if (text.length > 0) {
      return text;
    }
  }
  return '';
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Desktop 0.2.17 实际加载的 bundled `dsh-session` 只有 `deriveMessages()`。
 * Application Support 里的 0.1.5-rc.1 类型才有 `snapshotEvents()`。两者都按鸭子类型读。
 */
const readSessionItems = (session: CoachHostSession): readonly unknown[] => {
  if (typeof session.snapshotEvents === 'function') {
    return session.snapshotEvents();
  }
  if (typeof session.deriveMessages === 'function') {
    return session.deriveMessages();
  }
  return [];
};

/**
 * Host symbols checked on Desktop 0.2.17 bundled harness:
 * - agents.get(id).whenIdle
 * - agent.session.deriveMessages() or snapshotEvents() (first assistant)
 * - llm.stream + agentDefaultModel.currentSelection
 * No current-conversation inject, in-place history cut, or silent assistant-first API.
 */
const asCoachAgent = (value: unknown): CoachHostAgent | undefined => {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const agent = value as Partial<CoachHostAgent>;
  if (typeof agent.whenIdle !== 'function' || agent.session === undefined) {
    return undefined;
  }
  return agent as CoachHostAgent;
};

export const createHostCoachRuntime = (ctx: CoachHostContext): CoachRuntime => ({
  async readFirstQuestion(sessionId) {
    const agent = asCoachAgent(ctx.agents?.get(sessionId));
    if (agent === undefined) {
      return {
        ok: false,
        code: 'inject_unavailable',
        message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
      };
    }

    try {
      const deadline = Date.now() + FIRST_QUESTION_TIMEOUT_MS;
      const idle = agent.whenIdle().then(
        () => undefined,
        () => undefined,
      );
      let idleDone = false;
      void idle.then(() => {
        idleDone = true;
      });

      while (Date.now() < deadline) {
        const text = firstAssistantText(readSessionItems(agent.session));
        if (text.length > 0 && idleDone) {
          return { ok: true, text };
        }
        const wait = Math.min(FIRST_QUESTION_POLL_MS, deadline - Date.now());
        if (wait <= 0) {
          break;
        }
        await Promise.race([idle, sleep(wait)]);
      }

      const text = firstAssistantText(readSessionItems(agent.session));
      if (text.length > 0) {
        return { ok: true, text };
      }
      return firstQuestionFailed();
    } catch {
      return firstQuestionFailed();
    }
  },
  async complete(system, user) {
    const llm = ctx.llm;
    const selection = ctx.agentDefaultModel?.currentSelection();
    if (typeof llm?.stream !== 'function' || !selection?.provider || !selection.model) {
      return null;
    }

    const messages = [
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: user }],
        source: { kind: 'plugin', plugin: PLUGIN_ID },
      },
    ];

    let text = '';
    let failed = false;
    try {
      for await (const chunk of llm.stream({
        provider: selection.provider,
        model: selection.model,
        system,
        messages,
      })) {
        if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
          text += chunk.text;
        }
        if (
          chunk.type === 'finish' &&
          (chunk.reason?.kind === 'error' || chunk.reason?.kind === 'aborted')
        ) {
          failed = true;
        }
      }
    } catch {
      return null;
    }

    const trimmed = text.trim();
    if (failed || trimmed.length === 0) {
      return null;
    }
    return trimmed;
  },
});
