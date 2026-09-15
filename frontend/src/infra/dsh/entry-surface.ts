/** Host chrome for the 0.1.1 slot overlay. features/ MUST NOT import this. */

const listeners = new Set<() => void>();

let open = false;
let error: string | null = null;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const toMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

export const entrySurface = {
  isOpen: (): boolean => open,
  error: (): string | null => error,
  open: (): void => {
    if (open) {
      return;
    }
    open = true;
    notify();
  },
  close: (): void => {
    if (!open && error === null) {
      return;
    }
    open = false;
    error = null;
    notify();
  },
  toggle: (): void => {
    if (open) {
      open = false;
      error = null;
    } else {
      open = true;
    }
    notify();
  },
  fail: (cause: unknown): void => {
    error = toMessage(cause) || '无法打开模拟面试入口。';
    open = true;
    notify();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const getEntrySurfaceSnapshot = (): boolean => open;
export const getEntrySurfaceError = (): string | null => error;
