import { INTERVIEW_OPENING_PROMPT } from 'interview-dsh-shared';
import { startExamRoom, type ExamRoomSessions, type ExamRoomHost } from './start-exam-room';

const mysql = { topic: 'MySQL 索引与优化', difficulty: 'mid' as const };

describe('startExamRoom', () => {
  it('creates a session, attaches persona, prompts, then opens — in that order', async () => {
    const calls: string[] = [];
    const prompt = jest.fn(async () => {
      calls.push('prompt');
      return { ok: true as const, value: { accepted: true as const } };
    });
    const sessions: ExamRoomSessions = {
      async create() {
        calls.push('create');
        return 'session-new';
      },
      binding(id) {
        calls.push(`binding:${id}`);
        return { session: { prompt } };
      },
      open(id) {
        calls.push(`open:${id}`);
      },
    };
    const host: ExamRoomHost = {
      async attachInterviewer(request) {
        calls.push(`attach:${request.sessionId}`);
        expect(request.topic).toBe(mysql.topic);
        expect(request.difficulty).toBe(mysql.difficulty);
        return { ok: true };
      },
    };

    const result = await startExamRoom({ sessions, host }, mysql);

    expect(result).toEqual({ ok: true, sessionId: 'session-new' });
    expect(calls).toEqual([
      'create',
      'attach:session-new',
      'binding:session-new',
      'prompt',
      'open:session-new',
    ]);
    expect(prompt).toHaveBeenCalledWith(
      [{ type: 'text', text: INTERVIEW_OPENING_PROMPT }],
      'queue',
    );
  });

  it('does not prompt or open when persona attach fails', async () => {
    const prompt = jest.fn();
    const open = jest.fn();
    const sessions: ExamRoomSessions = {
      async create() {
        return 'session-new';
      },
      binding() {
        return { session: { prompt } };
      },
      open,
    };
    const host: ExamRoomHost = {
      async attachInterviewer() {
        return {
          ok: false,
          code: 'inject_unavailable',
          message: '当前会话还没有可挂载的 Agent。',
        };
      },
    };

    const result = await startExamRoom({ sessions, host }, mysql);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
    }
    expect(prompt).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('returns inject_unavailable when sessions.create is missing', async () => {
    const host: ExamRoomHost = {
      attachInterviewer: jest.fn(),
    };

    const result = await startExamRoom({ sessions: undefined, host }, mysql);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
    }
    expect(host.attachInterviewer).not.toHaveBeenCalled();
  });

  it('returns inject_unavailable when sessions.create throws', async () => {
    const host: ExamRoomHost = {
      attachInterviewer: jest.fn(),
    };
    const sessions: ExamRoomSessions = {
      async create() {
        throw new Error('SessionCreateError');
      },
      binding: jest.fn(),
      open: jest.fn(),
    };

    const result = await startExamRoom({ sessions, host }, mysql);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
    }
    expect(host.attachInterviewer).not.toHaveBeenCalled();
  });
});
