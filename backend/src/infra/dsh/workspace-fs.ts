import { type InterviewDeck } from 'interview-dsh-shared';
import {
  archiveDirFor,
  joinWorkspacePath,
  persistUnavailable,
  renderCardMarkdown,
  type WorkspaceArchive,
  type WriteDeckResult,
} from '../../data/workspace-archive.js';

export interface WorkspaceFsTarget {
  readonly targetKey: unknown;
  readonly displayPath?: string;
}

export type WorkspaceFsHandle = WorkspaceFsTarget | string;

export type WorkspaceWriteIntent = unknown;

export interface WorkspaceSandboxPolicy {
  readonly mode: 'read-only' | 'workspace-write' | 'danger-full-access';
  readonly workspaceRoot: string;
  readonly sessionId?: string;
}

export interface WorkspaceTextFs {
  writeText(
    target: WorkspaceFsHandle,
    text: string,
    expected?: WorkspaceWriteIntent,
    signal?: AbortSignal,
    sandboxPolicy?: WorkspaceSandboxPolicy,
  ): Promise<unknown> | unknown;
  readText?(target: WorkspaceFsHandle): Promise<string> | string;
  resolve?(
    rel: string,
    opts?: { cwd?: string },
  ): Promise<WorkspaceFsHandle> | WorkspaceFsHandle;
}

export interface ArchiveWorkspaceLookup {
  cwdFor(sessionId: string): string | undefined;
}

const resolveTarget = async (
  fs: WorkspaceTextFs,
  cwd: string,
  rel: string,
): Promise<WorkspaceFsHandle> => {
  if (typeof fs.resolve === 'function') {
    return await fs.resolve(rel, { cwd });
  }
  return joinWorkspacePath(cwd, rel);
};

const workspaceWritePolicy = (cwd: string, sessionId: string): WorkspaceSandboxPolicy => ({
  mode: 'workspace-write',
  workspaceRoot: cwd,
  sessionId,
});

const writeAll = async (fs: WorkspaceTextFs, deck: InterviewDeck, cwd: string): Promise<void> => {
  const archiveDir = deck.archiveDir;
  const policy = workspaceWritePolicy(cwd, deck.sessionId);
  const sessionTarget = await resolveTarget(fs, cwd, `${archiveDir}/session.json`);
  await fs.writeText(sessionTarget, `${JSON.stringify(deck, null, 2)}\n`, undefined, undefined, policy);
  for (const card of deck.cards) {
    const cardTarget = await resolveTarget(fs, cwd, `${archiveDir}/cards/${card.id}.md`);
    await fs.writeText(cardTarget, renderCardMarkdown(deck, card.id), undefined, undefined, policy);
  }
};

/**
 * Host 落盘只走 ctx.fs。查不到 fs 或会话 cwd 时可见失败，禁止 node:fs。
 * TODO: 若本机 Desktop 顶层 inject `fs` 导致 apply 失败，改为仅 ctx.get('fs') 探测。
 */
export const createFsWorkspaceArchive = (
  fs: WorkspaceTextFs | undefined,
  workspace: ArchiveWorkspaceLookup,
): WorkspaceArchive => {
  return {
    async writeDeck(deck): Promise<WriteDeckResult> {
      if (fs === undefined) {
        return persistUnavailable();
      }
      const cwd = workspace.cwdFor(deck.sessionId);
      const archiveDir = archiveDirFor(deck.sessionId);
      if (cwd === undefined || cwd.length === 0 || archiveDir === undefined) {
        return persistUnavailable();
      }
      const next: InterviewDeck = { ...deck, archiveDir };
      try {
        await writeAll(fs, next, cwd);
      } catch {
        return persistUnavailable();
      }
      return { ok: true, archiveDir };
    },
    async readDeck(sessionId) {
      if (fs === undefined || typeof fs.readText !== 'function') {
        return undefined;
      }
      const cwd = workspace.cwdFor(sessionId);
      const archiveDir = archiveDirFor(sessionId);
      if (cwd === undefined || archiveDir === undefined) {
        return undefined;
      }
      try {
        const raw = await fs.readText(await resolveTarget(fs, cwd, `${archiveDir}/session.json`));
        const parsed: unknown = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object') {
          return undefined;
        }
        return parsed as InterviewDeck;
      } catch {
        return undefined;
      }
    },
  };
};

