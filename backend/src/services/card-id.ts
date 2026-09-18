export type CardRelation = 'followup' | 'next_topic';

const CARD_ID = /^Q([1-9][0-9]*)(?:\.([1-9][0-9]*))?$/;

export const isCardId = (value: string): boolean => CARD_ID.test(value);

const parseCardId = (value: string): { major: number; minor: number | null } | null => {
  const match = value.trim().match(CARD_ID);
  if (match === null) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: match[2] === undefined ? null : Number(match[2]),
  };
};

const formatFollowUp = (major: number, minor: number): string => `Q${major}.${minor}`;

const nextMajor = (taken: readonly string[]): string => {
  let max = 0;
  for (const id of taken) {
    const parsed = parseCardId(id);
    if (parsed !== null && parsed.major > max) {
      max = parsed.major;
    }
  }
  return `Q${max + 1}`;
};

const nextFollowUp = (previousId: string, taken: readonly string[]): string => {
  const parsed = parseCardId(previousId);
  if (parsed === null) {
    return nextMajor(taken);
  }
  const major = parsed.major;
  let maxMinor = 0;
  for (const id of taken) {
    const item = parseCardId(id);
    if (item !== null && item.major === major && item.minor !== null && item.minor > maxMinor) {
      maxMinor = item.minor;
    }
  }
  if (parsed.minor !== null && parsed.minor > maxMinor) {
    maxMinor = parsed.minor;
  }
  return formatFollowUp(major, maxMinor + 1);
};

/**
 * Assign a Qn / Qn.m id. Coach suggestions are used only when unused and well-formed.
 */
export const assignCardId = (
  taken: readonly string[],
  input: {
    readonly suggestedId?: string;
    readonly relation?: CardRelation;
    readonly previousId?: string;
  } = {},
): string => {
  const suggested = input.suggestedId?.trim() ?? '';
  if (isCardId(suggested) && !taken.includes(suggested)) {
    return suggested;
  }

  if (input.relation === 'next_topic' || input.previousId === undefined || input.previousId.length === 0) {
    return nextMajor(taken);
  }

  return nextFollowUp(input.previousId, taken);
};
