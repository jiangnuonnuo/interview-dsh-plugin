import {
  INTERVIEW_ROUND_CLOSING_LINE,
  INTERVIEW_ROUND_CLOSING_PROMPT,
  INTERVIEW_ROUND_END_TRIGGER,
  INTERVIEW_SESSION_ERROR_MESSAGES,
} from 'interview-dsh-shared';
import { endExamRound } from './end-exam-round';
import type { ExamRoomSessions } from './start-exam-room';

describe('endExamRound', () => {
  it('prompts with 结束面试 after arming close and still prompts when note write fails', async () => {
    const prompt = jest.fn(async () => ({ ok: true as const }));
    const armRoundClose = jest.fn(async () => ({ ok: true as const }));
    const endRound = jest.fn(async () => ({
      ok: false as const,
      code: 'persist_unavailable' as const,
      message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
      ended: true,
    }));
    const sessions: ExamRoomSessions = {
      create: async () => 'session-exam',
      binding: () => ({ session: { prompt } }),
      open: jest.fn(),
    };

    const result = await endExamRound(
      { sessions, host: { armRoundClose, endRound } },
      { sessionId: 'session-exam' },
    );

    expect(armRoundClose).toHaveBeenCalledWith({ sessionId: 'session-exam' });
    expect(prompt).toHaveBeenCalledWith(
      [{ type: 'text', text: INTERVIEW_ROUND_END_TRIGGER }],
      'queue',
    );
    expect(prompt.mock.calls[0]?.[0]?.[0]?.text).not.toContain('请用面试官口吻');
    expect(INTERVIEW_ROUND_CLOSING_PROMPT).toContain(INTERVIEW_ROUND_CLOSING_LINE);
    expect(endRound).toHaveBeenCalledWith({ sessionId: 'session-exam' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('persist_unavailable');
      expect(result.ended).toBe(true);
    }
  });

  it('maps a prompt failure to a visible closing_failed error', async () => {
    const armRoundClose = jest.fn(async () => ({ ok: true as const }));
    const endRound = jest.fn(async () => ({
      ok: true as const,
      sessionId: 'session-exam',
      qaPath: '.dsh-interview/session-exam/round-1-MySQL-索引与优化/qa.md',
      summaryPath: '.dsh-interview/session-exam/round-1-MySQL-索引与优化/summary.md',
      ended: true as const,
    }));
    const sessions: ExamRoomSessions = {
      create: async () => 'session-exam',
      binding: () => ({
        session: {
          prompt: async () => {
            throw new Error('prompt denied');
          },
        },
      }),
      open: jest.fn(),
    };

    const result = await endExamRound(
      { sessions, host: { armRoundClose, endRound } },
      { sessionId: 'session-exam' },
    );
    expect(result).toEqual({
      ok: false,
      code: 'closing_failed',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.closing_failed,
      ended: true,
      qaPath: '.dsh-interview/session-exam/round-1-MySQL-索引与优化/qa.md',
      summaryPath: '.dsh-interview/session-exam/round-1-MySQL-索引与优化/summary.md',
    });
    expect(endRound).toHaveBeenCalled();
  });
});
