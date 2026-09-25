import {
  DIFFICULTY_LABELS,
  EXAM_LAYER_LABELS,
  answerTurnLabel,
  answerTurnsOf,
  isAnswerCoverage,
  type AnswerCoverage,
  type Difficulty,
  type InterviewDeck,
  type QuestionCard,
} from 'interview-dsh-shared';

export const REASK_CAP = 3;

export type CoverageDecision = AnswerCoverage | 'unavailable';

export const topicRootId = (cardId: string): string => {
  const dot = cardId.indexOf('.');
  return dot === -1 ? cardId : cardId.slice(0, dot);
};

export const countReasksOnThread = (cards: readonly QuestionCard[], currentId: string): number => {
  const root = topicRootId(currentId);
  return cards.filter(
    (card) => card.id !== currentId && topicRootId(card.id) === root && card.coverage === 'reask',
  ).length;
};

export const applyReaskCap = (coverage: AnswerCoverage, reaskCount: number): AnswerCoverage =>
  reaskCount >= REASK_CAP ? 'next' : coverage;

export type CoverageThreadCard = {
  readonly id: string;
  readonly relation: '正式问' | '追问';
  readonly questionText: string;
  readonly layer?: string;
  readonly intent?: string;
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
  readonly answerTurns: readonly string[];
  readonly coverage: AnswerCoverage | '待判断';
};

export type CoverageSettleInput = {
  readonly sessionId: string;
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly currentCardId: string;
  readonly reaskCount: number;
  readonly thread: readonly CoverageThreadCard[];
};

export interface CoveragePort {
  settle(input: CoverageSettleInput, signal?: AbortSignal): Promise<CoverageDecision>;
}

export const threadCardsOf = (deck: InterviewDeck, currentId: string): readonly CoverageThreadCard[] => {
  const root = topicRootId(currentId);
  return deck.cards
    .filter((card) => topicRootId(card.id) === root)
    .map((card) => ({
      id: card.id,
      relation: card.id.includes('.') ? ('追问' as const) : ('正式问' as const),
      questionText: card.questionText,
      questionBrief: card.questionBrief,
      keyPoints: card.keyPoints,
      answerTurns: answerTurnsOf(card),
      coverage: card.id === currentId ? '待判断' : isAnswerCoverage(card.coverage) ? card.coverage : '待判断',
      ...(card.layer !== undefined ? { layer: EXAM_LAYER_LABELS[card.layer] } : {}),
      ...(card.intent !== undefined ? { intent: card.intent } : {}),
    }));
};

export const buildCoverageSettleInput = (
  deck: InterviewDeck,
  current: QuestionCard,
  topic: string,
  difficulty: Difficulty,
  extraAnswer?: string,
): CoverageSettleInput => {
  const thread = threadCardsOf(deck, current.id).map((card) => {
    if (card.id !== current.id) {
      return card;
    }
    const turns =
      extraAnswer !== undefined && extraAnswer.length > 0 && !card.answerTurns.includes(extraAnswer)
        ? [...card.answerTurns, extraAnswer]
        : card.answerTurns;
    return { ...card, answerTurns: turns, coverage: '待判断' as const };
  });
  return {
    sessionId: deck.sessionId,
    topic,
    difficulty,
    currentCardId: current.id,
    reaskCount: countReasksOnThread(deck.cards, current.id),
    thread,
  };
};

export const jevStateFromInput = (input: CoverageSettleInput): Record<string, unknown> => ({
  主题: input.topic,
  难度: DIFFICULTY_LABELS[input.difficulty],
  当前卡: input.currentCardId,
  同一知识点已reask次数: input.reaskCount,
  硬性上限: REASK_CAP,
  硬性规则:
    input.reaskCount >= REASK_CAP
      ? '已满 3 次 reask，必须换方向，只能选 next。'
      : `还可以 reask ${REASK_CAP - input.reaskCount} 次，未满上限时按五档判断。`,
  知识链: input.thread.map((card) => ({
    编号: card.id,
    关系: card.relation,
    ...(card.layer !== undefined ? { 考察层: card.layer } : {}),
    面试官问题: card.questionText,
    ...(card.intent !== undefined ? { 考察意图: card.intent } : {}),
    本题摘要: card.questionBrief,
    标准答要点: card.keyPoints,
    作答轮次: card.answerTurns.map((内容, index) => ({ 轮次: answerTurnLabel(index), 内容 })),
    定档: card.coverage,
  })),
});
