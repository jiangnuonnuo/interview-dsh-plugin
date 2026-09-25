import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  BAGUA_SCORE_DIMENSIONS,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  createInterviewDeck,
  createPendingCard,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import { EntryPanel } from './EntryPanel';
import { createMemoryEntryPort } from './memory-port';
import type { EntryPort } from './entry-port';
import { examPanelState } from './exam-panel-state';

const firstCard = createPendingCard({
  id: 'Q1',
  questionText: '请说明聚簇索引。',
  questionBrief: '聚簇索引和二级索引的区别',
  keyPoints: ['聚簇索引叶子即行'],
});

const firstDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [firstCard],
  currentCardId: 'Q1',
});

const nextCard = createPendingCard({
  id: 'Q2',
  questionText: '二级索引如何回表？',
  questionBrief: '二级索引如何回表',
  keyPoints: ['先查二级再回聚簇'],
});

const nextDeck = createInterviewDeck({
  sessionId: 'session-exam',
  topic: 'MySQL 索引与优化',
  difficulty: 'mid',
  cards: [firstCard, nextCard],
  currentCardId: 'Q2',
});

const createDeferredWatchPort = (loadDeck = async () => ({ ok: true as const, deck: firstDeck })) => {
  const pending: Array<{
    request: WatchCoachTurnRequest;
    resolve: (value: WatchCoachTurnResponse) => void;
  }> = [];
  const requests: WatchCoachTurnRequest[] = [];
  const memory = createMemoryEntryPort();
  const port: EntryPort = {
    ...memory,
    async startInterview() {
      return { ok: true, deck: firstDeck };
    },
    watchCoachTurn(request) {
      requests.push(request);
      return new Promise((resolve) => {
        pending.push({ request, resolve });
      });
    },
    loadDeck,
    async restoreDeck() {
      return {
        ok: false as const,
        code: 'follow_up_failed' as const,
        message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
      };
    },
    async endRound() {
      return {
        ok: true as const,
        sessionId: firstDeck.sessionId,
        qaPath: '.dsh-interview/session-exam/round-1-MySQL-索引与优化/qa.md',
        summaryPath: '.dsh-interview/session-exam/round-1-MySQL-索引与优化/summary.md',
        ended: true as const,
      };
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

const openDetail = () => {
  fireEvent.click(screen.getByTestId('open-card-detail'));
};

const expand = (name: '作答' | '对照' | '评分') => {
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('EntryPanel watchCoachTurn', () => {
  afterEach(() => {
    act(() => {
      examPanelState.set(null);
    });
  });
  it('shows the new card and keeps Q1 reachable', async () => {
    const { port, resolve } = createDeferredWatchPort();
    await startExam(port);
    expect(screen.getByTestId('card-flow')).toBeDefined();
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();
    expect(screen.queryByText('聚簇索引叶子即行')).toBeNull();

    await act(async () => {
      resolve({ ok: true, status: 'updated', deck: nextDeck });
    });

    await waitFor(() => {
      expect(screen.getByText('二级索引如何回表')).toBeDefined();
    });
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    openDetail();
    expect(screen.getByText('先查二级再回聚簇')).toBeDefined();
    fireEvent.click(screen.getByTestId('back-to-flow'));
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');

    const thirdDeck = createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      cards: [
        firstCard,
        nextCard,
        createPendingCard({
          id: 'Q3',
          questionText: 'Redisson 看门狗',
          questionBrief: 'Redisson看门狗续期',
          keyPoints: ['客户端续期而不是服务端TTL'],
        }),
      ],
      currentCardId: 'Q3',
    });
    await act(async () => {
      resolve({ ok: true, status: 'updated', deck: thirdDeck });
    });
    await waitFor(() => {
      expect(screen.getByText('Redisson看门狗续期')).toBeDefined();
    });
    expect(screen.getByTestId('card-id').textContent).toBe('Q3');
    openDetail();
    expand('评分');
    const scores = screen.getByTestId('score-placeholders');
    expect(scores.textContent).toMatch(/—/);
    expect(scores.textContent).not.toMatch(/\d/);
  });

  it('keeps scored-card detail readable when watch returns without a new card', async () => {
    const { port, resolve } = createDeferredWatchPort();
    await startExam(port);
    openDetail();
    const scoredDeck = createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      cards: [
        {
          ...firstCard,
          status: 'scored' as const,
          answer: '叶子即行',
          comparison: { covered: ['聚簇索引叶子即行'], missed: [], comment: '可以' },
          scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 3.5 })),
        },
      ],
      currentCardId: 'Q1',
    });
    await act(async () => {
      resolve({ ok: true, status: 'updated', deck: scoredDeck });
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
      expect(screen.queryByTestId('generating-next')).toBeNull();
    });
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.getByText('请说明聚簇索引。')).toBeDefined();
    expect(screen.getByText('聚簇索引叶子即行')).toBeDefined();
    expand('作答');
    expect(screen.getByTestId('card-answer').textContent).toMatch(/叶子即行/);
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    fireEvent.click(screen.getByTestId('back-to-flow'));
    expect(screen.getByTestId('generating-next').textContent).toMatch(/正在准备下一题/);
    openDetail();
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.queryByTestId('generating-next')).toBeNull();
    expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
  });

  it('opens current-card detail from flow while next is generating', async () => {
    const { port, resolve } = createDeferredWatchPort();
    await startExam(port);
    const scoredDeck = createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      cards: [
        {
          ...firstCard,
          status: 'scored' as const,
          answer: '叶子即行',
          comparison: { covered: ['聚簇索引叶子即行'], missed: [], comment: '可以' },
          scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 3.5 })),
        },
      ],
      currentCardId: 'Q1',
    });
    await act(async () => {
      resolve({ ok: true, status: 'updated', deck: scoredDeck });
    });
    await waitFor(() => {
      expect(screen.getByTestId('generating-next').textContent).toMatch(/正在准备下一题/);
    });
    expect(screen.getByTestId('card-flow')).toBeDefined();
    openDetail();
    expect(screen.getByTestId('card-detail')).toBeDefined();
    expect(screen.queryByTestId('generating-next')).toBeNull();
    expect(screen.getByRole('heading', { name: '标准答要点' })).toBeDefined();
  });

  it('keeps the previous deck when refresh fails', async () => {
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
    openDetail();
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
      resolve({ ok: true, status: 'updated', deck: nextDeck });
    });

    expect(screen.queryByText('二级索引如何回表')).toBeNull();
  });

  it('restores two cards after the overlay unmounts', async () => {
    examPanelState.set(nextDeck);
    const { port } = createDeferredWatchPort(async () => ({ ok: true as const, deck: nextDeck }));
    render(<EntryPanel port={port} />);
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    fireEvent.click(screen.getByTestId('prev-card'));
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    expect(screen.getByText('聚簇索引和二级索引的区别')).toBeDefined();
  });

  it('restores the in-progress deck from the current exam session after memory is empty', async () => {
    examPanelState.set(null);
    const { port } = createDeferredWatchPort();
    const restoring: EntryPort = {
      ...port,
      async restoreDeck() {
        return { ok: true as const, deck: nextDeck };
      },
    };
    render(<EntryPanel port={restoring} />);
    await waitFor(() => {
      expect(screen.getByTestId('interview-in-progress')).toBeDefined();
    });
    expect(screen.getByTestId('card-id').textContent).toBe('Q2');
    expect(screen.getByText('二级索引如何回表')).toBeDefined();
  });

  it('force-refreshes the current pending card when 刷新本题 is clicked', async () => {
    const { port, requests, resolveForce } = createDeferredWatchPort();
    await startExam(port);
    fireEvent.click(screen.getByTestId('refresh-coach'));
    await waitFor(() => {
      expect(requests.some((request) => request.force === true)).toBe(true);
    });
    expect(screen.getByTestId('refresh-coach')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('refresh-coach').textContent).toBe('刷新中');

    const refreshed = createInterviewDeck({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
      cards: [
        {
          ...firstCard,
          questionBrief: '二级索引如何回表',
          keyPoints: ['先查二级再回聚簇'],
        },
      ],
      currentCardId: 'Q1',
    });
    await act(async () => {
      resolveForce({ ok: true, status: 'updated', deck: refreshed });
    });

    await waitFor(() => {
      expect(screen.getByText('二级索引如何回表')).toBeDefined();
    });
    expect(screen.getByTestId('card-id').textContent).toBe('Q1');
    openDetail();
    expect(screen.getByText('先查二级再回聚簇')).toBeDefined();
    expect(screen.getByTestId('refresh-coach').textContent).toBe('刷新本题');
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByPlaceholderText(/发消息|输入消息|聊天/)).toBeNull();
  });

  it('keeps the previous deck when force refresh fails', async () => {
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
    openDetail();
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
      resolveForce({ ok: true, status: 'updated', deck: nextDeck });
    });
    expect(screen.queryByText('二级索引如何回表')).toBeNull();
  });

  it('returns to the entry form after 结束本场 so a new round can start', async () => {
    const { port } = createDeferredWatchPort();
    await startExam(port);
    fireEvent.click(screen.getByTestId('end-exam'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始模拟面试' })).toBeDefined();
    });
    expect(screen.queryByTestId('interview-in-progress')).toBeNull();
    expect(screen.queryByText('聚簇索引和二级索引的区别')).toBeNull();
    expect(screen.getByTestId('qa-path').textContent).toMatch(/qa\.md/);
    expect(screen.getByTestId('summary-path').textContent).toMatch(/summary\.md/);
    expect(screen.getByText('xerina · 八股专项陪练')).toBeDefined();
    expect(screen.getByText('coach by xerina')).toBeDefined();
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.getByText('卡片判断')).toBeDefined();
    expect(document.querySelector('details:not(.judge)')).toBeNull();
  });
});

describe('memory watchCoachTurn', () => {
  it('returns an updated deck on the second call', async () => {
    const port = createMemoryEntryPort();
    await port.startInterview({ topicId: 'mysql', customTopic: '', difficulty: 'mid' });
    const first = await port.watchCoachTurn({ sessionId: 'memory-session' });
    expect(first).toEqual({ ok: true, status: 'unchanged' });
    const second = await port.watchCoachTurn({ sessionId: 'memory-session' });
    expect(second.ok).toBe(true);
    if (second.ok && second.status === 'updated') {
      expect(second.deck.cards).toHaveLength(2);
      expect(second.deck.cards[1]?.questionBrief).toMatch(/下一问摘要/);
    }
  });

  it('force-updates without waiting for the second poll', async () => {
    const port = createMemoryEntryPort();
    await port.startInterview({ topicId: 'mysql', customTopic: '', difficulty: 'mid' });
    const forced = await port.watchCoachTurn({ sessionId: 'memory-session', force: true });
    expect(forced.ok).toBe(true);
    if (forced.ok && forced.status === 'updated') {
      expect(forced.deck.cards[0]?.questionBrief).toMatch(/强制刷新摘要/);
    }
  });
});
