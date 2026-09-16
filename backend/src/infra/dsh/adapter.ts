import { createInterviewEntryPort } from '../../entrypoints/interview-entry.js';
import { attachInterviewerPersona, type PersonaHostContext } from './interviewer-persona.js';
import { createHostCoachRuntime, type CoachHostContext } from './coach.js';

export const name = 'interview-dsh';
export const inject = ['agents', 'llm', 'agentDefaultModel'];

export interface HostContext extends PersonaHostContext, CoachHostContext {
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
  ctx.provide(
    'interviewEntry',
    bindInterviewEntry(
      createInterviewEntryPort(
        undefined,
        {
          install(sessionId, text) {
            return attachInterviewerPersona(ctx, { sessionId, text });
          },
        },
        createHostCoachRuntime(ctx),
      ),
    ),
  );
}
