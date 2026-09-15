import {
  CUSTOM_TOPIC_ID,
  ENTRY_ERROR_MESSAGES,
  findPresetTopic,
  isDifficulty,
  type AcceptEntryConfigRequest,
  type AcceptEntryConfigResponse,
  type EntryConfig,
  type EntryErrorCode,
  type GetEntryConfigResponse,
} from 'interview-dsh-shared';
import type { EntryConfigStore } from '../data/entry-config-store.js';

export interface InterviewEntryService {
  acceptEntryConfig(request: AcceptEntryConfigRequest): AcceptEntryConfigResponse;
  getEntryConfig(): GetEntryConfigResponse;
}

const failure = (code: EntryErrorCode): AcceptEntryConfigResponse => ({
  ok: false,
  code,
  message: ENTRY_ERROR_MESSAGES[code],
});

export const createInterviewEntryService = (
  store: EntryConfigStore,
): InterviewEntryService => ({
  acceptEntryConfig(request) {
    if (!isDifficulty(request.difficulty)) {
      return failure('invalid_difficulty');
    }

    const topicId = request.topicId?.trim() ?? '';
    if (!topicId) {
      return failure('topic_required');
    }

    let config: EntryConfig;
    if (topicId === CUSTOM_TOPIC_ID) {
      const customTopic = request.customTopic.trim();
      if (!customTopic) {
        return failure('custom_topic_empty');
      }
      config = {
        topic: customTopic,
        difficulty: request.difficulty,
        topicKind: 'custom',
        topicId: CUSTOM_TOPIC_ID,
      };
    } else {
      const preset = findPresetTopic(topicId);
      if (!preset) {
        return failure('topic_required');
      }
      config = {
        topic: preset.name,
        difficulty: request.difficulty,
        topicKind: 'preset',
        topicId: preset.id,
      };
    }

    store.save(config);
    return { ok: true, config };
  },
  getEntryConfig() {
    return { config: store.load() };
  },
});
