import type { EntryConfig } from 'interview-dsh-shared';

export interface EntryConfigStore {
  save(config: EntryConfig): void;
  load(): EntryConfig | null;
}

export const createEntryConfigStore = (): EntryConfigStore => {
  let current: EntryConfig | null = null;
  return {
    save(config) {
      current = config;
    },
    load() {
      return current;
    },
  };
};
