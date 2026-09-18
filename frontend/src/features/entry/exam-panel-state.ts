import type { InterviewDeck } from 'interview-dsh-shared';

const listeners = new Set<() => void>();

let deck: InterviewDeck | null = null;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/**
 * Overlay 关闭会卸载 EntryPanel；本场甲板留在模块里，重开「面试」才能继续看守。
 * Host 可用时优先 loadDeck 读盘覆盖；「结束本场」必须清掉这份甲板。
 */
export const examPanelState = {
  get(): InterviewDeck | null {
    return deck;
  },
  set(next: InterviewDeck | null): void {
    deck = next;
    notify();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
