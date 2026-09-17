import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  emptyBaguaScores,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type InProgressSnapshot,
  type WatchCoachTurnRequest,
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
  const pending: Array<{
    request: WatchCoachTurnRequest;
    resolve: (value: WatchCoachTurnResponse) => void;
  }> = [];
  const requests: WatchCoachTurnRequest[] = [];
  const memory = createMemoryEntryPort();
  const port: EntryPort = {
    ...memory,
    async startInterview() {
      return { ok: true, snapshot: firstSnapshot };
    },
    watchCoachTurn(request) {
      requests.push(request);
      return new Promise((resolve) => {
        pending.push({ request, resolve });
      });
    },
  };
  return {
    port,
    requests,
    resolve(value: WatchCoachTurnResponse) {
      const next = pending.shift();
      if (next === undefined) {
        throw new Error('no pending watchCoachTurn');
      }
      next.resolve(value);
    },
    resolveForce(value: WatchCoachTurnResponse) {
      const index = pending.findIndex((item) => item.request.force === true);
      if (index < 0) {
        throw new Error('no pending force watchCoachTurn');
      }
      const [item] = pending.splice(index, 1);
      item.resolve(value);
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

  it('force-refreshes the current question when 刷新本题 is clicked', async () => {
    const { port, requests, resolveForce } = createDeferredWatchPort();
    await startExam(port);
    fireEvent.click(screen.getByTestId('refresh-coach'));
    await waitFor(() => {
      expect(requests.some((request) => request.force === true)).toBe(true);
    });
    expect(screen.getByTestId('refresh-coach')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('refresh-coach').textContent).toBe('刷新中');

    await act(async () => {
      resolveForce({ ok: true, status: 'updated', snapshot: nextSnapshot });
    });

    await waitFor(() => {
      expect(screen.getByText('二级索引如何回表')).toBeDefined();
    });
    expect(screen.getByText('先查二级再回聚簇')).toBeDefined();
    expect(screen.queryByText('聚簇索引和二级索引的区别')).toBeNull();
    expect(screen.getByTestId('refresh-coach').textContent).toBe('刷新本题');
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByPlaceholderText(/发消息|输入消息|聊天/)).toBeNull();
  });

  it('keeps the previous snapshot when force refresh fails', async () => {
    const { port, resolveForce } = createDeferredWatchPort();
    await startExam(port);
    fireEvent.click(screen.getByTestId('refresh-coach'));
    await act(async () => {
      resolveForce({
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

  it('ignores a late force-refresh result after unmount', async () => {
    const { port, resolveForce } = createDeferredWatchPort();
    const view = render(<EntryPanel port={port} />);
    fireEvent.click(screen.getByRole('button', { name: /MySQL 索引与优化/ }));
    fireEvent.click(screen.getByRole('button', { name: '开始模拟面试' }));
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('refresh-coach'));
    view.unmount();
    await act(async () => {
      resolveForce({ ok: true, status: 'updated', snapshot: nextSnapshot });
    });
    expect(screen.queryByText('二级索引如何回表')).toBeNull();
  });

  it('returns to the entry form after 结束本场 so a new round can start', async () => {
    const { port } = createDeferredWatchPort();
    await startExam(port);
    fireEvent.click(screen.getByTestId('end-exam'));
    expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
    expect(screen.queryByTestId('interview-in-progress')).toBeNull();
    expect(screen.queryByText('聚簇索引和二级索引的区别')).toBeNull();
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

  it('force-updates without waiting for the second poll', async () => {
    const port = createMemoryEntryPort();
    await port.startInterview({ topicId: 'mysql', customTopic: '', difficulty: 'mid' });
    const forced = await port.watchCoachTurn({ sessionId: 'memory-session', force: true });
    expect(forced.ok).toBe(true);
    if (forced.ok && forced.status === 'updated') {
      expect(forced.snapshot.questionBrief).toMatch(/强制刷新摘要/);
    }
  });
});
