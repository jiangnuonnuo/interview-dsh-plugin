import type {
  AcceptEntryConfigRequest,
  AcceptEntryConfigResponse,
  BriefCoachRequest,
  BriefCoachResponse,
  StartInterviewResponse,
} from 'interview-dsh-shared';
import {
  startExamRoom,
  type ExamRoomHost,
  type ExamRoomSessions,
  type ExamWorkspaces,
} from './start-exam-room';

export interface StartInterviewHost extends ExamRoomHost {
  acceptEntryConfig(request: AcceptEntryConfigRequest): Promise<AcceptEntryConfigResponse>;
  briefCoach(request: BriefCoachRequest): Promise<BriefCoachResponse>;
}

export const startInterview = async (
  deps: {
    sessions: ExamRoomSessions | undefined;
    workspaces?: ExamWorkspaces;
    host: StartInterviewHost;
  },
  request: AcceptEntryConfigRequest,
): Promise<StartInterviewResponse> => {
  const accepted = await deps.host.acceptEntryConfig(request);
  if (!accepted.ok) {
    return accepted;
  }

  const exam = await startExamRoom(
    { sessions: deps.sessions, workspaces: deps.workspaces, host: deps.host },
    { topic: accepted.config.topic, difficulty: accepted.config.difficulty },
  );
  if (!exam.ok) {
    return exam;
  }

  return deps.host.briefCoach({
    sessionId: exam.sessionId,
    topic: accepted.config.topic,
    difficulty: accepted.config.difficulty,
  });
};
