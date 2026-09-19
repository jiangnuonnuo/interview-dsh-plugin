/**
 * @jest-environment node
 */

import { BAGUA_SCORE_DIMENSIONS, createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import { renderQaMarkdown, renderSummaryMarkdown } from '../src/data/round-notes.js';

const q1 = {
  ...createPendingCard({
    id: 'Q1',
    questionText: '请说明聚簇索引。',
    questionBrief: '聚簇',
    keyPoints: ['叶子即行'],
  }),
  answer: '叶子节点存行。',
  comparison: {
    covered: ['叶子即行'],
    missed: [] as string[],
    comment: '覆盖了聚簇',
  },
  scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 4 })),
  status: 'scored' as const,
};

const q1_1 = createPendingCard({
  id: 'Q1.1',
  questionText: '二级索引如何回表？',
  questionBrief: '回表',
  keyPoints: ['先查二级'],
});

const deck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [q1, q1_1],
  currentCardId: 'Q1.1',
});

describe('round notes markdown', () => {
  it('writes a single qa.md with separate headings for Q1 and Q1.1', () => {
    const markdown = renderQaMarkdown(deck);
    expect(markdown).toContain('# 本轮问答');
    expect(markdown).toContain('主题：MySQL 索引与优化');
    expect(markdown).toContain('难度：中级');
    expect(markdown).toContain('## Q1');
    expect(markdown).toContain('## Q1.1');
    expect(markdown).toContain('请说明聚簇索引。');
    expect(markdown).toContain('二级索引如何回表？');
    expect(markdown).toContain('叶子节点存行。');
    expect(markdown).toContain('基础扎实度');
    expect(markdown).not.toContain('<details');
    expect(markdown).not.toContain('<summary>');
  });

  it('keeps pending cards with empty scores in qa.md', () => {
    const markdown = renderQaMarkdown(deck);
    expect(markdown).toContain('待作答');
    expect(markdown).toMatch(/Q1\.1[\s\S]*—/);
  });

  it('writes summary.md without mixing in Q/A folds', () => {
    const markdown = renderSummaryMarkdown(deck, '下一轮补回表。');
    expect(markdown).toContain('# 本轮总结');
    expect(markdown).toContain('下一轮补回表。');
    expect(markdown).not.toContain('请说明聚簇索引。');
    expect(markdown).not.toContain('<details');
  });

  it('marks missing summary without dropping the qa renderer', () => {
    const markdown = renderSummaryMarkdown(deck, null);
    expect(markdown).toContain('本轮总结未生成。');
  });
});
