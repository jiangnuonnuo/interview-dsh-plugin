/**
 * @jest-environment node
 */

import { extractPendingQuestion } from '../src/services/pending-question.js';

describe('extractPendingQuestion', () => {
  it('uses the text after 【本题】', () => {
    const pending = '联合索引 (col_a, col_b) 在什么查询条件下最左匹配会失效？';
    expect(
      extractPendingQuestion(`页分裂会放大随机读。\n\n【本题】\n${pending}`),
    ).toBe(pending);
  });

  it('takes the trailing question after a lecture with no interrogatives', () => {
    const pending = '联合索引 (col_a, col_b) 在什么查询条件下最左匹配会失效？';
    const mixed = [
      '你刚才说没影响，这个判断不准确。',
      'InnoDB 页分裂后新页往往不与原页连续，范围扫描会变成更多随机读，放大磁盘 I/O。',
      pending,
    ].join('\n\n');
    expect(extractPendingQuestion(mixed)).toBe(pending);
  });

  it('skips a trailing agenda paragraph that has no question mark', () => {
    const pending =
      '你能再展开说一句：这个链表结构为什么比 B 树的叶子节点更适合做范围查询吗？';
    const mixed = [
      '没关系，我们先把你刚才提到的点锚定清楚。',
      pending,
      '说完这点后，我们再回头看另外两个维度：数据结构特性和磁盘 I/O 行为。',
    ].join('\n\n');
    expect(extractPendingQuestion(mixed)).toBe(pending);
  });

  it('keeps consecutive list questions as one pending prompt', () => {
    const first = '当查询条件为 WHERE a = 1 AND c = 2 时，索引对 a 和 c 的利用情况如何？';
    const second = '若改为 WHERE a = 1 AND b > 1 AND c = 2 ，索引实际能用到哪一列？为什么？';
    const mixed = ['联合索引 (a, b, c) 遵循最左前缀匹配。请分析：', first, second].join('\n');
    expect(extractPendingQuestion(mixed)).toBe(`${first}\n${second}`);
  });

  it('returns the whole turn when there is no interrogative', () => {
    const text = '欢迎，本轮是 MySQL 索引与优化 的高级专项面试。';
    expect(extractPendingQuestion(text)).toBe(text);
  });
});
