/**
 * @jest-environment node
 */

import { assembleInterviewerPersona } from '../src/services/interviewer-persona.js';
import {
  assembleCoachBriefPrompt,
  briefCoachSession,
  parseCoachBriefOutput,
} from '../src/services/coach-brief.js';
import { stubCoach } from './coach-stub.js';

const topic = 'MySQL 索引与优化';
const difficulty = 'mid' as const;
const questionText = '请说明 InnoDB 聚簇索引和二级索引的区别。';

describe('assembleCoachBriefPrompt', () => {
  const { system, user } = assembleCoachBriefPrompt({
    topic,
    difficulty,
    questionText,
  });

  it('asks only for a question brief and standard-answer points', () => {
    expect(system).toContain('题干摘要');
    expect(system).toContain('标准答要点');
    expect(system).toMatch(/questionBrief/);
    expect(system).toMatch(/keyPoints/);
    expect(system).toMatch(/cardId/);
    expect(user).toContain(topic);
    expect(user).toContain('中级');
    expect(user).toContain(questionText);
    expect(user).toContain('面试官当前问题：');
    expect(user).not.toContain('面试官第一问：');
    expect(system).toMatch(/当前待答问/);
    expect(system).toMatch(/忽略同一段里对上一问的点评/);
  });

  it('puts only the pending question in the user message when the turn mixes lecture and a question', () => {
    const pending = '联合索引 (col_a, col_b) 在什么查询条件下最左匹配会失效？';
    const mixed = [
      '你刚才说没影响，这个判断不准确。',
      'InnoDB 页分裂后新页往往不与原页连续，范围扫描会变成更多随机读，放大磁盘 I/O。',
      pending,
    ].join('\n\n');
    const { user } = assembleCoachBriefPrompt({
      topic,
      difficulty,
      questionText: mixed,
    });
    expect(user).toContain(pending);
    expect(user).not.toContain('你刚才说没影响');
    expect(user).not.toContain('页分裂后新页');
  });

  it('does not include the interviewer role template', () => {
    expect(system).not.toContain('你的角色是一名专业面试官');
    expect(system).not.toContain('八股专项模式的知识点组织');
    expect(user).not.toContain('每次只问一个问题');
    expect(`${system}\n${user}`).not.toContain(assembleInterviewerPersona({ topic, difficulty }));
  });
});

describe('parseCoachBriefOutput', () => {
  it('reads questionBrief and keyPoints from JSON', () => {
    const parsed = parseCoachBriefOutput(
      '{"questionBrief":"聚簇 vs 二级索引","keyPoints":["聚簇索引叶子即行","二级索引回表"]}',
    );
    expect(parsed).toEqual({
      questionBrief: '聚簇 vs 二级索引',
      keyPoints: ['聚簇索引叶子即行', '二级索引回表'],
    });
  });

  it('reads optional cardId and relation', () => {
    const parsed = parseCoachBriefOutput(
      '{"questionBrief":"回表","keyPoints":["先查二级"],"cardId":"Q1.1","relation":"followup"}',
    );
    expect(parsed).toEqual({
      questionBrief: '回表',
      keyPoints: ['先查二级'],
      cardId: 'Q1.1',
      relation: 'followup',
    });
  });

  it('returns null when the model does not produce the structured brief', () => {
    expect(parseCoachBriefOutput('面试官第一问：什么是 B+ 树？')).toBeNull();
  });
});

describe('briefCoachSession', () => {
  it('sends the coach prompt to the completer, not to an interviewer installer', async () => {
    const installPersona = jest.fn();
    const complete = jest.fn(async (system: string, user: string) => {
      expect(system).toContain('面板教练');
      expect(user).toContain(questionText);
      expect(installPersona).not.toHaveBeenCalled();
      return '{"questionBrief":"聚簇 vs 二级索引","keyPoints":["回表"]}';
    });

    const result = await briefCoachSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: questionText }),
        complete,
      }),
      { sessionId: 'session-exam', topic, difficulty },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deck.cards).toHaveLength(1);
      expect(result.deck.cards[0]?.id).toBe('Q1');
      expect(result.deck.currentCardId).toBe('Q1');
      expect(result.deck.cards[0]?.questionBrief).toBe('聚簇 vs 二级索引');
      expect(result.deck.cards[0]?.status).toBe('pending');
      expect(result.deck.cards[0]?.scores.every((item) => item.score === null)).toBe(true);
    }
    expect(complete).toHaveBeenCalledTimes(1);
    expect(installPersona).not.toHaveBeenCalled();
  });

  it('writes the exam session fingerprint after a successful brief', async () => {
    const { createExamSessionStore } = await import('../src/data/exam-session-store.js');
    const examSessions = createExamSessionStore();
    const result = await briefCoachSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: questionText }),
        readLatestHuman: async () => ({ ok: true, text: '开始本场八股专项模拟面试。' }),
        complete: async () => '{"questionBrief":"聚簇 vs 二级索引","keyPoints":["回表"]}',
      }),
      { sessionId: 'session-exam', topic, difficulty },
      examSessions,
    );
    expect(result.ok).toBe(true);
    expect(examSessions.load('session-exam')?.lastQuestionText).toBe(questionText);
    expect(examSessions.load('session-exam')?.deck.cards[0]?.questionBrief).toBe('聚簇 vs 二级索引');
    expect(examSessions.load('session-exam')?.deck.cards[0]?.seedUserText).toBe(
      '开始本场八股专项模拟面试。',
    );
  });

  it('writes a new Q1 into a new round directory after the previous round ended', async () => {
    const { createExamSessionStore } = await import('../src/data/exam-session-store.js');
    const { createFsWorkspaceArchive } = await import('../src/infra/dsh/workspace-fs.js');
    const files = new Map<string, string>();
    const fs = {
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
    };
    const archive = createFsWorkspaceArchive(fs, { cwdFor: () => '/workspace' });
    const examSessions = createExamSessionStore();
    const first = await briefCoachSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: questionText }),
        complete: async () => '{"questionBrief":"聚簇 vs 二级索引","keyPoints":["回表"]}',
      }),
      { sessionId: 'session-exam', topic, difficulty },
      examSessions,
      archive,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const firstDir = first.deck.archiveDir;
    await archive.markEnded?.('session-exam', 'closing');
    examSessions.save({
      sessionId: 'session-exam',
      topic,
      difficulty,
      lastQuestionText: questionText,
      deck: first.deck,
      ended: true,
    });
    const second = await briefCoachSession(
      stubCoach({
        readLatestQuestion: async () => ({ ok: true, text: 'Redis 为什么单线程还快？' }),
        complete: async () => '{"questionBrief":"单线程","keyPoints":["无锁"]}',
      }),
      { sessionId: 'session-exam', topic: 'Redis 并发与缓存', difficulty },
      examSessions,
      archive,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.deck.cards[0]?.id).toBe('Q1');
    expect(second.deck.archiveDir).not.toBe(firstDir);
    expect(second.deck.archiveDir).toBe('.dsh-interview/session-exam/round-2-Redis-并发与缓存');
    expect(files.has(`/workspace/${firstDir}/cards/Q1.md`)).toBe(true);
    expect(files.has(`/workspace/${second.deck.archiveDir}/cards/Q1.md`)).toBe(true);
    expect(files.get(`/workspace/${firstDir}/cards/Q1.md`)).toContain('聚簇');
    expect(files.get(`/workspace/${second.deck.archiveDir}/cards/Q1.md`)).toContain('单线程');
  });
});
