/**
 * @jest-environment node
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  INTERVIEW_ROUND_CLOSING_PROMPT,
  INTERVIEW_ROUND_END_TRIGGER,
  INTERVIEW_SESSION_ERROR_MESSAGES,
} from 'interview-dsh-shared';
import { createEntryConfigStore } from '../src/data/entry-config-store.js';
import { createInterviewEntryService } from '../src/services/interview-entry.service.js';
import { clipChain, type ParsedChain } from '../src/services/knowledge-chain.js';

const sourceOf = (dir: string): string =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n');

describe('transcript isolation', () => {
  it('does not session.prompt chain or score text from services', () => {
    const services = sourceOf(join(__dirname, '../src/services'));
    const persona = readFileSync(join(__dirname, '../src/infra/dsh/interviewer-persona.ts'), 'utf8');
    expect(services).not.toContain('session.prompt(');
    expect(persona).not.toContain('session.prompt(');
    expect(services).not.toContain('.append(');
  });
});

describe('armRoundClose', () => {
  it('clears the chain section before installing the closing section', () => {
    const calls: string[] = [];
    const service = createInterviewEntryService(createEntryConfigStore(), {
      install: () => ({ ok: true }),
      clearChain: () => {
        calls.push('clearChain');
      },
      installRoundClose: (_sessionId, text) => {
        calls.push('close');
        expect(text).toBe(INTERVIEW_ROUND_CLOSING_PROMPT);
        expect(text).not.toBe(INTERVIEW_ROUND_END_TRIGGER);
        return { ok: true };
      },
    });
    const armed = service.armRoundClose({ sessionId: 'session-exam' });
    expect(armed).toEqual({ ok: true });
    expect(calls).toEqual(['clearChain', 'close']);
    const sample = clipChain({
      difficulty: 'mid',
      chain: {
        pointName: '索引',
        layer: 'why',
        intent: '说出机制',
        moves: { deep: '换前提', partial: '追缺口', miss: '换问法' },
      } satisfies ParsedChain,
      cardIds: ['Q1'],
    });
    expect(sample.sectionText).not.toBe(INTERVIEW_ROUND_END_TRIGGER);
    expect(INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable.length).toBeGreaterThan(0);
  });
});
