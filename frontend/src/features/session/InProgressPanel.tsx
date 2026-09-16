import {
  DIFFICULTY_LABELS,
  type InProgressSnapshot,
} from 'interview-dsh-shared';
import styles from './InProgressPanel.module.css';

export interface InProgressPanelProps {
  snapshot: InProgressSnapshot;
  onClose?: () => void;
}

export const InProgressPanel = ({ snapshot, onClose }: InProgressPanelProps) => {
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
        </section>
        <section>
          <h2 className={styles.block}>本题题干</h2>
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
