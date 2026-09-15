import type {
  AcceptEntryConfigRequest,
  AcceptEntryConfigResponse,
  GetEntryConfigResponse,
} from 'interview-dsh-shared';

export interface EntryPort {
  acceptEntryConfig(request: AcceptEntryConfigRequest): Promise<AcceptEntryConfigResponse>;
  getEntryConfig(): Promise<GetEntryConfigResponse>;
}
