const sourceKind = (item: unknown): string | undefined => {
  if (item === null || typeof item !== 'object') {
    return undefined;
  }
  const record = item as {
    source?: { kind?: string };
    data?: { source?: { kind?: string }; message?: { source?: { kind?: string } } };
  };
  return record.source?.kind ?? record.data?.source?.kind ?? record.data?.message?.source?.kind;
};

export const isHumanUserItem = (item: unknown): boolean => {
  if (item === null || typeof item !== 'object') {
    return false;
  }
  const kind = sourceKind(item);
  if (kind === 'tool' || kind === 'plugin') {
    return false;
  }
  const record = item as { role?: string; type?: string };
  return record.role === 'user' || record.type === 'user/message';
};

export const visibleTextFromContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((block) => {
      if (block === null || typeof block !== 'object') {
        return '';
      }
      const record = block as { type?: string; text?: unknown };
      if (record.type === 'reasoning') {
        return '';
      }
      if (typeof record.text === 'string') {
        return record.text;
      }
      return '';
    })
    .join('')
    .trim();
};

export const humanMessageText = (item: unknown): string => {
  if (!isHumanUserItem(item)) {
    return '';
  }
  const record = item as { content?: unknown; data?: Record<string, unknown> };
  const data = record.data ?? {};
  const message = data.message as { content?: unknown } | undefined;
  return visibleTextFromContent(record.content ?? data.content ?? message?.content);
};

/**
 * Last non-plugin human bubble. Opening `session.prompt` is usually kind=user, so callers
 * must compare against the card's seedUserText before treating this as an answer.
 */
export const latestHumanText = (items: readonly unknown[]): string => {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const text = humanMessageText(items[index]);
    if (text.length > 0) {
      return text;
    }
  }
  return '';
};
