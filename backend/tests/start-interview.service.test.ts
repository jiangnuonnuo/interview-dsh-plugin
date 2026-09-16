/**
 * @jest-environment node
 */

import { createEntryConfigStore } from '../src/data/entry-config-store.js';
import { createInterviewEntryService } from '../src/services/interview-entry.service.js';
import { startInterviewSession } from '../src/services/start-interview.js';
import { emptyBaguaScores } from 'interview-dsh-shared';

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
  keyPoints: ['聚簇索引叶子即行'],
  scores: emptyBaguaScores(),
};

describe('startInterviewSession', () => {
  it('does not start A/B when entry validation fails', async () => {
    const startExam = jest.fn();
    const briefCoach = jest.fn();
    const result = await startInterviewSession(
      createInterviewEntryService(createEntryConfigStore()),
      { startExam, briefCoach },
      {
        topicId: null,
        customTopic: '',
        difficulty: 'mid',
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('topic_required');
    }
    expect(startExam).not.toHaveBeenCalled();
    expect(briefCoach).not.toHaveBeenCalled();
  });

  it('maps inject failure to a visible error and skips the coach', async () => {
    const startExam = jest.fn(async () => ({
      ok: false as const,
      code: 'inject_unavailable' as const,
      message: '无法在新对话上挂载面试官人设：当前 Host 没有可寻址的 Agent。',
    }));
    const briefCoach = jest.fn();
    const result = await startInterviewSession(
      createInterviewEntryService(createEntryConfigStore()),
      { startExam, briefCoach },
      mysqlRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('inject_unavailable');
      expect(result.message.length).toBeGreaterThan(0);
    }
    expect(startExam).toHaveBeenCalledTimes(1);
    expect(briefCoach).not.toHaveBeenCalled();
  });

  it('starts the exam room then asks the coach for the first-question brief', async () => {
    const startExam = jest.fn(async () => ({
      ok: true as const,
      sessionId: 'session-exam',
    }));
    const briefCoach = jest.fn(async () => ({
      ok: true as const,
      snapshot,
    }));

    const result = await startInterviewSession(
      createInterviewEntryService(createEntryConfigStore()),
      { startExam, briefCoach },
      mysqlRequest,
    );

    expect(result).toEqual({ ok: true, snapshot });
    expect(startExam).toHaveBeenCalledWith({
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
    });
    expect(briefCoach).toHaveBeenCalledWith({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
    });
  });
});
