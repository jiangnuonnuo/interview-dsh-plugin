import type {
  AcceptEntryConfigRequest,
  AcceptEntryConfigResponse,
  AttachInterviewerRequest,
  AttachInterviewerResponse,
  BriefCoachRequest,
  BriefCoachResponse,
  GetEntryConfigResponse,
} from 'interview-dsh-shared';
import type { EntryPort } from '../../features/entry/entry-port';
import { startInterview, type StartInterviewHost } from './start-interview';
import type { ExamRoomSessions } from './start-exam-room';

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

export interface InterviewRemote {
  acceptEntryConfig: (request: AcceptEntryConfigRequest) => Promise<unknown>;
  getEntryConfig: () => Promise<unknown>;
  attachInterviewer: (request: AttachInterviewerRequest) => Promise<unknown>;
  briefCoach: (request: BriefCoachRequest) => Promise<unknown>;
}

export type SessionsProbe = ExamRoomSessions | undefined | (() => ExamRoomSessions | undefined);

const resolveSessions = (sessions: SessionsProbe): ExamRoomSessions | undefined =>
  typeof sessions === 'function' ? sessions() : sessions;

export const createInterviewPort = (
  remote: InterviewRemote,
  sessions: SessionsProbe,
): EntryPort => {
  const host: StartInterviewHost = {
    acceptEntryConfig(request) {
      return unwrap(remote.acceptEntryConfig(request) as Promise<AcceptEntryConfigResponse>, 'acceptEntryConfig');
    },
    attachInterviewer(request) {
      return unwrap(remote.attachInterviewer(request) as Promise<AttachInterviewerResponse>, 'attachInterviewer');
    },
    briefCoach(request) {
      return unwrap(remote.briefCoach(request) as Promise<BriefCoachResponse>, 'briefCoach');
    },
  };

  return {
    acceptEntryConfig(request) {
      return host.acceptEntryConfig(request);
    },
    getEntryConfig() {
      return unwrap(remote.getEntryConfig() as Promise<GetEntryConfigResponse>, 'getEntryConfig');
    },
    startInterview(request) {
      return startInterview({ sessions: resolveSessions(sessions), host }, request);
    },
  };
};

export const createUnavailableEntryPort = (reason: string): EntryPort => ({
  async acceptEntryConfig() {
    throw new Error(reason);
  },
  async getEntryConfig() {
    return { config: null };
  },
  async startInterview() {
    throw new Error(reason);
  },
});
