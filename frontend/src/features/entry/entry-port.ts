import type {
  AcceptEntryConfigRequest,
  AcceptEntryConfigResponse,
  GetEntryConfigResponse,
  LoadDeckRequest,
  LoadDeckResponse,
  StartInterviewResponse,
  WatchCoachTurnRequest,
  WatchCoachTurnResponse,
} from 'interview-dsh-shared';

export interface EntryPort {
  acceptEntryConfig(request: AcceptEntryConfigRequest): Promise<AcceptEntryConfigResponse>;
  getEntryConfig(): Promise<GetEntryConfigResponse>;
  startInterview(request: AcceptEntryConfigRequest): Promise<StartInterviewResponse>;
  watchCoachTurn(request: WatchCoachTurnRequest): Promise<WatchCoachTurnResponse>;
  loadDeck(request: LoadDeckRequest): Promise<LoadDeckResponse>;
}
