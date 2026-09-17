import {
  DIFFICULTY_LABELS,
  type InProgressSnapshot,
} from 'interview-dsh-shared';
import styles from './InProgressPanel.module.css';

export interface InProgressPanelProps {
  snapshot: InProgressSnapshot;
  error?: string | null;
  onClose?: () => void;
  onRefresh?: () => void;
  onEnd?: () => void;
  refreshing?: boolean;
}

export const InProgressPanel = ({
  snapshot,
  error,
  onClose,
  onRefresh,
  onEnd,
  refreshing = false,
}: InProgressPanelProps) => {
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
          <p className={styles.meta}>主题：{snapshot.topic}</p>
          <p className={styles.meta}>难度：{DIFFICULTY_LABELS[snapshot.difficulty]}</p>
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
            <h2 className={styles.block}>本题题干</h2>
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
          <p className={styles.brief}>{snapshot.questionBrief}</p>
        </section>
        <section>
          <h2 className={styles.block}>标准答要点</h2>
          <ul className={styles.points}>
            {snapshot.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className={styles.block}>评分</h2>
          <ul className={styles.scores} data-testid="score-placeholders">
            {snapshot.scores.map((item) => (
              <li key={item.dimension}>
                <span>{item.dimension}</span>
                <span>—</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
};
