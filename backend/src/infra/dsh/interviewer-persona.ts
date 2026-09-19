import {
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type AttachInterviewerResponse,
} from 'interview-dsh-shared';

export const INTERVIEWER_PERSONA_SECTION = 'deployment:persona';
export const INTERVIEWER_PERSONA_ORDER = 0;
export const ROUND_CLOSE_SECTION = 'deployment:round-close';
export const ROUND_CLOSE_ORDER = 1;

const roundCloseDisposers = new Map<string, () => void>();

export interface PersonaHostAgent {
  readonly ctx: {
    readonly systemPrompt?: {
      section(section: { name: string; order: number; text: string }): unknown;
    };
  };
}

export interface PersonaHostContext {
  readonly agents?: {
    get(sessionId: string): unknown;
  };
}

const asPersonaAgent = (value: unknown): PersonaHostAgent | undefined => {
  if (value === null || typeof value !== 'object' || !('ctx' in value)) {
    return undefined;
  }
  return value as PersonaHostAgent;
};

const unavailable = (): AttachInterviewerResponse => ({
  ok: false,
  code: 'inject_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
});

export const attachInterviewerPersona = (
  ctx: PersonaHostContext,
  request: { readonly sessionId: string; readonly text: string },
): AttachInterviewerResponse => {
  const systemPrompt = asPersonaAgent(ctx.agents?.get(request.sessionId))?.ctx.systemPrompt;
  if (typeof systemPrompt?.section !== 'function') {
    return unavailable();
  }

  // Must call as a method. Detaching section() drops Cordis `this` and throws
  // `Cannot read properties of undefined (reading 'layers')`.
  try {
    systemPrompt.section({
      name: INTERVIEWER_PERSONA_SECTION,
      order: INTERVIEWER_PERSONA_ORDER,
      text: request.text,
    });
  } catch {
    return unavailable();
  }
  return { ok: true };
};

export const installRoundClosingSection = (
  ctx: PersonaHostContext,
  request: { readonly sessionId: string; readonly text: string },
): AttachInterviewerResponse => {
  const systemPrompt = asPersonaAgent(ctx.agents?.get(request.sessionId))?.ctx.systemPrompt;
  if (typeof systemPrompt?.section !== 'function') {
    return unavailable();
  }

  roundCloseDisposers.get(request.sessionId)?.();
  roundCloseDisposers.delete(request.sessionId);

  try {
    const dispose = systemPrompt.section({
      name: ROUND_CLOSE_SECTION,
      order: ROUND_CLOSE_ORDER,
      text: request.text,
    });
    if (typeof dispose === 'function') {
      roundCloseDisposers.set(request.sessionId, () => {
        (dispose as () => void)();
      });
    }
  } catch {
    return unavailable();
  }
  return { ok: true };
};

export const clearRoundClosingSection = (sessionId: string): void => {
  roundCloseDisposers.get(sessionId)?.();
  roundCloseDisposers.delete(sessionId);
};
