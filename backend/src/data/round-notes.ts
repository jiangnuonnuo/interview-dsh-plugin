import { DIFFICULTY_LABELS, type InterviewDeck, type QuestionCard } from 'interview-dsh-shared';

const comparisonBlock = (card: QuestionCard): string => {
  if (card.comparison === null) {
    return '待对照';
  }
  return [
    `已覆盖：${card.comparison.covered.join('；') || '无'}`,
    `未覆盖：${card.comparison.missed.join('；') || '无'}`,
    card.comparison.comment,
  ].join('\n');
};

const scoresBlock = (card: QuestionCard): string =>
  card.scores
    .map((item) => `- ${item.dimension}：${item.score === null ? '—' : item.score}`)
    .join('\n');

const cardSection = (card: QuestionCard): string =>
  [
    `## ${card.id}`,
    '',
    '### 题干',
    card.questionText,
    '',
    '### 开卷',
    card.questionBrief,
    ...card.keyPoints.map((point) => `- ${point}`),
    '',
    '### 作答',
    card.answer ?? '待作答',
    '',
    '### 对照',
    comparisonBlock(card),
    '',
    '### 五维',
    scoresBlock(card),
    '',
  ].join('\n');

export const renderQaMarkdown = (deck: InterviewDeck): string => {
  const difficultyLabel = DIFFICULTY_LABELS[deck.difficulty];
  return [
    '# 本轮问答',
    '',
    `主题：${deck.topic}`,
    `难度：${difficultyLabel}`,
    '',
    ...deck.cards.flatMap((card) => [cardSection(card)]),
  ].join('\n');
};

export const renderSummaryMarkdown = (deck: InterviewDeck, advice: string | null): string => {
  const difficultyLabel = DIFFICULTY_LABELS[deck.difficulty];
  const body =
    advice === null || advice.trim().length === 0 ? '本轮总结未生成。' : advice.trim();
  return [
    '# 本轮总结',
    '',
    `主题：${deck.topic}`,
    `难度：${difficultyLabel}`,
    '',
    '## 表现与建议',
    '',
    body,
    '',
  ].join('\n');
};
