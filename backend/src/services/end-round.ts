import {
  INTERVIEW_ROUND_END_TRIGGER,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type EndRoundRequest,
  type EndRoundResponse,
} from 'interview-dsh-shared';
import { renderQaMarkdown, renderSummaryMarkdown } from '../data/round-notes.js';
import type { ExamSessionStore } from '../data/exam-session-store.js';
import { saveExamRecord, type WorkspaceArchive } from '../data/workspace-archive.js';
import type { CoachRuntime } from './coach-brief.js';
import { assembleRoundAdvicePrompt } from './round-advice.js';

const withNotePaths = (
  qaPath: string | undefined,
  summaryPath: string | undefined,
): { qaPath?: string; summaryPath?: string } => ({
  ...(qaPath !== undefined ? { qaPath } : {}),
  ...(summaryPath !== undefined ? { summaryPath } : {}),
});

export const endRoundSession = async (
  runtime: CoachRuntime,
  examSessions: ExamSessionStore,
  request: EndRoundRequest,
  archive?: WorkspaceArchive,
): Promise<EndRoundResponse> => {
  const record = examSessions.load(request.sessionId);
  const deck = record?.deck ?? (await archive?.readDeck(request.sessionId));
  if (deck === undefined) {
    return {
      ok: false,
      code: 'follow_up_failed',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
      ended: false,
    };
  }
  const last = deck.cards[deck.cards.length - 1];
  saveExamRecord(examSessions, deck, last?.questionText ?? '', {
    ended: true,
    closingSeed: INTERVIEW_ROUND_END_TRIGGER,
  });

  const marked = archive?.markEnded === undefined
    ? { ok: true as const }
    : await archive.markEnded(deck.sessionId, INTERVIEW_ROUND_END_TRIGGER);

  let advice: string | null = null;
  let adviceFailed = false;
  const { system, user } = assembleRoundAdvicePrompt(deck);
  const raw = await runtime.complete(system, user);
  if (typeof raw === 'string' && raw.trim().length > 0) {
    advice = raw.trim();
  } else {
    adviceFailed = true;
  }

  const qa = renderQaMarkdown(deck);
  const summary = renderSummaryMarkdown(deck, advice);
  let qaPath: string | undefined =
    deck.archiveDir.length > 0 ? `${deck.archiveDir}/qa.md` : undefined;
  let summaryPath: string | undefined =
    deck.archiveDir.length > 0 ? `${deck.archiveDir}/summary.md` : undefined;
  let persistFailed = marked !== undefined && marked.ok === false;
  if (archive?.writeRoundNotes !== undefined) {
    const written = await archive.writeRoundNotes(deck.sessionId, { qa, summary });
    if (written.ok) {
      qaPath = written.qaPath;
      summaryPath = written.summaryPath;
    } else {
      persistFailed = true;
    }
  }

  if (persistFailed) {
    return {
      ok: false,
      code: 'persist_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
      ended: true,
      ...withNotePaths(qaPath, summaryPath),
    };
  }
  if (adviceFailed) {
    return {
      ok: false,
      code: 'coach_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
      ended: true,
      ...withNotePaths(qaPath, summaryPath),
    };
  }
  return {
    ok: true,
    sessionId: deck.sessionId,
    qaPath: qaPath ?? `${deck.archiveDir}/qa.md`,
    summaryPath: summaryPath ?? `${deck.archiveDir}/summary.md`,
    ended: true,
  };
};
