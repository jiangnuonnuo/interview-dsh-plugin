import {
  BAGUA_SCORE_DIMENSIONS,
  DIFFICULTY_LABELS,
  emptyBaguaScores,
  type CardComparison,
  type CardScore,
  type Difficulty,
  type QuestionCard,
} from 'interview-dsh-shared';
import { extractPendingQuestion } from './pending-question.js';

export interface CoachScoreInput {
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly questionText: string;
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
  readonly answer: string;
}

export interface ParsedCoachScore {
  readonly comparison: CardComparison;
  readonly scores: readonly CardScore[];
}

export const assembleCoachScorePrompt = ({
  topic,
  difficulty,
  questionText,
  questionBrief,
  keyPoints,
  answer,
}: CoachScoreInput): { system: string; user: string } => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  return {
    system: [
      '你是本场模拟面试的面板教练，只为右侧面板评分。',
      '不要扮演面试官，不要向候选人发问，不要把结果写进对话。',
      '只根据本题开卷要点和候选人作答，返回一个 JSON 对象：',
      '{"covered":["已覆盖要点"],"missed":["未覆盖要点"],"comment":"对照评语","scores":[{"dimension":"基础扎实度","score":3.5,"reason":"理由"}]}',
      `scores 必须恰好包含这五个维度且顺序一致：${BAGUA_SCORE_DIMENSIONS.join('、')}。`,
      '每个 score 是 1 到 5 的数字，允许 0.5 步进。',
      '不要使用 Markdown 代码围栏，不要附加解释。',
    ].join('\n'),
    user: [
      `主题：${topic}`,
      `难度：${difficultyLabel}`,
      '面试官当前问题：',
      pendingQuestion,
      '本题摘要：',
      questionBrief,
      '标准答要点：',
      ...keyPoints.map((point) => `- ${point}`),
      '候选人作答：',
      answer,
    ].join('\n'),
  };
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
};

const extractJsonObject = (raw: string): string | null => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\{[\s\S]*\}/);
  return fenced ? fenced[0] : null;
};

const asStringList = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.map((item) => asNonEmptyString(item)).filter((item): item is string => item !== null);
};

const isHalfStepScore = (value: number): boolean =>
  Number.isFinite(value) && value >= 1 && value <= 5 && Math.abs(value * 2 - Math.round(value * 2)) < 1e-9;

export const parseCoachScoreOutput = (raw: string): ParsedCoachScore | null => {
  const json = extractJsonObject(raw);
  if (json === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const covered = asStringList(record.covered);
    const missed = asStringList(record.missed);
    const comment = asNonEmptyString(record.comment);
    if (covered === null || missed === null || comment === null || !Array.isArray(record.scores)) {
      return null;
    }
    const byDimension = new Map<string, CardScore>();
    for (const item of record.scores) {
      if (item === null || typeof item !== 'object') {
        return null;
      }
      const row = item as Record<string, unknown>;
      const dimension = asNonEmptyString(row.dimension);
      if (dimension === null || !isHalfStepScore(Number(row.score))) {
        return null;
      }
      const reason = typeof row.reason === 'string' ? row.reason.trim() : undefined;
      byDimension.set(dimension, {
        dimension: dimension as CardScore['dimension'],
        score: Number(row.score),
        ...(reason ? { reason } : {}),
      });
    }
    const scores = BAGUA_SCORE_DIMENSIONS.map((dimension) => byDimension.get(dimension));
    if (scores.some((item) => item === undefined)) {
      return null;
    }
    return {
      comparison: { covered, missed, comment },
      scores: scores as CardScore[],
    };
  } catch {
    return null;
  }
};

export const applyScoreToCard = (card: QuestionCard, parsed: ParsedCoachScore, answer: string): QuestionCard => ({
  ...card,
  answer,
  comparison: parsed.comparison,
  scores: parsed.scores,
  status: 'scored',
});

export const pendingScores = (): readonly CardScore[] => emptyBaguaScores();
