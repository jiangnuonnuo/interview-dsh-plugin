import { createEntryConfigStore } from '../data/entry-config-store.js';
import {
  createInterviewEntryService,
  type InterviewerPersonaInstaller,
  type InterviewEntryService,
} from '../services/interview-entry.service.js';
import type { CoachRuntime } from '../services/coach-brief.js';
import type { ExamSessionStore } from '../data/exam-session-store.js';
import type { WorkspaceArchive } from '../data/workspace-archive.js';
import { INTERVIEW_SESSION_ERROR_MESSAGES } from 'interview-dsh-shared';

export const createInterviewEntryPort = (
  store = createEntryConfigStore(),
  persona: InterviewerPersonaInstaller = {
    install: () => ({
      ok: false,
      code: 'inject_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
    }),
  },
  coach?: CoachRuntime,
  examSessions?: ExamSessionStore,
  archive?: WorkspaceArchive,
): InterviewEntryService =>
  coach === undefined
    ? createInterviewEntryService(store, persona)
    : createInterviewEntryService(store, persona, coach, examSessions, archive);
