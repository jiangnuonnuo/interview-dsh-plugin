import { INTERVIEW_SESSION_ERROR_MESSAGES, createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import { createInterviewPort } from './remote-port';
import type { ExamRoomSessions } from './start-exam-room';

const mysqlRequest = {
  topicId: 'mysql',
  customTopic: '',
  difficulty: 'mid' as const,
};

const deck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [
    createPendingCard({
      id: 'Q1',
      questionText: '聚簇 vs 二级索引',
      questionBrief: '聚簇 vs 二级索引',
      keyPoints: ['回表'],
    }),
  ],
  currentCardId: 'Q1',
});

describe('createInterviewPort', () => {
  it('resolves sessions at start time, not construction time', async () => {
    let sessions: ExamRoomSessions | undefined;
    const remote = {
      acceptEntryConfig: jest.fn(async () => ({
        ok: true as const,
        config: {
          topic: 'MySQL 索引与优化',
          difficulty: 'mid' as const,
          topicKind: 'preset' as const,
          topicId: 'mysql',
        },
      })),
      getEntryConfig: jest.fn(),
      attachInterviewer: jest.fn(async () => ({ ok: true as const })),
      briefCoach: jest.fn(async () => ({ ok: true as const, deck })),
      watchCoachTurn: jest.fn(),
      loadDeck: jest.fn(),
    };
    const port = createInterviewPort(remote, () => sessions);

    const missing = await port.startInterview(mysqlRequest);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.code).toBe('inject_unavailable');
      expect(missing.message).toBe(INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable);
    }
    expect(remote.attachInterviewer).not.toHaveBeenCalled();

    sessions = {
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
      list: {
        getSnapshot: () => ({
          current: 'current-chat',
          byId: { 'current-chat': { cwd: '/Users/jiang/workspace' } },
        }),
      },
    };

    const started = await port.startInterview(mysqlRequest);
    expect(started).toEqual({ ok: true, deck });
    expect(sessions.open).toHaveBeenCalledWith('session-exam');
  });

  it('creates the exam room with workspaceId when workspaces resolve at start time', async () => {
    const create = jest.fn(async () => 'session-exam');
    const remote = {
      acceptEntryConfig: jest.fn(async () => ({
        ok: true as const,
        config: {
          topic: 'MySQL 索引与优化',
          difficulty: 'mid' as const,
          topicKind: 'preset' as const,
          topicId: 'mysql',
        },
      })),
      getEntryConfig: jest.fn(),
      attachInterviewer: jest.fn(async () => ({ ok: true as const })),
      briefCoach: jest.fn(async () => ({ ok: true as const, deck })),
      watchCoachTurn: jest.fn(),
      loadDeck: jest.fn(),
    };
    const sessions: ExamRoomSessions = {
      create,
      binding() {
        return {
          session: {
            prompt: async () => ({ ok: true }),
          },
        };
      },
      open: jest.fn(),
      list: {
        getSnapshot: () => ({
          current: 'current-chat',
          byId: { 'current-chat': { cwd: '/Users/jiang/xerina-atlas' } },
        }),
      },
    };
    const port = createInterviewPort(remote, () => sessions, () => ({
      list: {
        getSnapshot: () => ({
          items: [
            {
              workspaceId: 'ws-atlas',
              path: '/Users/jiang/xerina-atlas',
              sessionIds: ['current-chat'],
            },
          ],
          recentWorkspaceId: 'ws-atlas',
        }),
      },
    }));

    const started = await port.startInterview(mysqlRequest);
    expect(started).toEqual({ ok: true, deck });
    expect(create).toHaveBeenCalledWith({ workspaceId: 'ws-atlas' });
  });
});
