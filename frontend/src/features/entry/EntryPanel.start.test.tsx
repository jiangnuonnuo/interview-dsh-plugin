import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import {
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type AcceptEntryConfigRequest,
  type StartInterviewResponse,
} from 'interview-dsh-shared';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';
import type { EntryPort } from './entry-port';
import { examPanelState } from './exam-panel-state';

const failingStartPort = (response: StartInterviewResponse): EntryPort => ({
  ...createMemoryEntryPort(),
  async startInterview() {
    return response;
  },
});

describe('EntryPanel start', () => {
  afterEach(() => {
    act(() => {
      examPanelState.set(null);
    });
  });
  it('enters 进行中 without rendering bubbles on success', async () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
    expect(screen.getByText('进行中')).toBeDefined();
    expect(screen.getByText('主题：MySQL 索引与优化')).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.queryByText('待开考')).toBeNull();
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
    expect(screen.queryByTestId('interview-in-progress')).toBeNull();
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
  });

  it('rejects a blank custom topic and shows an error', async () => {
    render(<EntryPanel port={createMemoryEntryPort()} />);
    fireEvent.click(screen.getByRole('button', { name: /自定义主题/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/自定义主题不能为空/);
    });
    expect(screen.queryByTestId('interview-in-progress')).toBeNull();
  });

  it('shows inject failure without entering a fake in-progress view', async () => {
    render(
      <EntryPanel
        port={failingStartPort({
          ok: false,
          code: 'inject_unavailable',
          message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/没有可寻址的 Agent/);
    });
    expect(screen.queryByTestId('interview-in-progress')).toBeNull();
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
  });
});

describe('memory startInterview', () => {
  it('accepts a valid request', async () => {
    const request: AcceptEntryConfigRequest = {
      topicId: 'mysql',
      customTopic: '',
      difficulty: 'mid',
    };
    const result = await createMemoryEntryPort().startInterview(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deck.cards[0]?.id).toBe('Q1');
      expect(result.deck.cards[0]?.scores.every((item) => item.score === null)).toBe(true);
    }
  });
});
