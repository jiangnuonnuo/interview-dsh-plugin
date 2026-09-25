import { isAnswerCoverage, type AnswerCoverage } from 'interview-dsh-shared';
import { isJevConnected, type JevConfigStore } from '../../data/jev-config.js';
import {
  type CoverageDecision,
  type CoveragePort,
  type CoverageSettleInput,
  jevStateFromInput,
} from '../../services/coverage-port.js';

export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const JEV_MODEL = 'jev-1.13.0';
export const JEV_TIMEOUT_MS = 2_000;
export const JEV_PROBE_TIMEOUT_MS = 5_000;

const CRITERIA = {
  miss: '作答与考察意图没有有效交集：空白、只会、或整段答成别的知识点。只要出现了本题正确概念的名称，即使后半句说不知道，也不是 miss。',
  wide_gap: '已经碰到本题概念，但核心机制几乎没讲清，还没有一个讲对的点可以追深，下一步应留在原题引导。不要因为提到正确名词就选 miss，也不要开子问。',
  deepen: '已经把当前意图里的一个点讲对，但只停在现象或结论，还没讲清机制或对比，下一步应就这一点往下挖。不要把「讲得不够深」当成另一个并列大方面。',
  reask: '候选人已经讲清了意图中的一块，并且自己点出了另一块还没讲，或意图里本来就有两个并列大方面只答了其中一块。这是把同一题拆开，不是把同一点问深。',
  next: '就当前考察意图而言，核心机制已经讲清，可以换知识点。还能展开工程细节不算没讲清。把同一题拆开再问不是 next。',
};

const INSTRUCTIONS = [
  '只判断知识链里「定档=待判断」的那一张当前卡，不是整场面试打分。五档互斥，只选一个。',
  '知识链从正式问 Qn 到当前子问 Qn.m 全部给出：每张卡的面试官问题、考察意图、要点、各轮作答 a1/a2、已定档都要读。',
  '硬性规则：统计知识链里已经定档为 reask 的次数。同一知识点最多 3 次 reask；已达到 3 次则必须选 next，换方向，不得再 reask、deepen，也不得再留在本题引导。',
  '未满 3 次时按普通五档判断。前面卡片已经讲清的内容不要再当成当前卡的缺口。',
  '意思相近算碰到。只点到正确概念名称、核心机制没讲清 → wide_gap。当前卡还剩并列大方面 → reask。',
].join(' ');

export type JevFetch = (
  input: string,
  init: {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: string;
    readonly signal?: AbortSignal;
  },
) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export const probeJevKey = async (
  apiKey: string,
  deps: { readonly fetch?: JevFetch; readonly timeoutMs?: number } = {},
): Promise<boolean> => {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const runFetch = deps.fetch ?? (globalThis.fetch as JevFetch);
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, deps.timeoutMs ?? JEV_PROBE_TIMEOUT_MS);
  try {
    const response = await runFetch(JEV_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${trimmed}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: { probe: 'connectivity' },
        questions: {
          coverage: {
            type: 'choice',
            instructions: 'connectivity probe only',
            criteria: CRITERIA,
          },
        },
      }),
    });
    return response.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const readChoice = (body: unknown): AnswerCoverage | undefined => {
  if (body === null || typeof body !== 'object') {
    return undefined;
  }
  const answers = (body as { answers?: { coverage?: { choice?: unknown } } }).answers;
  const choice = answers?.coverage?.choice;
  return isAnswerCoverage(choice) ? choice : undefined;
};

export const createJevCoveragePort = (
  store: JevConfigStore,
  deps: { readonly fetch?: JevFetch } = {},
): CoveragePort => {
  const runFetch = deps.fetch ?? (globalThis.fetch as JevFetch);
  return {
    async settle(input: CoverageSettleInput, signal?: AbortSignal): Promise<CoverageDecision> {
      if (signal?.aborted) {
        return 'unavailable';
      }
      const secret = await store.loadSecret(input.sessionId);
      if (!isJevConnected(secret)) {
        return 'unavailable';
      }
      const controller = new AbortController();
      const onAbort = () => {
        controller.abort();
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      const timer = setTimeout(() => {
        controller.abort();
      }, JEV_TIMEOUT_MS);
      try {
        const response = await runFetch(JEV_ENDPOINT, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${secret.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: JEV_MODEL,
            state: jevStateFromInput(input),
            questions: {
              coverage: {
                type: 'choice',
                instructions: INSTRUCTIONS,
                criteria: CRITERIA,
              },
            },
          }),
        });
        if (signal?.aborted || controller.signal.aborted) {
          return 'unavailable';
        }
        if (!response.ok) {
          return 'unavailable';
        }
        const body = await response.json();
        if (signal?.aborted || controller.signal.aborted) {
          return 'unavailable';
        }
        return readChoice(body) ?? 'unavailable';
      } catch {
        return 'unavailable';
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },
  };
};
