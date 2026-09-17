import { render, screen } from '@testing-library/react';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';
import { examPanelState } from './exam-panel-state';

describe('EntryPanel regressions', () => {
  afterEach(() => {
    examPanelState.set(null);
  });
  it('does not render duration, folder picker, chat list, composer, or bubbles', () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    expect(screen.queryByText(/30\s*分钟/)).toBeNull();
    expect(screen.queryByText('倒计时')).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(document.querySelector('input[webkitdirectory]')).toBeNull();
    expect(screen.queryByLabelText(/文件夹/)).toBeNull();
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByPlaceholderText(/发消息|输入消息|聊天/)).toBeNull();
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.querySelector('[data-chat-role]')).toBeNull();
    expect(document.querySelector('[role="listitem"][data-role]')).toBeNull();
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
  });
});
