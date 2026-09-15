import { createInterviewEntryPort } from '../../entrypoints/interview-entry.js';

export const name = 'interview-dsh';

export interface HostContext {
  provide(key: string, value: unknown): void;
}

const bindInterviewEntry = (service: ReturnType<typeof createInterviewEntryPort>) => {
  Object.defineProperty(service, 'typertRemote', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: { service, serviceKey: 'interviewEntry', namespace: 'interviewEntry' },
  });
  return service;
};

/**
 * Host lifecycle only. UI tabs and header actions belong in the frontend adapter.
 */
export function apply(ctx: HostContext): void {
  ctx.provide('interviewEntry', bindInterviewEntry(createInterviewEntryPort()));
}
