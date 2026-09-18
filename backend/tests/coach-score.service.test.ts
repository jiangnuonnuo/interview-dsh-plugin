/**
 * @jest-environment node
 */

import { BAGUA_SCORE_DIMENSIONS } from 'interview-dsh-shared';
import {
  assembleCoachScorePrompt,
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
    expect(system).toContain('基础扎实度');
    expect(system).not.toContain('你的角色是一名专业面试官');
    expect(user).toContain('叶子节点存行。');
    expect(user).toContain('叶子即行');
  });
});

describe('parseCoachScoreOutput', () => {
  it('accepts five dimensions with half-step scores', () => {
    const parsed = parseCoachScoreOutput(
      JSON.stringify({
        covered: ['叶子即行'],
        missed: ['回表'],
        comment: '只讲了聚簇',
        scores: validScores,
      }),
    );
    expect(parsed?.comparison.comment).toBe('只讲了聚簇');
    expect(parsed?.scores).toHaveLength(5);
    expect(parsed?.scores.every((item) => item.score !== null)).toBe(true);
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
