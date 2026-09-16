import type {
  AcceptEntryConfigRequest,
  BriefCoachRequest,
  BriefCoachResponse,
  StartExamRoomInput,
  StartExamRoomResponse,
  StartInterviewResponse,
} from 'interview-dsh-shared';
import type { InterviewEntryService } from './interview-entry.service.js';

export interface InterviewSessionPorts {
  startExam(input: StartExamRoomInput): Promise<StartExamRoomResponse>;
  briefCoach(request: BriefCoachRequest): Promise<BriefCoachResponse>;
}

export const startInterviewSession = async (
  entry: InterviewEntryService,
  sessions: InterviewSessionPorts,
  request: AcceptEntryConfigRequest,
): Promise<StartInterviewResponse> => {
  const accepted = entry.acceptEntryConfig(request);
  if (!accepted.ok) {
    return accepted;
  }

  const exam = await sessions.startExam({
    topic: accepted.config.topic,
    difficulty: accepted.config.difficulty,
  });
  if (!exam.ok) {
    return exam;
  }

  return sessions.briefCoach({
    sessionId: exam.sessionId,
    topic: accepted.config.topic,
    difficulty: accepted.config.difficulty,
  });
};
