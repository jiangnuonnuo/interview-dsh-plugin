import type { CardStatus } from 'interview-dsh-shared';

export const CARD_TITLE_MAX = 16;
export const SWIPE_THRESHOLD_PX = 48;
export const SWIPE_LOCK_PX = 12;
export const WHEEL_SWIPE_THRESHOLD = 40;
/** One trackpad flick keeps sending wheel events until it goes quiet. */
export const WHEEL_GESTURE_IDLE_MS = 280;

export const displayCardText = (text: string): string =>
  text.replace(/\*\*/g, '').replace(/^#+\s+/gm, '').trim();

export const cardShortTitle = (questionBrief: string): string => {
  const first = displayCardText(questionBrief).split(/\r?\n/, 1)[0]?.trim() ?? '';
  const chars = Array.from(first);
  if (chars.length <= CARD_TITLE_MAX) {
    return first;
  }
  return `${chars.slice(0, CARD_TITLE_MAX).join('')}…`;
};

export const shouldShowNextGenerating = ({
  viewingLatest,
  latestStatus,
  guiding = false,
}: {
  viewingLatest: boolean;
  latestStatus: CardStatus | undefined;
  guiding?: boolean;
}): boolean => viewingLatest && latestStatus === 'scored' && !guiding;

export const shouldShowRefreshGenerating = ({
  viewingTarget,
  refreshing,
}: {
  viewingTarget: boolean;
  refreshing: boolean;
}): boolean => refreshing && viewingTarget;

export const generatingLabel = (refreshing: boolean): string =>
  refreshing ? '正在生成本题…' : '正在准备下一题…';

export type SwipeDirection = 'next' | 'prev' | null;

export const swipeDirection = (
  dx: number,
  dy: number,
  threshold = SWIPE_THRESHOLD_PX,
): SwipeDirection => {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) {
    return null;
  }
  return dx < 0 ? 'next' : 'prev';
};

export const accumulateWheelSwipe = (
  acc: number,
  deltaX: number,
  deltaY: number,
  threshold = WHEEL_SWIPE_THRESHOLD,
): { acc: number; direction: SwipeDirection } => {
  if (Math.abs(deltaX) <= Math.abs(deltaY)) {
    return { acc: 0, direction: null };
  }
  const next = acc + deltaX;
  if (Math.abs(next) < threshold) {
    return { acc: next, direction: null };
  }
  return { acc: 0, direction: next > 0 ? 'next' : 'prev' };
};

export const asElement = (target: EventTarget | null): Element | null => {
  if (target instanceof Element) {
    return target;
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return target.parentElement;
  }
  return null;
};

export const isSwipeIgnoredTarget = (target: EventTarget | null): boolean =>
  asElement(target)?.closest('[data-swipe-ignore]') !== null;
