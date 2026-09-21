import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DIFFICULTY_LABELS, findCard, type InterviewDeck, type QuestionCard } from 'interview-dsh-shared';
import {
  accumulateWheelSwipe,
  asElement,
  cardShortTitle,
  displayCardText,
  generatingLabel,
  isSwipeIgnoredTarget,
  shouldShowNextGenerating,
  shouldShowRefreshGenerating,
  swipeDirection,
  SWIPE_LOCK_PX,
  WHEEL_SWIPE_COOLDOWN_MS,
} from './card-view';
import styles from './InProgressPanel.module.css';

export interface InProgressPanelProps {
  deck: InterviewDeck;
  error?: string | null;
  onClose?: () => void;
  onRefresh?: () => void;
  onEnd?: () => void;
  refreshing?: boolean;
  ending?: boolean;
}

type ViewMode = 'flow' | 'detail';

type PointerStart = {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  pointerId: number;
  tapOpensDetail: boolean;
  dragging: boolean;
};

type PointEvent = { clientX: number; clientY: number; button?: number; pointerId?: number; type?: string };

const scoreLabel = (score: number | null): string => (score === null ? '—' : String(score));

const IconDoc = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4.2 2.5h5.2L12 5.2v8.3H4.2V2.5z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9.4 2.6v2.8H12" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.5 12.5l.6-3.1 6.2-6.2 2.5 2.5-6.2 6.2-3.1.6z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9.2 4.3l2.5 2.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const IconBars = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.5 12.5V8.5M8 12.5V3.5M12.5 12.5V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M11.2 7A4.2 4.2 0 1 1 9.3 3.2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path d="M9.4 1.8v2.4H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FoldBlock = ({
  title,
  icon,
  children,
  blocked,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  blocked?: { current: boolean };
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.fold}>
      <button
        type="button"
        className={styles.foldBtn}
        aria-expanded={open}
        onClick={() => {
          if (blocked?.current) {
            return;
          }
          setOpen((value) => !value);
        }}
      >
        <span className={styles.foldLead}>
          <span className={styles.foldIcon}>{icon}</span>
          <span className={styles.foldTitle}>{title}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open ? children : null}
    </div>
  );
};

const RefreshButton = ({
  onRefresh,
  refreshing,
}: {
  onRefresh?: () => void;
  refreshing: boolean;
}) => {
  if (onRefresh === undefined) {
    return null;
  }
  return (
    <button
      type="button"
      className={styles.refresh}
      data-testid="refresh-coach"
      data-swipe-ignore="true"
      onClick={onRefresh}
      disabled={refreshing}
    >
      <span className={styles.refreshIcon}>
        <IconRefresh />
      </span>
      {refreshing ? '刷新中' : '刷新本题'}
    </button>
  );
};

const GeneratingSlot = ({
  refreshing,
  className,
}: {
  refreshing: boolean;
  className?: string;
}) => (
  <div
    className={className === undefined ? styles.generating : `${styles.generating} ${className}`}
    data-testid="generating-next"
    role="status"
    aria-live="polite"
  >
    <span className={styles.spinner} aria-hidden="true" />
    <span className={styles.generatingText}>{generatingLabel(refreshing)}</span>
  </div>
);

const PeekCard = ({
  card,
  className,
  onOpen,
}: {
  card: QuestionCard;
  className: string;
  onOpen: () => void;
}) => (
  <button type="button" className={className} aria-label={`切换到${card.id}`} onClick={onOpen}>
    <span className={styles.peekBadge}>{card.id}</span>
  </button>
);

export const InProgressPanel = ({
  deck,
  error,
  onClose,
  onRefresh,
  onEnd,
  refreshing = false,
  ending = false,
}: InProgressPanelProps) => {
  const [viewCardId, setViewCardId] = useState(deck.currentCardId);
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const cardCount = deck.cards.length;
  const prevCountRef = useRef(cardCount);
  const pointerStart = useRef<PointerStart | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const detachSwipe = useRef<(() => void) | null>(null);
  const detachWheel = useRef<(() => void) | null>(null);
  const justSwiped = useRef(false);
  const wheelAt = useRef(0);
  const wheelAcc = useRef(0);
  const indexRef = useRef(0);
  const goToIndexRef = useRef<(nextIndex: number) => void>(() => undefined);

  useEffect(() => {
    if (cardCount > prevCountRef.current) {
      setViewCardId(deck.currentCardId);
    }
    prevCountRef.current = cardCount;
  }, [cardCount, deck.currentCardId]);

  useEffect(
    () => () => {
      detachWheel.current?.();
      detachSwipe.current?.();
    },
    [],
  );

  const setPanelNode = useCallback((node: HTMLElement | null) => {
    detachWheel.current?.();
    detachWheel.current = null;
    panelRef.current = node;
    if (node === null) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        return;
      }
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const result = accumulateWheelSwipe(wheelAcc.current, event.deltaX, event.deltaY);
      wheelAcc.current = result.acc;
      if (horizontal) {
        event.preventDefault();
      }
      if (result.direction === null) {
        return;
      }
      const now = Date.now();
      if (now - wheelAt.current < WHEEL_SWIPE_COOLDOWN_MS) {
        return;
      }
      wheelAt.current = now;
      justSwiped.current = true;
      if (result.direction === 'next') {
        goToIndexRef.current(indexRef.current + 1);
      } else {
        goToIndexRef.current(indexRef.current - 1);
      }
    };
    node.addEventListener('wheel', onWheel, { passive: false, capture: true });
    detachWheel.current = () => {
      node.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
    };
  }, []);

  const index = Math.max(
    0,
    deck.cards.findIndex((item) => item.id === viewCardId),
  );
  const goToIndex = (nextIndex: number) => {
    const target = deck.cards[nextIndex];
    if (target === undefined) {
      return;
    }
    setViewCardId(target.id);
  };
  indexRef.current = index;
  goToIndexRef.current = goToIndex;
  const card = findCard(deck, deck.cards[index]?.id ?? deck.currentCardId) ?? deck.cards[0];
  if (card === undefined) {
    return null;
  }

  const previous = deck.cards[index - 1];
  const next = deck.cards[index + 1];
  const latest = deck.cards[deck.cards.length - 1];
  const viewingLatest = latest !== undefined && card.id === latest.id;
  const showNextGenerating = shouldShowNextGenerating({
    viewingLatest,
    latestStatus: latest?.status,
  });
  const showRefreshGenerating = shouldShowRefreshGenerating({
    viewingTarget: card.status === 'pending' && card.id === deck.currentCardId,
    refreshing,
  });
  const showFlowGenerating = next === undefined && (showNextGenerating || showRefreshGenerating);

  const openDetail = () => {
    setViewMode('detail');
  };

  const stopSwipeListen = () => {
    detachSwipe.current?.();
    detachSwipe.current = null;
  };

  const finishSwipe = (event: PointEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    stopSwipeListen();
    if (start === null) {
      return;
    }
    const endX = start.dragging ? start.lastX : event.clientX;
    const endY = start.dragging ? start.lastY : event.clientY;
    const direction = start.dragging ? swipeDirection(endX - start.x, endY - start.y) : null;
    justSwiped.current = direction !== null;
    if (direction === 'next') {
      goToIndex(index + 1);
      return;
    }
    if (direction === 'prev') {
      goToIndex(index - 1);
      return;
    }
    if (start.tapOpensDetail) {
      openDetail();
    }
  };

  const beginSwipe = (event: PointEvent & { target: EventTarget | null }) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    if (isSwipeIgnoredTarget(event.target)) {
      return;
    }
    stopSwipeListen();
    justSwiped.current = false;
    const el = asElement(event.target);
    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      pointerId: event.pointerId ?? 1,
      tapOpensDetail:
        viewMode === 'flow' &&
        el?.closest('[data-current-card]') !== null &&
        el?.closest('button') == null,
      dragging: false,
    };

    const onMove = (move: PointerEvent | MouseEvent) => {
      const start = pointerStart.current;
      if (start === null) {
        return;
      }
      start.lastX = move.clientX;
      start.lastY = move.clientY;
      const dx = move.clientX - start.x;
      const dy = move.clientY - start.y;
      if (!start.dragging && Math.abs(dx) >= SWIPE_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
        start.dragging = true;
        start.tapOpensDetail = false;
        const node = panelRef.current;
        if (node !== null && 'pointerId' in move) {
          try {
            node.setPointerCapture(move.pointerId);
          } catch {
            // capture is optional; window listeners still finish the gesture
          }
        }
      }
      if (start.dragging) {
        move.preventDefault();
      }
    };

    const onUp = (up: PointerEvent | MouseEvent) => {
      const start = pointerStart.current;
      if (up.type === 'pointercancel') {
        if (start === null || !start.dragging) {
          pointerStart.current = null;
          stopSwipeListen();
          return;
        }
        finishSwipe({ clientX: start.lastX, clientY: start.lastY });
        return;
      }
      if (start !== null) {
        start.lastX = up.clientX;
        start.lastY = up.clientY;
      }
      finishSwipe(up);
    };

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    detachSwipe.current = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
    };
  };

  return (
    <aside
      ref={setPanelNode}
      className={styles.panel}
      aria-label="模拟面试进行中"
      data-testid="interview-in-progress"
      onPointerDown={(event) => {
        beginSwipe(event);
      }}
      onMouseDown={(event) => {
        beginSwipe(event);
      }}
    >
      <header className={styles.chrome}>
        {viewMode === 'detail' ? (
          <button
            type="button"
            className={styles.back}
            data-testid="back-to-flow"
            data-swipe-ignore="true"
            onClick={() => {
              setViewMode('flow');
            }}
          >
            ← 返回卡片流
          </button>
        ) : onClose !== undefined ? (
          <button type="button" className={styles.close} data-swipe-ignore="true" onClick={onClose}>
            关闭
          </button>
        ) : (
          <span />
        )}
        <h1 className={styles.title}>模拟面试</h1>
        {onClose !== undefined ? (
          <button type="button" className={styles.dismiss} data-swipe-ignore="true" onClick={onClose} aria-label="关闭面板">
            ×
          </button>
        ) : (
          <span />
        )}
      </header>

      <div className={styles.statusRow}>
        <p className={styles.live}>
          <span className={styles.dot} aria-hidden="true" />
          进行中 · 八股专项
        </p>
        {onEnd !== undefined ? (
          <button
            type="button"
            className={styles.end}
            data-testid="end-exam"
            data-swipe-ignore="true"
            onClick={onEnd}
            disabled={ending}
          >
            结束本场
          </button>
        ) : null}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.stage} data-testid="card-stage">
      {viewMode === 'flow' ? (
        <div className={styles.flow} data-testid="card-flow">
          <div className={styles.toolbar}>
            <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
          </div>
          <div className={styles.stack}>
            {previous !== undefined ? (
              <PeekCard
                card={previous}
                className={`${styles.peek} ${styles.peekPrev}`}
                onOpen={() => {
                  if (justSwiped.current) {
                    return;
                  }
                  goToIndex(index - 1);
                }}
              />
            ) : null}
            {next !== undefined ? (
              <PeekCard
                card={next}
                className={`${styles.peek} ${styles.peekNext}`}
                onOpen={() => {
                  if (justSwiped.current) {
                    return;
                  }
                  goToIndex(index + 1);
                }}
              />
            ) : showFlowGenerating ? (
              <GeneratingSlot
                refreshing={showRefreshGenerating}
                className={`${styles.peek} ${styles.peekNext} ${styles.generatingPeek}`}
              />
            ) : null}
            <div
              className={styles.current}
              data-current-card="true"
              data-testid="current-card"
            >
              <span className={styles.badge} data-testid="card-id">
                {card.id}
              </span>
              <h2 className={styles.cardTitle}>{cardShortTitle(card.questionBrief)}</h2>
              <p className={styles.summary}>{displayCardText(card.questionText)}</p>
              <button
                type="button"
                className={styles.openDetail}
                data-testid="open-card-detail"
                onPointerUp={() => {
                  if (justSwiped.current) {
                    return;
                  }
                  openDetail();
                }}
                onClick={() => {
                  if (justSwiped.current) {
                    return;
                  }
                  openDetail();
                }}
              >
                <span className={styles.openDetailLabel}>
                  <IconDoc />
                  查看完整内容
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${styles.detail}${showRefreshGenerating ? ` ${styles.detailGenerating}` : ''}`} data-testid="card-detail">
          <div className={styles.detailHead}>
            <span className={styles.detailId} data-testid="card-id">
              {card.id}
            </span>
            <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
          </div>
          <div className={styles.detailTitleRow}>
            <h2 className={styles.detailTitle}>{cardShortTitle(card.questionBrief)}</h2>
            <span className={styles.diff}>难度：{DIFFICULTY_LABELS[deck.difficulty]}</span>
          </div>
          <section className={styles.detailBlock}>
            <h3 className={styles.block}>本题题干</h3>
            <p className={styles.brief}>{displayCardText(card.questionText)}</p>
          </section>
          {showRefreshGenerating ? (
            <GeneratingSlot refreshing />
          ) : (
          <section className={styles.detailBlock}>
            <h3 className={styles.block}>标准答要点</h3>
            <ol className={styles.points}>
              {card.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
          </section>
          )}
          <div key={card.id} className={styles.folds}>
            <FoldBlock title="作答" icon={<IconEdit />} blocked={justSwiped}>
              <p className={styles.brief} data-testid="card-answer">
                {card.answer ?? '待作答'}
              </p>
            </FoldBlock>
            <FoldBlock title="对照" icon={<IconDoc />} blocked={justSwiped}>
              {card.comparison === null ? (
                <p className={styles.brief} data-testid="card-comparison">
                  待对照
                </p>
              ) : (
                <div data-testid="card-comparison">
                  <p className={styles.brief}>已覆盖：{card.comparison.covered.join('；') || '无'}</p>
                  <p className={styles.brief}>未覆盖：{card.comparison.missed.join('；') || '无'}</p>
                  <p className={styles.brief}>{card.comparison.comment}</p>
                </div>
              )}
            </FoldBlock>
            <FoldBlock title="评分" icon={<IconBars />} blocked={justSwiped}>
              <ul className={styles.scores} data-testid="score-placeholders">
                {card.scores.map((item) => (
                  <li key={item.dimension}>
                    <span>{item.dimension}</span>
                    <span>{scoreLabel(item.score)}</span>
                  </li>
                ))}
              </ul>
            </FoldBlock>
          </div>
        </div>
      )}
      </div>

      <div className={styles.footer}>
        <div className={styles.pager} data-testid="card-pager">
          {deck.cards.map((item, cardIndex) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.pageDot} ${cardIndex === index ? styles.pageDotOn : ''}`}
              aria-label={`查看${item.id}`}
              aria-current={cardIndex === index ? 'true' : undefined}
              data-swipe-ignore="true"
              onClick={() => {
                goToIndex(cardIndex);
              }}
            />
          ))}
          {showNextGenerating ? <span className={styles.pageDotGhost} aria-hidden="true" /> : null}
        </div>
        <p className={styles.swipeHint}>左右滑动切换</p>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navPrev}
            data-testid="prev-card"
            data-swipe-ignore="true"
            disabled={index <= 0}
            onClick={() => {
              goToIndex(index - 1);
            }}
          >
            ← 上一题
          </button>
          <button
            type="button"
            className={styles.navNext}
            data-testid="next-card"
            data-swipe-ignore="true"
            disabled={index >= deck.cards.length - 1}
            onClick={() => {
              goToIndex(index + 1);
            }}
          >
            下一题 →
          </button>
        </div>
      </div>
    </aside>
  );
};
