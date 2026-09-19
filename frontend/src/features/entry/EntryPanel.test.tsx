import { fireEvent, render, screen, act } from '@testing-library/react';
import { CUSTOM_TOPIC_ID } from 'interview-dsh-shared';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';
import { examPanelState } from './exam-panel-state';

describe('EntryPanel', () => {
  afterEach(() => {
    act(() => {
      examPanelState.set(null);
    });
  });
  it('defaults difficulty to 中级', () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    expect(screen.getByRole('radio', { name: '中级' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '初级' }).getAttribute('aria-checked')).toBe('false');
  });

  it('shows xerina brand, circular avatar, and coach footer on the entry shell', () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    expect(screen.getByRole('heading', { name: '模拟面试' })).toBeDefined();
    expect(screen.getByText('xerina · 八股专项陪练')).toBeDefined();
    expect(screen.getByText('coach by xerina')).toBeDefined();
    const avatar = screen.getByRole('img', { name: /xerina/i });
    expect(avatar.getAttribute('src')).toMatch(/xerina-avatar/);
    expect(avatar.closest('a')).toBeNull();
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
    expect(screen.queryByText(/30\s*分钟/)).toBeNull();
    expect(screen.queryByLabelText(/文件夹/)).toBeNull();
  });

  it('selects MySQL as the current topic', () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    expect(screen.getByRole('button', { name: /MySQL 索引与优化/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows Redis when searching Redis', () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索面试主题' }), {
      target: { value: 'Redis' },
    });
    expect(screen.getByRole('button', { name: /Redis 并发与缓存/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /MySQL 索引与优化/ })).toBeNull();
    expect(screen.getByRole('button', { name: /自定义主题/ })).toBeDefined();
  });

  it('shows a custom input after selecting 自定义主题', () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByRole('button', { name: /自定义主题/ }));
    expect(screen.getByRole('textbox', { name: '自定义主题' })).toBeDefined();
    expect(CUSTOM_TOPIC_ID).toBe('custom');
  });
});
