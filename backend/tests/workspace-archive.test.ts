/**
 * @jest-environment node
 */

import { createInterviewDeck, createPendingCard, INTERVIEW_SESSION_ERROR_MESSAGES } from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import {
  archiveDirFor,
  loadDeckSession,
  renderCardMarkdown,
  type WorkspaceArchive,
} from '../src/data/workspace-archive.js';
import { createFsWorkspaceArchive } from '../src/infra/dsh/workspace-fs.js';
import { briefCoachSession } from '../src/services/coach-brief.js';
import { stubCoach } from './coach-stub.js';

const q1 = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '聚簇',
  keyPoints: ['叶子即行'],
});
const q1_1 = createPendingCard({
  id: 'Q1.1',
  questionText: '二级索引如何回表？',
  questionBrief: '回表',
  keyPoints: ['先查二级'],
});

const twoCardDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  archiveDir: 'study/interview-dsh/20260917-1430-MySQL-索引与优化',
  cards: [q1, q1_1],
  currentCardId: 'Q1.1',
});

const createFakeFs = () => {
  const files = new Map<string, string>();
  return {
    files,
    fs: {
      resolve(rel: string, opts?: { cwd?: string }) {
        return `${opts?.cwd ?? ''}/${rel}`.replace(/\/+/g, '/');
      },
      async writeText(path: string, text: string) {
        files.set(path, text);
      },
      async readText(path: string) {
        const text = files.get(path);
        if (text === undefined) {
          throw new Error(`missing ${path}`);
        }
        return text;
      },
    },
  };
};

/**
 * Desktop `ctx.fs`: resolve is async and returns FsTarget; writeText/readText
 * take that target, not a path string.
 */
const createHostLikeFs = () => {
  const files = new Map<string, string>();
  return {
    files,
    fs: {
      async resolve(rel: string, opts?: { cwd?: string }) {
        const displayPath = `${opts?.cwd ?? ''}/${rel}`.replace(/\/+/g, '/');
        return { targetKey: displayPath, displayPath };
      },
      async writeText(
        target: { targetKey?: unknown },
        text: string,
        _expected?: unknown,
        _signal?: unknown,
        policy?: { mode?: string; workspaceRoot?: string },
      ) {
        if (target === null || typeof target !== 'object' || typeof target.targetKey !== 'string') {
          throw new Error('writeText expects FsTarget');
        }
        if (policy?.mode !== 'workspace-write' || policy.workspaceRoot !== '/workspace') {
          throw new Error('FS_SANDBOX_DENIED');
        }
        files.set(target.targetKey, text);
      },
      async readText(target: { targetKey?: unknown }) {
        if (target === null || typeof target !== 'object' || typeof target.targetKey !== 'string') {
          throw new Error('readText expects FsTarget');
        }
        const text = files.get(target.targetKey);
        if (text === undefined) {
          throw new Error(`missing ${target.targetKey}`);
        }
        return text;
      },
    },
  };
};

describe('workspace archive', () => {
  it('writes session.json and per-card markdown under the study path', async () => {
    const { files, fs } = createFakeFs();
    const archive = createFsWorkspaceArchive(fs, { cwdFor: () => '/workspace' }, {
      now: () => new Date(2026, 8, 17, 14, 30, 0),
    });
    const written = await archive.writeDeck({ ...twoCardDeck, archiveDir: '' });
    expect(written.ok).toBe(true);
    if (!written.ok) {
      return;
    }
    expect(written.archiveDir).toBe(archiveDirFor('MySQL 索引与优化', new Date(2026, 8, 17, 14, 30, 0)));
    const jsonPath = `/workspace/${written.archiveDir}/session.json`;
    expect(files.get(jsonPath)).toContain('"currentCardId": "Q1.1"');
    expect(files.get(`/workspace/${written.archiveDir}/cards/Q1.md`)).toContain('# Q1');
    expect(files.get(`/workspace/${written.archiveDir}/cards/Q1.1.md`)).toContain('# Q1.1');
    expect(renderCardMarkdown(twoCardDeck, 'Q1')).toContain('叶子即行');
  });

  it('writes through async resolve + FsTarget writeText like Desktop ctx.fs', async () => {
    const { files, fs } = createHostLikeFs();
    const archive = createFsWorkspaceArchive(fs, { cwdFor: () => '/workspace' }, {
      now: () => new Date(2026, 8, 17, 14, 30, 0),
    });
    const written = await archive.writeDeck({ ...twoCardDeck, archiveDir: '' });
    expect(written.ok).toBe(true);
    if (!written.ok) {
      return;
    }
    expect(files.get(`/workspace/${written.archiveDir}/session.json`)).toContain('"currentCardId": "Q1.1"');
    expect(files.get(`/workspace/${written.archiveDir}/cards/Q1.md`)).toContain('# Q1');
    const loaded = await archive.readDeck('session-exam');
    expect(loaded?.cards.map((card) => card.id)).toEqual(['Q1', 'Q1.1']);
  });

  it('reads the two-card deck back from the fake archive', async () => {
    const { fs } = createFakeFs();
    const archive = createFsWorkspaceArchive(fs, { cwdFor: () => '/workspace' }, {
      now: () => new Date(2026, 8, 17, 14, 30, 0),
    });
    const written = await archive.writeDeck({ ...twoCardDeck, archiveDir: '' });
    expect(written.ok).toBe(true);
    const loaded = await archive.readDeck('session-exam');
    expect(loaded?.cards.map((card) => card.id)).toEqual(['Q1', 'Q1.1']);
  });

  it('returns persist_unavailable without fs or cwd', async () => {
    const missingFs = createFsWorkspaceArchive(undefined, { cwdFor: () => '/workspace' });
    await expect(missingFs.writeDeck(twoCardDeck)).resolves.toEqual({
      ok: false,
      code: 'persist_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
    });
    const missingCwd = createFsWorkspaceArchive(createFakeFs().fs, { cwdFor: () => undefined });
    await expect(missingCwd.writeDeck(twoCardDeck)).resolves.toMatchObject({
      ok: false,
      code: 'persist_unavailable',
    });
  });

  it('keeps the in-memory deck when write fails', async () => {
    const examSessions = createExamSessionStore();
    const archive: WorkspaceArchive = {
      writeDeck: async () => ({
        ok: false,
        code: 'persist_unavailable',
        message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
      }),
      readDeck: async () => undefined,
    };
    const result = await briefCoachSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: '请说明聚簇索引。' }),
        complete: async () => '{"questionBrief":"聚簇","keyPoints":["叶子即行"]}',
      }),
      { sessionId: 'session-exam', topic: 'MySQL 索引与优化', difficulty: 'mid' },
      examSessions,
      archive,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('persist_unavailable');
      expect(result.deck?.cards[0]?.id).toBe('Q1');
    }
    expect(examSessions.load('session-exam')?.deck.cards[0]?.id).toBe('Q1');
  });

  it('restores a saved deck through loadDeckSession', async () => {
    const examSessions = createExamSessionStore();
    const archive: WorkspaceArchive = {
      writeDeck: async () => ({ ok: true, archiveDir: twoCardDeck.archiveDir }),
      readDeck: async () => twoCardDeck,
    };
    const loaded = await loadDeckSession(examSessions, { sessionId: 'session-exam' }, archive);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.deck.cards).toHaveLength(2);
    }
  });
});
