/**
 * @jest-environment node
 */

import { BAGUA_SCORE_DIMENSIONS } from 'interview-dsh-shared';
import { createPendingCard } from 'interview-dsh-shared';
import {
  applyScoreToCard,
  assembleCoachScorePrompt,
  isSettledCoverage,
  parseCoachScoreOutput,
} from '../src/services/coach-score.js';

const validScores = BAGUA_SCORE_DIMENSIONS.map((dimension, index) => ({
  dimension,
  score: 3 + index * 0.5 > 5 ? 5 : 3 + (index % 3) * 0.5,
  reason: '理由',
}));

describe('assembleCoachScorePrompt', () => {
  it('asks for comparison and bagua scores without interviewer role', () => {
    const { system, user } = assembleCoachScorePrompt({
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      questionText: '请说明聚簇索引。',
      questionBrief: '聚簇 vs 二级',
      keyPoints: ['叶子即行'],
      answer: '叶子节点存行。',
    });
    expect(system).toContain('covered');
    expect(system).toContain('coverage');
    expect(system).toContain('wide_gap');
    expect(system).toContain('基础扎实度');
    expect(system).not.toContain('你的角色是一名专业面试官');
    expect(system).not.toContain('session.prompt');
    expect(user).toContain('叶子节点存行。');
    expect(user).toContain('叶子即行');
  });

  it('anchors a junior definition and a senior boundary to the intent', () => {
    const junior = assembleCoachScorePrompt({
      topic: 'MySQL',
      difficulty: 'junior',
      questionText: '什么是聚簇索引？',
      questionBrief: '聚簇',
      keyPoints: ['叶子即行'],
      answer: '就是主键索引。',
      layer: 'define',
      intent: '说清定义',
    });
    expect(junior.user).toContain('考察意图：说清定义');
    expect(junior.user).toContain('考察层：定义');
    expect(junior.system).toContain('不要因为候选人没有讲到边界');
    const senior = assembleCoachScorePrompt({
      topic: 'MySQL',
      difficulty: 'senior',
      questionText: '页缓存去掉还成立吗？',
      questionBrief: '边界',
      keyPoints: ['随机读'],
      answer: '会破。',
      layer: 'boundary',
      intent: '前提一变哪里会破',
    });
    expect(senior.system).toContain('深度边界才能到 4 以上');
    expect(senior.user).toContain('考察意图：前提一变哪里会破');
  });

  it('scores the joined turns, not only the latest line', () => {
    const { user } = assembleCoachScorePrompt({
      topic: 'MySQL',
      difficulty: 'mid',
      questionText: '什么是聚簇索引？',
      questionBrief: '聚簇',
      keyPoints: ['叶子即行'],
      answer: '不会。\n\n叶子存行。',
    });
    expect(user).toContain('不会。');
    expect(user).toContain('叶子存行。');
    expect(user).not.toContain('session.prompt');
  });
});

describe('parseCoachScoreOutput', () => {
  it('accepts five dimensions with half-step scores', () => {
    const parsed = parseCoachScoreOutput(
      JSON.stringify({
        coverage: 'next',
        covered: ['叶子即行'],
        missed: ['回表'],
        comment: '只讲了聚簇',
        scores: validScores,
      }),
    );
    expect(isSettledCoverage(parsed)).toBe(true);
    expect(parsed?.comparison.comment).toBe('只讲了聚簇');
    expect(parsed?.scores).toHaveLength(5);
    expect(parsed?.scores.every((item) => item.score !== null)).toBe(true);
  });

  it('accepts the five coverage values and rejects a missing or unknown one', () => {
    for (const coverage of ['miss', 'wide_gap', 'deepen', 'reask', 'next']) {
      const parsed = parseCoachScoreOutput(
        JSON.stringify({
          coverage,
          covered: ['叶子即行'],
          missed: [],
          comment: '对照',
          scores: validScores,
        }),
      );
      expect(isSettledCoverage(parsed)).toBe(true);
      expect(parsed?.coverage).toBe(coverage);
    }
    const missing = parseCoachScoreOutput(
      JSON.stringify({
        covered: ['叶子即行'],
        missed: [],
        comment: '对照',
        scores: validScores,
      }),
    );
    expect(missing?.comparison.comment).toBe('对照');
    expect(isSettledCoverage(missing)).toBe(false);
    const unknown = parseCoachScoreOutput(
      JSON.stringify({
        coverage: 'partial',
        covered: [],
        missed: [],
        comment: '对照',
        scores: validScores,
      }),
    );
    expect(isSettledCoverage(unknown)).toBe(false);
  });

  it('stacks a guided answer and stops incrementing after two guides', () => {
    const base = createPendingCard({
      id: 'Q1',
      questionText: '请说明聚簇索引。',
      questionBrief: '聚簇',
      keyPoints: ['叶子即行'],
    });
    const parsed = {
      comparison: { covered: [] as string[], missed: ['叶子即行'], comment: '第二轮' },
      scores: validScores,
      coverage: 'miss' as const,
    };
    const once = applyScoreToCard(base, parsed, '不会');
    expect(once.guideCount).toBe(1);
    expect(once.answerTurns).toEqual(['不会']);
    const twice = applyScoreToCard(once, { ...parsed, comparison: { ...parsed.comparison, comment: '仍未答上' } }, '还是不会');
    expect(twice.guideCount).toBe(2);
    expect(twice.answerTurns).toEqual(['不会', '还是不会']);
    expect(twice.answer).toContain('不会');
    expect(twice.answer).toContain('还是不会');
    expect(twice.comparison?.comment).toBe('仍未答上');
    const third = applyScoreToCard(twice, parsed, '第三句');
    expect(third.guideCount).toBe(2);
  });

  it('rejects missing dimensions or illegal scores', () => {
    expect(
      parseCoachScoreOutput(
        JSON.stringify({
          covered: [],
          missed: [],
          comment: 'x',
          scores: validScores.slice(0, 4),
        }),
      ),
    ).toBeNull();
    expect(
      parseCoachScoreOutput(
        JSON.stringify({
          covered: [],
          missed: [],
          comment: 'x',
          scores: validScores.map((item) => ({ ...item, score: 6 })),
        }),
      ),
    ).toBeNull();
  });
});
