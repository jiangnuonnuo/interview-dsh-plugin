import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  emptyBaguaScores,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type InProgressSnapshot,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';
import type { EntryPort } from './entry-port';
import { examPanelState } from './exam-panel-state';

const firstSnapshot: InProgressSnapshot = {
  phase: 'in_progress',
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  questionBrief: '聚簇索引和二级索引的区别',
  keyPoints: ['聚簇索引叶子即行'],
  scores: emptyBaguaScores(),
};

const nextSnapshot: InProgressSnapshot = {
  ...firstSnapshot,
  questionBrief: '二级索引如何回表',
  keyPoints: ['先查二级再回聚簇'],
};

const createDeferredWatchPort = () => {
  const pending: Array<(value: WatchCoachTurnResponse) => void> = [];
  const memory = createMemoryEntryPort();
  const port: EntryPort = {
    ...memory,
    async startInterview() {
      return { ok: true, snapshot: firstSnapshot };
    },
    watchCoachTurn() {
      return new Promise((resolve) => {
        pending.push(resolve);
      });
    },
  };
  return {
    port,
    resolve(value: WatchCoachTurnResponse) {
      const next = pending.shift();
      if (next === undefined) {
        throw new Error('no pending watchCoachTurn');
      }
      next(value);
    },
  };
};

const startExam = async (port: EntryPort) => {
  render(<EntryPanel port={port} />);
  fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
  fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
  await waitFor(() => {
    expect(screen.getByTestId('interview-in-progress')).toBeDefined();
  });
};

describe('EntryPanel watchCoachTurn', () => {
  afterEach(() => {
    examPanelState.set(null);
  });
  it('replaces the brief and key points when a later turn arrives', async () => {
    const { port, resolve } = createDeferredWatchPort();
    await startExam(port);
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();

    await act(async () => {
      resolve({ ok: true, status: 'updated', snapshot: nextSnapshot });
    });

    await waitFor(() => {
      expect(screen.getByText('二级索引如何回表')).toBeDefined();
    });
    expect(screen.getByText('先查二级再回聚簇')).toBeDefined();
    expect(screen.queryByText('聚簇索引和二级索引的区别')).toBeNull();

    const thirdSnapshot: InProgressSnapshot = {
      ...nextSnapshot,
      questionBrief: 'Redisson看门狗续期',
      keyPoints: ['客户端续期而不是服务端TTL'],
    };
    await act(async () => {
      resolve({ ok: true, status: 'updated', snapshot: thirdSnapshot });
    });
    await waitFor(() => {
      expect(screen.getByText('Redisson看门狗续期')).toBeDefined();
    });
    expect(screen.getByText('客户端续期而不是服务端TTL')).toBeDefined();
    expect(screen.queryByText('二级索引如何回表')).toBeNull();
    const scores = screen.getByTestId('score-placeholders');
    expect(scores.textContent).toMatch(/—/);
    expect(scores.textContent).not.toMatch(/\d/);
  });

  it('keeps the previous snapshot when refresh fails', async () => {
    const { port, resolve } = createDeferredWatchPort();
    await startExam(port);

    await act(async () => {
      resolve({
        ok: false,
        code: 'coach_unavailable',
        message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/没有可用的同模型补全/);
    });
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();
    expect(screen.getByText('聚簇索引叶子即行')).toBeDefined();
  });

  it('ignores a late watch result after unmount', async () => {
    const { port, resolve } = createDeferredWatchPort();
    const view = render(<EntryPanel port={port} />);
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });

    view.unmount();
    await act(async () => {
      resolve({ ok: true, status: 'updated', snapshot: nextSnapshot });
    });

    expect(screen.queryByText('二级索引如何回表')).toBeNull();
  });

  it('restores the in-progress snapshot after the overlay unmounts', async () => {
    const { port, resolve } = createDeferredWatchPort();
    const first = render(<EntryPanel port={port} />);
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
    first.unmount();
    render(<EntryPanel port={port} />);
    expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();
    await act(async () => {
      resolve({ ok: true, status: 'unchanged' });
    });
    await act(async () => {
      resolve({ ok: true, status: 'updated', snapshot: nextSnapshot });
    });
    await waitFor(() => {
      expect(screen.getByText('二级索引如何回表')).toBeDefined();
    });
  });
});

describe('memory watchCoachTurn', () => {
  it('returns an updated snapshot on the second call', async () => {
    const port = createMemoryEntryPort();
    await port.startInterview({ topicId: 'mysql', customTopic: '', difficulty: 'mid' });
    const first = await port.watchCoachTurn({ sessionId: 'memory-session' });
    expect(first).toEqual({ ok: true, status: 'unchanged' });
    const second = await port.watchCoachTurn({ sessionId: 'memory-session' });
    expect(second.ok).toBe(true);
    if (second.ok && second.status === 'updated') {
      expect(second.snapshot.questionBrief).toMatch(/下一问摘要/);
      expect(second.snapshot.scores).toEqual(emptyBaguaScores());
    }
  });
});
