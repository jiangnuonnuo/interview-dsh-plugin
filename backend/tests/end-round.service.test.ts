/**
 * @jest-environment node
 */

import {
  INTERVIEW_ROUND_CLOSING_LINE,
  INTERVIEW_ROUND_CLOSING_PROMPT,
  INTERVIEW_ROUND_END_TRIGGER,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  createInterviewDeck,
  createPendingCard,
} from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import { saveExamRecord, type WorkspaceArchive } from '../src/data/workspace-archive.js';
import { endRoundSession } from '../src/services/end-round.js';
import { assembleRoundAdvicePrompt } from '../src/services/round-advice.js';
import { stubCoach } from './coach-stub.js';

const q1 = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '聚簇',
  keyPoints: ['叶子即行'],
});

const deck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  archiveDir: '.dsh-interview/session-exam/round-1-MySQL-索引与优化',
  cards: [q1],
  currentCardId: 'Q1',
});

const seed = () => {
  const examSessions = createExamSessionStore();
  saveExamRecord(examSessions, deck, q1.questionText);
  return examSessions;
};

describe('endRoundSession', () => {
  it('requires the closing director prompt to use the fixed last line and not ask again', () => {
    expect(INTERVIEW_ROUND_CLOSING_PROMPT).toContain(INTERVIEW_ROUND_CLOSING_LINE);
    expect(INTERVIEW_ROUND_CLOSING_PROMPT).toContain('不要再提出待答问题');
    expect(INTERVIEW_ROUND_CLOSING_PROMPT).toContain('不要念对照、五维分数或本轮建议');
    expect(INTERVIEW_ROUND_END_TRIGGER).toBe('结束面试');
  });

  it('writes qa.md and summary.md from session B and does not send advice as exam text', async () => {
    const complete = jest.fn(async (system: string) => {
      expect(system).toContain('只为本轮总结文件写复习建议');
      expect(system).toContain('不要把建议写进考场对话');
      expect(system).not.toContain('你的角色是一名专业面试官');
      return '下一轮把回表讲清楚。';
    });
    const writeRoundNotes = jest.fn(async (_sessionId: string, notes: { qa: string; summary: string }) => {
      expect(notes.qa).toContain('请说明聚簇索引。');
      expect(notes.qa).not.toContain('<details');
      expect(notes.summary).toContain('下一轮把回表讲清楚。');
      expect(notes.summary).not.toContain('请说明聚簇索引。');
      return {
        ok: true as const,
        qaPath: `${deck.archiveDir}/qa.md`,
        summaryPath: `${deck.archiveDir}/summary.md`,
      };
    });
    const markEnded = jest.fn(async () => ({ ok: true as const }));
    const archive: WorkspaceArchive = {
      writeDeck: async () => ({ ok: true, archiveDir: deck.archiveDir }),
      readDeck: async () => deck,
      markEnded,
      writeRoundNotes,
    };
    const result = await endRoundSession(stubCoach({ complete }), seed(), { sessionId: 'session-exam' }, archive);
    expect(result).toEqual({
      ok: true,
      sessionId: 'session-exam',
      qaPath: `${deck.archiveDir}/qa.md`,
      summaryPath: `${deck.archiveDir}/summary.md`,
      ended: true,
    });
    expect(markEnded).toHaveBeenCalledWith('session-exam', INTERVIEW_ROUND_END_TRIGGER);
    expect(writeRoundNotes).toHaveBeenCalled();
    const { user } = assembleRoundAdvicePrompt(deck);
    expect(user).toContain('MySQL 索引与优化');
  });

  it('marks the round ended and still writes qa.md when advice fails', async () => {
    const writeRoundNotes = jest.fn(async (_sessionId: string, notes: { qa: string; summary: string }) => {
      expect(notes.summary).toContain('本轮总结未生成。');
      expect(notes.qa).toContain('请说明聚簇索引。');
      return {
        ok: true as const,
        qaPath: `${deck.archiveDir}/qa.md`,
        summaryPath: `${deck.archiveDir}/summary.md`,
      };
    });
    const archive: WorkspaceArchive = {
      writeDeck: async () => ({ ok: true, archiveDir: deck.archiveDir }),
      readDeck: async () => deck,
      markEnded: async () => ({ ok: true as const }),
      writeRoundNotes,
    };
    const result = await endRoundSession(stubCoach({ complete: async () => null }), seed(), {
      sessionId: 'session-exam',
    }, archive);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('coach_unavailable');
      expect(result.ended).toBe(true);
      expect(result.qaPath).toBe(`${deck.archiveDir}/qa.md`);
      expect(result.summaryPath).toBe(`${deck.archiveDir}/summary.md`);
    }
  });

  it('returns persist_unavailable when note write fails and still marks ended', async () => {
    const examSessions = seed();
    const archive: WorkspaceArchive = {
      writeDeck: async () => ({ ok: true, archiveDir: deck.archiveDir }),
      readDeck: async () => deck,
      markEnded: async () => ({ ok: true as const }),
      writeRoundNotes: async () => ({
        ok: false,
        code: 'persist_unavailable',
        message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
      }),
    };
    const result = await endRoundSession(
      stubCoach({ complete: async () => '建议' }),
      examSessions,
      { sessionId: 'session-exam' },
      archive,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('persist_unavailable');
      expect(result.ended).toBe(true);
    }
    expect(examSessions.load('session-exam')?.ended).toBe(true);
  });
});
