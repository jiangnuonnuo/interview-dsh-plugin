import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';

describe('EntryPanel start', () => {
  it('enters 待开考 without rendering bubbles on success', async () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('entry-pending')).toBeDefined();
    });
    expect(screen.getByText('待开考')).toBeDefined();
    expect(screen.getByText(/配置已记下，面试官尚未接入/)).toBeDefined();
    expect(screen.queryByRole('log')).toBeNull();
    expect(document.querySelector('[data-chat-role]')).toBeNull();
    expect(document.querySelector('.bubble')).toBeNull();
  });

  it('rejects start without a topic and shows an error', async () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/主题/);
    });
    expect(screen.queryByTestId('entry-pending')).toBeNull();
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
  });

  it('rejects a blank custom topic and shows an error', async () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByRole('button', { name: /自定义主题/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/自定义主题不能为空/);
    });
    expect(screen.queryByTestId('entry-pending')).toBeNull();
  });
});
