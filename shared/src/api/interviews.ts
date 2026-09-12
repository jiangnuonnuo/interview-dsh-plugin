/** Request to create or update an interview */
export interface InterviewRequest {
  readonly candidateId: string;
  readonly interviewerId: string;
  readonly scheduledAt: string;
  readonly mode: 'online' | 'offline';
}

/** Successful interview response */
export interface InterviewResponse {
  readonly interviewId: string;
  readonly status: 'created' | 'updated';
  readonly createdAt: string;
}

/** Error response shape */
export interface ErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly unknown[];
}
