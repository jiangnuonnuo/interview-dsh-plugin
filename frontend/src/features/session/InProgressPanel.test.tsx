import { fireEvent, render, screen } from '@testing-library/react';
import { emptyBaguaScores } from 'interview-dsh-shared';
import { InProgressPanel } from './InProgressPanel';

const snapshot = {
  phase: 'in_progress' as const,
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid' as const,
  questionBrief: '聚簇索引和二级索引的区别',
  keyPoints: ['聚簇索引叶子即行', '二级索引需要回表'],
  scores: emptyBaguaScores(),
};

describe('InProgressPanel', () => {
  it('shows in-progress topic, brief, and key points without a chat surface', () => {
    render(<InProgressPanel snapshot={snapshot} />);
    expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    expect(screen.getByText('进行中')).toBeDefined();
    expect(screen.getByText(/MySQL 索引与优化/)).toBeDefined();
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
    render(<InProgressPanel snapshot={snapshot} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId('refresh-coach'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('log')).toBeNull();
    expect(document.querySelector('.bubble')).toBeNull();
  });

  it('disables 刷新本题 while refreshing', () => {
    render(<InProgressPanel snapshot={snapshot} onRefresh={() => undefined} refreshing />);
    const button = screen.getByTestId('refresh-coach');
    expect(button).toHaveProperty('disabled', true);
    expect(button.textContent).toBe('刷新中');
  });

  it('calls onEnd from 结束本场 without adding a chat surface', () => {
    const onEnd = jest.fn();
    render(<InProgressPanel snapshot={snapshot} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId('end-exam'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('log')).toBeNull();
    expect(document.querySelector('.bubble')).toBeNull();
  });

  it('renders score placeholders without computing a number', () => {
    render(<InProgressPanel snapshot={snapshot} />);
    const scores = screen.getByTestId('score-placeholders');
    expect(scores.textContent).toMatch(/基础扎实度/);
    expect(scores.textContent).toMatch(/—/);
    expect(scores.textContent).not.toMatch(/\d/);
  });
});
