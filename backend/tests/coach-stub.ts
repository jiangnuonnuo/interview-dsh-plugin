import type { CoachRuntime } from '../src/services/coach-brief.js';

export const stubCoach = (overrides: Partial<CoachRuntime> = {}): CoachRuntime => ({
  readLatestQuestion: async () => ({ ok: true, text: 'x' }),
  readLatestHuman: async () => ({ ok: true, text: '' }),
  awaitNewQuestion: async () => ({ ok: true, status: 'unchanged' }),
  complete: async () => null,
  ...overrides,
});
