import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';
import { examPanelState } from './exam-panel-state';

describe('EntryPanel jev config', () => {
  afterEach(() => {
    act(() => {
      examPanelState.set(null);
    });
  });

  it('keeps start available when the judge toggle is unused', async () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    expect(screen.getByText('卡片判断')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
    expect(screen.queryByText('miss')).toBeNull();
    expect(screen.queryByText('wide_gap')).toBeNull();
    expect(screen.queryByText('deepen')).toBeNull();
    expect(screen.queryByText(/Jev/)).toBeNull();
  });

  it('shows a visible key error without blocking start', async () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByText('卡片判断'));
    fireEvent.click(screen.getByLabelText('开启 Jev 定档'));
    fireEvent.click(screen.getByRole('button', { name: '测试连通并保存' }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/密钥/);
    });
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
  });

  it('reloads enabled without echoing the key', async () => {
    const port = createMemoryEntryPort();
    await port.saveJevConfig({ enabled: true, apiKey: 'sk-secret-value' });
    render(<EntryPanel port={port} />);
    fireEvent.click(screen.getByText('卡片判断'));
    await waitFor(() => {
      expect((screen.getByLabelText('开启 Jev 定档') as HTMLInputElement).checked).toBe(true);
    });
    const keyBox = screen.getByLabelText(/Jev 密钥/) as HTMLInputElement;
    expect(keyBox.value).toBe('');
    expect(keyBox.placeholder).toMatch(/已保存/);
    expect(screen.getByText('已连通')).toBeDefined();
    expect(document.body.textContent).not.toContain('sk-secret-value');
  });

  it('probes and saves the key when starting with the toggle on', async () => {
    const port = createMemoryEntryPort();
    const save = jest.spyOn(port, 'saveJevConfig');
    render(<EntryPanel port={port} />);
    fireEvent.click(screen.getByText('卡片判断'));
    fireEvent.click(screen.getByLabelText('开启 Jev 定档'));
    fireEvent.change(screen.getByLabelText(/Jev 密钥/), { target: { value: 'sk-live' } });
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
    expect(save).toHaveBeenCalledWith({ enabled: true, apiKey: 'sk-live' });
  });

  it('does not keep a failed key and still allows start', async () => {
    const port = createMemoryEntryPort({ jevProbeFails: true });
    render(<EntryPanel port={port} />);
    fireEvent.click(screen.getByText('卡片判断'));
    fireEvent.click(screen.getByLabelText('开启 Jev 定档'));
    fireEvent.change(screen.getByLabelText(/Jev 密钥/), { target: { value: 'sk-bad' } });
    fireEvent.click(screen.getByRole('button', { name: '测试连通并保存' }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/连通失败/);
    });
    const keyBox = screen.getByLabelText(/Jev 密钥/) as HTMLInputElement;
    expect(keyBox.placeholder).not.toMatch(/已保存/);
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
  });
});
