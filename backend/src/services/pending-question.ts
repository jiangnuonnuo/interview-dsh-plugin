const hasInterrogative = (paragraph: string): boolean => /[？?]/.test(paragraph);

/**
 * 宿主把模型路由失败写进助手气泡时，整段是 `502: {json}`。
 * 不能当题干去 brief，否则会把审查错误开成下一张卡。
 */
export const isHostRouteFailureText = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (/^\d{3}\s*:\s*\{/.test(trimmed)) {
    return true;
  }
  return (
    trimmed.includes('route_plan_error') ||
    trimmed.includes('"failure_class"') ||
    trimmed.includes('machine outputted is blocked')
  );
};

/**
 * 面板 brief 的是「当前待答问」。面试官常在同一气泡里点评后再提问，
 * 文末还可能跟一句没有问号的议程，所以不能把整段助手文本当题干。
 */
export const extractPendingQuestion = (assistantTurn: string): string => {
  const text = assistantTurn.trim();
  if (text.length === 0 || isHostRouteFailureText(text)) {
    return '';
  }

  const marked = text.match(/【本题】\s*([\s\S]+)$/);
  const markedText = marked?.[1]?.trim();
  if (markedText !== undefined && markedText.length > 0) {
    return markedText;
  }

  const parts = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  let end = parts.length - 1;
  while (end >= 0 && !hasInterrogative(parts[end] ?? '')) {
    end -= 1;
  }
  if (end < 0) {
    return text;
  }

  const trailing: string[] = [];
  for (let index = end; index >= 0; index -= 1) {
    const paragraph = parts[index] ?? '';
    if (hasInterrogative(paragraph)) {
      trailing.unshift(paragraph);
      continue;
    }
    break;
  }
  if (trailing.length > 0) {
    return trailing.join('\n');
  }
  return text;
};
