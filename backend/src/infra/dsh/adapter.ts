import { createExamSessionStore } from '../../data/exam-session-store.js';
import { createInterviewEntryPort } from '../../entrypoints/interview-entry.js';
import { attachInterviewerPersona, clearRoundClosingSection, installRoundClosingSection, type PersonaHostContext } from './interviewer-persona.js';
import { createHostCoachRuntime, type CoachHostContext } from './coach.js';
import { createFsWorkspaceArchive, type WorkspaceTextFs } from './workspace-fs.js';

export const name = 'interview-dsh';
export const inject = ['agents', 'llm', 'agentDefaultModel', 'fs'];

export interface HostContext extends PersonaHostContext, CoachHostContext {
  provide(key: string, value: unknown): void;
  fs?: WorkspaceTextFs;
  get?: (key: string) => unknown;
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

const asTextFs = (value: unknown): WorkspaceTextFs | undefined => {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const fs = value as Partial<WorkspaceTextFs>;
  if (typeof fs.writeText !== 'function') {
    return undefined;
  }
  return fs as WorkspaceTextFs;
};

const readService = (ctx: HostContext, key: string): unknown => {
  if (typeof ctx.get === 'function') {
    try {
      return ctx.get(key);
    } catch {
      return undefined;
    }
  }
  return (ctx as unknown as Record<string, unknown>)[key];
};

const sessionCwd = (value: unknown): string | undefined => {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const cwd = (value as { session?: { header?: { cwd?: unknown } } }).session?.header?.cwd;
  return typeof cwd === 'string' && cwd.length > 0 ? cwd : undefined;
};

/**
 * Host lifecycle only. UI tabs and header actions belong in the frontend adapter.
 * `fs` is declared so writeText is in-sandbox. If a profile rejects the extra inject,
     * fall back to ctx.get('fs') and surface persist_unavailable — never Node filesystem APIs.
 */
export function apply(ctx: HostContext): void {
  const examSessions = createExamSessionStore();
  const fs = asTextFs(ctx.fs) ?? asTextFs(readService(ctx, 'fs'));
  const archive = createFsWorkspaceArchive(fs, {
    cwdFor(sessionId) {
      return sessionCwd(ctx.agents?.get(sessionId));
    },
  });
  ctx.provide(
    'interviewEntry',
    bindInterviewEntry(
      createInterviewEntryPort(
        undefined,
        {
          install(sessionId, text) {
            return attachInterviewerPersona(ctx, { sessionId, text });
          },
          installRoundClose(sessionId, text) {
            return installRoundClosingSection(ctx, { sessionId, text });
          },
          clearRoundClose(sessionId) {
            clearRoundClosingSection(sessionId);
          },
        },
        createHostCoachRuntime(ctx),
        examSessions,
        archive,
      ),
    ),
  );
}
