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

const twoCardDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [scored, q2],
  currentCardId: 'Q2',
});

describe('InProgressPanel', () => {
  it('shows in-progress topic, brief, and key points without a chat surface', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    expect(screen.getByText('进行中')).toBeDefined();
    expect(screen.getByText(/MySQL 索引与优化/)).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();
    expect(screen.getByText('聚簇索引叶子即行')).toBeDefined();
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByPlaceholderText(/发消息|输入消息|聊天/)).toBeNull();
    expect(document.querySelector('.bubble')).toBeNull();
    expect(screen.queryByText('提示一下')).toBeNull();
    expect(screen.queryByText('跳过问题')).toBeNull();
    expect(screen.queryByText(/30\s*分钟/)).toBeNull();
    expect(screen.queryByLabelText(/文件夹/)).toBeNull();
  });

  it('calls onRefresh from 刷新本题 without adding a chat surface', () => {
    const onRefresh = jest.fn();
    render(<InProgressPanel deck={pendingDeck} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId('refresh-coach'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('log')).toBeNull();
    expect(document.querySelector('.bubble')).toBeNull();
  });

  it('disables 刷新本题 while refreshing', () => {
    render(<InProgressPanel deck={pendingDeck} onRefresh={() => undefined} refreshing />);
    const button = screen.getByTestId('refresh-coach');
    expect(button).toHaveProperty('disabled', true);
    expect(button.textContent).toBe('刷新中');
  });

  it('calls onEnd from 结束本场 without adding a chat surface', () => {
    const onEnd = jest.fn();
    render(<InProgressPanel deck={pendingDeck} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId('end-exam'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('log')).toBeNull();
    expect(document.querySelector('.bubble')).toBeNull();
  });

  it('renders score placeholders without computing a number on a pending card', () => {
    render(<InProgressPanel deck={pendingDeck} />);
    const scores = screen.getByTestId('score-placeholders');
    expect(scores.textContent).toMatch(/基础扎实度/);
    expect(scores.textContent).toMatch(/—/);
    expect(scores.textContent).not.toMatch(/\d/);
  });

  it('shows backend scores on a scored card and can switch back', () => {
    render(<InProgressPanel deck={twoCardDeck} />);
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByText('二级索引如何回表')).toBeDefined();
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.getByText('只讲了聚簇')).toBeDefined();
    expect(screen.getByText('叶子节点存行。')).toBeDefined();
    const scores = screen.getByTestId('score-placeholders');
    expect(scores.textContent).toMatch(/3\.5/);
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.querySelector('.bubble')).toBeNull();
  });
});
