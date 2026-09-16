import {
  DIFFICULTY_LABELS,
  INTERVIEW_SESSION_ERROR_MESSAGES,
  emptyBaguaScores,
  type BriefCoachRequest,
  type BriefCoachResponse,
  type Difficulty,
} from 'interview-dsh-shared';

export interface CoachBriefInput {
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly questionText: string;
}

export interface CoachBriefParts {
  readonly system: string;
  readonly user: string;
}

export interface ParsedCoachBrief {
  readonly questionBrief: string;
  readonly keyPoints: readonly string[];
}

/**
 * Panel-only coach brief. Must not be mounted on session A.
 */
export const assembleCoachBriefPrompt = ({
  topic,
  difficulty,
  questionText,
}: CoachBriefInput): CoachBriefParts => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  return {
    system: [
      '你是本场模拟面试的面板教练，只为右侧面板产出对照材料。',
      '不要扮演面试官，不要向候选人发问，不要输出分数或通过/不通过判定。',
      '根据本场主题、难度和面试官已经问出的题目，只返回一个 JSON 对象：',
      '{"questionBrief":"题干摘要","keyPoints":["标准答要点1","标准答要点2"]}',
      'questionBrief 是本题题干的短摘要；keyPoints 是本题标准答要点，3 到 6 条。',
      '不要使用 Markdown 代码围栏，不要附加解释。',
    ].join('\n'),
    user: [
      `主题：${topic}`,
      `难度：${difficultyLabel}`,
      '面试官第一问：',
      questionText,
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

export const parseCoachBriefOutput = (raw: string): ParsedCoachBrief | null => {
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
    const questionBrief = asNonEmptyString(record.questionBrief);
    if (questionBrief === null || !Array.isArray(record.keyPoints)) {
      return null;
    }
    const keyPoints = record.keyPoints
      .map((item) => asNonEmptyString(item))
      .filter((item): item is string => item !== null);
    if (keyPoints.length === 0) {
      return null;
    }
    return { questionBrief, keyPoints };
  } catch {
    return null;
  }
};

export interface CoachRuntime {
  readFirstQuestion(
    sessionId: string,
  ): Promise<
    | { ok: true; text: string }
    | {
        ok: false;
        code: 'inject_unavailable' | 'first_question_failed';
        message: string;
      }
  >;
  complete(system: string, user: string): Promise<string | null>;
}

const coachUnavailable = (): BriefCoachResponse => ({
  ok: false,
  code: 'coach_unavailable',
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
});

export const briefCoachSession = async (
  runtime: CoachRuntime,
  request: BriefCoachRequest,
): Promise<BriefCoachResponse> => {
  const question = await runtime.readFirstQuestion(request.sessionId);
  if (!question.ok) {
    return question;
  }

  const { system, user } = assembleCoachBriefPrompt({
    topic: request.topic,
    difficulty: request.difficulty,
    questionText: question.text,
  });
  const raw = await runtime.complete(system, user);
  if (raw === null) {
    return coachUnavailable();
  }

  const parsed = parseCoachBriefOutput(raw);
  if (parsed === null) {
    return coachUnavailable();
  }

  return {
    ok: true,
    snapshot: {
      phase: 'in_progress',
      sessionId: request.sessionId,
      topic: request.topic,
      difficulty: request.difficulty,
      questionBrief: parsed.questionBrief,
      keyPoints: parsed.keyPoints,
      scores: emptyBaguaScores(),
    },
  };
};
