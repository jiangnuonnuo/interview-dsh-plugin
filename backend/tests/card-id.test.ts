/**
 * @jest-environment node
 */

import { assignCardId, isCardId } from '../src/services/card-id.js';

describe('isCardId', () => {
  it('accepts Q1 and Q1.1', () => {
    expect(isCardId('Q1')).toBe(true);
    expect(isCardId('Q1.1')).toBe(true);
    expect(isCardId('Q12.3')).toBe(true);
  });

  it('rejects illegal values', () => {
    expect(isCardId('q1')).toBe(false);
    expect(isCardId('Q0')).toBe(false);
    expect(isCardId('Q1.0')).toBe(false);
    expect(isCardId('1')).toBe(false);
    expect(isCardId('Q1.')).toBe(false);
  });
});

describe('assignCardId', () => {
  it('uses a unused legal suggestion', () => {
    expect(assignCardId(['Q1'], { suggestedId: 'Q1.1' })).toBe('Q1.1');
  });

  it('falls back when the suggestion is illegal or taken', () => {
    expect(assignCardId(['Q1'], { suggestedId: 'Q1', previousId: 'Q1' })).toBe('Q1.1');
    expect(assignCardId(['Q1'], { suggestedId: 'bad', previousId: 'Q1' })).toBe('Q1.1');
  });

  it('advances Q1 to Q1.1 and Q1.1 to Q1.2', () => {
    expect(assignCardId(['Q1'], { previousId: 'Q1' })).toBe('Q1.1');
    expect(assignCardId(['Q1', 'Q1.1'], { previousId: 'Q1.1' })).toBe('Q1.2');
  });

  it('opens Q2 on next_topic', () => {
    expect(assignCardId(['Q1', 'Q1.1'], { relation: 'next_topic', previousId: 'Q1.1' })).toBe('Q2');
  });

  it('opens Q1 when the deck is empty', () => {
    expect(assignCardId([])).toBe('Q1');
  });
});
