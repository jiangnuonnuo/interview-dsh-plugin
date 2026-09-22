import {
  CUSTOM_TOPIC_ID,
  ENTRY_ERROR_MESSAGES,
  INTERVIEW_ROUND_CLOSING_PROMPT,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  findPresetTopic,
  isDifficulty,
  type AcceptEntryConfigRequest,
  type AcceptEntryConfigResponse,
  type AttachInterviewerRequest,
  type ArmRoundCloseResponse,
  type AttachInterviewerResponse,
  type BriefCoachRequest,
  type BriefCoachResponse,
  type ClearRoundCloseResponse,
  type EndRoundRequest,
  type EndRoundResponse,
  type EntryConfig,
  type EntryErrorCode,
  type GetEntryConfigResponse,
  type GetExamRoundStateRequest,
  type GetExamRoundStateResponse,
  type LoadDeckRequest,
  type LoadDeckResponse,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { EntryConfigStore } from '../data/entry-config-store.js';
import { createExamSessionStore, type ExamSessionStore } from '../data/exam-session-store.js';
import { loadDeckSession, type WorkspaceArchive } from '../data/workspace-archive.js';
import { briefCoachSession, type ChainHooks, type CoachRuntime } from './coach-brief.js';
import { endRoundSession } from './end-round.js';
import { assembleInterviewerPersona } from './interviewer-persona.js';
import { createChainMemory } from './knowledge-chain.js';
import { watchCoachTurnSession } from './watch-coach-turn.js';

export interface InterviewerPersonaInstaller {
  install(sessionId: string, text: string): AttachInterviewerResponse;
  installRoundClose?(sessionId: string, text: string): ArmRoundCloseResponse;
  clearRoundClose?(sessionId: string): void;
  installChain?(sessionId: string, text: string): AttachInterviewerResponse;
  clearChain?(sessionId: string): void;
}

export interface InterviewEntryService {
  acceptEntryConfig(request: AcceptEntryConfigRequest): AcceptEntryConfigResponse;
  getEntryConfig(): GetEntryConfigResponse;
  attachInterviewer(request: AttachInterviewerRequest): AttachInterviewerResponse;
  briefCoach(request: BriefCoachRequest): Promise<BriefCoachResponse>;
  watchCoachTurn(request: WatchCoachTurnRequest): Promise<WatchCoachTurnResponse>;
  loadDeck(request: LoadDeckRequest): Promise<LoadDeckResponse>;
  endRound(request: EndRoundRequest): Promise<EndRoundResponse>;
  armRoundClose(request: EndRoundRequest): ArmRoundCloseResponse;
  clearRoundClose(request: EndRoundRequest): ClearRoundCloseResponse;
  getExamRoundState(request: GetExamRoundStateRequest): Promise<GetExamRoundStateResponse>;
}

const failure = (code: EntryErrorCode): AcceptEntryConfigResponse => ({
  ok: false,
  code,
  message: ENTRY_ERROR_MESSAGES[code],
});

const unavailablePersona: InterviewerPersonaInstaller = {
  install: () => ({
    ok: false,
    code: 'inject_unavailable',
    message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
  }),
};

const unavailableCoach: CoachRuntime = {
  readLatestQuestion: async () => ({
    ok: false,
    code: 'first_question_failed',
    message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed,
  }),
  awaitNewQuestion: async () => ({
    ok: false,
    code: 'follow_up_failed',
    message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
  }),
  readLatestHuman: async () => ({ ok: true, text: '' }),
  complete: async () => null,
};

export const createInterviewEntryService = (
  store: EntryConfigStore,
  persona: InterviewerPersonaInstaller = unavailablePersona,
  coach: CoachRuntime = unavailableCoach,
  examSessions: ExamSessionStore = createExamSessionStore(),
  archive?: WorkspaceArchive,
): InterviewEntryService => {
  const chainMemory = createChainMemory();
  const hooks: ChainHooks = {
    memory: chainMemory,
    ...(persona.installChain !== undefined && persona.clearChain !== undefined
      ? {
          port: {
            install: (sessionId, text) => persona.installChain?.(sessionId, text) ?? { ok: false },
            clear: (sessionId) => {
              persona.clearChain?.(sessionId);
            },
          },
        }
      : {}),
  };
  return {
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
  attachInterviewer(request) {
    const text = assembleInterviewerPersona({
      topic: request.topic,
      difficulty: request.difficulty,
    });
    return persona.install(request.sessionId, text);
  },
  briefCoach(request) {
    persona.clearRoundClose?.(request.sessionId);
    return briefCoachSession(coach, request, examSessions, archive, hooks);
  },
  watchCoachTurn(request) {
    return watchCoachTurnSession(coach, examSessions, request, {}, archive, hooks);
  },
  loadDeck(request) {
    return loadDeckSession(examSessions, request, archive);
  },
  endRound(request) {
    return endRoundSession(coach, examSessions, request, archive);
  },
  armRoundClose(request) {
    if (persona.installRoundClose === undefined) {
      return {
        ok: false as const,
        code: 'inject_unavailable' as const,
        message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
      };
    }
    persona.clearChain?.(request.sessionId);
    chainMemory.forget(request.sessionId);
    return persona.installRoundClose(request.sessionId, INTERVIEW_ROUND_CLOSING_PROMPT);
  },
  clearRoundClose(request) {
    persona.clearRoundClose?.(request.sessionId);
    return { ok: true as const };
  },
  async getExamRoundState(request) {
    const record = examSessions.load(request.sessionId);
    if (record?.ended === true) {
      return { ok: true as const, status: 'ended' as const };
    }
    if (record !== undefined) {
      return { ok: true as const, status: 'in_progress' as const };
    }
    const index = await archive?.readRoundIndex?.(request.sessionId);
    if (index !== undefined) {
      return { ok: true as const, status: index.status };
    }
    const disk = await archive?.readDeck(request.sessionId);
    if (disk !== undefined) {
      return { ok: true as const, status: 'in_progress' as const };
    }
    return { ok: true as const, status: 'none' as const };
  },
  };
};
