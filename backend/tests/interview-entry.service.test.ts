/**
 * @jest-environment node
 */

import { JEV_CONFIG_ERROR_MESSAGES } from 'interview-dsh-shared';
import { createEntryConfigStore } from '../src/data/entry-config-store.js';
import { emptyJevSecret, type JevConfigStore, type JevSecretConfig } from '../src/data/jev-config.js';
import { createInterviewEntryService } from '../src/services/interview-entry.service.js';

const memoryJev = (secret: JevSecretConfig, writes: unknown[] = []): JevConfigStore => ({
  async loadPublic() {
    return { ok: true, enabled: secret.enabled, apiKeySet: secret.apiKey.length > 0 };
  },
  async loadSecret() {
    return secret;
  },
  async save(input) {
    writes.push(input);
    return { ok: true, enabled: input.enabled, apiKeySet: (input.apiKey ?? secret.apiKey).length > 0 };
  },
});

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

  it('does not write the key when Jev probe fails', async () => {
    const writes: unknown[] = [];
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      {
        jevConfig: memoryJev(emptyJevSecret(), writes),
        probeJev: async () => false,
      },
    );
    const result = await service.saveJevConfig({ enabled: true, apiKey: 'sk-bad' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('jev_unreachable');
      expect(result.message).toBe(JEV_CONFIG_ERROR_MESSAGES.jev_unreachable);
    }
    expect(writes).toHaveLength(0);
  });

  it('writes the key only after a successful probe', async () => {
    const writes: unknown[] = [];
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      {
        jevConfig: memoryJev(emptyJevSecret(), writes),
        probeJev: async () => true,
      },
    );
    const result = await service.saveJevConfig({ enabled: true, apiKey: 'sk-live' });
    expect(result).toEqual({ ok: true, enabled: true, apiKeySet: true });
    expect(writes).toEqual([{ enabled: true, apiKey: 'sk-live' }]);
  });

  it('does not probe when turning Jev off', async () => {
    const writes: unknown[] = [];
    const probeJev = jest.fn(async () => true);
    const service = createInterviewEntryService(
      createEntryConfigStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      {
        jevConfig: memoryJev({ enabled: true, apiKey: 'sk-kept' }, writes),
        probeJev,
      },
    );
    const result = await service.saveJevConfig({ enabled: false });
    expect(result).toEqual({ ok: true, enabled: false, apiKeySet: true });
    expect(probeJev).not.toHaveBeenCalled();
    expect(writes).toEqual([{ enabled: false, apiKey: 'sk-kept' }]);
  });
});
