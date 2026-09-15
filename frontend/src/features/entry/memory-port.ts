import {
  CUSTOM_TOPIC_ID,
  ENTRY_ERROR_MESSAGES,
  findPresetTopic,
  isDifficulty,
  type AcceptEntryConfigRequest,
  type AcceptEntryConfigResponse,
  type EntryConfig,
  type GetEntryConfigResponse,
} from 'interview-dsh-shared';
import type { EntryPort } from './entry-port';

export const createMemoryEntryPort = (): EntryPort => {
  let current: EntryConfig | null = null;
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
  };
};
