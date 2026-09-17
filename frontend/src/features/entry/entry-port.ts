import type {
  AcceptEntryConfigRequest,
  AcceptEntryConfigResponse,
  GetEntryConfigResponse,
  StartInterviewResponse,
  WatchCoachTurnRequest,
  WatchCoachTurnResponse,
} from 'interview-dsh-shared';

export interface EntryPort {
  acceptEntryConfig(request: AcceptEntryConfigRequest): Promise<AcceptEntryConfigResponse>;
  getEntryConfig(): Promise<GetEntryConfigResponse>;
  startInterview(request: AcceptEntryConfigRequest): Promise<StartInterviewResponse>;
  watchCoachTurn(request: WatchCoachTurnRequest): Promise<WatchCoachTurnResponse>;
}
