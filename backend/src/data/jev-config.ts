import {
  JEV_CONFIG_ERROR_MESSAGES,
  JEV_CONFIG_REL,
  type GetJevConfigResponse,
  type JevPublicConfig,
  type SaveJevConfigResponse,
} from 'interview-dsh-shared';
import { persistUnavailable, type PersistFailure } from './workspace-archive.js';

export { JEV_CONFIG_REL };

export type JevSecretConfig = {
  readonly enabled: boolean;
  readonly apiKey: string;
};

export interface JevConfigStore {
  loadPublic(sessionId?: string): Promise<GetJevConfigResponse>;
  loadSecret(sessionId?: string): Promise<JevSecretConfig>;
  save(
    input: { readonly enabled: boolean; readonly apiKey?: string },
    sessionId?: string,
  ): Promise<SaveJevConfigResponse>;
}

export const emptyJevSecret = (): JevSecretConfig => ({ enabled: false, apiKey: '' });

export const toPublicJevConfig = (secret: JevSecretConfig): JevPublicConfig => ({
  enabled: secret.enabled === true,
  apiKeySet: secret.apiKey.trim().length > 0,
});

export const isJevConnected = (secret: JevSecretConfig): boolean =>
  secret.enabled === true && secret.apiKey.trim().length > 0;

export const parseJevFile = (raw: string | undefined): JevSecretConfig => {
  if (raw === undefined) {
    return emptyJevSecret();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return emptyJevSecret();
    }
    const record = parsed as Record<string, unknown>;
    return {
      enabled: record.enabled === true,
      apiKey: typeof record.apiKey === 'string' ? record.apiKey : '',
    };
  } catch {
    return emptyJevSecret();
  }
};

export type PlanJevSaveResult =
  | { readonly ok: true; readonly next: JevSecretConfig }
  | { readonly ok: false; readonly code: 'jev_key_required'; readonly message: string };

export const planJevSave = (
  current: JevSecretConfig,
  input: { readonly enabled: boolean; readonly apiKey?: string },
): PlanJevSaveResult => {
  const incoming = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
  const nextKey = incoming.length > 0 ? incoming : current.apiKey;
  if (input.enabled === true && nextKey.trim().length === 0) {
    return {
      ok: false,
      code: 'jev_key_required',
      message: JEV_CONFIG_ERROR_MESSAGES.jev_key_required,
    };
  }
  return {
    ok: true,
    next: {
      enabled: input.enabled === true,
      apiKey: nextKey,
    },
  };
};

export const jevPersistUnavailable = (): PersistFailure => persistUnavailable();
