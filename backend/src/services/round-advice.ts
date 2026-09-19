import { DIFFICULTY_LABELS, type InterviewDeck } from 'interview-dsh-shared';

export const assembleRoundAdvicePrompt = (
  deck: InterviewDeck,
): { readonly system: string; readonly user: string } => {
  const scored = deck.cards.filter((card) => card.status === 'scored');
  const pending = deck.cards.filter((card) => card.status === 'pending');
  const scoredLines = scored.flatMap((card) => [
    `${card.id} ${card.questionBrief}`,
    `作答：${card.answer ?? '无'}`,
    card.comparison === null
      ? '对照：无'
      : `对照：已覆盖 ${card.comparison.covered.join('；') || '无'}；未覆盖 ${card.comparison.missed.join('；') || '无'}。${card.comparison.comment}`,
    `五维：${card.scores.map((item) => `${item.dimension}${item.score === null ? '—' : item.score}`).join('，')}`,
  ]);
  const pendingLines = pending.map((card) => `${card.id} 待作答：${card.questionBrief}`);
  return {
    system: [
      '你是本场模拟面试的面板教练，只为本轮总结文件写复习建议。',
      '不要扮演面试官，不要向候选人发问，不要把建议写进考场对话。',
      '根据本轮已评卡的对照与五维，用中文写一段本轮总结：薄弱点和下轮该练什么。',
      '不要输出 JSON，不要输出分数表，不要复述完整对照条目。',
    ].join('\n'),
    user: [
      `主题：${deck.topic}`,
      `难度：${DIFFICULTY_LABELS[deck.difficulty]}`,
      scoredLines.length > 0 ? '已评卡：' : '已评卡：无',
      ...scoredLines,
      pendingLines.length > 0 ? '待作答卡：' : '待作答卡：无',
      ...pendingLines,
    ].join('\n'),
  };
};
