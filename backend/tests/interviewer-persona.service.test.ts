/**
 * @jest-environment node
 */

import { assembleInterviewerPersona } from '../src/services/interviewer-persona.js';

describe('assembleInterviewerPersona', () => {
  const text = assembleInterviewerPersona({
    topic: 'MySQL 索引与优化',
    difficulty: 'mid',
  });

  it('fills topic, bagua mode, and one-question constraint', () => {
    expect(text).toContain('MySQL 索引与优化');
    expect(text).toContain('八股专项');
    expect(text).toContain('中级');
    expect(text).toMatch(/每次只问一个/);
    expect(text).toContain('第一问只问原理或场景');
    expect(text).not.toContain('按梯度推进');
    expect(text).toContain('interview:chain');
    expect(text).toMatch(/纠正上一问或补充讲解时只短说/);
    expect(text).toContain('【本题】');
  });

  it('starts juniors on definitions and keeps the move menu out of the persona', () => {
    const junior = assembleInterviewerPersona({
      topic: 'MySQL 索引与优化',
      difficulty: 'junior',
    });
    expect(junior).toContain('第一问只问定义');
    expect(junior).not.toContain('按梯度推进');
    expect(junior).not.toContain('答到了');
    expect(junior).not.toContain('有缺口');
    expect(junior).not.toContain('没答上');
  });

  it('does not include coach scoring or standard-answer instructions', () => {
    expect(text).not.toMatch(/标准答要点/);
    expect(text).not.toMatch(/评分过程/);
    expect(text).not.toMatch(/五维/);
    expect(text).not.toMatch(/questionBrief/);
    expect(text).not.toMatch(/keyPoints/);
    expect(text).toMatch(/禁止输出 JSON/);
  });
});
