/**
 * @jest-environment node
 */

import { createEntryConfigStore } from '../src/data/entry-config-store.js';
import { createInterviewEntryService } from '../src/services/interview-entry.service.js';

const mysqlRequest = {
  topicId: 'mysql',
  customTopic: '',
  difficulty: 'mid' as const,
};

describe('interview-entry.service', () => {
  it('saves a preset topic and mid difficulty', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig(mysqlRequest);
    expect(result).toEqual({
      ok: true,
      config: {
        topic: 'MySQL 索引与优化',
        difficulty: 'mid',
        topicKind: 'preset',
        topicId: 'mysql',
      },
    });
    expect(service.getEntryConfig().config).toEqual(result.ok ? result.config : null);
  });

  it('returns topic_required when no topic is selected', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig({
      topicId: null,
      customTopic: '',
      difficulty: 'mid',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('topic_required');
      expect(result.message.length).toBeGreaterThan(0);
    }
    expect(service.getEntryConfig().config).toBeNull();
  });

  it('returns custom_topic_empty when custom topic is blank', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig({
      topicId: 'custom',
      customTopic: '   ',
      difficulty: 'senior',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('custom_topic_empty');
    }
    expect(service.getEntryConfig().config).toBeNull();
  });

  it('returns invalid_difficulty for an unknown difficulty', () => {
    const service = createInterviewEntryService(createEntryConfigStore());
    const result = service.acceptEntryConfig({
      topicId: 'mysql',
      customTopic: '',
      difficulty: 'expert' as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_difficulty');
    }
  });

  it('attaches assembled persona text through the installer', () => {
    const install = jest.fn(() => ({ ok: true as const }));
    const service = createInterviewEntryService(createEntryConfigStore(), {
      install,
    });
    const result = service.attachInterviewer({
      sessionId: 'session-exam',
      topic: 'MySQL 索引与优化',
      difficulty: 'mid',
    });
    expect(result).toEqual({ ok: true });
    expect(install).toHaveBeenCalledTimes(1);
    const [sessionId, text] = install.mock.calls[0];
    expect(sessionId).toBe('session-exam');
    expect(text).toContain('MySQL 索引与优化');
    expect(text).toContain('八股专项');
    expect(text).not.toMatch(/标准答要点/);
  });
});
