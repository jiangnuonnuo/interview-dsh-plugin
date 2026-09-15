import { render, screen } from '@testing-library/react';
import { App } from './App';
import { createMemoryEntryPort } from '../features/entry/memory-port';

describe('App', () => {
  it('only mounts the entry panel', () => {
    render(<App port={createMemoryEntryPort()} />);
    expect(screen.getByText('模拟面试')).toBeDefined();
    expect(screen.getByText('选择面试主题')).toBeDefined();
    expect(screen.queryByText('Frontend scaffold ready.')).toBeNull();
  });
});
