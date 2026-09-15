/** Preset topic shown in the entry panel. */
export interface PresetTopic {
  readonly id: string;
  readonly name: string;
  readonly category: string;
}

/** Category chips; highlighting a chip MUST NOT hide other presets. */
export const TOPIC_CATEGORIES = [
  '后端开发',
  '数据 / 中间件',
  '系统设计',
  '算法与编程',
  '运维与云原生',
  '产品 / 其他',
] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];

/** Preset topics covering doc/entry-panel.png plus a separate custom row. */
export const PRESET_TOPICS: readonly PresetTopic[] = [
  { id: 'mysql', name: 'MySQL 索引与优化', category: '后端开发' },
  { id: 'redis', name: 'Redis 并发与缓存', category: '数据 / 中间件' },
  { id: 'mq', name: '消息队列（Kafka / RocketMQ）', category: '数据 / 中间件' },
  { id: 'distributed', name: '分布式系统设计', category: '系统设计' },
  { id: 'spring', name: 'Spring / Spring Boot', category: '后端开发' },
  { id: 'java-concurrency', name: 'Java 并发编程', category: '算法与编程' },
  { id: 'db-practice', name: '数据库实战场景', category: '数据 / 中间件' },
];

export const CUSTOM_TOPIC_ID = 'custom';

export type Difficulty = 'junior' | 'mid' | 'senior';

export const DIFFICULTIES: readonly Difficulty[] = ['junior', 'mid', 'senior'];

export const DEFAULT_DIFFICULTY: Difficulty = 'mid';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  junior: '初级',
  mid: '中级',
  senior: '高级',
};

export type TopicKind = 'preset' | 'custom';

export type EntryErrorCode = 'topic_required' | 'custom_topic_empty' | 'invalid_difficulty';

export const ENTRY_ERROR_MESSAGES: Record<EntryErrorCode, string> = {
  topic_required: '请选择一个面试主题，或填写自定义主题。',
  custom_topic_empty: '自定义主题不能为空。',
  invalid_difficulty: '请选择初级、中级或高级。',
};

/** Saved start-of-exam configuration. */
export interface EntryConfig {
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly topicKind: TopicKind;
  readonly topicId: string;
}

export interface AcceptEntryConfigRequest {
  readonly topicId: string | null;
  readonly customTopic: string;
  readonly difficulty: Difficulty;
}

export type AcceptEntryConfigResponse =
  | { readonly ok: true; readonly config: EntryConfig }
  | { readonly ok: false; readonly code: EntryErrorCode; readonly message: string };

export interface GetEntryConfigResponse {
  readonly config: EntryConfig | null;
}

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'junior' || value === 'mid' || value === 'senior';
}

export function findPresetTopic(topicId: string): PresetTopic | undefined {
  return PRESET_TOPICS.find((topic) => topic.id === topicId);
}
