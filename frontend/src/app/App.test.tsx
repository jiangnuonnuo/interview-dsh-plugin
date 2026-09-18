import { render, screen, act } from '@testing-library/react';
import { App } from './App';
import { createMemoryEntryPort } from '../features/entry/memory-port';
import { examPanelState } from '../features/entry/exam-panel-state';

describe('App', () => {
  afterEach(() => {
    act(() => {
      examPanelState.set(null);
    });
  });
  it('only mounts the entry panel', () => {
    render(<App port={createMemoryEntryPort()} />);
    expect(screen.getByText('模拟面试')).toBeDefined();
    expect(screen.getByText('选择面试主题')).toBeDefined();
    expect(screen.queryByText('Frontend scaffold ready.')).toBeNull();
  });
});
