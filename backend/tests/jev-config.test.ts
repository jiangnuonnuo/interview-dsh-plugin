/**
 * @jest-environment node
 */

import { JEV_CONFIG_ERROR_MESSAGES, JEV_CONFIG_REL } from 'interview-dsh-shared';
import {
  JEV_CONFIG_REL as DATA_REL,
  parseJevFile,
  planJevSave,
  toPublicJevConfig,
} from '../src/data/jev-config.js';
import { createFsJevConfigStore } from '../src/infra/dsh/jev-config-fs.js';

const createFakeFs = () => {
  const files = new Map<string, string>();
  return {
    files,
    fs: {
      resolve(rel: string, opts?: { cwd?: string }) {
        return `${opts?.cwd ?? ''}/${rel}`.replace(/\/+/g, '/');
      },
      async writeText(path: string, text: string) {
        files.set(path, text);
      },
      async readText(path: string) {
        const text = files.get(path);
        if (text === undefined) {
          throw new Error(`missing ${path}`);
        }
        return text;
      },
    },
  };
};

describe('jev config store', () => {
  it('uses the workspace-fixed path outside round archives', () => {
    expect(DATA_REL).toBe('.dsh-interview/config/jev.json');
    expect(JEV_CONFIG_REL).toBe('.dsh-interview/config/jev.json');
    expect(DATA_REL.includes('round-')).toBe(false);
  });

  it('treats a missing or broken file as disabled', () => {
    expect(parseJevFile(undefined)).toEqual({ enabled: false, apiKey: '' });
    expect(parseJevFile('{')).toEqual({ enabled: false, apiKey: '' });
    expect(parseJevFile('[]')).toEqual({ enabled: false, apiKey: '' });
    expect(toPublicJevConfig({ enabled: true, apiKey: 'secret' })).toEqual({
      enabled: true,
      apiKeySet: true,
    });
  });

  it('refuses to enable without a key', () => {
    const planned = planJevSave({ enabled: false, apiKey: '' }, { enabled: true });
    expect(planned.ok).toBe(false);
    if (!planned.ok) {
      expect(planned.code).toBe('jev_key_required');
      expect(planned.message).toBe(JEV_CONFIG_ERROR_MESSAGES.jev_key_required);
    }
  });

  it('keeps the stored key when the box is empty', () => {
    const planned = planJevSave({ enabled: false, apiKey: 'kept' }, { enabled: true, apiKey: '' });
    expect(planned).toEqual({ ok: true, next: { enabled: true, apiKey: 'kept' } });
  });

  it('keeps the key when disabling', () => {
    const planned = planJevSave({ enabled: true, apiKey: 'kept' }, { enabled: false });
    expect(planned).toEqual({ ok: true, next: { enabled: false, apiKey: 'kept' } });
  });

  it('writes the config file through Host fs and never under round-*', async () => {
    const { files, fs } = createFakeFs();
    const store = createFsJevConfigStore(fs, { cwdFor: () => '/workspace' });
    const saved = await store.save({ enabled: true, apiKey: 'sk-test' }, 'session-exam');
    expect(saved).toEqual({ ok: true, enabled: true, apiKeySet: true });
    const path = `/workspace/${JEV_CONFIG_REL}`;
    expect(files.get(path)).toContain('"apiKey": "sk-test"');
    expect(path.includes('/round-')).toBe(false);
    const loaded = await store.loadPublic('session-exam');
    expect(loaded).toEqual({ ok: true, enabled: true, apiKeySet: true });
    const secret = await store.loadSecret('session-exam');
    expect(secret.apiKey).toBe('sk-test');
  });

  it('maps missing cwd to persist_unavailable', async () => {
    const { fs } = createFakeFs();
    const store = createFsJevConfigStore(fs, { cwdFor: () => undefined });
    const saved = await store.save({ enabled: true, apiKey: 'sk-test' }, 'session-exam');
    expect(saved.ok).toBe(false);
    if (!saved.ok) {
      expect(saved.code).toBe('persist_unavailable');
    }
  });

  it('does not echo the key on loadPublic', async () => {
    const { fs } = createFakeFs();
    const store = createFsJevConfigStore(fs, { cwdFor: () => '/workspace' });
    await store.save({ enabled: true, apiKey: 'sk-test' }, 'session-exam');
    const loaded = await store.loadPublic('session-exam');
    expect(JSON.stringify(loaded)).not.toContain('sk-test');
  });
});
