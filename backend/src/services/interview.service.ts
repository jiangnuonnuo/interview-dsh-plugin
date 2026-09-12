/**
 * Interview service stub.
 *
 * TODO: Implement domain logic once requirements are defined.
 */

import { PluginError } from '../infra/errors.js';
import type { InterviewRequest, InterviewResponse } from 'shared/api/interviews.js';

export const createInterview = async (
  request: InterviewRequest
): Promise<InterviewResponse> => {
  if (!request.candidateId || !request.interviewerId) {
    throw new PluginError('invalid_request', 'candidateId and interviewerId are required');
  }

  // Placeholder implementation
  return {
    interviewId: 'placeholder-id',
    status: 'created',
    createdAt: new Date().toISOString(),
  };
};
