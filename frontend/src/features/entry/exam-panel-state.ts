import type { InProgressSnapshot } from 'interview-dsh-shared';

const listeners = new Set<() => void>();

let snapshot: InProgressSnapshot | null = null;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/**
 * Overlay 关闭会卸载 EntryPanel；本场快照留在模块里，重开「面试」才能继续看守。
 * 「结束本场」必须清掉这份快照，否则入口被锁死，也无法再开一轮。
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
