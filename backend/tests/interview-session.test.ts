/**
 * @jest-environment node
 */

import {
  createInterviewDeck,
  createPendingCard,
  isCardBriefGenerating,
  mergeInterviewDeck,
  previewQuestionBrief,
  BAGUA_SCORE_DIMENSIONS,
} from 'interview-dsh-shared';
import { createExamSessionStore } from '../src/data/exam-session-store.js';
import { watchCoachTurnSession } from '../src/services/watch-coach-turn.js';
import { stubCoach } from './coach-stub.js';

describe('stage deck merge', () => {
  const base = createInterviewDeck({
    sessionId: 'session-exam',
    topic: 'MySQL',
    difficulty: 'mid',
    cards: [createPendingCard({ id: 'Q1', questionText: '题目', questionBrief: '摘要', keyPoints: [] })],
    currentCardId: 'Q1',
  });

  it('accepts a newer stage and keeps the card payload', () => {
    const next = {
      ...base,
      cards: [{ ...base.cards[0], answer: '回答', evaluation: { stage: 'coverage_ready' as const, version: 1 } }],
      evaluation: { stage: 'coverage_ready' as const, version: 1, cardId: 'Q1' },
    };
    expect(mergeInterviewDeck(base, next).cards[0]?.answer).toBe('回答');
    expect(mergeInterviewDeck(base, next).evaluation?.stage).toBe('coverage_ready');
  });

  it('orders preview before coverage and derives a local brief', () => {
    const preview = {
      ...base,
      cards: [{ ...base.cards[0], evaluation: { stage: 'preview_ready' as const, version: 1 } }],
      evaluation: { stage: 'preview_ready' as const, version: 1, cardId: 'Q1' },
    };
    const coverage = {
      ...base,
      cards: [{ ...base.cards[0], evaluation: { stage: 'coverage_ready' as const, version: 1 } }],
      evaluation: { stage: 'coverage_ready' as const, version: 1, cardId: 'Q1' },
    };
    expect(mergeInterviewDeck(base, preview).evaluation?.stage).toBe('preview_ready');
    expect(mergeInterviewDeck(preview, coverage).evaluation?.stage).toBe('coverage_ready');
    expect(previewQuestionBrief('**请解释** B+ 树\n\n补充说明')).toBe('请解释 B+ 树 补充说明');
    expect(isCardBriefGenerating({ evaluation: preview.cards[0]?.evaluation, keyPoints: [] })).toBe(true);
  });

  it('rejects an older snapshot after a newer stage', () => {
    const current = {
      ...base,
      cards: [{ ...base.cards[0], evaluation: { stage: 'comparison_ready' as const, version: 2 } }],
      evaluation: { stage: 'comparison_ready' as const, version: 2, cardId: 'Q1' },
    };
    const old = {
      ...base,
      cards: [{ ...base.cards[0], answer: '旧回答', evaluation: { stage: 'answer_received' as const, version: 1 } }],
      evaluation: { stage: 'answer_received' as const, version: 1, cardId: 'Q1' },
    };
    expect(mergeInterviewDeck(current, old)).toBe(current);
  });

  it('does not merge a snapshot from another session', () => {
    const other = { ...base, sessionId: 'other-session' };
    expect(mergeInterviewDeck(base, other)).toBe(other);
  });

  it('keeps a newer card when a stale deck-level snapshot arrives', () => {
    const current = {
      ...base,
      cards: [{ ...base.cards[0], evaluation: { stage: 'comparison_ready' as const, version: 2 } }],
      evaluation: { stage: 'comparison_ready' as const, version: 2, cardId: 'Q1' },
    };
    const next = {
      ...base,
      cards: [
        current.cards[0],
        createPendingCard({ id: 'Q1.1', questionText: '追问', questionBrief: '追问', keyPoints: [] }),
      ],
      currentCardId: 'Q1.1',
      evaluation: { stage: 'brief_ready' as const, version: 1, cardId: 'Q1.1' },
    };
    expect(mergeInterviewDeck(current, next).cards.map((card) => card.id)).toEqual(['Q1', 'Q1.1']);
    expect(mergeInterviewDeck(current, next).evaluation?.version).toBe(2);
  });

  it('returns cancellation and never commits a superseded model result', async () => {
    const sessions = createExamSessionStore();
    sessions.save({
      sessionId: 'session-exam',
      topic: 'MySQL',
      difficulty: 'mid',
      lastQuestionText: '题目',
      deck: base,
    });
    let release: (value: string) => void = () => undefined;
    const controller = new AbortController();
    const task = watchCoachTurnSession(
      stubCoach({
        readLatestHuman: async () => ({ ok: true, text: '回答' }),
        complete: async () => new Promise((resolve) => { release = resolve; }),
      }),
      sessions,
      { sessionId: 'session-exam' },
      {},
      undefined,
      undefined,
      undefined,
      () => !controller.signal.aborted,
      controller.signal,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    release(JSON.stringify({
      coverage: 'next',
      covered: ['要点'],
      missed: [],
      comment: '不应写入',
      scores: BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 4 })),
    }));
    const result = await task;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('evaluation_cancelled');
    expect(sessions.load('session-exam')?.deck.cards[0]?.comparison).toBeNull();
  });

});
