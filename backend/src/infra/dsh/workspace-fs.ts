import { type ExamRoundIndex, type InterviewDeck } from 'interview-dsh-shared';
import {
  archiveDirFor,
  isRoundArchiveDir,
  joinWorkspacePath,
  persistUnavailable,
  renderCardMarkdown,
  sessionArchiveRoot,
  type BeginRoundResult,
  type WorkspaceArchive,
  type WriteDeckResult,
  type WriteRoundNotesResult,
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

const writeRel = async (
  fs: WorkspaceTextFs,
  cwd: string,
  sessionId: string,
  rel: string,
  text: string,
): Promise<void> => {
  const target = await resolveTarget(fs, cwd, rel);
  await fs.writeText(target, text, undefined, undefined, workspaceWritePolicy(cwd, sessionId));
};

const readRel = async (
  fs: WorkspaceTextFs,
  cwd: string,
  rel: string,
): Promise<string | undefined> => {
  if (typeof fs.readText !== 'function') {
    return undefined;
  }
  try {
    return await fs.readText(await resolveTarget(fs, cwd, rel));
  } catch {
    return undefined;
  }
};

const parseIndex = (raw: string | undefined): ExamRoundIndex | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    const record = parsed as Record<string, unknown>;
    if (record.status !== 'in_progress' && record.status !== 'ended') {
      return undefined;
    }
    if (typeof record.currentRound !== 'number' || !Number.isInteger(record.currentRound) || record.currentRound < 1) {
      return undefined;
    }
    if (typeof record.currentRoundDir !== 'string' || !record.currentRoundDir.includes('/round-')) {
      return undefined;
    }
    return {
      status: record.status,
      currentRound: record.currentRound,
      currentRoundDir: record.currentRoundDir,
      ...(typeof record.closingSeed === 'string' ? { closingSeed: record.closingSeed } : {}),
    };
  } catch {
    return undefined;
  }
};

const parseDeck = (raw: string | undefined): InterviewDeck | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as InterviewDeck;
  } catch {
    return undefined;
  }
};

const writeAll = async (fs: WorkspaceTextFs, deck: InterviewDeck, cwd: string): Promise<void> => {
  const archiveDir = deck.archiveDir;
  await writeRel(fs, cwd, deck.sessionId, `${archiveDir}/session.json`, `${JSON.stringify(deck, null, 2)}\n`);
  for (const card of deck.cards) {
    await writeRel(fs, cwd, deck.sessionId, `${archiveDir}/cards/${card.id}.md`, renderCardMarkdown(deck, card.id));
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
  const readIndex = async (sessionId: string): Promise<ExamRoundIndex | undefined> => {
    if (fs === undefined) {
      return undefined;
    }
    const cwd = workspace.cwdFor(sessionId);
    const root = sessionArchiveRoot(sessionId);
    if (cwd === undefined || root === undefined) {
      return undefined;
    }
    return parseIndex(await readRel(fs, cwd, `${root}/index.json`));
  };

  const writeIndex = async (sessionId: string, index: ExamRoundIndex): Promise<WriteDeckResult> => {
    if (fs === undefined) {
      return persistUnavailable();
    }
    const cwd = workspace.cwdFor(sessionId);
    const root = sessionArchiveRoot(sessionId);
    if (cwd === undefined || cwd.length === 0 || root === undefined) {
      return persistUnavailable();
    }
    try {
      await writeRel(fs, cwd, sessionId, `${root}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
    } catch {
      return persistUnavailable();
    }
    return { ok: true, archiveDir: index.currentRoundDir };
  };

  const beginRound = async (
    sessionId: string,
    topic: string,
    options: { forceNext?: boolean } = {},
  ): Promise<BeginRoundResult> => {
    if (fs === undefined) {
      return persistUnavailable();
    }
    const cwd = workspace.cwdFor(sessionId);
    if (cwd === undefined || cwd.length === 0) {
      return persistUnavailable();
    }
    const index = await readIndex(sessionId);
    let round: number;
    if (options.forceNext === true) {
      round = (index?.currentRound ?? 0) + 1;
    } else if (index?.status === 'in_progress') {
      return { ok: true, archiveDir: index.currentRoundDir, round: index.currentRound };
    } else if (index?.status === 'ended') {
      round = index.currentRound + 1;
    } else {
      round = 1;
    }
    const archiveDir = archiveDirFor(sessionId, round, topic);
    if (archiveDir === undefined) {
      return persistUnavailable();
    }
    const written = await writeIndex(sessionId, {
      status: 'in_progress',
      currentRound: round,
      currentRoundDir: archiveDir,
    });
    if (!written.ok) {
      return written;
    }
    return { ok: true, archiveDir, round };
  };

  return {
    beginRound,
    async writeDeck(deck): Promise<WriteDeckResult> {
      if (fs === undefined) {
        return persistUnavailable();
      }
      const cwd = workspace.cwdFor(deck.sessionId);
      if (cwd === undefined || cwd.length === 0) {
        return persistUnavailable();
      }
      let archiveDir = deck.archiveDir;
      if (!isRoundArchiveDir(deck.sessionId, archiveDir)) {
        const begun = await beginRound(deck.sessionId, deck.topic);
        if (!begun.ok) {
          return begun;
        }
        archiveDir = begun.archiveDir;
      }
      const next: InterviewDeck = { ...deck, archiveDir };
      try {
        await writeAll(fs, next, cwd);
      } catch {
        return persistUnavailable();
      }
      const index = await readIndex(deck.sessionId);
      if (index === undefined || index.currentRoundDir !== archiveDir) {
        const roundMatch = archiveDir.match(/\/round-(\d+)-/);
        const round = roundMatch ? Number(roundMatch[1]) : 1;
        const indexed = await writeIndex(deck.sessionId, {
          status: 'in_progress',
          currentRound: round,
          currentRoundDir: archiveDir,
        });
        if (!indexed.ok) {
          return indexed;
        }
      }
      return { ok: true, archiveDir };
    },
    async readDeck(sessionId) {
      if (fs === undefined) {
        return undefined;
      }
      const cwd = workspace.cwdFor(sessionId);
      const root = sessionArchiveRoot(sessionId);
      if (cwd === undefined || root === undefined) {
        return undefined;
      }
      const index = await readIndex(sessionId);
      if (index?.status === 'ended') {
        return undefined;
      }
      if (index?.status === 'in_progress') {
        return parseDeck(await readRel(fs, cwd, `${index.currentRoundDir}/session.json`));
      }
      return parseDeck(await readRel(fs, cwd, `${root}/session.json`));
    },
    async markEnded(sessionId, closingSeed) {
      const index = await readIndex(sessionId);
      if (index === undefined) {
        return persistUnavailable();
      }
      return writeIndex(sessionId, {
        ...index,
        status: 'ended',
        closingSeed,
      });
    },
    async writeRoundNotes(sessionId, notes): Promise<WriteRoundNotesResult> {
      if (fs === undefined) {
        return persistUnavailable();
      }
      const cwd = workspace.cwdFor(sessionId);
      const index = await readIndex(sessionId);
      if (cwd === undefined || cwd.length === 0 || index === undefined) {
        return persistUnavailable();
      }
      const qaPath = `${index.currentRoundDir}/qa.md`;
      const summaryPath = `${index.currentRoundDir}/summary.md`;
      try {
        await writeRel(fs, cwd, sessionId, qaPath, notes.qa.endsWith('\n') ? notes.qa : `${notes.qa}\n`);
      } catch {
        return persistUnavailable();
      }
      try {
        await writeRel(
          fs,
          cwd,
          sessionId,
          summaryPath,
          notes.summary.endsWith('\n') ? notes.summary : `${notes.summary}\n`,
        );
      } catch {
        return persistUnavailable();
      }
      return { ok: true, qaPath, summaryPath };
    },
    readRoundIndex: readIndex,
  };
};
