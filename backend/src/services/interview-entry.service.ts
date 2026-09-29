import {
  CUSTOM_TOPIC_ID,
  ENTRY_ERROR_MESSAGES,
  INTERVIEW_ROUND_CLOSING_PROMPT,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  JEV_CONFIG_ERROR_MESSAGES,
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
  type GetJevConfigRequest,
  type GetJevConfigResponse,
  type LoadDeckRequest,
  type LoadDeckResponse,
  type SaveJevConfigRequest,
  type SaveJevConfigResponse,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { EntryConfigStore } from '../data/entry-config-store.js';
import { createExamSessionStore, type ExamSessionStore } from '../data/exam-session-store.js';
import { planJevSave, type JevConfigStore } from '../data/jev-config.js';
import { loadDeckSession, type WorkspaceArchive } from '../data/workspace-archive.js';
import { briefCoachSession, type ChainHooks, type CoachBriefCache, type CoachRuntime } from './coach-brief.js';
import type { CoveragePort } from './coverage-port.js';
import { endRoundSession } from './end-round.js';
import { assembleInterviewerPersona } from './interviewer-persona.js';
import { createChainMemory } from './knowledge-chain.js';
import { watchCoachTurnSession } from './watch-coach-turn.js';

const WATCH_SNAPSHOT_DELAY_MS = 120;
const WATCH_RESULT_TTL_MS = 5_000;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
  getJevConfig(request?: GetJevConfigRequest): Promise<GetJevConfigResponse>;
  saveJevConfig(request: SaveJevConfigRequest): Promise<SaveJevConfigResponse>;
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
  extras?: {
    readonly jevConfig?: JevConfigStore;
    readonly coverage?: CoveragePort;
    readonly probeJev?: (apiKey: string) => Promise<boolean>;
  },
): InterviewEntryService => {
  const chainMemory = createChainMemory();
  const watchFlights = new Map<string, Promise<WatchCoachTurnResponse>>();
  const watchControllers = new Map<string, AbortController>();
  const enrichmentFlights = new Map<
    string,
    { readonly sessionId: string; readonly controller: AbortController; readonly task: Promise<void> }
  >();
  const enrichmentSessions = new Set<string>();
  const watchResults = new Map<string, { readonly expiresAt: number; readonly response: WatchCoachTurnResponse }>();
  const cancelledSessions = new Set<string>();
  const jevProbeCache = new Map<string, string>();
  const briefCache: CoachBriefCache = new Map();
  const cancelEnrichment = (sessionId: string) => {
    for (const [key, flight] of enrichmentFlights) {
      if (flight.sessionId !== sessionId) continue;
      flight.controller.abort();
      enrichmentFlights.delete(key);
    }
  };
  const watchSnapshot = (sessionId: string): WatchCoachTurnResponse => {
    const record = examSessions.load(sessionId);
    const card = record?.deck.cards[record.deck.cards.length - 1];
    const evaluation = record?.deck.evaluation ?? card?.evaluation;
    if (record === undefined || evaluation === undefined || evaluation.stage === 'idle') {
      return {
        ok: true,
        status: 'unchanged',
        stage: evaluation?.stage,
        generation: evaluation?.version,
      };
    }
    return {
      ok: true,
      status: 'updated',
      deck: record.deck,
      stage: evaluation.stage,
      generation: evaluation.version,
      ...(record.jevAccelerated === true ? { jevAccelerated: true } : {}),
    };
  };
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
  async getJevConfig(request = {}) {
    if (extras?.jevConfig === undefined) {
      return { ok: true as const, enabled: false, apiKeySet: false };
    }
    return extras.jevConfig.loadPublic(request.sessionId);
  },
  async saveJevConfig(request) {
    if (extras?.jevConfig === undefined) {
      return {
        ok: false as const,
        code: 'persist_unavailable' as const,
        message: JEV_CONFIG_ERROR_MESSAGES.persist_unavailable,
      };
    }
    const current = await extras.jevConfig.loadSecret(request.sessionId);
    const planned = planJevSave(current, { enabled: request.enabled, apiKey: request.apiKey });
    if (!planned.ok) {
      return planned;
    }
    if (planned.next.enabled) {
      const cacheKey = request.sessionId ?? 'workspace';
      const signature = `${planned.next.enabled}:${planned.next.apiKey}`;
      if (jevProbeCache.get(cacheKey) !== signature) {
        const reachable = extras.probeJev === undefined ? false : await extras.probeJev(planned.next.apiKey);
        if (!reachable) {
          return {
            ok: false as const,
            code: 'jev_unreachable' as const,
            message: JEV_CONFIG_ERROR_MESSAGES.jev_unreachable,
          };
        }
        jevProbeCache.set(cacheKey, signature);
      }
    } else {
      jevProbeCache.delete(request.sessionId ?? 'workspace');
    }
    return extras.jevConfig.save(
      { enabled: planned.next.enabled, apiKey: planned.next.apiKey },
      request.sessionId,
    );
  },
  attachInterviewer(request) {
    cancelledSessions.delete(request.sessionId);
    watchResults.delete(request.sessionId);
    const text = assembleInterviewerPersona({
      topic: request.topic,
      difficulty: request.difficulty,
    });
    return persona.install(request.sessionId, text);
  },
  briefCoach(request) {
    cancelledSessions.delete(request.sessionId);
    watchResults.delete(request.sessionId);
    persona.clearRoundClose?.(request.sessionId);
    return briefCoachSession(coach, request, examSessions, archive, hooks);
  },
  async watchCoachTurn(request) {
    if (request.force === true) {
      watchControllers.get(request.sessionId)?.abort();
      cancelEnrichment(request.sessionId);
      watchFlights.delete(request.sessionId);
      watchResults.delete(request.sessionId);
    }
    const running = watchFlights.get(request.sessionId);
    if (running !== undefined) {
      return Promise.race([
        running,
        wait(WATCH_SNAPSHOT_DELAY_MS).then(() => {
          return watchSnapshot(request.sessionId);
        }),
      ]);
    }
    const cached = watchResults.get(request.sessionId);
    if (cached !== undefined && cached.expiresAt > Date.now() && request.force !== true) {
      const [question, human] = await Promise.all([
        coach.readLatestQuestion(request.sessionId),
        coach.readLatestHuman(request.sessionId),
      ]);
      const record = examSessions.load(request.sessionId);
      const latestCard = record?.deck.cards[record.deck.cards.length - 1];
      const knownAnswer = human.ok && latestCard !== undefined
        ? latestCard.seedUserText === human.text || latestCard.answerTurns?.includes(human.text) === true
        : false;
      const knownQuestion = question.ok && record !== undefined ? question.text === record.lastQuestionText : false;
      if (knownAnswer && knownQuestion) {
        return cached.response;
      }
    } else if (cached !== undefined) {
      watchResults.delete(request.sessionId);
    }
    const controller = new AbortController();
    watchControllers.set(request.sessionId, controller);
    const background = {
      schedule(key: string, run: () => Promise<void>) {
        if (enrichmentFlights.has(key)) return;
        enrichmentSessions.add(request.sessionId);
        watchResults.delete(request.sessionId);
        const task = run().catch(() => undefined);
        enrichmentFlights.set(key, { sessionId: request.sessionId, controller, task });
        void task.finally(() => {
          if (enrichmentFlights.get(key)?.task === task) {
            enrichmentFlights.delete(key);
          }
          const stillRunning = [...enrichmentFlights.values()].some(
            (flight) => flight.sessionId === request.sessionId,
          );
          if (!stillRunning) {
            enrichmentSessions.delete(request.sessionId);
            watchResults.delete(request.sessionId);
          }
        });
      },
    };
    const task = watchCoachTurnSession(
      coach,
      examSessions,
      request,
      {},
      archive,
      hooks,
      extras?.coverage,
      () => !cancelledSessions.has(request.sessionId),
      watchControllers.get(request.sessionId)?.signal,
      briefCache,
      background,
    );
    watchFlights.set(request.sessionId, task);
    void task.then(
      (response) => {
        if (
          !cancelledSessions.has(request.sessionId) &&
          watchControllers.get(request.sessionId) === controller &&
          !enrichmentSessions.has(request.sessionId)
        ) {
          watchResults.set(request.sessionId, { response, expiresAt: Date.now() + WATCH_RESULT_TTL_MS });
        }
        if (watchFlights.get(request.sessionId) === task) {
          watchFlights.delete(request.sessionId);
          watchControllers.delete(request.sessionId);
        }
      },
      () => {
        if (watchFlights.get(request.sessionId) === task) {
          watchFlights.delete(request.sessionId);
          watchControllers.delete(request.sessionId);
        }
      },
    );
    const response = await Promise.race([
      task,
      wait(WATCH_SNAPSHOT_DELAY_MS).then(() => {
        return watchSnapshot(request.sessionId);
      }),
    ]);
    if (response.ok && response.status === 'unchanged') {
      const snapshot = watchSnapshot(request.sessionId);
      if (snapshot.ok && snapshot.status === 'updated') {
        return snapshot;
      }
    }
    return response;
  },
  loadDeck(request) {
    return loadDeckSession(examSessions, request, archive);
  },
  endRound(request) {
    cancelledSessions.add(request.sessionId);
    watchResults.delete(request.sessionId);
    watchControllers.get(request.sessionId)?.abort();
    cancelEnrichment(request.sessionId);
    watchFlights.delete(request.sessionId);
    watchControllers.delete(request.sessionId);
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
