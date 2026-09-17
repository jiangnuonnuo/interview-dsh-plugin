import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import {
  CUSTOM_TOPIC_ID,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  PRESET_TOPICS,
  TOPIC_CATEGORIES,
  type Difficulty,
} from 'interview-dsh-shared';
import type { EntryPort } from './entry-port';
import { examPanelState } from './exam-panel-state';
import { InProgressPanel } from '../session/InProgressPanel';
import styles from './EntryPanel.module.css';

const TOPIC_ICONS: Record<string, { background: string; svg: ReactElement }> = {
  mysql: {
    background: '#e8f1ff',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <ellipse cx="6" cy="3.2" rx="4.2" ry="1.6" fill="#3d6ae8" />
        <path d="M1.8 3.2v5.2c0 .9 1.9 1.6 4.2 1.6s4.2-.7 4.2-1.6V3.2" stroke="#3d6ae8" fill="none" />
      </svg>
    ),
  },
  redis: {
    background: '#ffe8ea',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" rx="1.5" fill="#e11d48" />
      </svg>
    ),
  },
  mq: {
    background: '#fff1e4',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2 6h8M6 2v8" stroke="#ea580c" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  distributed: {
    background: '#f1e9ff',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="3" cy="6" r="1.4" fill="#7c3aed" />
        <circle cx="9" cy="3.5" r="1.4" fill="#7c3aed" />
        <circle cx="9" cy="8.5" r="1.4" fill="#7c3aed" />
        <path d="M4.3 5.5l3.2-1.5M4.3 6.5l3.2 1.5" stroke="#7c3aed" strokeWidth="1.1" />
      </svg>
    ),
  },
  spring: {
    background: '#e8f8ee',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 10C6 10 3 8 3 5.2 3 3.8 4.2 3 5.2 3c.7 0 1.3.4 1.6.9C7.1 3.4 7.7 3 8.4 3 9.5 3 10.6 3.9 10.6 5.4 10.6 8 6 10 6 10z" fill="#16a34a" />
      </svg>
    ),
  },
  'java-concurrency': {
    background: '#fff0e6',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 9.5L6 2.5 9 9.5" stroke="#c2410c" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      </svg>
    ),
  },
  'db-practice': {
    background: '#e7f6f4',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="2" y="3" width="8" height="6" rx="1.2" fill="#0f766e" />
      </svg>
    ),
  },
  [CUSTOM_TOPIC_ID]: {
    background: '#eef1f6',
    svg: (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M7.6 2.4l2 2L5 9H3V7z" stroke="#64748b" strokeWidth="1.3" fill="none" />
      </svg>
    ),
  },
};

export interface EntryPanelProps {
  port: EntryPort;
  onClose?: () => void;
  onExamLive?: () => void;
}

const PanelHead = ({ onClose }: { onClose?: () => void }) => (
  <header className={styles.head}>
    {onClose !== undefined ? (
      <button type="button" className={styles.close} onClick={onClose}>
        关闭
      </button>
    ) : null}
    <div className={styles.brand}>
      <div className={styles.mark} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3.5h10v9H3z" stroke="#fff" strokeWidth="1.4" />
          <path d="M5 6h6M5 8.5h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <h1 className={styles.title}>模拟面试</h1>
        <p className={styles.sub}>八股专项陪练 · 新开对话当考场</p>
      </div>
    </div>
  </header>
);

export const EntryPanel = ({ port, onClose, onExamLive }: EntryPanelProps) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<(typeof TOPIC_CATEGORIES)[number]>(TOPIC_CATEGORIES[0]);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [error, setError] = useState<string | null>(null);
  const snapshot = useSyncExternalStore(
    examPanelState.subscribe,
    examPanelState.get,
    examPanelState.get,
  );
  const [watchError, setWatchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    port
      .getEntryConfig()
      .then((response) => {
        if (cancelled || !response.config) {
          return;
        }
        setTopicId(response.config.topicId);
        setDifficulty(response.config.difficulty);
        if (response.config.topicKind === 'custom') {
          setCustomTopic(response.config.topic);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [port]);

  useEffect(() => {
    if (snapshot === null) {
      return;
    }
    onExamLive?.();
  }, [onExamLive, snapshot?.sessionId]);

  useEffect(() => {
    if (snapshot === null) {
      return;
    }
    const sessionId = snapshot.sessionId;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        try {
          const result = await port.watchCoachTurn({ sessionId });
          if (cancelled) {
            return;
          }
          if (!result.ok) {
            setWatchError(result.message);
            await new Promise((resolve) => {
              setTimeout(resolve, 1000);
            });
            if (cancelled) {
              return;
            }
            continue;
          }
          if (result.status === 'updated') {
            setWatchError(null);
            examPanelState.set(result.snapshot);
          }
        } catch (cause: unknown) {
          if (cancelled) {
            return;
          }
          setWatchError(cause instanceof Error ? cause.message : String(cause));
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [port, snapshot?.sessionId]);

  const refreshCoach = async () => {
    if (snapshot === null || refreshing) {
      return;
    }
    const sessionId = snapshot.sessionId;
    setRefreshing(true);
    try {
      const result = await port.watchCoachTurn({ sessionId, force: true });
      if (!aliveRef.current) {
        return;
      }
      if (!result.ok) {
        setWatchError(result.message);
        return;
      }
      if (result.status === 'updated') {
        setWatchError(null);
        examPanelState.set(result.snapshot);
      }
    } catch (cause: unknown) {
      if (!aliveRef.current) {
        return;
      }
      setWatchError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (aliveRef.current) {
        setRefreshing(false);
      }
    }
  };

  const visiblePresets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return PRESET_TOPICS;
    }
    return PRESET_TOPICS.filter((topic) => topic.name.toLowerCase().includes(needle));
  }, [query]);

  const start = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await port.startInterview({
        topicId,
        customTopic,
        difficulty,
      });
      if (!result.ok) {
        setError(result.message);
        examPanelState.set(null);
        return;
      }
      setWatchError(null);
      examPanelState.set(result.snapshot);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  };

  if (snapshot) {
    return (
      <InProgressPanel
        snapshot={snapshot}
        error={watchError}
        onClose={onClose}
        onRefresh={() => {
          void refreshCoach();
        }}
        onEnd={() => {
          examPanelState.set(null);
          setWatchError(null);
          setRefreshing(false);
        }}
        refreshing={refreshing}
      />
    );
  }

  return (
    <aside className={styles.panel} aria-label="模拟面试入口">
      <PanelHead onClose={onClose} />

      <div className={styles.body}>
        <section>
          <div className={styles.blockTitle}>
            <span className={styles.step}>1</span>
            选择面试主题
          </div>
          <label className={styles.search}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.2" stroke="#98a0b0" strokeWidth="1.4" />
              <path d="M9.2 9.2L12 12" stroke="#98a0b0" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索面试主题，如：MySQL、Redis…"
              aria-label="搜索面试主题"
            />
          </label>
          <div className={styles.cats} role="group" aria-label="主题分类">
            {TOPIC_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.cat} ${activeCategory === category ? styles.catOn : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className={styles.topics}>
            {visiblePresets.map((topic) => {
              const icon = TOPIC_ICONS[topic.id];
              return (
                <button
                  key={topic.id}
                  type="button"
                  className={`${styles.topic} ${topicId === topic.id ? styles.topicOn : ''}`}
                  aria-pressed={topicId === topic.id}
                  onClick={() => {
                    setTopicId(topic.id);
                    setCustomTopic('');
                    setError(null);
                  }}
                >
                  <span className={styles.ico} style={{ background: icon?.background ?? '#eef1f6' }}>
                    {icon?.svg}
                  </span>
                  {topic.name}
                </button>
              );
            })}
            <div>
              <button
                type="button"
                className={`${styles.topic} ${topicId === CUSTOM_TOPIC_ID ? styles.topicOn : ''}`}
                aria-pressed={topicId === CUSTOM_TOPIC_ID}
                onClick={() => {
                  setTopicId(CUSTOM_TOPIC_ID);
                  setError(null);
                }}
              >
                <span className={styles.ico} style={{ background: TOPIC_ICONS[CUSTOM_TOPIC_ID].background }}>
                  {TOPIC_ICONS[CUSTOM_TOPIC_ID].svg}
                </span>
                自定义主题
              </button>
              {topicId === CUSTOM_TOPIC_ID ? (
                <input
                  className={styles.customInput}
                  type="text"
                  value={customTopic}
                  onChange={(event) => setCustomTopic(event.target.value)}
                  placeholder="输入自定义主题"
                  aria-label="自定义主题"
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.settings}>
          <div className={styles.blockTitle}>
            <span className={styles.step}>2</span>
            面试设置
          </div>
          <div className={styles.diffs} role="radiogroup" aria-label="难度">
            {DIFFICULTIES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={difficulty === value}
                className={`${styles.diff} ${difficulty === value ? styles.diffOn : ''}`}
                onClick={() => setDifficulty(value)}
              >
                {DIFFICULTY_LABELS[value]}
              </button>
            ))}
          </div>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button className={styles.cta} type="button" onClick={() => void start()} disabled={submitting}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M4 3.2v7.6L11 7 4 3.2z" fill="#fff" />
            </svg>
            开始模拟面试
          </button>
          <p className={styles.hint}>
            开始后新开一条面试对话当考场，要点只出现在面板。
            <br />
            本场不选时长、不选文件夹。
          </p>
        </section>
      </div>
    </aside>
  );
};
