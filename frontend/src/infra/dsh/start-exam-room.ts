import {
  INTERVIEW_OPENING_PROMPT,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type AttachInterviewerRequest,
  type AttachInterviewerResponse,
  type StartExamRoomInput,
  type StartExamRoomResponse,
} from 'interview-dsh-shared';

interface PromptContentPart {
  readonly type: 'text';
  readonly text: string;
}

interface PromptRemoteResult {
  readonly ok: boolean;
}

export interface ExamRoomSessions {
  create(opts?: { workspaceId?: string; cwd?: string; sessionId?: string }): Promise<string>;
  binding(id: string): { session: { prompt(content: PromptContentPart[], mode: 'queue' | 'steer'): Promise<PromptRemoteResult> } } | undefined;
  open(id: string): void;
}

export interface ExamRoomHost {
  attachInterviewer(request: AttachInterviewerRequest): Promise<AttachInterviewerResponse>;
}

export const startExamRoom = async (
  deps: { sessions: ExamRoomSessions | undefined; host: ExamRoomHost },
  input: StartExamRoomInput,
): Promise<StartExamRoomResponse> => {
  const sessions = deps.sessions;
  if (sessions === undefined || typeof sessions.create !== 'function') {
    return {
      ok: false,
      code: 'inject_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
    };
  }

  let sessionId: string;
  try {
    sessionId = await sessions.create();
  } catch {
    return {
      ok: false,
      code: 'inject_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
    };
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return {
      ok: false,
      code: 'inject_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
    };
  }

  const attached = await deps.host.attachInterviewer({
    sessionId,
    topic: input.topic,
    difficulty: input.difficulty,
  });
  if (!attached.ok) {
    return attached;
  }

  const binding = sessions.binding(sessionId);
  if (binding === undefined) {
    return {
      ok: false,
      code: 'first_question_failed',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed,
    };
  }

  let prompted: PromptRemoteResult;
  try {
    prompted = await binding.session.prompt(
      [{ type: 'text', text: INTERVIEW_OPENING_PROMPT }],
      'queue',
    );
  } catch {
    return {
      ok: false,
      code: 'first_question_failed',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed,
    };
  }
  if (!prompted.ok) {
    return {
      ok: false,
      code: 'first_question_failed',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed,
    };
  }

  sessions.open(sessionId);
  return { ok: true, sessionId };
};
