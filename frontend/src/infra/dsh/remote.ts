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
  ],
};
