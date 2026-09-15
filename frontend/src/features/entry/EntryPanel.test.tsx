import { fireEvent, render, screen } from '@testing-library/react';
import { CUSTOM_TOPIC_ID } from 'interview-dsh-shared';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';

describe('EntryPanel', () => {
  it('defaults difficulty to 中级', () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    expect(screen.getByRole('radio', { name: '中级' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '初级' }).getAttribute('aria-checked')).toBe('false');
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
