/**
 * @jest-environment node
 */

import {
  INTERVIEW_OPENING_PROMPT,
  INTERVIEW_ROUND_END_TRIGGER,
  assembleNextRoundOpeningPrompt,
  createInterviewDeck,
  createPendingCard,
} from 'interview-dsh-shared';
import { renderCardMarkdown } from '../src/data/workspace-archive.js';
import {
  clipChain,
  fallbackChain,
  relationForNextCard,
  type ParsedChain,
} from '../src/services/knowledge-chain.js';

const chain = (layer: ParsedChain['layer'], deep = '再问一次定义'): ParsedChain => ({
  pointName: 'B+树',
  layer,
  intent: '说出按页读磁盘',
  moves: { deep, partial: '只追扇出', miss: '留在本层换问法' },
  matchedMove: 'deep',
});

describe('opening prompts stay free of director clauses', () => {
  const next = assembleNextRoundOpeningPrompt('MySQL 索引与优化', 'mid');

  it('uses the short opening and the natural next-round line', () => {
    for (const text of [INTERVIEW_OPENING_PROMPT, next, INTERVIEW_ROUND_END_TRIGGER]) {
      expect(text).not.toContain('请按人设');
      expect(text).not.toContain('知识链');
      expect(text).not.toContain('只问第一个问题');
    }
    expect(INTERVIEW_OPENING_PROMPT).toBe('开始本场八股专项模拟面试。');
    expect(next).toBe('上一轮已经结束。开始新一轮：主题「MySQL 索引与优化」，难度「中级」。');
    expect(INTERVIEW_ROUND_END_TRIGGER).toBe('结束面试');
  });
});

describe('clipChain', () => {
  it('rewrites a junior boundary layer down to scene', () => {
    const clipped = clipChain({
      difficulty: 'junior',
      chain: chain('boundary'),
      cardIds: ['Q1'],
    });
    expect(clipped.layer).toBe('scene');
    expect(clipped.mustSwitch).toBe(false);
  });

  it('keeps guiding on the same point after two questions', () => {
    const clipped = clipChain({
      difficulty: 'junior',
      chain: chain('define'),
      cardIds: ['Q1', 'Q1.1'],
    });
    expect(clipped.mustSwitch).toBe(false);
    expect(clipped.moves).not.toBeNull();
    expect(clipped.sectionText).toContain('可以把步骤点到只剩最后一问');
    expect(clipped.sectionText).not.toContain('必须换成另一个知识点');
    expect(clipped.sectionText).not.toContain('必须换知识点');
  });

  it('fills a junior fallback chain on the definition layer', () => {
    const clipped = clipChain({
      difficulty: 'junior',
      chain: fallbackChain({
        difficulty: 'junior',
        questionBrief: '聚簇索引',
        keyPoints: ['叶子即行'],
      }),
      cardIds: ['Q1'],
    });
    expect(clipped.layer).toBe('define');
    expect(clipped.intent).toBe('叶子即行');
    expect(clipped.pointName).toBe('聚簇索引');
    expect(clipped.sectionText).toContain('留在这道题上引导');
    expect(clipped.mustSwitch).toBe(false);
  });

  it('makes a senior deep move change the premise', () => {
    const clipped = clipChain({
      difficulty: 'senior',
      chain: chain('why'),
      cardIds: ['Q1'],
    });
    expect(clipped.moves?.deep).toContain('前提');
    expect(clipped.layer).toBe('why');
  });
});

describe('relationForNextCard', () => {
  const previous = clipChain({
    difficulty: 'mid',
    chain: chain('why', '换一个前提再问'),
    cardIds: ['Q1'],
  });

  it('maps the three answer moves to a follow-up and switch to the next topic', () => {
    expect(relationForNextCard({ previous, matchedMove: 'deep', nextLayer: 'why' })).toBe('followup');
    expect(relationForNextCard({ previous, matchedMove: 'partial', nextLayer: 'why' })).toBe('followup');
    expect(relationForNextCard({ previous, matchedMove: 'miss', nextLayer: 'why' })).toBe('followup');
    expect(relationForNextCard({ previous, matchedMove: 'switch', nextLayer: 'scene' })).toBe('next_topic');
  });

  it('does not force a new topic just because several cards already exist', () => {
    expect(relationForNextCard({ previous, matchedMove: undefined, nextLayer: 'why', fallback: 'followup' })).toBe(
      'followup',
    );
    const full = clipChain({
      difficulty: 'junior',
      chain: chain('define'),
      cardIds: ['Q1', 'Q1.1'],
    });
    expect(full.mustSwitch).toBe(false);
    expect(relationForNextCard({ previous: full, matchedMove: 'deep', nextLayer: 'define' })).toBe('followup');
  });
});

describe('renderCardMarkdown exam intent', () => {
  it('writes the layer and intent and omits the move menu', () => {
    const deck = createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL',
      difficulty: 'mid',
      cards: [
        createPendingCard({
          id: 'Q1',
          questionText: '为什么用 B+ 树？',
          questionBrief: 'B+ 树与磁盘',
          keyPoints: ['按页读取'],
          layer: 'why',
          intent: '说出扇出和页',
        }),
      ],
      currentCardId: 'Q1',
    });
    const text = renderCardMarkdown(deck, 'Q1');
    expect(text).toContain('## 考察');
    expect(text).toContain('原理');
    expect(text).toContain('说出扇出和页');
    expect(text).not.toContain('答到了');
    expect(text).not.toContain('有缺口');
    expect(text).not.toContain('没答上');
  });

  it('writes each answer turn and the latest comparison on the same card', () => {
    const deck = createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL',
      difficulty: 'mid',
      cards: [
        {
          ...createPendingCard({
            id: 'Q1',
            questionText: '为什么用 B+ 树？',
            questionBrief: 'B+ 树与磁盘',
            keyPoints: ['按页读取'],
            layer: 'why',
            intent: '说出扇出和页',
          }),
          answer: '不会。\n\n按页读。',
          answerTurns: ['不会。', '按页读。'],
          guideCount: 2,
          coverage: 'miss',
          status: 'scored',
          comparison: { covered: [], missed: ['扇出'], comment: '第二轮仍缺扇出' },
        },
      ],
      currentCardId: 'Q1',
    });
    const text = renderCardMarkdown(deck, 'Q1');
    expect(text).toContain('a1');
    expect(text).toContain('不会。');
    expect(text).toContain('a2');
    expect(text).toContain('按页读。');
    expect(text).toContain('第二轮仍缺扇出');
    expect(text).not.toContain('Q1.1');
  });
});
