import {
  EXAM_LAYER_LABELS,
  type CardRelation,
  type Difficulty,
  type ExamLayer,
} from 'interview-dsh-shared';

export type ChainMove = 'deep' | 'partial' | 'miss' | 'switch';

export interface ChainMoves {
  readonly deep: string;
  readonly partial: string;
  readonly miss: string;
}

export interface ParsedChain {
  readonly pointName: string;
  readonly layer: ExamLayer;
  readonly intent: string;
  readonly moves: ChainMoves;
  readonly matchedMove?: ChainMove;
}

export interface ClippedChain {
  readonly pointName: string;
  readonly layer: ExamLayer;
  readonly intent: string;
  readonly moves: ChainMoves | null;
  readonly mustSwitch: boolean;
  readonly sectionText: string;
}

export interface ChainMemory {
  remember(sessionId: string, chain: ClippedChain): void;
  recall(sessionId: string): ClippedChain | undefined;
  forget(sessionId: string): void;
}

export interface ChainSectionPort {
  install(sessionId: string, text: string): { readonly ok: boolean };
  clear(sessionId: string): void;
}

const allowedLayers = (difficulty: Difficulty): readonly ExamLayer[] => {
  if (difficulty === 'junior') {
    return ['define', 'scene'];
  }
  if (difficulty === 'senior') {
    return ['define', 'why', 'scene', 'boundary'];
  }
  return ['define', 'why', 'scene'];
};

const highestAllowed = (difficulty: Difficulty): ExamLayer => {
  const layers = allowedLayers(difficulty);
  return layers[layers.length - 1] ?? 'scene';
};

export const clipLayer = (difficulty: Difficulty, layer: ExamLayer): ExamLayer =>
  allowedLayers(difficulty).includes(layer) ? layer : highestAllowed(difficulty);

const rewriteDeep = (difficulty: Difficulty, layer: ExamLayer, deep: string): string => {
  if (difficulty !== 'senior') {
    return deep;
  }
  if (layer !== 'why' && layer !== 'scene' && layer !== 'boundary') {
    return deep;
  }
  if (deep.includes('前提') || deep.includes('规模')) {
    return deep;
  }
  return `换一个前提或规模：${deep}`;
};

export const clipChain = (input: {
  readonly difficulty: Difficulty;
  readonly chain: ParsedChain;
  readonly cardIds: readonly string[];
}): ClippedChain => {
  const layer = clipLayer(input.difficulty, input.chain.layer);
  const moves = {
    deep: rewriteDeep(input.difficulty, layer, input.chain.moves.deep),
    partial: input.chain.moves.partial,
    miss: input.chain.moves.miss,
  };
  const clipped: ClippedChain = {
    pointName: input.chain.pointName,
    layer,
    intent: input.chain.intent,
    moves,
    mustSwitch: false,
    sectionText: '',
  };
  return { ...clipped, sectionText: renderChainSection(clipped, input.difficulty) };
};

const guideScale = (difficulty: Difficulty): string => {
  if (difficulty === 'junior') {
    return '引导时可以把步骤点到只剩最后一问。';
  }
  if (difficulty === 'senior') {
    return '引导时只标出缺的那一刀。下一正式问必须换一个前提或换一个规模。';
  }
  return '引导时只点出缺口。';
};

export const renderChainSection = (
  chain: Omit<ClippedChain, 'sectionText'> & { sectionText?: string },
  difficulty: Difficulty,
): string => {
  const boundaryNote =
    chain.layer === 'boundary' ? '边界上的下一正式问必须换前提或换规模，不要再出一道边界题。' : '';
  return [
    '【下一问约束】',
    `知识点：${chain.pointName}`,
    `当前层：${EXAM_LAYER_LABELS[chain.layer]}`,
    `考察意图：${chain.intent}`,
    '候选人作答后，按对照结果只说一件事，一次只问一个问题。',
    '一点没答上，或缺口还大：留在这道题上引导。不要改问别的知识点，不要用【本题】标成新题。',
    '对已经说到的一个点追深：接着问深一层，这是子问题。',
    '同一知识点换一个大方面，或把这一题拆开再问：换方面或拆开再问，这也是子问题，不是新的正式问。',
    '这层意图已经达到，或该换知识点：问一个新的正式问题。',
    guideScale(difficulty),
    boundaryNote,
    '禁止输出 JSON，禁止复述本段，禁止说出对照结果的名称。',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
};

export const isChainMove = (value: unknown): value is ChainMove =>
  value === 'deep' || value === 'partial' || value === 'miss' || value === 'switch';

export const relationForNextCard = (input: {
  readonly previous: ClippedChain | undefined;
  readonly matchedMove: ChainMove | undefined;
  readonly nextLayer: ExamLayer | undefined;
  readonly fallback?: CardRelation;
}): CardRelation | undefined => {
  if (input.previous?.mustSwitch === true) {
    return 'next_topic';
  }
  if (input.previous?.layer === 'boundary' && input.nextLayer === 'boundary') {
    return 'next_topic';
  }
  if (input.matchedMove === 'deep' || input.matchedMove === 'partial' || input.matchedMove === 'miss') {
    return 'followup';
  }
  if (input.matchedMove === 'switch') {
    return 'next_topic';
  }
  return input.fallback;
};

export const createChainMemory = (): ChainMemory => {
  const chains = new Map<string, ClippedChain>();
  return {
    remember(sessionId, chain) {
      chains.set(sessionId, chain);
    },
    recall(sessionId) {
      return chains.get(sessionId);
    },
    forget(sessionId) {
      chains.delete(sessionId);
    },
  };
};

export const previousChainLines = (previous: ClippedChain | undefined): readonly string[] => {
  if (previous === undefined) {
    return [];
  }
  if (previous.mustSwitch || previous.moves === null) {
    return ['上一题之后必须换知识点。matchedMove 必须是 switch。'];
  }
  return [
    `上一题知识点：${previous.pointName}`,
    `上一题考察层：${EXAM_LAYER_LABELS[previous.layer]}`,
    '上一题三档：',
    `答到了：${previous.moves.deep}`,
    `有缺口：${previous.moves.partial}`,
    `没答上：${previous.moves.miss}`,
    'matchedMove 对上上面某一档时用 deep、partial 或 miss，换了知识点用 switch。',
  ];
};

export const openingLayer = (difficulty: Difficulty): ExamLayer => {
  if (difficulty === 'junior') {
    return 'define';
  }
  return 'why';
};

export const fallbackChain = (input: {
  readonly difficulty: Difficulty;
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
}): ParsedChain => {
  const pointName = input.questionBrief.trim();
  const intent = input.keyPoints.map((point) => point.trim()).find((point) => point.length > 0) ?? pointName;
  return {
    pointName,
    layer: openingLayer(input.difficulty),
    intent,
    moves: {
      deep: '对已经说到的一个点再问深一层，这是子问题。',
      partial: '把同一题拆开或换一个大方面再问，这也是子问题。',
      miss: '留在这道题上引导，不要改问别的知识点。',
    },
  };
};

export const openingLayerLine = (difficulty: Difficulty): string => {
  if (difficulty === 'junior') {
    return '第一问只问定义。';
  }
  if (difficulty === 'senior') {
    return '第一问直接问原理中的取舍，或边界。';
  }
  return '第一问只问原理或场景，不要只问定义。';
};
