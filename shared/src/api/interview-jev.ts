import { INTERVIEW_SESSION_ERROR_MESSAGES } from './interview-session.js';

export const JEV_CONFIG_REL = '.dsh-interview/config/jev.json';

export type JevConfigErrorCode = 'persist_unavailable' | 'jev_key_required' | 'jev_unreachable';

export const JEV_CONFIG_ERROR_MESSAGES: Record<JevConfigErrorCode, string> = {
  persist_unavailable: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
  jev_key_required: '开启卡片判断需要填写 Jev 密钥。',
  jev_unreachable: 'Jev 连通失败，密钥未保存，本场走对照回退。',
};

export interface JevPublicConfig {
  readonly enabled: boolean;
  readonly apiKeySet: boolean;
}

export interface GetJevConfigRequest {
  readonly sessionId?: string;
}

export type GetJevConfigResponse =
  | { readonly ok: true; readonly enabled: boolean; readonly apiKeySet: boolean }
  | { readonly ok: false; readonly code: 'persist_unavailable'; readonly message: string };

export interface SaveJevConfigRequest {
  readonly enabled: boolean;
  readonly apiKey?: string;
  readonly sessionId?: string;
}

export type SaveJevConfigResponse =
  | { readonly ok: true; readonly enabled: boolean; readonly apiKeySet: boolean }
  | { readonly ok: false; readonly code: JevConfigErrorCode; readonly message: string };
