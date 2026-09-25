import {
  BAGUA_SCORE_DIMENSIONS,
  DIFFICULTY_LABELS,
  EXAM_LAYER_LABELS,
  answerTurnsOf,
  coverageGuides,
  emptyBaguaScores,
  isAnswerCoverage,
  joinAnswerTurns,
  type AnswerCoverage,
  type CardComparison,
  type CardScore,
  type Difficulty,
  type ExamLayer,
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
  readonly layer?: ExamLayer;
  readonly intent?: string;
}

export interface ParsedCoachScore {
  readonly comparison: CardComparison;
  readonly scores: readonly CardScore[];
  readonly coverage: AnswerCoverage | null;
}

export const isSettledCoverage = (
  parsed: ParsedCoachScore | null,
): parsed is ParsedCoachScore & { readonly coverage: AnswerCoverage } =>
  parsed !== null && parsed.coverage !== null;

export const assembleCoachScorePrompt = ({
  topic,
  difficulty,
  questionText,
  questionBrief,
  keyPoints,
  answer,
  layer,
  intent,
}: CoachScoreInput): { system: string; user: string } => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  const anchored = layer !== undefined && intent !== undefined;
  const layerNote =
    difficulty === 'junior' && layer === 'define'
      ? '本题是初级的定义层。不要因为候选人没有讲到边界，而压低这一层并不考察的深度。原理理解可以因此不高。'
      : difficulty === 'senior' && layer === 'boundary'
        ? '本题是高级的边界层。只有说得出前提一变哪里会破，深度边界才能到 4 以上。'
        : '';
  return {
    system: [
      '你是本场模拟面试的面板教练，只为右侧面板评分。',
      '不要扮演面试官，不要向候选人发问，不要把结果写进对话。',
      anchored
        ? '只根据本题考察意图、所在层和候选人作答打分，不要另找一套标准。'
        : '只根据本题开卷要点和候选人作答，返回一个 JSON 对象：',
      anchored ? '返回一个 JSON 对象：' : '',
      '{"coverage":"miss","covered":["已覆盖要点"],"missed":["未覆盖要点"],"comment":"对照评语","scores":[{"dimension":"基础扎实度","score":3.5,"reason":"理由"}]}',
      'coverage 只能是 miss、wide_gap、deepen、reask、next 之一。',
      'miss 表示一点没答上，换了说法也没碰到考察意图。wide_gap 表示碰到了一部分但缺口大。',
      'deepen 表示对已经说到的某一个点追深。reask 表示把同一题拆开，或换一个大方面再问。',
      'next 只表示这层意图已经达到，或该换知识点。同一题拆开再问不是 next。',
      '意思相近算碰到。不要用未覆盖条数决定 coverage。',
      `scores 必须恰好包含这五个维度且顺序一致：${BAGUA_SCORE_DIMENSIONS.join('、')}。`,
      '每个 score 是 1 到 5 的数字，允许 0.5 步进。',
      layerNote,
      '不要使用 Markdown 代码围栏，不要附加解释。',
    ]
      .filter((line) => line.length > 0)
      .join('\n'),
    user: [
      `主题：${topic}`,
      `难度：${difficultyLabel}`,
      '面试官当前问题：',
      pendingQuestion,
      ...(anchored ? [`考察层：${EXAM_LAYER_LABELS[layer]}`, `考察意图：${intent}`] : []),
      '本题摘要：',
      questionBrief,
      '标准答要点：',
      ...keyPoints.map((point) => `- ${point}`),
      '候选人作答（按时间顺序，含引导后的补充）：',
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
    const coverage = isAnswerCoverage(record.coverage) ? record.coverage : null;
    return {
      comparison: { covered, missed, comment },
      scores: scores as CardScore[],
      coverage,
    };
  } catch {
    return null;
  }
};

export const applyScoreToCard = (card: QuestionCard, parsed: ParsedCoachScore, answer: string): QuestionCard => {
  const prior = answerTurnsOf(card);
  const turns = answer.length > 0 && !prior.includes(answer) ? [...prior, answer] : prior;
  const guideCount = card.guideCount ?? 0;
  const guiding = parsed.coverage !== null && coverageGuides(parsed.coverage) && guideCount < 2;
  return {
    ...card,
    answer: turns.length > 0 ? joinAnswerTurns(turns) : answer,
    answerTurns: turns,
    guideCount: guiding ? guideCount + 1 : guideCount,
    coverage: parsed.coverage,
    comparison: parsed.comparison,
    scores: parsed.scores,
    status: 'scored',
  };
};

export const applyCoverageToCard = (
  card: QuestionCard,
  coverage: AnswerCoverage,
  answer: string,
): QuestionCard => {
  const prior = answerTurnsOf(card);
  const turns = answer.length > 0 && !prior.includes(answer) ? [...prior, answer] : prior;
  const guideCount = card.guideCount ?? 0;
  const guiding = coverageGuides(coverage) && guideCount < 2;
  return {
    ...card,
    answer: turns.length > 0 ? joinAnswerTurns(turns) : answer,
    answerTurns: turns,
    guideCount: guiding ? guideCount + 1 : guideCount,
    coverage,
    status: 'scored',
  };
};

export const applyProseToCard = (card: QuestionCard, parsed: ParsedCoachScore): QuestionCard => ({
  ...card,
  comparison: parsed.comparison,
  scores: parsed.scores,
  status: 'scored',
});

export const pendingScores = (): readonly CardScore[] => emptyBaguaScores();
