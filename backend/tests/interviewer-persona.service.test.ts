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
    expect(text).toContain('是什么');
    expect(text).toContain('为什么');
  });

  it('does not include coach scoring or standard-answer instructions', () => {
    expect(text).not.toMatch(/标准答要点/);
    expect(text).not.toMatch(/评分过程/);
    expect(text).not.toMatch(/五维/);
    expect(text).not.toMatch(/questionBrief/);
    expect(text).not.toMatch(/keyPoints/);
  });
});
