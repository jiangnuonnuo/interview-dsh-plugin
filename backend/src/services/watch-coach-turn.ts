import {
  INTERVIEW_SESSION_ERROR_MESSAGES,
  emptyBaguaScores,
  type WatchCoachTurnRequest,
  type WatchCoachTurnResponse,
} from 'interview-dsh-shared';
import type { ExamSessionStore } from '../data/exam-session-store.js';
import {
  assembleCoachBriefPrompt,
  parseCoachBriefOutput,
  type CoachRuntime,
} from './coach-brief.js';

export const WATCH_COACH_TURN_TIMEOUT_MS = 20_000;

export interface WatchCoachTurnClock {
  readonly timeoutMs?: number;
  readonly pollMs?: number;
}

const followUpFailed = (): WatchCoachTurnResponse => ({
  ok: false,
  code: 'follow_up_failed',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
});

const coachUnavailable = (): WatchCoachTurnResponse => ({
  ok: false,
  code: 'coach_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
});

export const watchCoachTurnSession = async (
  runtime: CoachRuntime,
  examSessions: ExamSessionStore,
  request: WatchCoachTurnRequest,
  clock: WatchCoachTurnClock = {},
): Promise<WatchCoachTurnResponse> => {
  const record = examSessions.load(request.sessionId);
  if (record === undefined) {
    return followUpFailed();
  }

  const pollMs = clock.pollMs ?? 300;
  const briefPendingQuestion = async (questionText: string): Promise<WatchCoachTurnResponse> => {
    let pendingText = questionText;
    let parsed: ReturnType<typeof parseCoachBriefOutput> = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { system, user } = assembleCoachBriefPrompt({
        topic: record.topic,
        difficulty: record.difficulty,
        questionText: pendingText,
      });
      const raw = await runtime.complete(system, user);
      if (raw === null) {
        return coachUnavailable();
      }
      parsed = parseCoachBriefOutput(raw);
      if (parsed === null) {
        return coachUnavailable();
      }

      if (attempt < 2) {
        const caught = await runtime.awaitNewQuestion(request.sessionId, pendingText, {
          timeoutMs: pollMs,
          pollMs,
        });
        if (caught.ok && caught.status === 'ready' && caught.text !== pendingText) {
          pendingText = caught.text;
          continue;
        }
      }
      break;
    }
    if (parsed === null) {
      return coachUnavailable();
    }

    const snapshot = {
      phase: 'in_progress' as const,
      sessionId: record.sessionId,
      topic: record.topic,
      difficulty: record.difficulty,
      questionBrief: parsed.questionBrief,
      keyPoints: parsed.keyPoints,
      scores: emptyBaguaScores(),
    };
    examSessions.save({
      sessionId: record.sessionId,
      topic: record.topic,
      difficulty: record.difficulty,
      lastQuestionText: pendingText,
      snapshot,
    });

    return { ok: true, status: 'updated', snapshot };
  };

  if (request.force === true) {
    const latest = await runtime.readLatestQuestion(request.sessionId);
    if (!latest.ok) {
      return latest;
    }
    return briefPendingQuestion(latest.text);
  }

  const waited = await runtime.awaitNewQuestion(request.sessionId, record.lastQuestionText, {
    timeoutMs: clock.timeoutMs ?? WATCH_COACH_TURN_TIMEOUT_MS,
    pollMs: clock.pollMs,
  });
  if (!waited.ok) {
    return waited;
  }
  if (waited.status === 'unchanged') {
    return { ok: true, status: 'unchanged' };
  }
  return briefPendingQuestion(waited.text);
};
