import {
  CUSTOM_TOPIC_ID,
  ENTRY_ERROR_MESSAGES,
  createInterviewDeck,
  createPendingCard,
  findPresetTopic,
  isDifficulty,
  type AcceptEntryConfigRequest,
  type AcceptEntryConfigResponse,
  type EntryConfig,
  type GetEntryConfigResponse,
  type InterviewDeck,
  type StartInterviewResponse,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { EntryPort } from './entry-port';

const memoryDeck = (topic: string, difficulty: EntryConfig['difficulty'], brief: string, points: readonly string[]): InterviewDeck =>
  createInterviewDeck({
    sessionId: 'memory-session',
    topic,
    difficulty,
    cards: [
      createPendingCard({
        id: 'Q1',
        questionText: brief,
        questionBrief: brief,
        keyPoints: points,
      }),
    ],
    currentCardId: 'Q1',
  });

export const createMemoryEntryPort = (): EntryPort => {
  let current: EntryConfig | null = null;
  let watchCalls = 0;
  let deck: InterviewDeck | null = null;
  return {
    async acceptEntryConfig(request: AcceptEntryConfigRequest): Promise<AcceptEntryConfigResponse> {
      if (!isDifficulty(request.difficulty)) {
        return { ok: false, code: 'invalid_difficulty', message: ENTRY_ERROR_MESSAGES.invalid_difficulty };
      }
      const topicId = request.topicId?.trim() ?? '';
      if (!topicId) {
        return { ok: false, code: 'topic_required', message: ENTRY_ERROR_MESSAGES.topic_required };
      }
      if (topicId === CUSTOM_TOPIC_ID) {
        const customTopic = request.customTopic.trim();
        if (!customTopic) {
          return { ok: false, code: 'custom_topic_empty', message: ENTRY_ERROR_MESSAGES.custom_topic_empty };
        }
        current = {
          topic: customTopic,
          difficulty: request.difficulty,
          topicKind: 'custom',
          topicId: CUSTOM_TOPIC_ID,
        };
        return { ok: true, config: current };
      }
      const preset = findPresetTopic(topicId);
      if (!preset) {
        return { ok: false, code: 'topic_required', message: ENTRY_ERROR_MESSAGES.topic_required };
      }
      current = {
        topic: preset.name,
        difficulty: request.difficulty,
        topicKind: 'preset',
        topicId: preset.id,
      };
      return { ok: true, config: current };
    },
    async getEntryConfig(): Promise<GetEntryConfigResponse> {
      return { config: current };
    },
    async startInterview(request: AcceptEntryConfigRequest): Promise<StartInterviewResponse> {
      const accepted = await this.acceptEntryConfig(request);
      if (!accepted.ok) {
        return accepted;
      }
      deck = memoryDeck(accepted.config.topic, accepted.config.difficulty, `${accepted.config.topic} · 第一问摘要`, [
        '要点一',
        '要点二',
      ]);
      return { ok: true, deck };
    },
    async watchCoachTurn(request: WatchCoachTurnRequest): Promise<WatchCoachTurnResponse> {
      if (request.force === true) {
        const topic = current?.topic ?? '主题';
        const difficulty = current?.difficulty ?? 'mid';
        const pending = deck?.cards[0];
        deck = memoryDeck(topic, difficulty, `${topic} · 强制刷新摘要`, ['强制刷新要点']);
        if (pending !== undefined && deck.cards[0] !== undefined) {
          deck = {
            ...deck,
            cards: [{ ...deck.cards[0], id: pending.id }],
            currentCardId: pending.id,
          };
        }
        return { ok: true, status: 'updated', deck };
      }
      watchCalls += 1;
      if (watchCalls >= 2 && current && deck) {
        const next = createPendingCard({
          id: 'Q2',
          questionText: `${current.topic} · 下一问`,
          questionBrief: `${current.topic} · 下一问摘要`,
          keyPoints: ['追问要点一', '追问要点二'],
        });
        deck = {
          ...deck,
          cards: [...deck.cards, next],
          currentCardId: next.id,
        };
        return { ok: true, status: 'updated', deck };
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      return { ok: true, status: 'unchanged' };
    },
    async loadDeck() {
      if (deck === null) {
        return {
          ok: false as const,
          code: 'follow_up_failed' as const,
          message: '本场记录不存在',
        };
      }
      return { ok: true as const, deck };
    },
    async restoreDeck() {
      if (deck === null) {
        return {
          ok: false as const,
          code: 'follow_up_failed' as const,
          message: '本场记录不存在',
        };
      }
      return { ok: true as const, deck };
    },
    async endRound() {
      if (deck === null) {
        return {
          ok: false as const,
          code: 'follow_up_failed' as const,
          message: '本场记录不存在',
          ended: false,
        };
      }
      const qaPath =
        deck.archiveDir.length > 0
          ? `${deck.archiveDir}/qa.md`
          : '.dsh-interview/memory-session/round-1-round/qa.md';
      const summaryPath =
        deck.archiveDir.length > 0
          ? `${deck.archiveDir}/summary.md`
          : '.dsh-interview/memory-session/round-1-round/summary.md';
      const sessionId = deck.sessionId;
      deck = null;
      return { ok: true as const, sessionId, qaPath, summaryPath, ended: true as const };
    },
  };
};
