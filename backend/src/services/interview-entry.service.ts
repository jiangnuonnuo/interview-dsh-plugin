import {
  CUSTOM_TOPIC_ID,
  ENTRY_ERROR_MESSAGES,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  findPresetTopic,
  isDifficulty,
  type AcceptEntryConfigRequest,
  type AcceptEntryConfigResponse,
  type AttachInterviewerRequest,
  type AttachInterviewerResponse,
  type BriefCoachRequest,
  type BriefCoachResponse,
  type EntryConfig,
  type EntryErrorCode,
  type GetEntryConfigResponse,
  type LoadDeckRequest,
  type LoadDeckResponse,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { EntryConfigStore } from '../data/entry-config-store.js';
import { createExamSessionStore, type ExamSessionStore } from '../data/exam-session-store.js';
import { loadDeckSession, type WorkspaceArchive } from '../data/workspace-archive.js';
import { briefCoachSession, type CoachRuntime } from './coach-brief.js';
import { assembleInterviewerPersona } from './interviewer-persona.js';
import { watchCoachTurnSession } from './watch-coach-turn.js';

export interface InterviewerPersonaInstaller {
  install(sessionId: string, text: string): AttachInterviewerResponse;
}

export interface InterviewEntryService {
  acceptEntryConfig(request: AcceptEntryConfigRequest): AcceptEntryConfigResponse;
  getEntryConfig(): GetEntryConfigResponse;
  attachInterviewer(request: AttachInterviewerRequest): AttachInterviewerResponse;
  briefCoach(request: BriefCoachRequest): Promise<BriefCoachResponse>;
  watchCoachTurn(request: WatchCoachTurnRequest): Promise<WatchCoachTurnResponse>;
  loadDeck(request: LoadDeckRequest): Promise<LoadDeckResponse>;
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
): InterviewEntryService => ({
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
    return briefCoachSession(coach, request, examSessions, archive);
  },
  watchCoachTurn(request) {
    return watchCoachTurnSession(coach, examSessions, request, {}, archive);
  },
  loadDeck(request) {
    return loadDeckSession(examSessions, request, archive);
  },
});
