import type { InProgressSnapshot } from 'interview-dsh-shared';

const listeners = new Set<() => void>();

let snapshot: InProgressSnapshot | null = null;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/**
 * Overlay 关闭会卸载 EntryPanel；本场快照必须留在模块里，重开才能继续看守。
 */
export const examPanelState = {
  get(): InProgressSnapshot | null {
    return snapshot;
  },
  set(next: InProgressSnapshot | null): void {
    snapshot = next;
    notify();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
