import type {
  AcceptEntryConfigRequest,
  AcceptEntryConfigResponse,
  EndRoundRequest,
  EndRoundResponse,
  GetEntryConfigResponse,
  GetJevConfigResponse,
  LoadDeckRequest,
  LoadDeckResponse,
  SaveJevConfigRequest,
  SaveJevConfigResponse,
  StartInterviewResponse,
  WatchCoachTurnRequest,
  WatchCoachTurnResponse,
} from 'interview-dsh-shared';

export interface EntryPort {
  acceptEntryConfig(request: AcceptEntryConfigRequest): Promise<AcceptEntryConfigResponse>;
  getEntryConfig(): Promise<GetEntryConfigResponse>;
  getJevConfig(): Promise<GetJevConfigResponse>;
  saveJevConfig(request: SaveJevConfigRequest): Promise<SaveJevConfigResponse>;
  startInterview(request: AcceptEntryConfigRequest): Promise<StartInterviewResponse>;
  watchCoachTurn(request: WatchCoachTurnRequest): Promise<WatchCoachTurnResponse>;
  loadDeck(request: LoadDeckRequest): Promise<LoadDeckResponse>;
  restoreDeck(): Promise<LoadDeckResponse>;
  endRound(request: EndRoundRequest): Promise<EndRoundResponse>;
}
