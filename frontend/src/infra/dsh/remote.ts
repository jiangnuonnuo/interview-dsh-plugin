import { z } from 'zod';

const difficultySchema = z.enum(['junior', 'mid', 'senior']);

const entryConfigSchema = z.object({
  topic: z.string(),
  difficulty: difficultySchema,
  topicKind: z.enum(['preset', 'custom']),
  topicId: z.string(),
});

const acceptRequestSchema = z.object({
  topicId: z.union([z.string(), z.null()]),
  customTopic: z.string(),
  difficulty: z.string(),
});

const acceptResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    config: entryConfigSchema,
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum(['topic_required', 'custom_topic_empty', 'invalid_difficulty']),
    message: z.string(),
  }),
]);

const getResultSchema = z.object({
  config: z.union([entryConfigSchema, z.null()]),
});

const attachRequestSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
});

const sessionErrorSchema = z.enum([
  'inject_unavailable',
  'coach_unavailable',
  'first_question_failed',
  'follow_up_failed',
  'persist_unavailable',
  'closing_failed',
]);

const attachResultSchema = z.union([
  z.object({
    ok: z.literal(true),
  }),
  z.object({
    ok: z.literal(false),
    code: sessionErrorSchema,
    message: z.string(),
  }),
]);

const briefRequestSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
});

const cardSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  questionBrief: z.string(),
  keyPoints: z.array(z.string()),
  answer: z.union([z.string(), z.null()]),
  comparison: z.union([
    z.object({
      covered: z.array(z.string()),
      missed: z.array(z.string()),
      comment: z.string(),
    }),
    z.null(),
  ]),
  scores: z.array(
    z.object({
      dimension: z.string(),
      score: z.union([z.number(), z.null()]),
      reason: z.string().optional(),
    }),
  ),
  status: z.enum(['pending', 'scored']),
  seedUserText: z.string(),
});

const deckSchema = z.object({
  phase: z.literal('in_progress'),
  sessionId: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
  archiveDir: z.string(),
  cards: z.array(cardSchema),
  currentCardId: z.string(),
});

const briefResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    deck: deckSchema,
  }),
  z.object({
    ok: z.literal(false),
    code: sessionErrorSchema,
    message: z.string(),
    deck: deckSchema.optional(),
  }),
]);

const watchRequestSchema = z.object({
  sessionId: z.string(),
  force: z.boolean().optional(),
});

const watchResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    status: z.literal('updated'),
    deck: deckSchema,
  }),
  z.object({
    ok: z.literal(true),
    status: z.literal('unchanged'),
  }),
  z.object({
    ok: z.literal(false),
    code: sessionErrorSchema,
    message: z.string(),
    deck: deckSchema.optional(),
  }),
]);

const loadRequestSchema = z.object({
  sessionId: z.string(),
});

const loadResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    deck: deckSchema,
  }),
  z.object({
    ok: z.literal(false),
    code: sessionErrorSchema,
    message: z.string(),
  }),
]);

const endRequestSchema = z.object({
  sessionId: z.string(),
});

const endResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    sessionId: z.string(),
    qaPath: z.string(),
    summaryPath: z.string(),
    ended: z.literal(true),
  }),
  z.object({
    ok: z.literal(false),
    code: sessionErrorSchema,
    message: z.string(),
    ended: z.boolean(),
    qaPath: z.string().optional(),
    summaryPath: z.string().optional(),
  }),
]);

const roundStateRequestSchema = z.object({
  sessionId: z.string(),
});

const roundStateResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    status: z.enum(['none', 'in_progress', 'ended']),
  }),
  z.object({
    ok: z.literal(false),
    code: sessionErrorSchema,
    message: z.string(),
  }),
]);

const strict = (typeSymbol: string, schema: z.ZodTypeAny) => ({
  mode: 'strict' as const,
  typeSymbol,
  schema,
});

/** Handwritten Typert remote contribution; mounted via ctx.remote.$mount. */
export const interviewEntryRemote = {
  package: 'interview-dsh',
  descriptors: [
    {
      id: 'interview-dsh#interviewEntry/acceptEntryConfig',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'acceptEntryConfig',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#AcceptEntryConfigRequest', acceptRequestSchema),
        },
      ],
      result: strict('interview-dsh#AcceptEntryConfigResponse', acceptResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/getEntryConfig',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'getEntryConfig',
      invocation: { kind: 'direct' as const },
      parameters: [],
      result: strict('interview-dsh#GetEntryConfigResponse', getResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/attachInterviewer',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'attachInterviewer',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#AttachInterviewerRequest', attachRequestSchema),
        },
      ],
      result: strict('interview-dsh#AttachInterviewerResponse', attachResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/briefCoach',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'briefCoach',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#BriefCoachRequest', briefRequestSchema),
        },
      ],
      result: strict('interview-dsh#BriefCoachResponse', briefResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/watchCoachTurn',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'watchCoachTurn',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#WatchCoachTurnRequest', watchRequestSchema),
        },
      ],
      result: strict('interview-dsh#WatchCoachTurnResponse', watchResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/loadDeck',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'loadDeck',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#LoadDeckRequest', loadRequestSchema),
        },
      ],
      result: strict('interview-dsh#LoadDeckResponse', loadResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/endRound',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'endRound',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#EndRoundRequest', endRequestSchema),
        },
      ],
      result: strict('interview-dsh#EndRoundResponse', endResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/armRoundClose',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'armRoundClose',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#EndRoundRequest', endRequestSchema),
        },
      ],
      result: strict('interview-dsh#ArmRoundCloseResponse', attachResultSchema),
    },
    {
      id: 'interview-dsh#interviewEntry/clearRoundClose',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'clearRoundClose',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#EndRoundRequest', endRequestSchema),
        },
      ],
      result: strict('interview-dsh#ClearRoundCloseResponse', z.object({ ok: z.literal(true) })),
    },
    {
      id: 'interview-dsh#interviewEntry/getExamRoundState',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'getExamRoundState',
      invocation: { kind: 'direct' as const },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json' as const,
          codec: strict('interview-dsh#GetExamRoundStateRequest', roundStateRequestSchema),
        },
      ],
      result: strict('interview-dsh#GetExamRoundStateResponse', roundStateResultSchema),
    },
  ],
};
