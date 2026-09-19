import type { InterviewDeck } from 'interview-dsh-shared';

const listeners = new Set<() => void>();

let deck: InterviewDeck | null = null;

const STORAGE_KEY = 'interview-dsh.activeSessionId';

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const readStoredSessionId = (): string | null => {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredSessionId = (sessionId: string | null): void => {
  try {
    if (sessionId === null) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, sessionId);
    }
  } catch {
    // overlay restore can still use the current host session
  }
};

/**
 * Overlay 关闭会卸载 EntryPanel；本场甲板留在模块里，重开「面试」才能继续看守。
 * Host 可用时优先 loadDeck 读盘覆盖；「结束本场」必须清掉这份甲板。
 * sessionId 另写入 sessionStorage，插件脚本重载后仍能按 id 读盘。
 */
export const examPanelState = {
  get(): InterviewDeck | null {
    return deck;
  },
  peekSessionId(): string | null {
    return deck?.sessionId ?? readStoredSessionId();
  },
  set(next: InterviewDeck | null): void {
    deck = next;
    writeStoredSessionId(next?.sessionId ?? null);
    notify();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
