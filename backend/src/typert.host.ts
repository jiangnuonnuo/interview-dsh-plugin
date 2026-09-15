import { z } from 'zod';

const difficultySchema = z.enum(['junior', 'mid', 'senior']);

const acceptRequestSchema = z.object({
  topicId: z.union([z.string(), z.null()]),
  customTopic: z.string(),
  difficulty: z.string(),
});

const entryConfigSchema = z.object({
  topic: z.string(),
  difficulty: difficultySchema,
  topicKind: z.enum(['preset', 'custom']),
  topicId: z.string(),
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

const _request$codec = {
  mode: 'strict' as const,
  typeSymbol: 'interview-dsh#AcceptEntryConfigRequest',
  schema: acceptRequestSchema,
};
const _accept$codec = {
  mode: 'strict' as const,
  typeSymbol: 'interview-dsh#AcceptEntryConfigResponse',
  schema: acceptResultSchema,
};
const _get$codec = {
  mode: 'strict' as const,
  typeSymbol: 'interview-dsh#GetEntryConfigResponse',
  schema: getResultSchema,
};

export const TYPERT = {
  package: 'interview-dsh',
  face: 'host' as const,
  schemas: [],
  invocations: [
    {
      id: 'interview-dsh#interviewEntry/acceptEntryConfig',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'acceptEntryConfig',
      invocation: { kind: 'direct' as const },
      parameters: [
        { name: 'request', wire: 'request', source: 'json' as const, codec: _request$codec },
      ],
      result: _accept$codec,
    },
    {
      id: 'interview-dsh#interviewEntry/getEntryConfig',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'getEntryConfig',
      invocation: { kind: 'direct' as const },
      parameters: [],
      result: _get$codec,
    },
  ],
  model: {
    services: [
      {
        description: 'interview-dsh 入口配置服务，校验并保存主题与难度。',
        summary: '八股专项入口配置服务。',
        tags: [],
        jsDoc: '/** 入口配置：acceptEntryConfig / getEntryConfig */',
        key: 'interviewEntry',
        exportName: 'InterviewEntryService',
        members: [
          {
            kind: 'method',
            name: 'acceptEntryConfig',
            signature: 'acceptEntryConfig(request: AcceptEntryConfigRequest): AcceptEntryConfigResponse',
            summary: '校验主题与难度并写入内存。',
            jsDoc: '/** 校验主题与难度并记下本次配置。 */',
          },
          {
            kind: 'method',
            name: 'getEntryConfig',
            signature: 'getEntryConfig(): GetEntryConfigResponse',
            summary: '读取最近一次有效入口配置。',
            jsDoc: '/** 读取最近一次有效入口配置；尚未开始时 config 为 null。 */',
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
};

export default TYPERT;
