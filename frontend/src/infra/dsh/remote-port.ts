import type { AcceptEntryConfigRequest, AcceptEntryConfigResponse, GetEntryConfigResponse } from 'interview-dsh-shared';
import type { EntryPort } from '../../features/entry/entry-port';

interface GatewayEnvelope<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: { readonly message?: string };
}

const unwrap = async <T>(result: Promise<T | GatewayEnvelope<T>>, method: string): Promise<T> => {
  const payload = await result;
  if (payload && typeof payload === 'object' && 'ok' in payload && 'value' in payload) {
    const envelope = payload as GatewayEnvelope<T>;
    if (envelope.ok === true && envelope.value !== undefined) {
      return envelope.value;
    }
    throw new Error(envelope.error?.message ?? `${method} failed`);
  }
  return payload as T;
};

export const createRemoteEntryPort = (remote: {
  acceptEntryConfig: (request: AcceptEntryConfigRequest) => Promise<unknown>;
  getEntryConfig: () => Promise<unknown>;
}): EntryPort => ({
  acceptEntryConfig(request) {
    return unwrap(remote.acceptEntryConfig(request) as Promise<AcceptEntryConfigResponse>, 'acceptEntryConfig');
  },
  getEntryConfig() {
    return unwrap(remote.getEntryConfig() as Promise<GetEntryConfigResponse>, 'getEntryConfig');
  },
});

export const createUnavailableEntryPort = (reason: string): EntryPort => ({
  async acceptEntryConfig() {
    throw new Error(reason);
  },
  async getEntryConfig() {
    return { config: null };
  },
});
