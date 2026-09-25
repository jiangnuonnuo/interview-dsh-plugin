/**
 * @jest-environment node
 */

import { createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import {
  applyReaskCap,
  buildCoverageSettleInput,
  countReasksOnThread,
  jevStateFromInput,
  topicRootId,
} from '../src/services/coverage-port.js';

const q1 = createPendingCard({
  id: 'Q1',
  questionText: 'Q1 题干',
  questionBrief: 'Q1 摘要',
  keyPoints: ['要点一'],
  layer: 'why',
  intent: '说清机制',
});
const q1_1 = {
  ...createPendingCard({
    id: 'Q1.1',
    questionText: 'Q1.1 题干',
    questionBrief: 'Q1.1 摘要',
    keyPoints: ['要点二'],
  }),
  coverage: 'reask' as const,
  status: 'scored' as const,
  answer: '第一轮',
  answerTurns: ['第一轮'],
};
const q1_2 = createPendingCard({
  id: 'Q1.2',
  questionText: 'Q1.2 题干',
  questionBrief: 'Q1.2 摘要',
  keyPoints: ['要点三'],
});

const deck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [
    { ...q1, coverage: 'reask', status: 'scored', answer: 'a', answerTurns: ['a'] },
    q1_1,
    q1_2,
  ],
  currentCardId: 'Q1.2',
});

describe('coverage thread and reask cap', () => {
  it('counts reasks on the same Qn thread excluding the current card', () => {
    expect(topicRootId('Q1.2')).toBe('Q1');
    expect(countReasksOnThread(deck.cards, 'Q1.2')).toBe(2);
    expect(applyReaskCap('reask', 2)).toBe('reask');
    expect(applyReaskCap('reask', 3)).toBe('next');
    expect(applyReaskCap('miss', 3)).toBe('next');
  });

  it('includes parent cards when the current card is Q1.2', () => {
    const input = buildCoverageSettleInput(deck, q1_2, deck.topic, deck.difficulty, '当前作答');
    expect(input.thread.map((card) => card.id)).toEqual(['Q1', 'Q1.1', 'Q1.2']);
    expect(input.thread[2]?.answerTurns).toEqual(['当前作答']);
    const state = jevStateFromInput(input);
    const chain = state['知识链'] as Array<{ 编号: string }>;
    expect(chain.map((card) => card.编号)).toEqual(['Q1', 'Q1.1', 'Q1.2']);
  });
});
