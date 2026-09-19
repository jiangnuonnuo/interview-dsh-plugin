import {
  INTERVIEW_ROUND_END_TRIGGER,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  type ArmRoundCloseResponse,
  type EndRoundRequest,
  type EndRoundResponse,
} from 'interview-dsh-shared';
import type { ExamRoomSessions } from './start-exam-room';

export interface EndExamRoundHost {
  armRoundClose(request: EndRoundRequest): Promise<ArmRoundCloseResponse>;
  endRound(request: EndRoundRequest): Promise<EndRoundResponse>;
}

const withNotePaths = (ended: EndRoundResponse): Pick<EndRoundResponse, never> & {
  qaPath?: string;
  summaryPath?: string;
} => ({
  ...('qaPath' in ended && ended.qaPath !== undefined ? { qaPath: ended.qaPath } : {}),
  ...('summaryPath' in ended && ended.summaryPath !== undefined
    ? { summaryPath: ended.summaryPath }
    : {}),
});

const closingFailed = (ended: EndRoundResponse): EndRoundResponse => ({
  ok: false,
  code: 'closing_failed',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.closing_failed,
  ended: ended.ok || ended.ended,
  ...withNotePaths(ended),
});

/**
 * Host 先挂收尾 section 并写 qa.md / summary.md；Client 对考场 prompt「结束面试」。
 * Host 适配层禁止 session.prompt。导演词不得进用户气泡。
 */
export const endExamRound = async (
  deps: {
    sessions: ExamRoomSessions | undefined;
    host: EndExamRoundHost;
  },
  request: EndRoundRequest,
): Promise<EndRoundResponse> => {
  const armed = await deps.host.armRoundClose(request);
  const hostEnding = deps.host.endRound(request);
  const binding = deps.sessions?.binding(request.sessionId);
  let promptFailed = binding === undefined;
  if (binding !== undefined) {
    try {
      const prompted = await binding.session.prompt(
        [{ type: 'text', text: INTERVIEW_ROUND_END_TRIGGER }],
        'queue',
      );
      if (!prompted.ok) {
        promptFailed = true;
      }
    } catch {
      promptFailed = true;
    }
  }
  const ended = await hostEnding;
  if (!armed.ok) {
    if (!ended.ok && !ended.ended) {
      return ended;
    }
    return {
      ok: false,
      code: armed.code,
      message: armed.message,
      ended: ended.ok || ended.ended,
      ...withNotePaths(ended),
    };
  }
  if (promptFailed) {
    if (!ended.ok && !ended.ended) {
      return ended;
    }
    return closingFailed(ended);
  }
  return ended;
};
