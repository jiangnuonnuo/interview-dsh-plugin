import { INTERVIEW_SESSION_ERROR_MESSAGES, emptyBaguaScores } from 'interview-dsh-shared';
import { startInterview, type StartInterviewHost } from './start-interview';
import type { ExamRoomSessions } from './start-exam-room';

const mysqlRequest = {
  topicId: 'mysql',
  customTopic: '',
  difficulty: 'mid' as const,
};

const snapshot = {
  phase: 'in_progress' as const,
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid' as const,
  questionBrief: '聚簇 vs 二级索引',
  keyPoints: ['回表'],
  scores: emptyBaguaScores(),
};

describe('startInterview', () => {
  it('stays on the entry path when validation fails', async () => {
    const host: StartInterviewHost = {
      acceptEntryConfig: jest.fn(async () => ({
        ok: false as const,
        code: 'topic_required' as const,
        message: '请选择一个面试主题，或填写自定义主题。',
      })),
      attachInterviewer: jest.fn(),
      briefCoach: jest.fn(),
    };

    const result = await startInterview({ sessions: undefined, host }, mysqlRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('topic_required');
    }
    expect(host.attachInterviewer).not.toHaveBeenCalled();
    expect(host.briefCoach).not.toHaveBeenCalled();
  });

  it('does not enter in-progress when inject fails', async () => {
    const sessions: ExamRoomSessions = {
      async create() {
        return 'session-exam';
      },
      binding: () => undefined,
      open: jest.fn(),
    };
    const host: StartInterviewHost = {
      async acceptEntryConfig() {
        return {
          ok: true,
          config: {
            topic: 'MySQL 索引与优化',
            difficulty: 'mid',
            topicKind: 'preset',
            topicId: 'mysql',
          },
        };
      },
      async attachInterviewer() {
        return {
          ok: false,
          code: 'inject_unavailable',
          message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
        };
      },
      briefCoach: jest.fn(),
    };

    const result = await startInterview({ sessions, host }, mysqlRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
    }
    expect(host.briefCoach).not.toHaveBeenCalled();
    expect(sessions.open).not.toHaveBeenCalled();
  });

  it('returns the coach snapshot after a successful exam-room start', async () => {
    const sessions: ExamRoomSessions = {
      async create() {
        return 'session-exam';
      },
      binding() {
        return {
          session: {
            prompt: async () => ({ ok: true }),
          },
        };
      },
      open: jest.fn(),
    };
    const host: StartInterviewHost = {
      async acceptEntryConfig() {
        return {
          ok: true,
          config: {
            topic: 'MySQL 索引与优化',
            difficulty: 'mid',
            topicKind: 'preset',
            topicId: 'mysql',
          },
        };
      },
      async attachInterviewer() {
        return { ok: true };
      },
      async briefCoach() {
        return { ok: true, snapshot };
      },
    };

    const result = await startInterview({ sessions, host }, mysqlRequest);
    expect(result).toEqual({ ok: true, snapshot });
    expect(sessions.open).toHaveBeenCalledWith('session-exam');
  });
});
