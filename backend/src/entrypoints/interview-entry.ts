import { createEntryConfigStore } from '../data/entry-config-store.js';
import {
  createInterviewEntryService,
  type InterviewEntryService,
} from '../services/interview-entry.service.js';

export const createInterviewEntryPort = (
  store = createEntryConfigStore(),
): InterviewEntryService => createInterviewEntryService(store);
