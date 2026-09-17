import {
  CUSTOM_TOPIC_ID,
  ENTRY_ERROR_MESSAGES,
  emptyBaguaScores,
  findPresetTopic,
  isDifficulty,
  type AcceptEntryConfigRequest,
  type AcceptEntryConfigResponse,
  type EntryConfig,
  type GetEntryConfigResponse,
  type StartInterviewResponse,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { EntryPort } from './entry-port';

export const createMemoryEntryPort = (): EntryPort => {
  let current: EntryConfig | null = null;
  let watchCalls = 0;
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
      return {
        ok: true,
        snapshot: {
          phase: 'in_progress',
          sessionId: 'memory-session',
          topic: accepted.config.topic,
          difficulty: accepted.config.difficulty,
          questionBrief: `${accepted.config.topic} · 第一问摘要`,
          keyPoints: ['要点一', '要点二'],
          scores: emptyBaguaScores(),
        },
      };
    },
    async watchCoachTurn(): Promise<WatchCoachTurnResponse> {
      watchCalls += 1;
      if (watchCalls >= 2 && current) {
        return {
          ok: true,
          status: 'updated',
          snapshot: {
            phase: 'in_progress',
            sessionId: 'memory-session',
            topic: current.topic,
            difficulty: current.difficulty,
            questionBrief: `${current.topic} · 下一问摘要`,
            keyPoints: ['追问要点一', '追问要点二'],
            scores: emptyBaguaScores(),
          },
        };
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      return { ok: true, status: 'unchanged' };
    },
  };
};
