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

const attachRequestSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
});

const attachResultSchema = z.union([
  z.object({
    ok: z.literal(true),
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum(['inject_unavailable', 'coach_unavailable', 'first_question_failed']),
    message: z.string(),
  }),
]);

const briefRequestSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
});

const snapshotSchema = z.object({
  phase: z.literal('in_progress'),
  sessionId: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
  questionBrief: z.string(),
  keyPoints: z.array(z.string()),
  scores: z.array(
    z.object({
      dimension: z.string(),
      score: z.null(),
    }),
  ),
});

const briefResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    snapshot: snapshotSchema,
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum(['inject_unavailable', 'coach_unavailable', 'first_question_failed']),
    message: z.string(),
  }),
]);

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
const _attachRequest$codec = {
  mode: 'strict' as const,
  typeSymbol: 'interview-dsh#AttachInterviewerRequest',
  schema: attachRequestSchema,
};
const _attachResult$codec = {
  mode: 'strict' as const,
  typeSymbol: 'interview-dsh#AttachInterviewerResponse',
  schema: attachResultSchema,
};
const _briefRequest$codec = {
  mode: 'strict' as const,
  typeSymbol: 'interview-dsh#BriefCoachRequest',
  schema: briefRequestSchema,
};
const _briefResult$codec = {
  mode: 'strict' as const,
  typeSymbol: 'interview-dsh#BriefCoachResponse',
  schema: briefResultSchema,
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
    {
      id: 'interview-dsh#interviewEntry/attachInterviewer',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'attachInterviewer',
      invocation: { kind: 'direct' as const },
      parameters: [
        { name: 'request', wire: 'request', source: 'json' as const, codec: _attachRequest$codec },
      ],
      result: _attachResult$codec,
    },
    {
      id: 'interview-dsh#interviewEntry/briefCoach',
      service: 'interviewEntry',
      namespace: 'interviewEntry',
      method: 'briefCoach',
      invocation: { kind: 'direct' as const },
      parameters: [
        { name: 'request', wire: 'request', source: 'json' as const, codec: _briefRequest$codec },
      ],
      result: _briefResult$codec,
    },
  ],
  model: {
    services: [
      {
        description: 'interview-dsh 入口配置服务，校验并保存主题与难度。',
        summary: '八股专项入口配置服务。',
        tags: [],
        jsDoc: '/** 入口配置：acceptEntryConfig / getEntryConfig / attachInterviewer / briefCoach */',
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
          {
            kind: 'method',
            name: 'attachInterviewer',
            signature: 'attachInterviewer(request: AttachInterviewerRequest): AttachInterviewerResponse',
            summary: '把八股面试官人设挂到指定会话的 Agent 上。',
            jsDoc: '/** 在已创建会话的 Agent 上挂 deployment:persona。 */',
          },
          {
            kind: 'method',
            name: 'briefCoach',
            signature: 'briefCoach(request: BriefCoachRequest): Promise<BriefCoachResponse>',
            summary: '根据第一问题干生成本题要点快照。',
            jsDoc: '/** 同模型静默补全，只写进行中快照。 */',
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
