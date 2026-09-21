import { fireEvent, render, screen } from '@testing-library/react';
import { BAGUA_SCORE_DIMENSIONS, createInterviewDeck, createPendingCard } from 'interview-dsh-shared';
import { InProgressPanel } from './InProgressPanel';

const pending = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '聚簇索引和二级索引的区别',
  keyPoints: ['聚簇索引叶子即行', '二级索引需要回表'],
});

const scored = {
  ...pending,
  id: 'Q1',
  answer: '叶子节点存行。',
  comparison: {
    covered: ['聚簇索引叶子即行'],
    missed: ['二级索引需要回表'],
    comment: '只讲了聚簇',
  },
  scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 3.5 })),
  status: 'scored' as const,
};

const q2 = createPendingCard({
  id: 'Q2',
  questionText: '二级索引如何回表？',
  questionBrief: '二级索引如何回表',
  keyPoints: ['先查二级再回聚簇'],
});

const pendingDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [pending],
  currentCardId: 'Q1',
});

const scoredOnlyDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [scored],
  currentCardId: 'Q1',
});

const twoCardDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [scored, q2],
  currentCardId: 'Q2',
});

const q2Scored = {
  ...q2,
  answer: '先回表。',
  comparison: { covered: ['先查二级再回聚簇'], missed: [], comment: '可以' },
  scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 4 })),
  status: 'scored' as const,
};

const twoScoredDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [scored, q2Scored],
  currentCardId: 'Q2',
});

const openDetail = () => {
  fireEvent.click(screen.getByTestId('open-card-detail'));
};

const swipeFrom = (target: Element, fromX: number, toX: number, y = 80) => {
  fireEvent.mouseDown(target, { clientX: fromX, clientY: y, button: 0 });
  fireEvent.mouseMove(target, { clientX: toX, clientY: y + 2 });
  fireEvent.mouseUp(target, { clientX: toX, clientY: y + 2, button: 0 });
};

const expand = (name: '作答' | '对照' | '评分') => {
  fireEvent.click(screen.getByRole('button', { name }));
};

const expectNoChatSurface = () => {
  expect(screen.queryByRole('log')).toBeNull();
  expect(screen.queryByPlaceholderText(/发消息|输入消息|聊天/)).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(document.querySelector('.bubble')).toBeNull();
  expect(screen.queryByText('提示一下')).toBeNull();
  expect(screen.queryByText('跳过问题')).toBeNull();
  expect(document.querySelector('details')).toBeNull();
};

describe('InProgressPanel', () => {
  it('defaults to card flow with a detail entry and does not dump key points', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    expect(screen.getByTestId('card-flow')).toBeDefined();
    expect(screen.queryByTestId('card-detail')).toBeNull();
    expect(screen.getByText('进行中 · 八股专项')).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();
    expect(screen.getByRole('button', { name: /查看完整内容/ })).toBeDefined();
    expect(screen.queryByRole('heading', { name: '标准答要点' })).toBeNull();
    expect(screen.queryByText('聚簇索引叶子即行')).toBeNull();
    expect(screen.queryByText('二级索引需要回表')).toBeNull();
    expect(screen.queryByTestId('card-answer')).toBeNull();
    expect(screen.queryByTestId('score-placeholders')).toBeNull();
    expectNoChatSurface();
    expect(screen.queryByText(/30\s*分钟/)).toBeNull();
    expect(screen.queryByLabelText(/文件夹/)).toBeNull();
  });

  it('opens detail from 查看完整内容 even after pointerdown on the CTA', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    const cta = screen.getByTestId('open-card-detail');
    fireEvent.pointerDown(cta, { clientX: 80, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(cta, { clientX: 82, clientY: 121, pointerId: 1 });
    fireEvent.click(cta);
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
  });

  it('opens detail from a jittery CTA pointerup when click is cancelled', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    const cta = screen.getByTestId('open-card-detail');
    fireEvent.pointerDown(cta, { clientX: 80, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(cta, { clientX: 92, clientY: 126, pointerId: 1 });
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.getByText('本题题干')).toBeDefined();
  });

  it('keeps pager and 上一题/下一题 on the flow surface', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    expect(screen.getByTestId('card-pager')).toBeDefined();
    expect(screen.getByTestId('prev-card')).toBeDefined();
    expect(screen.getByTestId('next-card')).toBeDefined();
    expect(screen.getByText('左右滑动切换')).toBeDefined();
  });

  it('opens same-panel detail with stem and key points, then returns to flow', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    openDetail();
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.queryByTestId('card-flow')).toBeNull();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.getByText('本题题干')).toBeDefined();
    expect(screen.getByText('请说明聚簇索引。')).toBeDefined();
    expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
    expect(screen.getByText('聚簇索引叶子即行')).toBeDefined();
    expect(screen.getByText('难度：中级')).toBeDefined();
    fireEvent.click(screen.getByTestId('back-to-flow'));
    expect(screen.getByTestId('card-flow')).toBeDefined();
    expect(screen.queryByTestId('card-detail')).toBeNull();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.queryByRole('heading', { name: '标准答要点' })).toBeNull();
    expectNoChatSurface();
  });

  it('switches card-id with prev/next across two cards', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByText('二级索引如何回表')).toBeDefined();
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    fireEvent.click(screen.getByTestId('next-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expectNoChatSurface();
  });

  it('shows backend answer, comparison, and scores only after expanding detail folds', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    openDetail();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expand('作答');
    expect(screen.getByTestId('card-answer').textContent).toMatch(/叶子节点存行/);
    expand('对照');
    expect(screen.getByTestId('card-comparison').textContent).toMatch(/只讲了聚簇/);
    expand('评分');
    const scores = screen.getByTestId('score-placeholders');
    expect(scores.textContent).toMatch(/3\.5/);
    expect(scores.textContent).toMatch(/基础扎实度/);
    expectNoChatSurface();
    expect(screen.queryByText(/本轮手册/)).toBeNull();
  });

  it('keeps pending detail folds as empty placeholders without frontend scores', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    openDetail();
    expand('作答');
    expect(screen.getByTestId('card-answer').textContent).toMatch(/待作答/);
    expand('对照');
    expect(screen.getByTestId('card-comparison').textContent).toMatch(/待对照/);
    expand('评分');
    const scores = screen.getByTestId('score-placeholders');
    expect(scores.textContent).toMatch(/基础扎实度/);
    expect(scores.textContent).toMatch(/—/);
    expect(scores.textContent).not.toMatch(/\d/);
  });

  it('shows generating-next when the latest card is scored', () => {
    render(<InProgressPanel deck={scoredOnlyDeck} />);
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在准备下一题/);
    expect(screen.getByTestId('card-flow')).toBeDefined();
    expect(screen.getByTestId('current-card')).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.getByTestId('generating-next').getAttribute('role')).toBe('status');
    expect(screen.getByTestId('card-flow').contains(screen.getByTestId('generating-next'))).toBe(true);
  });

  it('opens scored-card detail with key points while next is generating', () => {
    render(<InProgressPanel deck={scoredOnlyDeck} />);
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在准备下一题/);
    openDetail();
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.queryByTestId('generating-next')).toBeNull();
    expect(screen.queryByTestId('card-flow')).toBeNull();
    expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
    expect(screen.getByText('聚簇索引叶子即行')).toBeDefined();
    expect(screen.getByText('请说明聚簇索引。')).toBeDefined();
    expect(screen.getByRole('button', { name: '作答' })).toBeDefined();
  });

  it('lets the user open a history card detail while next is generating', () => {
    render(<InProgressPanel deck={twoScoredDeck} />);
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在准备下一题/);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    fireEvent.click(screen.getByRole('button', { name: '切换到Q1' }));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.queryByTestId('generating-next')).toBeNull();
    openDetail();
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.getByText('请说明聚簇索引。')).toBeDefined();
    expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
    expect(screen.getByText('聚簇索引叶子即行')).toBeDefined();
    expect(screen.queryByTestId('generating-next')).toBeNull();
    fireEvent.click(screen.getByTestId('back-to-flow'));
    fireEvent.click(screen.getByTestId('next-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在准备下一题/);
  });

  it('shows generating-next while refreshing a pending card', () => {
    render(<InProgressPanel deck={pendingDeck} onRefresh={() => undefined} refreshing />);
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在生成本题/);
    expect(screen.getByTestId('refresh-coach')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('refresh-coach').textContent).toBe('刷新中');
    expect(screen.getByTestId('open-card-detail')).toHaveProperty('disabled', false);
    openDetail();
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在生成本题/);
    expect(screen.queryByRole('heading', { name: '标准答要点' })).toBeNull();
  });

  it('hides refresh generating after switching to a scored history card', () => {
    render(<InProgressPanel deck={twoCardDeck} onRefresh={() => undefined} refreshing />);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在生成本题/);
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.queryByTestId('generating-next')).toBeNull();
    openDetail();
    expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
    expect(screen.getByText('聚簇索引叶子即行')).toBeDefined();
    expect(screen.queryByTestId('generating-next')).toBeNull();
  });

  it('hides generating-next after a new pending card arrives', () => {
    const { rerender } = render(<InProgressPanel deck={scoredOnlyDeck} />);
    expect(screen.getByTestId('generating-next')).toBeDefined();
    rerender(<InProgressPanel deck={twoCardDeck} />);
    expect(screen.queryByTestId('generating-next')).toBeNull();
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
  });

  it('jumps to a newly appended card but does not leave a history card when only scores update', () => {
    const { rerender } = render(<InProgressPanel deck={pendingDeck} />);
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    rerender(<InProgressPanel deck={twoCardDeck} />);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    rerender(<InProgressPanel deck={twoScoredDeck} />);
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
  });

  it('enters the new card detail when a card is appended during detail view', () => {
    const { rerender } = render(<InProgressPanel deck={pendingDeck} />);
    openDetail();
    expect(screen.getByTestId('card-detail')).toBeDefined();
    rerender(<InProgressPanel deck={twoCardDeck} />);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByTestId('card-detail')).toBeDefined();
  });

  it('calls onRefresh from 刷新本题 without adding a chat surface', () => {
    const onRefresh = jest.fn();
    render(<InProgressPanel deck={pendingDeck} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId('refresh-coach'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expectNoChatSurface();
  });

  it('calls onEnd from 结束本场 without adding a chat surface', () => {
    const onEnd = jest.fn();
    render(<InProgressPanel deck={pendingDeck} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId('end-exam'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expectNoChatSurface();
  });

  it('swipes left to the next card and does not wrap at the boundary', () => {
    const onClose = jest.fn();
    render(<InProgressPanel deck={twoCardDeck} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    swipeFrom(screen.getByTestId('card-stage'), 120, 40);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    swipeFrom(screen.getByTestId('card-stage'), 120, 40);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('completes a flow swipe when pointerup happens outside the panel', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    fireEvent.mouseDown(screen.getByTestId('card-stage'), { clientX: 180, clientY: 80, button: 0 });
    fireEvent.mouseMove(document.body, { clientX: 40, clientY: 82 });
    fireEvent.mouseUp(document.body, { clientX: 40, clientY: 82, button: 0 });
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByTestId('card-flow')).toBeDefined();
  });

  it('swipes to the next card from detail and stays in detail', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    openDetail();
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    swipeFrom(screen.getByTestId('card-detail'), 180, 20, 90);
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByText('二级索引如何回表')).toBeDefined();
  });

  it('swipes right on detail to the previous card', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    openDetail();
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    swipeFrom(screen.getByTestId('card-detail'), 40, 160, 90);
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.getByTestId('card-detail')).toBeDefined();
  });

  it('treats a horizontal wheel flick as a card swipe', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    fireEvent.wheel(screen.getByTestId('card-stage'), { deltaX: 80, deltaY: 0 });
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
  });

  it('swipes from 查看完整内容 without opening detail', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    swipeFrom(screen.getByTestId('open-card-detail'), 200, 20, 90);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByTestId('card-flow')).toBeDefined();
    expect(screen.queryByTestId('card-detail')).toBeNull();
  });

  it('swipes from a peeked neighbor card', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    swipeFrom(screen.getByRole('button', { name: '切换到Q2' }), 200, 40, 90);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
  });

  it('accumulates small horizontal wheel ticks into one swipe', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    const stage = screen.getByTestId('card-stage');
    fireEvent.wheel(stage, { deltaX: 20, deltaY: 0 });
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    fireEvent.wheel(stage, { deltaX: 25, deltaY: 0 });
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
  });

  it('swipes to the next card from a detail fold header', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    fireEvent.click(screen.getByTestId('prev-card'));
    openDetail();
    swipeFrom(screen.getByRole('button', { name: '作答' }), 180, 20, 90);
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.queryByTestId('card-answer')).toBeNull();
  });
});
