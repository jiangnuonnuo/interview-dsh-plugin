import { INTERVIEW_SESSION_ERROR_MESSAGES } from 'interview-dsh-shared';
import type {
  AwaitNewQuestionOptions,
  AwaitNewQuestionResult,
  CoachQuestionFailure,
  CoachRuntime,
} from '../../services/coach-brief.js';
import { extractPendingQuestion } from '../../services/pending-question.js';

const PLUGIN_ID = 'interview-dsh';
const FIRST_QUESTION_TIMEOUT_MS = 90_000;
const FIRST_QUESTION_POLL_MS = 300;
const WATCH_TIMEOUT_MS = 20_000;
const WATCH_POLL_MS = 300;

interface CoachHostSession {
  snapshotEvents?: () => readonly unknown[];
  deriveMessages?: () => readonly unknown[];
  readonly events?: readonly unknown[];
}

interface CoachHostAgent {
  whenIdle(): Promise<void>;
  readonly session: CoachHostSession;
  readonly status?: 'idle' | 'running' | string;
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

const firstQuestionFailed = (): CoachQuestionFailure => ({
  ok: false,
  code: 'first_question_failed',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed,
});

const followUpFailed = (): CoachQuestionFailure => ({
  ok: false,
  code: 'follow_up_failed',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
});

const injectUnavailable = (): CoachQuestionFailure => ({
  ok: false,
  code: 'inject_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
});

const sourceKind = (item: unknown): string | undefined => {
  if (item === null || typeof item !== 'object') {
    return undefined;
  }
  const record = item as {
    source?: { kind?: string };
    data?: { source?: { kind?: string }; message?: { source?: { kind?: string } } };
  };
  return record.source?.kind ?? record.data?.source?.kind ?? record.data?.message?.source?.kind;
};

const isHumanUser = (item: unknown): boolean => {
  if (item === null || typeof item !== 'object') {
    return false;
  }
  const kind = sourceKind(item);
  if (kind === 'tool' || kind === 'plugin') {
    return false;
  }
  const record = item as { role?: string; type?: string };
  return record.role === 'user' || record.type === 'user/message';
};

const visibleTextFromContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((block) => {
      if (block === null || typeof block !== 'object') {
        return '';
      }
      const record = block as { type?: string; text?: unknown };
      if (record.type === 'reasoning') {
        return '';
      }
      if (typeof record.text === 'string') {
        return record.text;
      }
      return '';
    })
    .join('')
    .trim();
};

const assistantMessageText = (item: unknown): string => {
  if (item === null || typeof item !== 'object' || sourceKind(item) === 'plugin') {
    return '';
  }
  const record = item as { type?: string; role?: string; content?: unknown; data?: Record<string, unknown> };
  if (record.role === 'assistant') {
    return visibleTextFromContent(record.content);
  }
  if (record.type !== 'assistant/message') {
    return '';
  }
  const data = record.data ?? {};
  const message = data.message as { content?: unknown } | undefined;
  return visibleTextFromContent(message?.content ?? data.content);
};

const chunkDelta = (item: unknown): string => {
  if (item === null || typeof item !== 'object') {
    return '';
  }
  const record = item as { type?: string; data?: { chunk?: { type?: string; text?: unknown } } };
  if (record.type !== 'assistant/chunk') {
    return '';
  }
  const chunk = record.data?.chunk;
  if (chunk?.type !== 'text-delta' || typeof chunk.text !== 'string') {
    return '';
  }
  return chunk.text;
};

/**
 * 面板要对齐「当前待答问」：最后一条人类用户之后的面试官可见文本，再抽出问句。
 * 宿主气泡来自 append-only events（含 text-delta）；deriveMessages 是模型面，可能还停在上一问。
 */
const currentQuestionText = (items: readonly unknown[]): string => {
  let lastHuman = -1;
  for (let index = 0; index < items.length; index += 1) {
    if (isHumanUser(items[index])) {
      lastHuman = index;
    }
  }
  let committed = '';
  let streamed = '';
  for (let index = lastHuman + 1; index < items.length; index += 1) {
    const item = items[index];
    const messageText = assistantMessageText(item);
    if (messageText.length > 0) {
      committed = messageText;
      streamed = '';
      continue;
    }
    streamed += chunkDelta(item);
  }
  const raw = committed.length > 0 ? committed : streamed.trim();
  return extractPendingQuestion(raw);
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/**
 * Desktop 0.2.17 bundled `dsh-session` 以 `events` 为人类对话日志；`deriveMessages()` 是模型面投影。
 * Application Support 里的 0.1.5-rc.1 类型才有 `snapshotEvents()`。按鸭子类型都认，优先 events。
 */
const readCurrentQuestion = (session: CoachHostSession): string => {
  const sources: Array<readonly unknown[]> = [];
  if (Array.isArray(session.events) && session.events.length > 0) {
    sources.push(session.events);
  }
  if (typeof session.snapshotEvents === 'function') {
    sources.push(session.snapshotEvents());
  }
  if (typeof session.deriveMessages === 'function') {
    sources.push(session.deriveMessages());
  }
  for (const items of sources) {
    const text = currentQuestionText(items);
    if (text.length > 0) {
      return text;
    }
  }
  return '';
};

const hasQuestionLogReader = (session: CoachHostSession): boolean =>
  typeof session.snapshotEvents === 'function' ||
  typeof session.deriveMessages === 'function' ||
  Array.isArray(session.events);

/**
 * Host symbols checked on Desktop 0.2.17 bundled harness:
 * - agents.get(id).whenIdle
 * - agents.get(id).status (idle | running)
 * - agent.session.events / deriveMessages() / snapshotEvents() (question after last human user)
 * - llm.stream + agentDefaultModel.currentSelection
 * TODO: no dedicated follow-up event; watchCoachTurn polls current question text.
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

export const createHostCoachRuntime = (
  ctx: CoachHostContext,
  options: AwaitNewQuestionOptions = {},
): CoachRuntime => ({
  async readLatestQuestion(sessionId) {
    const agent = asCoachAgent(ctx.agents?.get(sessionId));
    if (agent === undefined) {
      return injectUnavailable();
    }
    if (!hasQuestionLogReader(agent.session)) {
      return firstQuestionFailed();
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
        const text = readCurrentQuestion(agent.session);
        if (text.length > 0 && idleDone) {
          return { ok: true, text };
        }
        const wait = Math.min(FIRST_QUESTION_POLL_MS, deadline - Date.now());
        if (wait <= 0) {
          break;
        }
        const pollAbort = new AbortController();
        await Promise.race([idle, sleep(wait, pollAbort.signal)]);
        pollAbort.abort();
      }

      const text = readCurrentQuestion(agent.session);
      if (text.length > 0) {
        return { ok: true, text };
      }
      return firstQuestionFailed();
    } catch {
      return firstQuestionFailed();
    }
  },
  async awaitNewQuestion(sessionId, baselineText, watchOptions): Promise<AwaitNewQuestionResult> {
    const timeoutMs = watchOptions?.timeoutMs ?? options.timeoutMs ?? WATCH_TIMEOUT_MS;
    const pollMs = watchOptions?.pollMs ?? options.pollMs ?? WATCH_POLL_MS;
    const agent = asCoachAgent(ctx.agents?.get(sessionId));
    if (agent === undefined) {
      return injectUnavailable();
    }
    if (!hasQuestionLogReader(agent.session)) {
      return followUpFailed();
    }

    try {
      const deadline = Date.now() + timeoutMs;
      let stableText: string | undefined;
      let first = true;
      while (first || Date.now() < deadline) {
        first = false;
        const live = asCoachAgent(ctx.agents?.get(sessionId));
        if (live === undefined) {
          return injectUnavailable();
        }
        if (!hasQuestionLogReader(live.session)) {
          return followUpFailed();
        }

        const text = readCurrentQuestion(live.session);
        const hasStatus = live.status !== undefined;
        if (text.length > 0 && text !== baselineText) {
          const remaining = Math.max(0, deadline - Date.now());
          const idleWait = new AbortController();
          await Promise.race([
            live.whenIdle().then(
              () => undefined,
              () => undefined,
            ),
            remaining > 0 ? sleep(remaining, idleWait.signal) : Promise.resolve(),
          ]);
          idleWait.abort();
          const after = asCoachAgent(ctx.agents?.get(sessionId));
          if (after === undefined) {
            return injectUnavailable();
          }
          if (!hasQuestionLogReader(after.session)) {
            return followUpFailed();
          }
          const finalText = readCurrentQuestion(after.session);
          if (finalText.length > 0 && finalText !== baselineText) {
            if (after.status === 'running') {
              stableText = undefined;
            } else if (!hasStatus) {
              if (stableText === finalText) {
                return { ok: true, status: 'ready', text: finalText };
              }
              stableText = finalText;
            } else {
              return { ok: true, status: 'ready', text: finalText };
            }
          }
        } else {
          stableText = undefined;
        }

        if (Date.now() >= deadline) {
          break;
        }
        const wait = Math.min(pollMs, deadline - Date.now());
        if (wait <= 0) {
          break;
        }
        await sleep(wait);
      }
      return { ok: true, status: 'unchanged' };
    } catch {
      return followUpFailed();
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
