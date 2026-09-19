import {
  accumulateWheelSwipe,
  generatingLabel,
  isSwipeIgnoredTarget,
  swipeDirection,
  WHEEL_SWIPE_THRESHOLD,
} from './card-view';

describe('card-view swipe helpers', () => {
  it('labels the generating card from the product copy', () => {
    expect(generatingLabel(false)).toBe('正在准备下一题…');
    expect(generatingLabel(true)).toBe('正在生成本题…');
  });

  it('swipes next on a left drag and prev on a right drag', () => {
    expect(swipeDirection(-48, 0)).toBe('next');
    expect(swipeDirection(48, 0)).toBe('prev');
    expect(swipeDirection(-47, 0)).toBeNull();
    expect(swipeDirection(-80, 90)).toBeNull();
  });

  it('accumulates small horizontal wheel ticks until the threshold', () => {
    const first = accumulateWheelSwipe(0, 20, 0);
    expect(first.direction).toBeNull();
    expect(first.acc).toBe(20);
    const second = accumulateWheelSwipe(first.acc, 25, 2);
    expect(second.direction).toBe('next');
    expect(second.acc).toBe(0);
    expect(WHEEL_SWIPE_THRESHOLD).toBe(40);
  });

  it('resets wheel accumulation when the gesture is vertical', () => {
    expect(accumulateWheelSwipe(30, 10, 40)).toEqual({ acc: 0, direction: null });
  });

  it('only ignores marked chrome, not card buttons', () => {
    document.body.innerHTML = `
      <aside>
        <button data-swipe-ignore="true">下一题</button>
        <div data-current-card="true"><button data-testid="open-card-detail">查看完整内容</button></div>
        <button aria-label="切换到Q2">Q2</button>
      </aside>
    `;
    expect(isSwipeIgnoredTarget(document.querySelector('[data-swipe-ignore]'))).toBe(true);
    expect(isSwipeIgnoredTarget(document.querySelector('[data-testid=open-card-detail]'))).toBe(false);
    expect(isSwipeIgnoredTarget(document.querySelector('[aria-label="切换到Q2"]'))).toBe(false);
  });
});
