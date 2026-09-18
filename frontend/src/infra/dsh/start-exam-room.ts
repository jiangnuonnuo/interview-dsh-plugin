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

export interface ExamSessionListSnapshot {
  readonly current?: string;
  readonly byId?: Record<string, { readonly cwd?: string; readonly workspaceId?: string }>;
}

export interface ExamRoomSessions {
  create(opts?: { workspaceId?: string; cwd?: string; sessionId?: string }): Promise<string>;
  binding(id: string): { session: { prompt(content: PromptContentPart[], mode: 'queue' | 'steer'): Promise<PromptRemoteResult> } } | undefined;
  open(id: string): void;
  list?: {
    getSnapshot(): ExamSessionListSnapshot;
  };
}

export interface ExamWorkspaceItem {
  readonly workspaceId?: unknown;
  readonly path?: unknown;
  readonly sessionIds?: unknown;
}

export interface ExamWorkspaces {
  readonly list?: {
    getSnapshot(): {
      readonly items?: readonly ExamWorkspaceItem[];
      readonly recentWorkspaceId?: unknown;
    };
  };
}

export interface ExamRoomHost {
  attachInterviewer(request: AttachInterviewerRequest): Promise<AttachInterviewerResponse>;
}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const normalizePath = (value: string): string => value.replace(/[/\\]+$/, '');

const workspaceItems = (workspaces: ExamWorkspaces | undefined): readonly ExamWorkspaceItem[] => {
  const items = workspaces?.list?.getSnapshot?.()?.items;
  return Array.isArray(items) ? items : [];
};

const ownerWorkspaceId = (
  items: readonly ExamWorkspaceItem[],
  match: (item: ExamWorkspaceItem) => boolean,
): string | undefined => {
  for (const item of items) {
    if (!match(item)) {
      continue;
    }
    const id = asNonEmptyString(item.workspaceId);
    if (id !== undefined) {
      return id;
    }
  }
  return undefined;
};

/**
 * Host 只有 create({ workspaceId }) 才会 attachSession；只传 cwd 会进未分组。
 * 当前会话已在某项目下时信会话所属；未分组时信顶栏 recentWorkspaceId。
 */
export const resolveExamWorkspace = (
  sessions: ExamRoomSessions,
  workspaces?: ExamWorkspaces,
): { cwd: string } | { workspaceId: string } | undefined => {
  const snapshot = sessions.list?.getSnapshot?.();
  const current = asNonEmptyString(snapshot?.current);
  const record = current !== undefined ? snapshot?.byId?.[current] : undefined;
  const cwd = asNonEmptyString(record?.cwd);
  const recordWorkspaceId = asNonEmptyString(record?.workspaceId);
  const items = workspaceItems(workspaces);

  if (current !== undefined) {
    const grouped = ownerWorkspaceId(items, (item) => {
      const ids = item.sessionIds;
      return Array.isArray(ids) && ids.some((id) => id === current);
    });
    if (grouped !== undefined) {
      return { workspaceId: grouped };
    }
  }

  const recent = asNonEmptyString(workspaces?.list?.getSnapshot?.()?.recentWorkspaceId);
  if (recent !== undefined) {
    return { workspaceId: recent };
  }

  if (cwd !== undefined) {
    const byPath = ownerWorkspaceId(
      items,
      (item) => asNonEmptyString(item.path) !== undefined && normalizePath(String(item.path)) === normalizePath(cwd),
    );
    if (byPath !== undefined) {
      return { workspaceId: byPath };
    }
  }

  if (recordWorkspaceId !== undefined) {
    return { workspaceId: recordWorkspaceId };
  }
  if (cwd !== undefined) {
    return { cwd };
  }
  return undefined;
};

export const startExamRoom = async (
  deps: {
    sessions: ExamRoomSessions | undefined;
    workspaces?: ExamWorkspaces;
    host: ExamRoomHost;
  },
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

  const workspace = resolveExamWorkspace(sessions, deps.workspaces);
  if (workspace === undefined) {
    return {
      ok: false,
      code: 'persist_unavailable',
      message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
    };
  }

  let sessionId: string;
  try {
    sessionId = await sessions.create(workspace);
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
