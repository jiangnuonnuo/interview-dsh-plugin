import { useEffect, useState } from 'react';
import {
  DIFFICULTY_LABELS,
  findCard,
  type InterviewDeck,
  type QuestionCard,
} from 'interview-dsh-shared';
import styles from './InProgressPanel.module.css';

export interface InProgressPanelProps {
  deck: InterviewDeck;
  error?: string | null;
  onClose?: () => void;
  onRefresh?: () => void;
  onEnd?: () => void;
  refreshing?: boolean;
}

const scoreLabel = (score: number | null): string => (score === null ? '—' : String(score));

const CardBody = ({ card }: { card: QuestionCard }) => (
  <>
    <section>
      <h2 className={styles.block}>本题题干</h2>
      <p className={styles.brief}>{card.questionBrief}</p>
    </section>
    <section>
      <h2 className={styles.block}>标准答要点</h2>
      <ul className={styles.points}>
        {card.keyPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
    <section>
      <h2 className={styles.block}>作答</h2>
      <p className={styles.brief} data-testid="card-answer">
        {card.answer ?? '待作答'}
      </p>
    </section>
    <section>
      <h2 className={styles.block}>对照</h2>
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
    </section>
    <section>
      <h2 className={styles.block}>评分</h2>
      <ul className={styles.scores} data-testid="score-placeholders">
        {card.scores.map((item) => (
          <li key={item.dimension}>
            <span>{item.dimension}</span>
            <span>{scoreLabel(item.score)}</span>
          </li>
        ))}
      </ul>
    </section>
  </>
);

export const InProgressPanel = ({
  deck,
  error,
  onClose,
  onRefresh,
  onEnd,
  refreshing = false,
}: InProgressPanelProps) => {
  const [viewCardId, setViewCardId] = useState(deck.currentCardId);

  useEffect(() => {
    setViewCardId(deck.currentCardId);
  }, [deck.currentCardId]);

  const index = Math.max(
    0,
    deck.cards.findIndex((card) => card.id === viewCardId),
  );
  const card = findCard(deck, deck.cards[index]?.id ?? deck.currentCardId) ?? deck.cards[0];
  if (card === undefined) {
    return null;
  }

  return (
    <aside className={styles.panel} aria-label="模拟面试进行中">
      <header className={styles.head}>
        {onClose !== undefined ? (
          <button type="button" className={styles.close} onClick={onClose}>
            关闭
          </button>
        ) : null}
        <div>
          <h1 className={styles.title}>模拟面试</h1>
          <p className={styles.sub}>进行中 · 八股专项</p>
        </div>
      </header>
      <div className={styles.body}>
        <section data-testid="interview-in-progress">
          <p className={styles.status}>进行中</p>
          <p className={styles.meta}>主题：{deck.topic}</p>
          <p className={styles.meta}>难度：{DIFFICULTY_LABELS[deck.difficulty]}</p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {onEnd !== undefined ? (
            <button type="button" className={styles.end} data-testid="end-exam" onClick={onEnd}>
              结束本场
            </button>
          ) : null}
        </section>
        <section>
          <div className={styles.blockHead}>
            <h2 className={styles.block} data-testid="card-id">
              {card.id}
            </h2>
            {onRefresh !== undefined ? (
              <button
                type="button"
                className={styles.refresh}
                data-testid="refresh-coach"
                onClick={onRefresh}
                disabled={refreshing}
              >
                {refreshing ? '刷新中' : '刷新本题'}
              </button>
            ) : null}
          </div>
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navBtn}
              data-testid="prev-card"
              disabled={index <= 0}
              onClick={() => {
                const previous = deck.cards[index - 1];
                if (previous !== undefined) {
                  setViewCardId(previous.id);
                }
              }}
            >
              上一题
            </button>
            <button
              type="button"
              className={styles.navBtn}
              data-testid="next-card"
              disabled={index >= deck.cards.length - 1}
              onClick={() => {
                const next = deck.cards[index + 1];
                if (next !== undefined) {
                  setViewCardId(next.id);
                }
              }}
            >
              下一题
            </button>
          </div>
        </section>
        <CardBody card={card} />
      </div>
    </aside>
  );
};
