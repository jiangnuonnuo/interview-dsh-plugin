/**
 * @jest-environment node
 */

import { INTERVIEW_OPENING_PROMPT } from 'interview-dsh-shared';
import { latestHumanText } from '../src/services/human-answer.js';

describe('latestHumanText', () => {
  it('skips plugin and tool sources and returns the later user answer', () => {
    const text = latestHumanText([
      {
        type: 'user/message',
        data: {
          role: 'user',
          content: [{ type: 'text', text: INTERVIEW_OPENING_PROMPT }],
          source: { kind: 'plugin' },
        },
      },
      {
        type: 'user/message',
        data: {
          role: 'user',
          content: [{ type: 'text', text: INTERVIEW_OPENING_PROMPT }],
          source: { kind: 'user' },
        },
      },
      {
        type: 'user/message',
        data: {
          role: 'user',
          content: [{ type: 'text', text: '叶子节点存行。' }],
          source: { kind: 'user' },
        },
      },
    ]);
    expect(text).toBe('叶子节点存行。');
  });

  it('reads role=user messages from deriveMessages', () => {
    expect(
      latestHumanText([
        { role: 'assistant', content: [{ type: 'text', text: '请说明聚簇索引。' }] },
        { role: 'user', content: [{ type: 'text', text: '叶子节点存行。' }] },
      ]),
    ).toBe('叶子节点存行。');
  });
});
