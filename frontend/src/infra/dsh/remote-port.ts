import {
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type AcceptEntryConfigRequest,
  type AcceptEntryConfigResponse,
  type AttachInterviewerRequest,
  type AttachInterviewerResponse,
  type BriefCoachRequest,
  type BriefCoachResponse,
  type ClearRoundCloseResponse,
  type EndRoundRequest,
  type EndRoundResponse,
  type ArmRoundCloseResponse,
  type GetEntryConfigResponse,
  type GetExamRoundStateRequest,
  type GetExamRoundStateResponse,
  type LoadDeckRequest,
  type LoadDeckResponse,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { EntryPort } from '../../features/entry/entry-port';
import { endExamRound } from './end-exam-round';
import { startInterview, type StartInterviewHost } from './start-interview';
import type { ExamRoomSessions, ExamWorkspaces } from './start-exam-room';

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
  watchCoachTurn: (request: WatchCoachTurnRequest) => Promise<unknown>;
  loadDeck: (request: LoadDeckRequest) => Promise<unknown>;
  endRound: (request: EndRoundRequest) => Promise<unknown>;
  armRoundClose: (request: EndRoundRequest) => Promise<unknown>;
  clearRoundClose: (request: EndRoundRequest) => Promise<unknown>;
  getExamRoundState: (request: GetExamRoundStateRequest) => Promise<unknown>;
}

export type SessionsProbe = ExamRoomSessions | undefined | (() => ExamRoomSessions | undefined);
export type WorkspacesProbe = ExamWorkspaces | undefined | (() => ExamWorkspaces | undefined);

const resolveSessions = (sessions: SessionsProbe): ExamRoomSessions | undefined =>
  typeof sessions === 'function' ? sessions() : sessions;

const resolveWorkspaces = (workspaces: WorkspacesProbe | undefined): ExamWorkspaces | undefined =>
  typeof workspaces === 'function' ? workspaces() : workspaces;

export const createInterviewPort = (
  remote: InterviewRemote,
  sessions: SessionsProbe,
  workspaces?: WorkspacesProbe,
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
    getExamRoundState(request) {
      return unwrap(
        remote.getExamRoundState(request) as Promise<GetExamRoundStateResponse>,
        'getExamRoundState',
      );
    },
    clearRoundClose(request) {
      return unwrap(remote.clearRoundClose(request) as Promise<ClearRoundCloseResponse>, 'clearRoundClose');
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
      return startInterview(
        {
          sessions: resolveSessions(sessions),
          workspaces: resolveWorkspaces(workspaces),
          host,
        },
        request,
      );
    },
    watchCoachTurn(request) {
      return unwrap(remote.watchCoachTurn(request) as Promise<WatchCoachTurnResponse>, 'watchCoachTurn');
    },
    loadDeck(request) {
      return unwrap(remote.loadDeck(request) as Promise<LoadDeckResponse>, 'loadDeck');
    },
    restoreDeck() {
      const current = resolveSessions(sessions)?.list?.getSnapshot?.()?.current;
      if (typeof current !== 'string' || current.length === 0) {
        return Promise.resolve({
          ok: false as const,
          code: 'follow_up_failed' as const,
          message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
        });
      }
      return unwrap(remote.loadDeck({ sessionId: current }) as Promise<LoadDeckResponse>, 'loadDeck');
    },
    endRound(request) {
      return endExamRound(
        {
          sessions: resolveSessions(sessions),
          host: {
            armRoundClose: (payload) =>
              unwrap(remote.armRoundClose(payload) as Promise<ArmRoundCloseResponse>, 'armRoundClose'),
            endRound: (payload) => unwrap(remote.endRound(payload) as Promise<EndRoundResponse>, 'endRound'),
          },
        },
        request,
      );
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
  async watchCoachTurn() {
    throw new Error(reason);
  },
  async loadDeck() {
    throw new Error(reason);
  },
  async restoreDeck() {
    return {
      ok: false as const,
      code: 'follow_up_failed' as const,
      message: reason,
    };
  },
  async endRound() {
    throw new Error(reason);
  },
});
