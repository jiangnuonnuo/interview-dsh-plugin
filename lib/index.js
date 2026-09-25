// backend/src/data/exam-session-store.ts
var createExamSessionStore = () => {
  const records = /* @__PURE__ */ new Map();
  return {
    save(record) {
      records.set(record.sessionId, record);
    },
    load(sessionId) {
      return records.get(sessionId);
    }
  };
};

// backend/src/data/entry-config-store.ts
var createEntryConfigStore = () => {
  let current = null;
  return {
    save(config) {
      current = config;
    },
    load() {
      return current;
    }
  };
};

// shared/src/api/interview-entry.ts
var PRESET_TOPICS = [
  { id: "mysql", name: "MySQL \u7D22\u5F15\u4E0E\u4F18\u5316", category: "\u540E\u7AEF\u5F00\u53D1" },
  { id: "redis", name: "Redis \u5E76\u53D1\u4E0E\u7F13\u5B58", category: "\u6570\u636E / \u4E2D\u95F4\u4EF6" },
  { id: "mq", name: "\u6D88\u606F\u961F\u5217\uFF08Kafka / RocketMQ\uFF09", category: "\u6570\u636E / \u4E2D\u95F4\u4EF6" },
  { id: "distributed", name: "\u5206\u5E03\u5F0F\u7CFB\u7EDF\u8BBE\u8BA1", category: "\u7CFB\u7EDF\u8BBE\u8BA1" },
  { id: "spring", name: "Spring / Spring Boot", category: "\u540E\u7AEF\u5F00\u53D1" },
  { id: "java-concurrency", name: "Java \u5E76\u53D1\u7F16\u7A0B", category: "\u7B97\u6CD5\u4E0E\u7F16\u7A0B" },
  { id: "db-practice", name: "\u6570\u636E\u5E93\u5B9E\u6218\u573A\u666F", category: "\u6570\u636E / \u4E2D\u95F4\u4EF6" }
];
var CUSTOM_TOPIC_ID = "custom";
var DIFFICULTY_LABELS = {
  junior: "\u521D\u7EA7",
  mid: "\u4E2D\u7EA7",
  senior: "\u9AD8\u7EA7"
};
var ENTRY_ERROR_MESSAGES = {
  topic_required: "\u8BF7\u9009\u62E9\u4E00\u4E2A\u9762\u8BD5\u4E3B\u9898\uFF0C\u6216\u586B\u5199\u81EA\u5B9A\u4E49\u4E3B\u9898\u3002",
  custom_topic_empty: "\u81EA\u5B9A\u4E49\u4E3B\u9898\u4E0D\u80FD\u4E3A\u7A7A\u3002",
  invalid_difficulty: "\u8BF7\u9009\u62E9\u521D\u7EA7\u3001\u4E2D\u7EA7\u6216\u9AD8\u7EA7\u3002"
};
function isDifficulty(value) {
  return value === "junior" || value === "mid" || value === "senior";
}
function findPresetTopic(topicId) {
  return PRESET_TOPICS.find((topic) => topic.id === topicId);
}

// shared/src/api/interview-session.ts
var INTERVIEW_SESSION_ERROR_MESSAGES = {
  inject_unavailable: "\u65E0\u6CD5\u5728\u65B0\u5BF9\u8BDD\u4E0A\u6302\u8F7D\u9762\u8BD5\u5B98\u4EBA\u8BBE\uFF1A\u5F53\u524D Host \u6CA1\u6709\u53EF\u5BFB\u5740\u7684 Agent\u3002",
  coach_unavailable: "\u65E0\u6CD5\u751F\u6210\u672C\u9898\u8981\u70B9\uFF1A\u5F53\u524D Host \u6CA1\u6709\u53EF\u7528\u7684\u540C\u6A21\u578B\u8865\u5168\u3002",
  chain_unavailable: "\u672C\u9898\u77E5\u8BC6\u94FE\u6CA1\u6709\u6302\u4E0A\uFF0C\u8FFD\u95EE\u9000\u56DE\u5F53\u524D\u4EBA\u8BBE\u3002\u5361\u7247\u8981\u70B9\u4ECD\u4FDD\u7559\u3002",
  coverage_unavailable: "\u5BF9\u7167\u6CA1\u6709\u7ED9\u51FA\u6709\u6548\u7ED3\u679C\uFF0C\u4F5C\u7B54\u7559\u5728\u672C\u9898\uFF0C\u6CA1\u6709\u65B0\u5F00\u5361\u7247\u3002",
  first_question_failed: "\u9762\u8BD5\u5B98\u5F00\u53E3\u5931\u8D25\u3002",
  follow_up_failed: "\u65E0\u6CD5\u770B\u5B88\u4E0B\u4E00\u95EE\uFF1A\u672C\u573A\u8BB0\u5F55\u4E0D\u5B58\u5728\uFF0C\u6216\u5F53\u524D Host \u8BFB\u4E0D\u5230\u6700\u65B0\u9898\u5E72\u3002",
  persist_unavailable: "\u65E0\u6CD5\u5199\u5165\u5DE5\u4F5C\u533A\u7EC3\u4E60\u8BB0\u5F55\uFF1A\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u7684\u5DE5\u4F5C\u533A\u76EE\u5F55\u6216\u6587\u4EF6\u7CFB\u7EDF\u3002",
  closing_failed: "\u65E0\u6CD5\u53D1\u9001\u672C\u8F6E\u6536\u5C3E\u3002\u95EE\u7B54\u4E0E\u603B\u7ED3\u4ECD\u4F1A\u5C1D\u8BD5\u5199\u5165\u3002"
};
var INTERVIEW_ROUND_END_TRIGGER = "\u7ED3\u675F\u9762\u8BD5";
var INTERVIEW_ROUND_CLOSING_LINE = "\u6B64\u756A xerina \u4F34\u541B\u81F3\u6B64\uFF0C\u8A00\u5C3D\u4E8E\u6B64\uFF0C\u613F\u541B\u9762\u8BD5\u987A\u9042\uFF0C\u524D\u7A0B\u53EF\u671F";
var INTERVIEW_ROUND_CLOSING_PROMPT = `\u672C\u8F6E\u516B\u80A1\u4E13\u9879\u6A21\u62DF\u9762\u8BD5\u5230\u6B64\u7ED3\u675F\u3002\u8BF7\u7528\u9762\u8BD5\u5B98\u53E3\u543B\u4F5C\u6536\u5C3E\uFF0C\u4E0D\u8981\u518D\u63D0\u51FA\u5F85\u7B54\u95EE\u9898\uFF0C\u4E0D\u8981\u5FF5\u5BF9\u7167\u3001\u4E94\u7EF4\u5206\u6570\u6216\u672C\u8F6E\u5EFA\u8BAE\u3002\u4F60\u7684\u56DE\u590D\u6700\u540E\u4E00\u53E5\u5FC5\u987B\u539F\u6587\u662F\uFF1A${INTERVIEW_ROUND_CLOSING_LINE}`;
var isRoundClosingText = (text) => {
  const trimmed = text.trim();
  return trimmed === INTERVIEW_ROUND_END_TRIGGER || trimmed.includes(INTERVIEW_ROUND_CLOSING_LINE) || trimmed.includes(INTERVIEW_ROUND_CLOSING_PROMPT);
};
var BAGUA_SCORE_DIMENSIONS = [
  "\u57FA\u7840\u624E\u5B9E\u5EA6",
  "\u539F\u7406\u7406\u89E3",
  "\u573A\u666F\u8FC1\u79FB",
  "\u6DF1\u5EA6\u8FB9\u754C",
  "\u8868\u8FBE\u6E05\u6670\u5EA6"
];
var EXAM_LAYERS = ["define", "why", "scene", "boundary"];
var EXAM_LAYER_LABELS = {
  define: "\u5B9A\u4E49",
  why: "\u539F\u7406",
  scene: "\u573A\u666F",
  boundary: "\u8FB9\u754C"
};
var isExamLayer = (value) => typeof value === "string" && EXAM_LAYERS.includes(value);
var ANSWER_COVERAGES = ["miss", "wide_gap", "deepen", "reask", "next"];
var isAnswerCoverage = (value) => typeof value === "string" && ANSWER_COVERAGES.includes(value);
var coverageGuides = (coverage) => coverage === "miss" || coverage === "wide_gap";
var emptyBaguaScores = () => BAGUA_SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: null }));
var createPendingCard = (input) => ({
  id: input.id,
  questionText: input.questionText,
  questionBrief: input.questionBrief,
  keyPoints: input.keyPoints,
  answer: null,
  comparison: null,
  scores: emptyBaguaScores(),
  status: "pending",
  seedUserText: input.seedUserText ?? "",
  answerTurns: [],
  guideCount: 0,
  ...input.layer !== void 0 ? { layer: input.layer } : {},
  ...input.intent !== void 0 ? { intent: input.intent } : {}
});
var answerTurnsOf = (card) => {
  if (card.answerTurns !== void 0 && card.answerTurns.length > 0) {
    return card.answerTurns;
  }
  if (card.answer !== null && card.answer.length > 0) {
    return [card.answer];
  }
  return [];
};
var joinAnswerTurns = (turns) => turns.join("\n\n");
var answerTurnLabel = (index) => `a${index + 1}`;
var createInterviewDeck = (input) => ({
  phase: "in_progress",
  sessionId: input.sessionId,
  topic: input.topic,
  difficulty: input.difficulty,
  archiveDir: input.archiveDir ?? "",
  cards: input.cards,
  currentCardId: input.currentCardId
});

// shared/src/api/interview-jev.ts
var JEV_CONFIG_REL = ".dsh-interview/config/jev.json";
var JEV_CONFIG_ERROR_MESSAGES = {
  persist_unavailable: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
  jev_key_required: "\u5F00\u542F\u5361\u7247\u5224\u65AD\u9700\u8981\u586B\u5199 Jev \u5BC6\u94A5\u3002",
  jev_unreachable: "Jev \u8FDE\u901A\u5931\u8D25\uFF0C\u5BC6\u94A5\u672A\u4FDD\u5B58\uFF0C\u672C\u573A\u8D70\u5BF9\u7167\u56DE\u9000\u3002"
};

// backend/src/data/workspace-archive.ts
var persistUnavailable = () => ({
  ok: false,
  code: "persist_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable
});
var ARCHIVE_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
var RESERVED_ARCHIVE_SESSION_IDS = /* @__PURE__ */ new Set(["config"]);
var sessionArchiveRoot = (sessionId) => {
  if (!ARCHIVE_SESSION_ID.test(sessionId) || sessionId.includes("..") || RESERVED_ARCHIVE_SESSION_IDS.has(sessionId)) {
    return void 0;
  }
  return `.dsh-interview/${sessionId}`;
};
var topicSlug = (topic) => {
  const slug = topic.trim().replace(/[/\\]+/g, "-").replace(/\.\./g, "").replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return slug.length > 0 ? slug : "round";
};
var archiveDirFor = (sessionId, round = 1, topic = "round") => {
  const root = sessionArchiveRoot(sessionId);
  if (root === void 0 || !Number.isInteger(round) || round < 1) {
    return void 0;
  }
  return `${root}/round-${round}-${topicSlug(topic)}`;
};
var isRoundArchiveDir = (sessionId, archiveDir) => {
  const root = sessionArchiveRoot(sessionId);
  if (root === void 0 || archiveDir.length === 0) {
    return false;
  }
  return archiveDir.startsWith(`${root}/round-`) && /\/round-\d+-/.test(archiveDir);
};
var joinWorkspacePath = (cwd, rel) => `${cwd.replace(/[/\\]+$/, "")}/${rel.replace(/^[/\\]+/, "")}`;
var renderCardMarkdown = (deck, cardId) => {
  const card = deck.cards.find((item) => item.id === cardId);
  if (card === void 0) {
    return `# ${cardId}
`;
  }
  const lines = [
    `# ${card.id}`,
    "",
    "## \u9898\u5E72",
    card.questionText,
    "",
    "## \u5F00\u5377",
    card.questionBrief,
    ...card.keyPoints.map((point) => `- ${point}`),
    ...card.layer !== void 0 && card.intent !== void 0 ? ["", "## \u8003\u5BDF", EXAM_LAYER_LABELS[card.layer], card.intent] : [],
    "",
    "## \u4F5C\u7B54",
    ...(() => {
      const turns = answerTurnsOf(card);
      if (turns.length === 0) {
        return ["\u5F85\u4F5C\u7B54"];
      }
      return turns.flatMap((turn, index) => [answerTurnLabel(index), turn]);
    })(),
    "",
    "## \u5BF9\u7167",
    card.comparison === null ? "\u5F85\u5BF9\u7167" : [
      `\u5DF2\u8986\u76D6\uFF1A${card.comparison.covered.join("\uFF1B") || "\u65E0"}`,
      `\u672A\u8986\u76D6\uFF1A${card.comparison.missed.join("\uFF1B") || "\u65E0"}`,
      card.comparison.comment
    ].join("\n"),
    "",
    "## \u8BC4\u5206",
    ...card.scores.map((item) => `- ${item.dimension}\uFF1A${item.score === null ? "\u2014" : item.score}`),
    ""
  ];
  return lines.join("\n");
};
var saveExamRecord = (examSessions, deck, lastQuestionText, extras) => {
  examSessions.save({
    sessionId: deck.sessionId,
    topic: deck.topic,
    difficulty: deck.difficulty,
    lastQuestionText,
    deck,
    ended: extras?.ended === true,
    ...extras?.closingSeed !== void 0 ? { closingSeed: extras.closingSeed } : {},
    ...extras?.jevAccelerated === true ? { jevAccelerated: true } : {}
  });
};
var loadDeckSession = async (examSessions, request, archive) => {
  const record = examSessions.load(request.sessionId);
  if (record !== void 0 && record.ended !== true) {
    return { ok: true, deck: record.deck };
  }
  const disk = await archive?.readDeck(request.sessionId);
  if (disk !== void 0) {
    const last = disk.cards[disk.cards.length - 1];
    saveExamRecord(examSessions, disk, last?.questionText ?? "");
    return { ok: true, deck: disk };
  }
  return {
    ok: false,
    code: "follow_up_failed",
    message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed
  };
};

// backend/src/data/jev-config.ts
var emptyJevSecret = () => ({ enabled: false, apiKey: "" });
var toPublicJevConfig = (secret) => ({
  enabled: secret.enabled === true,
  apiKeySet: secret.apiKey.trim().length > 0
});
var isJevConnected = (secret) => secret.enabled === true && secret.apiKey.trim().length > 0;
var parseJevFile = (raw) => {
  if (raw === void 0) {
    return emptyJevSecret();
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return emptyJevSecret();
    }
    const record = parsed;
    return {
      enabled: record.enabled === true,
      apiKey: typeof record.apiKey === "string" ? record.apiKey : ""
    };
  } catch {
    return emptyJevSecret();
  }
};
var planJevSave = (current, input) => {
  const incoming = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  const nextKey = incoming.length > 0 ? incoming : current.apiKey;
  if (input.enabled === true && nextKey.trim().length === 0) {
    return {
      ok: false,
      code: "jev_key_required",
      message: JEV_CONFIG_ERROR_MESSAGES.jev_key_required
    };
  }
  return {
    ok: true,
    next: {
      enabled: input.enabled === true,
      apiKey: nextKey
    }
  };
};

// backend/src/services/card-id.ts
var CARD_ID = /^Q([1-9][0-9]*)(?:\.([1-9][0-9]*))?$/;
var isCardId = (value) => CARD_ID.test(value);
var parseCardId = (value) => {
  const match = value.trim().match(CARD_ID);
  if (match === null) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: match[2] === void 0 ? null : Number(match[2])
  };
};
var formatFollowUp = (major, minor) => `Q${major}.${minor}`;
var nextMajor = (taken) => {
  let max = 0;
  for (const id of taken) {
    const parsed = parseCardId(id);
    if (parsed !== null && parsed.major > max) {
      max = parsed.major;
    }
  }
  return `Q${max + 1}`;
};
var nextFollowUp = (previousId, taken) => {
  const parsed = parseCardId(previousId);
  if (parsed === null) {
    return nextMajor(taken);
  }
  const major = parsed.major;
  let maxMinor = 0;
  for (const id of taken) {
    const item = parseCardId(id);
    if (item !== null && item.major === major && item.minor !== null && item.minor > maxMinor) {
      maxMinor = item.minor;
    }
  }
  if (parsed.minor !== null && parsed.minor > maxMinor) {
    maxMinor = parsed.minor;
  }
  return formatFollowUp(major, maxMinor + 1);
};
var assignCardId = (taken, input = {}) => {
  const suggested = input.suggestedId?.trim() ?? "";
  if (isCardId(suggested) && !taken.includes(suggested)) {
    return suggested;
  }
  if (input.relation === "next_topic" || input.previousId === void 0 || input.previousId.length === 0) {
    return nextMajor(taken);
  }
  return nextFollowUp(input.previousId, taken);
};

// backend/src/services/knowledge-chain.ts
var allowedLayers = (difficulty) => {
  if (difficulty === "junior") {
    return ["define", "scene"];
  }
  if (difficulty === "senior") {
    return ["define", "why", "scene", "boundary"];
  }
  return ["define", "why", "scene"];
};
var highestAllowed = (difficulty) => {
  const layers = allowedLayers(difficulty);
  return layers[layers.length - 1] ?? "scene";
};
var clipLayer = (difficulty, layer) => allowedLayers(difficulty).includes(layer) ? layer : highestAllowed(difficulty);
var rewriteDeep = (difficulty, layer, deep) => {
  if (difficulty !== "senior") {
    return deep;
  }
  if (layer !== "why" && layer !== "scene" && layer !== "boundary") {
    return deep;
  }
  if (deep.includes("\u524D\u63D0") || deep.includes("\u89C4\u6A21")) {
    return deep;
  }
  return `\u6362\u4E00\u4E2A\u524D\u63D0\u6216\u89C4\u6A21\uFF1A${deep}`;
};
var clipChain = (input) => {
  const layer = clipLayer(input.difficulty, input.chain.layer);
  const moves = {
    deep: rewriteDeep(input.difficulty, layer, input.chain.moves.deep),
    partial: input.chain.moves.partial,
    miss: input.chain.moves.miss
  };
  const clipped = {
    pointName: input.chain.pointName,
    layer,
    intent: input.chain.intent,
    moves,
    mustSwitch: false,
    sectionText: ""
  };
  return { ...clipped, sectionText: renderChainSection(clipped, input.difficulty) };
};
var guideScale = (difficulty) => {
  if (difficulty === "junior") {
    return "\u5F15\u5BFC\u65F6\u53EF\u4EE5\u628A\u6B65\u9AA4\u70B9\u5230\u53EA\u5269\u6700\u540E\u4E00\u95EE\u3002";
  }
  if (difficulty === "senior") {
    return "\u5F15\u5BFC\u65F6\u53EA\u6807\u51FA\u7F3A\u7684\u90A3\u4E00\u5200\u3002\u4E0B\u4E00\u6B63\u5F0F\u95EE\u5FC5\u987B\u6362\u4E00\u4E2A\u524D\u63D0\u6216\u6362\u4E00\u4E2A\u89C4\u6A21\u3002";
  }
  return "\u5F15\u5BFC\u65F6\u53EA\u70B9\u51FA\u7F3A\u53E3\u3002";
};
var renderChainSection = (chain, difficulty) => {
  const boundaryNote = chain.layer === "boundary" ? "\u8FB9\u754C\u4E0A\u7684\u4E0B\u4E00\u6B63\u5F0F\u95EE\u5FC5\u987B\u6362\u524D\u63D0\u6216\u6362\u89C4\u6A21\uFF0C\u4E0D\u8981\u518D\u51FA\u4E00\u9053\u8FB9\u754C\u9898\u3002" : "";
  return [
    "\u3010\u4E0B\u4E00\u95EE\u7EA6\u675F\u3011",
    `\u77E5\u8BC6\u70B9\uFF1A${chain.pointName}`,
    `\u5F53\u524D\u5C42\uFF1A${EXAM_LAYER_LABELS[chain.layer]}`,
    `\u8003\u5BDF\u610F\u56FE\uFF1A${chain.intent}`,
    "\u5019\u9009\u4EBA\u4F5C\u7B54\u540E\uFF0C\u6309\u5BF9\u7167\u7ED3\u679C\u53EA\u8BF4\u4E00\u4EF6\u4E8B\uFF0C\u4E00\u6B21\u53EA\u95EE\u4E00\u4E2A\u95EE\u9898\u3002",
    "\u4E00\u70B9\u6CA1\u7B54\u4E0A\uFF0C\u6216\u7F3A\u53E3\u8FD8\u5927\uFF1A\u7559\u5728\u8FD9\u9053\u9898\u4E0A\u5F15\u5BFC\u3002\u4E0D\u8981\u6539\u95EE\u522B\u7684\u77E5\u8BC6\u70B9\uFF0C\u4E0D\u8981\u7528\u3010\u672C\u9898\u3011\u6807\u6210\u65B0\u9898\u3002",
    "\u5BF9\u5DF2\u7ECF\u8BF4\u5230\u7684\u4E00\u4E2A\u70B9\u8FFD\u6DF1\uFF1A\u63A5\u7740\u95EE\u6DF1\u4E00\u5C42\uFF0C\u8FD9\u662F\u5B50\u95EE\u9898\u3002",
    "\u540C\u4E00\u77E5\u8BC6\u70B9\u6362\u4E00\u4E2A\u5927\u65B9\u9762\uFF0C\u6216\u628A\u8FD9\u4E00\u9898\u62C6\u5F00\u518D\u95EE\uFF1A\u6362\u65B9\u9762\u6216\u62C6\u5F00\u518D\u95EE\uFF0C\u8FD9\u4E5F\u662F\u5B50\u95EE\u9898\uFF0C\u4E0D\u662F\u65B0\u7684\u6B63\u5F0F\u95EE\u3002",
    "\u8FD9\u5C42\u610F\u56FE\u5DF2\u7ECF\u8FBE\u5230\uFF0C\u6216\u8BE5\u6362\u77E5\u8BC6\u70B9\uFF1A\u95EE\u4E00\u4E2A\u65B0\u7684\u6B63\u5F0F\u95EE\u9898\u3002",
    guideScale(difficulty),
    boundaryNote,
    "\u7981\u6B62\u8F93\u51FA JSON\uFF0C\u7981\u6B62\u590D\u8FF0\u672C\u6BB5\uFF0C\u7981\u6B62\u8BF4\u51FA\u5BF9\u7167\u7ED3\u679C\u7684\u540D\u79F0\u3002"
  ].filter((line) => line.length > 0).join("\n");
};
var isChainMove = (value) => value === "deep" || value === "partial" || value === "miss" || value === "switch";
var createChainMemory = () => {
  const chains = /* @__PURE__ */ new Map();
  return {
    remember(sessionId, chain) {
      chains.set(sessionId, chain);
    },
    recall(sessionId) {
      return chains.get(sessionId);
    },
    forget(sessionId) {
      chains.delete(sessionId);
    }
  };
};
var previousChainLines = (previous) => {
  if (previous === void 0) {
    return [];
  }
  if (previous.mustSwitch || previous.moves === null) {
    return ["\u4E0A\u4E00\u9898\u4E4B\u540E\u5FC5\u987B\u6362\u77E5\u8BC6\u70B9\u3002matchedMove \u5FC5\u987B\u662F switch\u3002"];
  }
  return [
    `\u4E0A\u4E00\u9898\u77E5\u8BC6\u70B9\uFF1A${previous.pointName}`,
    `\u4E0A\u4E00\u9898\u8003\u5BDF\u5C42\uFF1A${EXAM_LAYER_LABELS[previous.layer]}`,
    "\u4E0A\u4E00\u9898\u4E09\u6863\uFF1A",
    `\u7B54\u5230\u4E86\uFF1A${previous.moves.deep}`,
    `\u6709\u7F3A\u53E3\uFF1A${previous.moves.partial}`,
    `\u6CA1\u7B54\u4E0A\uFF1A${previous.moves.miss}`,
    "matchedMove \u5BF9\u4E0A\u4E0A\u9762\u67D0\u4E00\u6863\u65F6\u7528 deep\u3001partial \u6216 miss\uFF0C\u6362\u4E86\u77E5\u8BC6\u70B9\u7528 switch\u3002"
  ];
};
var openingLayer = (difficulty) => {
  if (difficulty === "junior") {
    return "define";
  }
  return "why";
};
var fallbackChain = (input) => {
  const pointName = input.questionBrief.trim();
  const intent = input.keyPoints.map((point) => point.trim()).find((point) => point.length > 0) ?? pointName;
  return {
    pointName,
    layer: openingLayer(input.difficulty),
    intent,
    moves: {
      deep: "\u5BF9\u5DF2\u7ECF\u8BF4\u5230\u7684\u4E00\u4E2A\u70B9\u518D\u95EE\u6DF1\u4E00\u5C42\uFF0C\u8FD9\u662F\u5B50\u95EE\u9898\u3002",
      partial: "\u628A\u540C\u4E00\u9898\u62C6\u5F00\u6216\u6362\u4E00\u4E2A\u5927\u65B9\u9762\u518D\u95EE\uFF0C\u8FD9\u4E5F\u662F\u5B50\u95EE\u9898\u3002",
      miss: "\u7559\u5728\u8FD9\u9053\u9898\u4E0A\u5F15\u5BFC\uFF0C\u4E0D\u8981\u6539\u95EE\u522B\u7684\u77E5\u8BC6\u70B9\u3002"
    }
  };
};
var openingLayerLine = (difficulty) => {
  if (difficulty === "junior") {
    return "\u7B2C\u4E00\u95EE\u53EA\u95EE\u5B9A\u4E49\u3002";
  }
  if (difficulty === "senior") {
    return "\u7B2C\u4E00\u95EE\u76F4\u63A5\u95EE\u539F\u7406\u4E2D\u7684\u53D6\u820D\uFF0C\u6216\u8FB9\u754C\u3002";
  }
  return "\u7B2C\u4E00\u95EE\u53EA\u95EE\u539F\u7406\u6216\u573A\u666F\uFF0C\u4E0D\u8981\u53EA\u95EE\u5B9A\u4E49\u3002";
};

// backend/src/services/pending-question.ts
var hasInterrogative = (paragraph) => /[？?]/.test(paragraph);
var isHostRouteFailureText = (text) => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (/^\d{3}\s*:\s*\{/.test(trimmed)) {
    return true;
  }
  return trimmed.includes("route_plan_error") || trimmed.includes('"failure_class"') || trimmed.includes("machine outputted is blocked");
};
var extractPendingQuestion = (assistantTurn) => {
  const text = assistantTurn.trim();
  if (text.length === 0 || isHostRouteFailureText(text)) {
    return "";
  }
  const marked = text.match(/【本题】\s*([\s\S]+)$/);
  const markedText = marked?.[1]?.trim();
  if (markedText !== void 0 && markedText.length > 0) {
    return markedText;
  }
  const parts = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0);
  let end = parts.length - 1;
  while (end >= 0 && !hasInterrogative(parts[end] ?? "")) {
    end -= 1;
  }
  if (end < 0) {
    return text;
  }
  const trailing = [];
  for (let index = end; index >= 0; index -= 1) {
    const paragraph = parts[index] ?? "";
    if (hasInterrogative(paragraph)) {
      trailing.unshift(paragraph);
      continue;
    }
    break;
  }
  if (trailing.length > 0) {
    return trailing.join("\n");
  }
  return text;
};

// backend/src/services/coach-brief.ts
var assembleCoachBriefPrompt = ({
  topic,
  difficulty,
  questionText,
  previousChain,
  repairChain = false
}) => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  return {
    system: [
      "\u4F60\u662F\u672C\u573A\u6A21\u62DF\u9762\u8BD5\u7684\u9762\u677F\u6559\u7EC3\uFF0C\u53EA\u4E3A\u53F3\u4FA7\u9762\u677F\u4EA7\u51FA\u5BF9\u7167\u6750\u6599\u3002",
      "\u4E0D\u8981\u626E\u6F14\u9762\u8BD5\u5B98\uFF0C\u4E0D\u8981\u5411\u5019\u9009\u4EBA\u53D1\u95EE\uFF0C\u4E0D\u8981\u8F93\u51FA\u5206\u6570\u6216\u901A\u8FC7/\u4E0D\u901A\u8FC7\u5224\u5B9A\u3002",
      "\u53EA\u9488\u5BF9\u5F53\u524D\u5F85\u7B54\u95EE\u5199\u6458\u8981\u548C\u8981\u70B9\uFF1B\u5FFD\u7565\u540C\u4E00\u6BB5\u91CC\u5BF9\u4E0A\u4E00\u95EE\u7684\u70B9\u8BC4\u3001\u7EA0\u6B63\u6216\u63ED\u6653\u3002",
      "keyPoints \u5FC5\u987B\u4ECE\u8003\u5BDF\u610F\u56FE\u62C6\u51FA\uFF0C3 \u5230 6 \u6761\uFF0C\u4E0D\u8981\u53E6\u8003\u4E00\u5957\u3002",
      "\u6839\u636E\u672C\u573A\u4E3B\u9898\u3001\u96BE\u5EA6\u548C\u9762\u8BD5\u5B98\u5DF2\u7ECF\u95EE\u51FA\u7684\u5F85\u7B54\u95EE\uFF0C\u53EA\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A",
      '{"questionBrief":"\u9898\u5E72\u6458\u8981","keyPoints":["\u6807\u51C6\u7B54\u8981\u70B91","\u6807\u51C6\u7B54\u8981\u70B92"],"cardId":"Q1","pointName":"\u77E5\u8BC6\u70B9","layer":"why","intent":"\u8FD9\u4E00\u95EE\u8981\u542C\u5230\u7684\u90A3\u4E00\u53E5","moves":{"deep":"\u7B54\u5230\u4E86\u7684\u4E0B\u4E00\u95EE\u7EA6\u675F","partial":"\u6709\u7F3A\u53E3\u7684\u4E0B\u4E00\u95EE\u7EA6\u675F","miss":"\u6CA1\u7B54\u4E0A\u7684\u4E0B\u4E00\u95EE\u7EA6\u675F"},"matchedMove":"switch"}',
      "questionBrief \u662F\u672C\u9898\u9898\u5E72\u7684\u77ED\u6458\u8981\u3002",
      "layer \u53EA\u80FD\u662F define\u3001why\u3001scene\u3001boundary\u3002",
      "matchedMove \u53EA\u80FD\u662F deep\u3001partial\u3001miss\u3001switch\u3002\u540C\u4E00\u9898\u62C6\u5F00\u3001\u8FFD\u6DF1\u6216\u6362\u65B9\u9762\u7528\u524D\u4E09\u4E2A\u3002\u53EA\u6709\u6362\u4E86\u77E5\u8BC6\u70B9\u624D\u7528 switch\u3002",
      repairChain ? "\u4E0A\u4E00\u6B21\u8981\u70B9\u53EF\u4EE5\u4FDD\u7559\uFF0C\u4F46\u77E5\u8BC6\u94FE\u4E0D\u5408\u6CD5\u3002\u8FD9\u6B21\u5FC5\u987B\u8FD4\u56DE\u5B8C\u6574 JSON\uFF0C\u5305\u542B pointName\u3001layer\u3001intent\u3001moves\u3002layer \u53EA\u80FD\u662F define\u3001why\u3001scene\u3001boundary\u3002moves \u7684 deep\u3001partial\u3001miss \u90FD\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\u3002\u4E0D\u8981\u6362\u9898\u3002" : "",
      "\u4E0D\u8981\u4F7F\u7528 Markdown \u4EE3\u7801\u56F4\u680F\uFF0C\u4E0D\u8981\u9644\u52A0\u89E3\u91CA\u3002"
    ].filter((line) => line.length > 0).join("\n"),
    user: [
      `\u4E3B\u9898\uFF1A${topic}`,
      `\u96BE\u5EA6\uFF1A${difficultyLabel}`,
      ...previousChainLines(previousChain),
      "\u9762\u8BD5\u5B98\u5F53\u524D\u95EE\u9898\uFF1A",
      pendingQuestion
    ].join("\n")
  };
};
var asNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
};
var extractJsonObject = (raw) => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\{[\s\S]*\}/);
  return fenced ? fenced[0] : null;
};
var asRelation = (value) => value === "followup" || value === "next_topic" ? value : void 0;
var asMoves = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value;
  const deep = asNonEmptyString(row.deep);
  const partial = asNonEmptyString(row.partial);
  const miss = asNonEmptyString(row.miss);
  if (deep === null || partial === null || miss === null) {
    return null;
  }
  return { deep, partial, miss };
};
var asChain = (record) => {
  const pointName = asNonEmptyString(record.pointName);
  const intent = asNonEmptyString(record.intent);
  const moves = asMoves(record.moves);
  if (pointName === null || intent === null || !isExamLayer(record.layer) || moves === null) {
    return void 0;
  }
  const matchedMove = isChainMove(record.matchedMove) ? record.matchedMove : void 0;
  return {
    pointName,
    layer: record.layer,
    intent,
    moves,
    ...matchedMove !== void 0 ? { matchedMove } : {}
  };
};
var parseCoachBriefOutput = (raw) => {
  const json = extractJsonObject(raw);
  if (json === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(json);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed;
    const questionBrief = asNonEmptyString(record.questionBrief);
    if (questionBrief === null || !Array.isArray(record.keyPoints)) {
      return null;
    }
    const keyPoints = record.keyPoints.map((item) => asNonEmptyString(item)).filter((item) => item !== null);
    if (keyPoints.length === 0) {
      return null;
    }
    const cardId = asNonEmptyString(record.cardId) ?? void 0;
    const relation = asRelation(record.relation);
    const chain = asChain(record);
    return {
      questionBrief,
      keyPoints,
      ...cardId ? { cardId } : {},
      ...relation ? { relation } : {},
      ...chain ? { chain } : {}
    };
  } catch {
    return null;
  }
};
var coachUnavailable = (deck) => ({
  ok: false,
  code: "coach_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
  ...deck ? { deck } : {}
});
var chainUnavailable = (deck) => ({
  ok: false,
  code: "chain_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.chain_unavailable,
  deck
});
var finishBrief = async (archive, examSessions, deck, questionText, chain, hooks) => {
  const persisted = await persistDeck(archive, deck);
  const saved = persisted.deck ?? deck;
  if (examSessions) {
    saveExamRecord(examSessions, saved, questionText);
  }
  if (!persisted.ok) {
    return persisted;
  }
  if (chain === void 0) {
    hooks?.memory.forget(saved.sessionId);
    hooks?.port?.clear(saved.sessionId);
    return chainUnavailable(saved);
  }
  hooks?.memory.remember(saved.sessionId, chain);
  if (hooks?.port !== void 0) {
    const mounted = hooks.port.install(saved.sessionId, chain.sectionText);
    if (!mounted.ok) {
      return {
        ok: false,
        code: "inject_unavailable",
        message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
        deck: saved
      };
    }
  }
  return persisted;
};
var persistDeck = async (archive, deck) => {
  if (archive === void 0) {
    return { ok: true, deck };
  }
  const written = await archive.writeDeck(deck);
  if (!written.ok) {
    return { ...persistUnavailable(), deck };
  }
  return { ok: true, deck: { ...deck, archiveDir: written.archiveDir } };
};
var briefCoachSession = async (runtime, request, examSessions, archive, hooks) => {
  hooks?.memory.forget(request.sessionId);
  const question = await runtime.readLatestQuestion(request.sessionId);
  if (!question.ok) {
    return question;
  }
  const human = await runtime.readLatestHuman(request.sessionId);
  if (!human.ok) {
    return human;
  }
  const firstPrompt = assembleCoachBriefPrompt({
    topic: request.topic,
    difficulty: request.difficulty,
    questionText: question.text
  });
  const raw = await runtime.complete(firstPrompt.system, firstPrompt.user);
  if (raw === null) {
    return coachUnavailable();
  }
  let parsed = parseCoachBriefOutput(raw);
  if (parsed === null) {
    return coachUnavailable();
  }
  if (parsed.chain === void 0) {
    const repairPrompt = assembleCoachBriefPrompt({
      topic: request.topic,
      difficulty: request.difficulty,
      questionText: question.text,
      repairChain: true
    });
    const repairedRaw = await runtime.complete(repairPrompt.system, repairPrompt.user);
    const repaired = repairedRaw === null ? null : parseCoachBriefOutput(repairedRaw);
    if (repaired !== null) {
      parsed = repaired;
    }
  }
  if (parsed.chain === void 0) {
    parsed = {
      ...parsed,
      chain: fallbackChain({
        difficulty: request.difficulty,
        questionBrief: parsed.questionBrief,
        keyPoints: parsed.keyPoints
      })
    };
  }
  const previous = examSessions?.load(request.sessionId);
  let archiveDir = "";
  if (archive?.beginRound !== void 0) {
    const begun = await archive.beginRound(request.sessionId, request.topic, {
      forceNext: previous?.ended === true
    });
    if (!begun.ok) {
      const failedCard = createPendingCard({
        id: assignCardId([], { suggestedId: "Q1" }),
        questionText: question.text,
        questionBrief: parsed.questionBrief,
        keyPoints: parsed.keyPoints,
        seedUserText: human.text
      });
      const failedDeck = createInterviewDeck({
        sessionId: request.sessionId,
        topic: request.topic,
        difficulty: request.difficulty,
        cards: [failedCard],
        currentCardId: failedCard.id
      });
      examSessions && saveExamRecord(examSessions, failedDeck, question.text);
      return { ...begun, deck: failedDeck };
    }
    archiveDir = begun.archiveDir;
  }
  const cardId = assignCardId([], { suggestedId: "Q1" });
  const clipped = parsed.chain === void 0 ? void 0 : clipChain({
    difficulty: request.difficulty,
    chain: parsed.chain,
    cardIds: [cardId]
  });
  const card = createPendingCard({
    id: cardId,
    questionText: question.text,
    questionBrief: parsed.questionBrief,
    keyPoints: parsed.keyPoints,
    seedUserText: human.text,
    ...clipped !== void 0 ? { layer: clipped.layer, intent: clipped.intent } : {}
  });
  const deck = createInterviewDeck({
    sessionId: request.sessionId,
    topic: request.topic,
    difficulty: request.difficulty,
    cards: [card],
    currentCardId: card.id,
    archiveDir
  });
  await runtime.whenIdle?.(request.sessionId);
  return finishBrief(archive, examSessions, deck, question.text, clipped, hooks);
};

// backend/src/data/round-notes.ts
var comparisonBlock = (card) => {
  if (card.comparison === null) {
    return "\u5F85\u5BF9\u7167";
  }
  return [
    `\u5DF2\u8986\u76D6\uFF1A${card.comparison.covered.join("\uFF1B") || "\u65E0"}`,
    `\u672A\u8986\u76D6\uFF1A${card.comparison.missed.join("\uFF1B") || "\u65E0"}`,
    card.comparison.comment
  ].join("\n");
};
var scoresBlock = (card) => card.scores.map((item) => `- ${item.dimension}\uFF1A${item.score === null ? "\u2014" : item.score}`).join("\n");
var cardSection = (card) => [
  `## ${card.id}`,
  "",
  "### \u9898\u5E72",
  card.questionText,
  "",
  "### \u5F00\u5377",
  card.questionBrief,
  ...card.keyPoints.map((point) => `- ${point}`),
  "",
  "### \u4F5C\u7B54",
  card.answer ?? "\u5F85\u4F5C\u7B54",
  "",
  "### \u5BF9\u7167",
  comparisonBlock(card),
  "",
  "### \u4E94\u7EF4",
  scoresBlock(card),
  ""
].join("\n");
var renderQaMarkdown = (deck) => {
  const difficultyLabel = DIFFICULTY_LABELS[deck.difficulty];
  return [
    "# \u672C\u8F6E\u95EE\u7B54",
    "",
    `\u4E3B\u9898\uFF1A${deck.topic}`,
    `\u96BE\u5EA6\uFF1A${difficultyLabel}`,
    "",
    ...deck.cards.flatMap((card) => [cardSection(card)])
  ].join("\n");
};
var renderSummaryMarkdown = (deck, advice) => {
  const difficultyLabel = DIFFICULTY_LABELS[deck.difficulty];
  const body = advice === null || advice.trim().length === 0 ? "\u672C\u8F6E\u603B\u7ED3\u672A\u751F\u6210\u3002" : advice.trim();
  return [
    "# \u672C\u8F6E\u603B\u7ED3",
    "",
    `\u4E3B\u9898\uFF1A${deck.topic}`,
    `\u96BE\u5EA6\uFF1A${difficultyLabel}`,
    "",
    "## \u8868\u73B0\u4E0E\u5EFA\u8BAE",
    "",
    body,
    ""
  ].join("\n");
};

// backend/src/services/round-advice.ts
var assembleRoundAdvicePrompt = (deck) => {
  const scored = deck.cards.filter((card) => card.status === "scored");
  const pending = deck.cards.filter((card) => card.status === "pending");
  const scoredLines = scored.flatMap((card) => [
    `${card.id} ${card.questionBrief}`,
    `\u4F5C\u7B54\uFF1A${card.answer ?? "\u65E0"}`,
    card.comparison === null ? "\u5BF9\u7167\uFF1A\u65E0" : `\u5BF9\u7167\uFF1A\u5DF2\u8986\u76D6 ${card.comparison.covered.join("\uFF1B") || "\u65E0"}\uFF1B\u672A\u8986\u76D6 ${card.comparison.missed.join("\uFF1B") || "\u65E0"}\u3002${card.comparison.comment}`,
    `\u4E94\u7EF4\uFF1A${card.scores.map((item) => `${item.dimension}${item.score === null ? "\u2014" : item.score}`).join("\uFF0C")}`
  ]);
  const pendingLines = pending.map((card) => `${card.id} \u5F85\u4F5C\u7B54\uFF1A${card.questionBrief}`);
  return {
    system: [
      "\u4F60\u662F\u672C\u573A\u6A21\u62DF\u9762\u8BD5\u7684\u9762\u677F\u6559\u7EC3\uFF0C\u53EA\u4E3A\u672C\u8F6E\u603B\u7ED3\u6587\u4EF6\u5199\u590D\u4E60\u5EFA\u8BAE\u3002",
      "\u4E0D\u8981\u626E\u6F14\u9762\u8BD5\u5B98\uFF0C\u4E0D\u8981\u5411\u5019\u9009\u4EBA\u53D1\u95EE\uFF0C\u4E0D\u8981\u628A\u5EFA\u8BAE\u5199\u8FDB\u8003\u573A\u5BF9\u8BDD\u3002",
      "\u6839\u636E\u672C\u8F6E\u5DF2\u8BC4\u5361\u7684\u5BF9\u7167\u4E0E\u4E94\u7EF4\uFF0C\u7528\u4E2D\u6587\u5199\u4E00\u6BB5\u672C\u8F6E\u603B\u7ED3\uFF1A\u8584\u5F31\u70B9\u548C\u4E0B\u8F6E\u8BE5\u7EC3\u4EC0\u4E48\u3002",
      "\u4E0D\u8981\u8F93\u51FA JSON\uFF0C\u4E0D\u8981\u8F93\u51FA\u5206\u6570\u8868\uFF0C\u4E0D\u8981\u590D\u8FF0\u5B8C\u6574\u5BF9\u7167\u6761\u76EE\u3002"
    ].join("\n"),
    user: [
      `\u4E3B\u9898\uFF1A${deck.topic}`,
      `\u96BE\u5EA6\uFF1A${DIFFICULTY_LABELS[deck.difficulty]}`,
      scoredLines.length > 0 ? "\u5DF2\u8BC4\u5361\uFF1A" : "\u5DF2\u8BC4\u5361\uFF1A\u65E0",
      ...scoredLines,
      pendingLines.length > 0 ? "\u5F85\u4F5C\u7B54\u5361\uFF1A" : "\u5F85\u4F5C\u7B54\u5361\uFF1A\u65E0",
      ...pendingLines
    ].join("\n")
  };
};

// backend/src/services/end-round.ts
var withNotePaths = (qaPath, summaryPath) => ({
  ...qaPath !== void 0 ? { qaPath } : {},
  ...summaryPath !== void 0 ? { summaryPath } : {}
});
var endRoundSession = async (runtime, examSessions, request, archive) => {
  const record = examSessions.load(request.sessionId);
  const deck = record?.deck ?? await archive?.readDeck(request.sessionId);
  if (deck === void 0) {
    return {
      ok: false,
      code: "follow_up_failed",
      message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
      ended: false
    };
  }
  const last = deck.cards[deck.cards.length - 1];
  saveExamRecord(examSessions, deck, last?.questionText ?? "", {
    ended: true,
    closingSeed: INTERVIEW_ROUND_END_TRIGGER
  });
  const marked = archive?.markEnded === void 0 ? { ok: true } : await archive.markEnded(deck.sessionId, INTERVIEW_ROUND_END_TRIGGER);
  let advice = null;
  let adviceFailed = false;
  const { system, user } = assembleRoundAdvicePrompt(deck);
  const raw = await runtime.complete(system, user);
  if (typeof raw === "string" && raw.trim().length > 0) {
    advice = raw.trim();
  } else {
    adviceFailed = true;
  }
  const qa = renderQaMarkdown(deck);
  const summary = renderSummaryMarkdown(deck, advice);
  let qaPath = deck.archiveDir.length > 0 ? `${deck.archiveDir}/qa.md` : void 0;
  let summaryPath = deck.archiveDir.length > 0 ? `${deck.archiveDir}/summary.md` : void 0;
  let persistFailed = marked !== void 0 && marked.ok === false;
  if (archive?.writeRoundNotes !== void 0) {
    const written = await archive.writeRoundNotes(deck.sessionId, { qa, summary });
    if (written.ok) {
      qaPath = written.qaPath;
      summaryPath = written.summaryPath;
    } else {
      persistFailed = true;
    }
  }
  if (persistFailed) {
    return {
      ok: false,
      code: "persist_unavailable",
      message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable,
      ended: true,
      ...withNotePaths(qaPath, summaryPath)
    };
  }
  if (adviceFailed) {
    return {
      ok: false,
      code: "coach_unavailable",
      message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
      ended: true,
      ...withNotePaths(qaPath, summaryPath)
    };
  }
  return {
    ok: true,
    sessionId: deck.sessionId,
    qaPath: qaPath ?? `${deck.archiveDir}/qa.md`,
    summaryPath: summaryPath ?? `${deck.archiveDir}/summary.md`,
    ended: true
  };
};

// backend/src/services/interviewer-persona.ts
var assembleInterviewerPersona = ({ topic, difficulty }) => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  return [
    "# \u89D2\u8272",
    `\u4F60\u7684\u89D2\u8272\u662F\u4E00\u540D\u4E13\u4E1A\u9762\u8BD5\u5B98\uFF0C\u672C\u573A\u6A21\u5F0F\u56FA\u5B9A\u4E3A\u516B\u80A1\u4E13\u9879\uFF0C\u4E3B\u9898\u662F\u3010${topic}\u3011\uFF0C\u96BE\u5EA6\u662F\u3010${difficultyLabel}\u3011\u3002`,
    "\u3010\u6838\u5FC3\u539F\u5219\u3011",
    "1. \u6BCF\u6B21\u53EA\u95EE\u4E00\u4E2A\u95EE\u9898\uFF0C\u7B49\u5019\u9009\u4EBA\u56DE\u7B54\u540E\u518D\u8FFD\u95EE\uFF1B\u4E0D\u8FDE\u73AF\u53D1\u95EE\u3002",
    `2. ${openingLayerLine(difficulty)}`,
    "3. \u7B2C\u4E00\u95EE\u4E4B\u540E\uFF0C\u4E0B\u4E00\u95EE\u53EA\u80FD\u9075\u5B88\u7CFB\u7EDF\u6BB5 interview:chain \u4E2D\u7684\u4E00\u6863\uFF0C\u4E0D\u8981\u81EA\u9009\u68AF\u5EA6\u3002",
    "4. \u5F00\u573A\u5148\u7528\u4E00\u4E24\u53E5\u8BF4\u660E\u672C\u8F6E\u4E3B\u9898\u548C\u96BE\u5EA6\uFF0C\u7136\u540E\u7ACB\u523B\u95EE\u7B2C\u4E00\u4E2A\u95EE\u9898\u3002",
    "5. \u4FDD\u6301\u5BF9\u8BDD\u611F\uFF0C\u50CF\u771F\u4EBA\u9762\u8BD5\u5B98\uFF1B\u4E0D\u8981\u5728\u5BF9\u8BDD\u91CC\u516C\u5E03\u5B8C\u6574\u89E3\u7B54\u6216\u5206\u6570\u3002",
    "6. \u672C\u573A\u4ECE\u8FD9\u6761\u65B0\u5BF9\u8BDD\u5F00\u59CB\uFF0C\u4E0D\u8981\u5047\u8BBE\u5B58\u5728\u66F4\u65E9\u7684\u804A\u5929\u5386\u53F2\u3002",
    "7. \u7EA0\u6B63\u4E0A\u4E00\u95EE\u6216\u8865\u5145\u8BB2\u89E3\u65F6\u53EA\u77ED\u8BF4\uFF0C\u7136\u540E\u7ACB\u523B\u7ED9\u51FA\u8FD9\u4E00\u8F6E\u552F\u4E00\u5F85\u7B54\u95EE\uFF1B\u53EF\u7528\u3010\u672C\u9898\u3011\u6807\u51FA\u5F85\u7B54\u95EE\u3002",
    "8. \u8003\u573A\u6C14\u6CE1\u5FC5\u987B\u662F\u81EA\u7136\u8BED\u8A00\u9762\u8BD5\u53E3\u6C14\uFF0C\u7981\u6B62\u8F93\u51FA JSON\u3001\u6863\u540D\u5217\u8868\u6216\u77E5\u8BC6\u94FE\u6B63\u6587\u3002",
    "",
    "\u3010\u96BE\u5EA6\u3011",
    difficultyLabel
  ].join("\n");
};

// backend/src/services/coach-score.ts
var assembleCoachScorePrompt = ({
  topic,
  difficulty,
  questionText,
  questionBrief,
  keyPoints,
  answer,
  layer,
  intent
}) => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  const anchored = layer !== void 0 && intent !== void 0;
  const layerNote = difficulty === "junior" && layer === "define" ? "\u672C\u9898\u662F\u521D\u7EA7\u7684\u5B9A\u4E49\u5C42\u3002\u4E0D\u8981\u56E0\u4E3A\u5019\u9009\u4EBA\u6CA1\u6709\u8BB2\u5230\u8FB9\u754C\uFF0C\u800C\u538B\u4F4E\u8FD9\u4E00\u5C42\u5E76\u4E0D\u8003\u5BDF\u7684\u6DF1\u5EA6\u3002\u539F\u7406\u7406\u89E3\u53EF\u4EE5\u56E0\u6B64\u4E0D\u9AD8\u3002" : difficulty === "senior" && layer === "boundary" ? "\u672C\u9898\u662F\u9AD8\u7EA7\u7684\u8FB9\u754C\u5C42\u3002\u53EA\u6709\u8BF4\u5F97\u51FA\u524D\u63D0\u4E00\u53D8\u54EA\u91CC\u4F1A\u7834\uFF0C\u6DF1\u5EA6\u8FB9\u754C\u624D\u80FD\u5230 4 \u4EE5\u4E0A\u3002" : "";
  return {
    system: [
      "\u4F60\u662F\u672C\u573A\u6A21\u62DF\u9762\u8BD5\u7684\u9762\u677F\u6559\u7EC3\uFF0C\u53EA\u4E3A\u53F3\u4FA7\u9762\u677F\u8BC4\u5206\u3002",
      "\u4E0D\u8981\u626E\u6F14\u9762\u8BD5\u5B98\uFF0C\u4E0D\u8981\u5411\u5019\u9009\u4EBA\u53D1\u95EE\uFF0C\u4E0D\u8981\u628A\u7ED3\u679C\u5199\u8FDB\u5BF9\u8BDD\u3002",
      anchored ? "\u53EA\u6839\u636E\u672C\u9898\u8003\u5BDF\u610F\u56FE\u3001\u6240\u5728\u5C42\u548C\u5019\u9009\u4EBA\u4F5C\u7B54\u6253\u5206\uFF0C\u4E0D\u8981\u53E6\u627E\u4E00\u5957\u6807\u51C6\u3002" : "\u53EA\u6839\u636E\u672C\u9898\u5F00\u5377\u8981\u70B9\u548C\u5019\u9009\u4EBA\u4F5C\u7B54\uFF0C\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A",
      anchored ? "\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A" : "",
      '{"coverage":"miss","covered":["\u5DF2\u8986\u76D6\u8981\u70B9"],"missed":["\u672A\u8986\u76D6\u8981\u70B9"],"comment":"\u5BF9\u7167\u8BC4\u8BED","scores":[{"dimension":"\u57FA\u7840\u624E\u5B9E\u5EA6","score":3.5,"reason":"\u7406\u7531"}]}',
      "coverage \u53EA\u80FD\u662F miss\u3001wide_gap\u3001deepen\u3001reask\u3001next \u4E4B\u4E00\u3002",
      "miss \u8868\u793A\u4E00\u70B9\u6CA1\u7B54\u4E0A\uFF0C\u6362\u4E86\u8BF4\u6CD5\u4E5F\u6CA1\u78B0\u5230\u8003\u5BDF\u610F\u56FE\u3002wide_gap \u8868\u793A\u78B0\u5230\u4E86\u4E00\u90E8\u5206\u4F46\u7F3A\u53E3\u5927\u3002",
      "deepen \u8868\u793A\u5BF9\u5DF2\u7ECF\u8BF4\u5230\u7684\u67D0\u4E00\u4E2A\u70B9\u8FFD\u6DF1\u3002reask \u8868\u793A\u628A\u540C\u4E00\u9898\u62C6\u5F00\uFF0C\u6216\u6362\u4E00\u4E2A\u5927\u65B9\u9762\u518D\u95EE\u3002",
      "next \u53EA\u8868\u793A\u8FD9\u5C42\u610F\u56FE\u5DF2\u7ECF\u8FBE\u5230\uFF0C\u6216\u8BE5\u6362\u77E5\u8BC6\u70B9\u3002\u540C\u4E00\u9898\u62C6\u5F00\u518D\u95EE\u4E0D\u662F next\u3002",
      "\u610F\u601D\u76F8\u8FD1\u7B97\u78B0\u5230\u3002\u4E0D\u8981\u7528\u672A\u8986\u76D6\u6761\u6570\u51B3\u5B9A coverage\u3002",
      `scores \u5FC5\u987B\u6070\u597D\u5305\u542B\u8FD9\u4E94\u4E2A\u7EF4\u5EA6\u4E14\u987A\u5E8F\u4E00\u81F4\uFF1A${BAGUA_SCORE_DIMENSIONS.join("\u3001")}\u3002`,
      "\u6BCF\u4E2A score \u662F 1 \u5230 5 \u7684\u6570\u5B57\uFF0C\u5141\u8BB8 0.5 \u6B65\u8FDB\u3002",
      layerNote,
      "\u4E0D\u8981\u4F7F\u7528 Markdown \u4EE3\u7801\u56F4\u680F\uFF0C\u4E0D\u8981\u9644\u52A0\u89E3\u91CA\u3002"
    ].filter((line) => line.length > 0).join("\n"),
    user: [
      `\u4E3B\u9898\uFF1A${topic}`,
      `\u96BE\u5EA6\uFF1A${difficultyLabel}`,
      "\u9762\u8BD5\u5B98\u5F53\u524D\u95EE\u9898\uFF1A",
      pendingQuestion,
      ...anchored ? [`\u8003\u5BDF\u5C42\uFF1A${EXAM_LAYER_LABELS[layer]}`, `\u8003\u5BDF\u610F\u56FE\uFF1A${intent}`] : [],
      "\u672C\u9898\u6458\u8981\uFF1A",
      questionBrief,
      "\u6807\u51C6\u7B54\u8981\u70B9\uFF1A",
      ...keyPoints.map((point) => `- ${point}`),
      "\u5019\u9009\u4EBA\u4F5C\u7B54\uFF08\u6309\u65F6\u95F4\u987A\u5E8F\uFF0C\u542B\u5F15\u5BFC\u540E\u7684\u8865\u5145\uFF09\uFF1A",
      answer
    ].join("\n")
  };
};
var asNonEmptyString2 = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
};
var extractJsonObject2 = (raw) => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\{[\s\S]*\}/);
  return fenced ? fenced[0] : null;
};
var asStringList = (value) => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.map((item) => asNonEmptyString2(item)).filter((item) => item !== null);
};
var isHalfStepScore = (value) => Number.isFinite(value) && value >= 1 && value <= 5 && Math.abs(value * 2 - Math.round(value * 2)) < 1e-9;
var parseCoachScoreOutput = (raw) => {
  const json = extractJsonObject2(raw);
  if (json === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(json);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed;
    const covered = asStringList(record.covered);
    const missed = asStringList(record.missed);
    const comment = asNonEmptyString2(record.comment);
    if (covered === null || missed === null || comment === null || !Array.isArray(record.scores)) {
      return null;
    }
    const byDimension = /* @__PURE__ */ new Map();
    for (const item of record.scores) {
      if (item === null || typeof item !== "object") {
        return null;
      }
      const row = item;
      const dimension = asNonEmptyString2(row.dimension);
      if (dimension === null || !isHalfStepScore(Number(row.score))) {
        return null;
      }
      const reason = typeof row.reason === "string" ? row.reason.trim() : void 0;
      byDimension.set(dimension, {
        dimension,
        score: Number(row.score),
        ...reason ? { reason } : {}
      });
    }
    const scores = BAGUA_SCORE_DIMENSIONS.map((dimension) => byDimension.get(dimension));
    if (scores.some((item) => item === void 0)) {
      return null;
    }
    const coverage = isAnswerCoverage(record.coverage) ? record.coverage : null;
    return {
      comparison: { covered, missed, comment },
      scores,
      coverage
    };
  } catch {
    return null;
  }
};
var applyScoreToCard = (card, parsed, answer) => {
  const prior = answerTurnsOf(card);
  const turns = answer.length > 0 && !prior.includes(answer) ? [...prior, answer] : prior;
  const guideCount = card.guideCount ?? 0;
  const guiding = parsed.coverage !== null && coverageGuides(parsed.coverage) && guideCount < 2;
  return {
    ...card,
    answer: turns.length > 0 ? joinAnswerTurns(turns) : answer,
    answerTurns: turns,
    guideCount: guiding ? guideCount + 1 : guideCount,
    coverage: parsed.coverage,
    comparison: parsed.comparison,
    scores: parsed.scores,
    status: "scored"
  };
};
var applyCoverageToCard = (card, coverage, answer) => {
  const prior = answerTurnsOf(card);
  const turns = answer.length > 0 && !prior.includes(answer) ? [...prior, answer] : prior;
  const guideCount = card.guideCount ?? 0;
  const guiding = coverageGuides(coverage) && guideCount < 2;
  return {
    ...card,
    answer: turns.length > 0 ? joinAnswerTurns(turns) : answer,
    answerTurns: turns,
    guideCount: guiding ? guideCount + 1 : guideCount,
    coverage,
    status: "scored"
  };
};
var applyProseToCard = (card, parsed) => ({
  ...card,
  comparison: parsed.comparison,
  scores: parsed.scores,
  status: "scored"
});

// backend/src/services/coverage-port.ts
var REASK_CAP = 3;
var topicRootId = (cardId) => {
  const dot = cardId.indexOf(".");
  return dot === -1 ? cardId : cardId.slice(0, dot);
};
var countReasksOnThread = (cards, currentId) => {
  const root = topicRootId(currentId);
  return cards.filter(
    (card) => card.id !== currentId && topicRootId(card.id) === root && card.coverage === "reask"
  ).length;
};
var applyReaskCap = (coverage, reaskCount) => reaskCount >= REASK_CAP ? "next" : coverage;
var threadCardsOf = (deck, currentId) => {
  const root = topicRootId(currentId);
  return deck.cards.filter((card) => topicRootId(card.id) === root).map((card) => ({
    id: card.id,
    relation: card.id.includes(".") ? "\u8FFD\u95EE" : "\u6B63\u5F0F\u95EE",
    questionText: card.questionText,
    questionBrief: card.questionBrief,
    keyPoints: card.keyPoints,
    answerTurns: answerTurnsOf(card),
    coverage: card.id === currentId ? "\u5F85\u5224\u65AD" : isAnswerCoverage(card.coverage) ? card.coverage : "\u5F85\u5224\u65AD",
    ...card.layer !== void 0 ? { layer: EXAM_LAYER_LABELS[card.layer] } : {},
    ...card.intent !== void 0 ? { intent: card.intent } : {}
  }));
};
var buildCoverageSettleInput = (deck, current, topic, difficulty, extraAnswer) => {
  const thread = threadCardsOf(deck, current.id).map((card) => {
    if (card.id !== current.id) {
      return card;
    }
    const turns = extraAnswer !== void 0 && extraAnswer.length > 0 && !card.answerTurns.includes(extraAnswer) ? [...card.answerTurns, extraAnswer] : card.answerTurns;
    return { ...card, answerTurns: turns, coverage: "\u5F85\u5224\u65AD" };
  });
  return {
    sessionId: deck.sessionId,
    topic,
    difficulty,
    currentCardId: current.id,
    reaskCount: countReasksOnThread(deck.cards, current.id),
    thread
  };
};
var jevStateFromInput = (input) => ({
  \u4E3B\u9898: input.topic,
  \u96BE\u5EA6: DIFFICULTY_LABELS[input.difficulty],
  \u5F53\u524D\u5361: input.currentCardId,
  \u540C\u4E00\u77E5\u8BC6\u70B9\u5DF2reask\u6B21\u6570: input.reaskCount,
  \u786C\u6027\u4E0A\u9650: REASK_CAP,
  \u786C\u6027\u89C4\u5219: input.reaskCount >= REASK_CAP ? "\u5DF2\u6EE1 3 \u6B21 reask\uFF0C\u5FC5\u987B\u6362\u65B9\u5411\uFF0C\u53EA\u80FD\u9009 next\u3002" : `\u8FD8\u53EF\u4EE5 reask ${REASK_CAP - input.reaskCount} \u6B21\uFF0C\u672A\u6EE1\u4E0A\u9650\u65F6\u6309\u4E94\u6863\u5224\u65AD\u3002`,
  \u77E5\u8BC6\u94FE: input.thread.map((card) => ({
    \u7F16\u53F7: card.id,
    \u5173\u7CFB: card.relation,
    ...card.layer !== void 0 ? { \u8003\u5BDF\u5C42: card.layer } : {},
    \u9762\u8BD5\u5B98\u95EE\u9898: card.questionText,
    ...card.intent !== void 0 ? { \u8003\u5BDF\u610F\u56FE: card.intent } : {},
    \u672C\u9898\u6458\u8981: card.questionBrief,
    \u6807\u51C6\u7B54\u8981\u70B9: card.keyPoints,
    \u4F5C\u7B54\u8F6E\u6B21: card.answerTurns.map((\u5185\u5BB9, index) => ({ \u8F6E\u6B21: answerTurnLabel(index), \u5185\u5BB9 })),
    \u5B9A\u6863: card.coverage
  }))
});

// backend/src/services/watch-coach-turn.ts
var WATCH_COACH_TURN_TIMEOUT_MS = 2e4;
var followUpFailed = (deck) => ({
  ok: false,
  code: "follow_up_failed",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
  ...deck ? { deck } : {}
});
var coverageUnavailable = (deck) => ({
  ok: false,
  code: "coverage_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coverage_unavailable,
  ...deck ? { deck } : {}
});
var chainUnavailable2 = (deck) => ({
  ok: false,
  code: "chain_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.chain_unavailable,
  ...deck ? { deck } : {}
});
var injectUnavailable = (deck) => ({
  ok: false,
  code: "inject_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable,
  ...deck ? { deck } : {}
});
var coachUnavailable2 = (deck) => ({
  ok: false,
  code: "coach_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.coach_unavailable,
  ...deck ? { deck } : {}
});
var lastPending = (deck) => [...deck.cards].reverse().find((card) => card.status === "pending");
var pendingToScore = (deck, humanText) => [...deck.cards].reverse().find((card) => card.status === "pending" && humanText.length > 0 && humanText !== card.seedUserText);
var guideToScore = (deck, humanText) => [...deck.cards].reverse().find((card) => {
  if (card.status !== "scored" || !coverageGuides(card.coverage) || (card.guideCount ?? 0) >= 2) {
    return false;
  }
  return humanText.length > 0 && humanText !== card.seedUserText && !answerTurnsOf(card).includes(humanText);
});
var cardToScore = (deck, humanText) => pendingToScore(deck, humanText) ?? guideToScore(deck, humanText);
var stillGuiding = (deck) => {
  const latest = deck.cards[deck.cards.length - 1];
  return latest !== void 0 && coverageGuides(latest.coverage) && (latest.guideCount ?? 0) < 2;
};
var relationForOpenedCard = (coverage, matchedMove) => {
  if (coverage === "next") {
    return "next_topic";
  }
  if (coverage === "deepen" || coverage === "reask") {
    return "followup";
  }
  return matchedMove === "switch" ? "next_topic" : "followup";
};
var replaceCard = (deck, next, currentCardId = deck.currentCardId) => ({
  ...deck,
  currentCardId,
  cards: deck.cards.map((card) => card.id === next.id ? next : card)
});
var appendCard = (deck, card) => ({
  ...deck,
  currentCardId: card.id,
  cards: [...deck.cards, card]
});
var watchCoachTurnSession = async (runtime, examSessions, request, clock = {}, archive, hooks, coveragePort) => {
  const record = examSessions.load(request.sessionId);
  if (record === void 0) {
    return followUpFailed();
  }
  if (record.ended === true) {
    return { ok: true, status: "unchanged" };
  }
  const pollMs = clock.pollMs ?? 300;
  let deck = record.deck;
  let lastQuestionText = record.lastQuestionText;
  let briefError;
  let scoreError;
  let changed = false;
  let sealedGuide = false;
  let jevAccelerated = record.jevAccelerated === true;
  let openedAfterJev = false;
  let pendingProse;
  const withAccel = (value) => jevAccelerated ? { ...value, jevAccelerated: true } : value;
  const persistAndReturn = async () => {
    saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
    const persisted = await persistDeck(archive, deck);
    if (!persisted.ok) {
      if (persisted.deck) {
        deck = persisted.deck;
        saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
      }
      return withAccel(persisted);
    }
    deck = persisted.deck;
    saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
    return withAccel({ ok: true, status: "updated", deck });
  };
  const rememberDeck = () => {
    saveExamRecord(examSessions, deck, lastQuestionText, { jevAccelerated });
  };
  const applySettledCoverage = (pending, coverage, answer) => {
    const beforeGuide = pending.guideCount ?? 0;
    const next = applyCoverageToCard(pending, coverage, answer);
    deck = replaceCard(deck, next, pending.id);
    changed = true;
    if (coverageGuides(coverage) && beforeGuide < 2 && beforeGuide + 1 >= 2) {
      sealedGuide = true;
    }
    rememberDeck();
  };
  const fillPendingProse = async () => {
    if (pendingProse === void 0) {
      return;
    }
    const job = pendingProse;
    pendingProse = void 0;
    const raw = await job.completePromise;
    const card = deck.cards.find((item) => item.id === job.cardId);
    if (card === void 0) {
      return;
    }
    if (raw === null) {
      scoreError = coachUnavailable2(deck);
      return;
    }
    const parsed = parseCoachScoreOutput(raw);
    if (parsed === null) {
      scoreError = coachUnavailable2(deck);
      return;
    }
    deck = replaceCard(deck, applyProseToCard(card, parsed));
    changed = true;
  };
  const scorePendingIfAnswered = async () => {
    const human = await runtime.readLatestHuman(request.sessionId);
    if (!human.ok) {
      scoreError = human;
      return;
    }
    if (isRoundClosingText(human.text) || human.text === record.closingSeed) {
      return;
    }
    const pending = cardToScore(deck, human.text);
    if (pending === void 0) {
      return;
    }
    const turns = answerTurnsOf(pending).includes(human.text) ? answerTurnsOf(pending) : [...answerTurnsOf(pending), human.text];
    const { system, user } = assembleCoachScorePrompt({
      topic: record.topic,
      difficulty: record.difficulty,
      questionText: pending.questionText,
      questionBrief: pending.questionBrief,
      keyPoints: pending.keyPoints,
      answer: joinAnswerTurns(turns),
      ...pending.layer !== void 0 ? { layer: pending.layer } : {},
      ...pending.intent !== void 0 ? { intent: pending.intent } : {}
    });
    const completePromise = runtime.complete(system, user);
    const reaskCount = countReasksOnThread(deck.cards, pending.id);
    let decided = "unavailable";
    if (coveragePort !== void 0) {
      decided = await coveragePort.settle(
        buildCoverageSettleInput(deck, pending, record.topic, record.difficulty, human.text)
      );
    }
    if (isAnswerCoverage(decided)) {
      applySettledCoverage(pending, applyReaskCap(decided, reaskCount), human.text);
      jevAccelerated = true;
      pendingProse = { cardId: pending.id, completePromise };
      return;
    }
    const raw = await completePromise;
    if (raw === null) {
      scoreError = coachUnavailable2(deck);
      return;
    }
    const parsed = parseCoachScoreOutput(raw);
    if (parsed === null) {
      scoreError = coachUnavailable2(deck);
      return;
    }
    const beforeGuide = pending.guideCount ?? 0;
    const coverage = parsed.coverage === null ? null : applyReaskCap(parsed.coverage, reaskCount);
    deck = replaceCard(deck, applyScoreToCard(pending, { ...parsed, coverage }, human.text), pending.id);
    changed = true;
    if (coverage === null) {
      scoreError = coverageUnavailable(deck);
      return;
    }
    if (coverageGuides(coverage) && beforeGuide < 2 && beforeGuide + 1 >= 2) {
      sealedGuide = true;
    }
  };
  const briefQuestion = async (questionText) => {
    let pendingText = questionText;
    let parsed = null;
    let repairChain = false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { system, user } = assembleCoachBriefPrompt({
        topic: record.topic,
        difficulty: record.difficulty,
        questionText: pendingText,
        previousChain: hooks?.memory.recall(request.sessionId),
        repairChain
      });
      const raw = await runtime.complete(system, user);
      if (raw === null) {
        briefError = coachUnavailable2(deck);
        return null;
      }
      parsed = parseCoachBriefOutput(raw);
      if (parsed === null) {
        briefError = coachUnavailable2(deck);
        return null;
      }
      if (parsed.chain === void 0 && !repairChain) {
        repairChain = true;
        continue;
      }
      repairChain = false;
      if (attempt < 3) {
        const caught = await runtime.awaitNewQuestion(request.sessionId, pendingText, {
          timeoutMs: pollMs,
          pollMs
        });
        if (caught.ok && caught.status === "ready" && caught.text !== pendingText) {
          pendingText = caught.text;
          continue;
        }
      }
      break;
    }
    if (parsed !== null && parsed.chain === void 0) {
      parsed = {
        ...parsed,
        chain: fallbackChain({
          difficulty: record.difficulty,
          questionBrief: parsed.questionBrief,
          keyPoints: parsed.keyPoints
        })
      };
    }
    lastQuestionText = pendingText;
    return parsed;
  };
  const waitUntilExamIdle = async () => {
    if (runtime.whenIdle === void 0) {
      return;
    }
    let timer;
    try {
      await Promise.race([
        runtime.whenIdle(request.sessionId),
        new Promise((resolve) => {
          timer = setTimeout(resolve, WATCH_COACH_TURN_TIMEOUT_MS);
        })
      ]);
    } finally {
      if (timer !== void 0) {
        clearTimeout(timer);
      }
    }
  };
  const acceptChain = async (parsed, cardIds) => {
    if (parsed.chain === void 0) {
      briefError = chainUnavailable2(deck);
      hooks?.memory.forget(request.sessionId);
      hooks?.port?.clear(request.sessionId);
      return void 0;
    }
    const clipped = clipChain({
      difficulty: record.difficulty,
      chain: parsed.chain,
      cardIds
    });
    hooks?.memory.remember(request.sessionId, clipped);
    if (hooks?.port !== void 0) {
      await waitUntilExamIdle();
      const mounted = hooks.port.install(request.sessionId, clipped.sectionText);
      if (!mounted.ok) {
        briefError = injectUnavailable(deck);
      }
    }
    return clipped;
  };
  const appendNewCard = async (questionText) => {
    await waitUntilExamIdle();
    const parsed = await briefQuestion(questionText);
    if (parsed === null) {
      return false;
    }
    const previous = deck.cards[deck.cards.length - 1];
    const relation = relationForOpenedCard(previous?.coverage, parsed.chain?.matchedMove);
    const id = assignCardId(deck.cards.map((item) => item.id), {
      relation,
      previousId: previous?.id
    });
    const clipped = await acceptChain(parsed, [...deck.cards.map((item) => item.id), id]);
    const seed = await runtime.readLatestHuman(request.sessionId);
    const card = createPendingCard({
      id,
      questionText: lastQuestionText,
      questionBrief: parsed.questionBrief,
      keyPoints: parsed.keyPoints,
      seedUserText: seed.ok ? seed.text : "",
      ...clipped !== void 0 ? { layer: clipped.layer, intent: clipped.intent } : {}
    });
    deck = appendCard(deck, card);
    changed = true;
    rememberDeck();
    return true;
  };
  const openAfterJevCoverage = async (knownQuestion) => {
    const latest = deck.cards[deck.cards.length - 1];
    const canOpen = pendingProse !== void 0 && latest?.status === "scored" && lastPending(deck) === void 0 && !coverageGuides(latest.coverage) && !sealedGuide;
    if (canOpen) {
      if (knownQuestion !== void 0 && !isRoundClosingText(knownQuestion) && knownQuestion !== lastQuestionText) {
        openedAfterJev = await appendNewCard(knownQuestion) || openedAfterJev;
      } else if (knownQuestion === void 0) {
        const waited = await runtime.awaitNewQuestion(request.sessionId, lastQuestionText, {
          timeoutMs: pollMs,
          pollMs
        });
        if (waited.ok && waited.status === "ready" && !isRoundClosingText(waited.text)) {
          openedAfterJev = await appendNewCard(waited.text) || openedAfterJev;
        }
      }
    }
    await fillPendingProse();
  };
  const publishIfWaitingForNextBrief = async () => {
    if (scoreError !== void 0) {
      return void 0;
    }
    const latest = deck.cards[deck.cards.length - 1];
    if (!changed || latest?.status !== "scored" || lastPending(deck) !== void 0) {
      return void 0;
    }
    return persistAndReturn();
  };
  const holdGuideSpeech = async (questionText) => {
    lastQuestionText = questionText;
    changed = true;
    await fillPendingProse();
    return persistAndReturn();
  };
  const briefNewQuestion = async (questionText) => {
    if (isRoundClosingText(questionText)) {
      return withAccel({ ok: true, status: "unchanged" });
    }
    await scorePendingIfAnswered();
    await openAfterJevCoverage(questionText);
    if (scoreError !== void 0) {
      return void 0;
    }
    if (stillGuiding(deck) || sealedGuide) {
      return holdGuideSpeech(questionText);
    }
    const published = await publishIfWaitingForNextBrief();
    if (published !== void 0) {
      return published;
    }
    if (openedAfterJev) {
      return void 0;
    }
    await appendNewCard(questionText);
    return void 0;
  };
  await scorePendingIfAnswered();
  await openAfterJevCoverage();
  if (!openedAfterJev) {
    const scoredOnly = await publishIfWaitingForNextBrief();
    if (scoredOnly !== void 0) {
      return scoredOnly;
    }
  }
  if (!openedAfterJev) {
    if (request.force === true) {
      const latest = await runtime.readLatestQuestion(request.sessionId);
      if (!latest.ok) {
        return withAccel({ ...latest, deck });
      }
      if (isRoundClosingText(latest.text)) {
        return withAccel({ ok: true, status: "unchanged" });
      }
      const pending = lastPending(deck);
      if (pending !== void 0 && latest.text === pending.questionText) {
        const parsed = await briefQuestion(latest.text);
        if (parsed !== null) {
          const clipped = await acceptChain(
            parsed,
            deck.cards.map((item) => item.id)
          );
          deck = replaceCard(
            deck,
            {
              ...pending,
              questionBrief: parsed.questionBrief,
              keyPoints: parsed.keyPoints,
              ...clipped !== void 0 ? { layer: clipped.layer, intent: clipped.intent } : {}
            },
            pending.id
          );
          changed = true;
        }
      } else if (latest.text !== lastQuestionText) {
        const published = await briefNewQuestion(latest.text);
        if (published !== void 0) {
          return published;
        }
      }
    } else {
      const timeoutMs = clock.timeoutMs ?? WATCH_COACH_TURN_TIMEOUT_MS;
      const sliceMs = Math.min(pollMs, timeoutMs);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const remaining = deadline - Date.now();
        const waitMs = Math.min(sliceMs, remaining);
        if (waitMs <= 0) {
          break;
        }
        const started = Date.now();
        const waited = await runtime.awaitNewQuestion(request.sessionId, lastQuestionText, {
          timeoutMs: waitMs,
          pollMs: clock.pollMs
        });
        if (!waited.ok) {
          return withAccel({ ...waited, deck });
        }
        if (waited.status === "ready") {
          const published2 = await briefNewQuestion(waited.text);
          if (published2 !== void 0) {
            return published2;
          }
          break;
        }
        await scorePendingIfAnswered();
        await openAfterJevCoverage();
        if (openedAfterJev) {
          break;
        }
        const published = await publishIfWaitingForNextBrief();
        if (published !== void 0) {
          return published;
        }
        if (Date.now() - started < Math.min(50, waitMs)) {
          break;
        }
      }
    }
  }
  if (changed) {
    const persisted = await persistAndReturn();
    if (!persisted.ok) {
      return persisted;
    }
    if (scoreError !== void 0 && briefError === void 0) {
      return withAccel({ ...scoreError, deck: persisted.deck });
    }
    if (briefError !== void 0) {
      return withAccel({ ...briefError, deck: persisted.deck });
    }
    return persisted;
  }
  if (scoreError !== void 0) {
    return withAccel({ ...scoreError, deck });
  }
  if (briefError !== void 0) {
    return withAccel({ ...briefError, deck });
  }
  return withAccel({ ok: true, status: "unchanged" });
};

// backend/src/services/interview-entry.service.ts
var failure = (code) => ({
  ok: false,
  code,
  message: ENTRY_ERROR_MESSAGES[code]
});
var unavailablePersona = {
  install: () => ({
    ok: false,
    code: "inject_unavailable",
    message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable
  })
};
var unavailableCoach = {
  readLatestQuestion: async () => ({
    ok: false,
    code: "first_question_failed",
    message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed
  }),
  awaitNewQuestion: async () => ({
    ok: false,
    code: "follow_up_failed",
    message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed
  }),
  readLatestHuman: async () => ({ ok: true, text: "" }),
  complete: async () => null
};
var createInterviewEntryService = (store, persona = unavailablePersona, coach = unavailableCoach, examSessions = createExamSessionStore(), archive, extras) => {
  const chainMemory = createChainMemory();
  const hooks = {
    memory: chainMemory,
    ...persona.installChain !== void 0 && persona.clearChain !== void 0 ? {
      port: {
        install: (sessionId, text) => persona.installChain?.(sessionId, text) ?? { ok: false },
        clear: (sessionId) => {
          persona.clearChain?.(sessionId);
        }
      }
    } : {}
  };
  return {
    acceptEntryConfig(request) {
      if (!isDifficulty(request.difficulty)) {
        return failure("invalid_difficulty");
      }
      const topicId = request.topicId?.trim() ?? "";
      if (!topicId) {
        return failure("topic_required");
      }
      let config;
      if (topicId === CUSTOM_TOPIC_ID) {
        const customTopic = request.customTopic.trim();
        if (!customTopic) {
          return failure("custom_topic_empty");
        }
        config = {
          topic: customTopic,
          difficulty: request.difficulty,
          topicKind: "custom",
          topicId: CUSTOM_TOPIC_ID
        };
      } else {
        const preset = findPresetTopic(topicId);
        if (!preset) {
          return failure("topic_required");
        }
        config = {
          topic: preset.name,
          difficulty: request.difficulty,
          topicKind: "preset",
          topicId: preset.id
        };
      }
      store.save(config);
      return { ok: true, config };
    },
    getEntryConfig() {
      return { config: store.load() };
    },
    async getJevConfig(request = {}) {
      if (extras?.jevConfig === void 0) {
        return { ok: true, enabled: false, apiKeySet: false };
      }
      return extras.jevConfig.loadPublic(request.sessionId);
    },
    async saveJevConfig(request) {
      if (extras?.jevConfig === void 0) {
        return {
          ok: false,
          code: "persist_unavailable",
          message: JEV_CONFIG_ERROR_MESSAGES.persist_unavailable
        };
      }
      const current = await extras.jevConfig.loadSecret(request.sessionId);
      const planned = planJevSave(current, { enabled: request.enabled, apiKey: request.apiKey });
      if (!planned.ok) {
        return planned;
      }
      if (planned.next.enabled) {
        const reachable = extras.probeJev === void 0 ? false : await extras.probeJev(planned.next.apiKey);
        if (!reachable) {
          return {
            ok: false,
            code: "jev_unreachable",
            message: JEV_CONFIG_ERROR_MESSAGES.jev_unreachable
          };
        }
      }
      return extras.jevConfig.save(
        { enabled: planned.next.enabled, apiKey: planned.next.apiKey },
        request.sessionId
      );
    },
    attachInterviewer(request) {
      const text = assembleInterviewerPersona({
        topic: request.topic,
        difficulty: request.difficulty
      });
      return persona.install(request.sessionId, text);
    },
    briefCoach(request) {
      persona.clearRoundClose?.(request.sessionId);
      return briefCoachSession(coach, request, examSessions, archive, hooks);
    },
    watchCoachTurn(request) {
      return watchCoachTurnSession(coach, examSessions, request, {}, archive, hooks, extras?.coverage);
    },
    loadDeck(request) {
      return loadDeckSession(examSessions, request, archive);
    },
    endRound(request) {
      return endRoundSession(coach, examSessions, request, archive);
    },
    armRoundClose(request) {
      if (persona.installRoundClose === void 0) {
        return {
          ok: false,
          code: "inject_unavailable",
          message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable
        };
      }
      persona.clearChain?.(request.sessionId);
      chainMemory.forget(request.sessionId);
      return persona.installRoundClose(request.sessionId, INTERVIEW_ROUND_CLOSING_PROMPT);
    },
    clearRoundClose(request) {
      persona.clearRoundClose?.(request.sessionId);
      return { ok: true };
    },
    async getExamRoundState(request) {
      const record = examSessions.load(request.sessionId);
      if (record?.ended === true) {
        return { ok: true, status: "ended" };
      }
      if (record !== void 0) {
        return { ok: true, status: "in_progress" };
      }
      const index = await archive?.readRoundIndex?.(request.sessionId);
      if (index !== void 0) {
        return { ok: true, status: index.status };
      }
      const disk = await archive?.readDeck(request.sessionId);
      if (disk !== void 0) {
        return { ok: true, status: "in_progress" };
      }
      return { ok: true, status: "none" };
    }
  };
};

// backend/src/entrypoints/interview-entry.ts
var createInterviewEntryPort = (store = createEntryConfigStore(), persona = {
  install: () => ({
    ok: false,
    code: "inject_unavailable",
    message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable
  })
}, coach, examSessions, archive, extras) => createInterviewEntryService(store, persona, coach, examSessions, archive, extras);

// backend/src/infra/dsh/interviewer-persona.ts
var INTERVIEWER_PERSONA_SECTION = "deployment:persona";
var INTERVIEWER_PERSONA_ORDER = 0;
var ROUND_CLOSE_SECTION = "deployment:round-close";
var ROUND_CLOSE_ORDER = 1;
var INTERVIEW_CHAIN_SECTION = "interview:chain";
var INTERVIEW_CHAIN_ORDER = 2;
var roundCloseDisposers = /* @__PURE__ */ new Map();
var chainDisposers = /* @__PURE__ */ new Map();
var asPersonaAgent = (value) => {
  if (value === null || typeof value !== "object" || !("ctx" in value)) {
    return void 0;
  }
  return value;
};
var unavailable = () => ({
  ok: false,
  code: "inject_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable
});
var attachInterviewerPersona = (ctx, request) => {
  const systemPrompt = asPersonaAgent(ctx.agents?.get(request.sessionId))?.ctx.systemPrompt;
  if (typeof systemPrompt?.section !== "function") {
    return unavailable();
  }
  try {
    systemPrompt.section({
      name: INTERVIEWER_PERSONA_SECTION,
      order: INTERVIEWER_PERSONA_ORDER,
      text: request.text
    });
  } catch {
    return unavailable();
  }
  return { ok: true };
};
var installRoundClosingSection = (ctx, request) => {
  const systemPrompt = asPersonaAgent(ctx.agents?.get(request.sessionId))?.ctx.systemPrompt;
  if (typeof systemPrompt?.section !== "function") {
    return unavailable();
  }
  roundCloseDisposers.get(request.sessionId)?.();
  roundCloseDisposers.delete(request.sessionId);
  try {
    const dispose = systemPrompt.section({
      name: ROUND_CLOSE_SECTION,
      order: ROUND_CLOSE_ORDER,
      text: request.text
    });
    if (typeof dispose === "function") {
      roundCloseDisposers.set(request.sessionId, () => {
        dispose();
      });
    }
  } catch {
    return unavailable();
  }
  return { ok: true };
};
var clearRoundClosingSection = (sessionId) => {
  roundCloseDisposers.get(sessionId)?.();
  roundCloseDisposers.delete(sessionId);
};
var clearChainSection = (sessionId) => {
  chainDisposers.get(sessionId)?.();
  chainDisposers.delete(sessionId);
};
var installChainSection = (ctx, request) => {
  const systemPrompt = asPersonaAgent(ctx.agents?.get(request.sessionId))?.ctx.systemPrompt;
  if (typeof systemPrompt?.section !== "function") {
    return unavailable();
  }
  chainDisposers.get(request.sessionId)?.();
  chainDisposers.delete(request.sessionId);
  try {
    const dispose = systemPrompt.section({
      name: INTERVIEW_CHAIN_SECTION,
      order: INTERVIEW_CHAIN_ORDER,
      text: request.text
    });
    if (typeof dispose === "function") {
      chainDisposers.set(request.sessionId, () => {
        dispose();
      });
    }
  } catch {
    return unavailable();
  }
  return { ok: true };
};

// backend/src/services/human-answer.ts
var sourceKind = (item) => {
  if (item === null || typeof item !== "object") {
    return void 0;
  }
  const record = item;
  return record.source?.kind ?? record.data?.source?.kind ?? record.data?.message?.source?.kind;
};
var isHumanUserItem = (item) => {
  if (item === null || typeof item !== "object") {
    return false;
  }
  const kind = sourceKind(item);
  if (kind === "tool" || kind === "plugin") {
    return false;
  }
  const record = item;
  return record.role === "user" || record.type === "user/message";
};
var visibleTextFromContent = (content) => {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content.map((block) => {
    if (block === null || typeof block !== "object") {
      return "";
    }
    const record = block;
    if (record.type === "reasoning") {
      return "";
    }
    if (typeof record.text === "string") {
      return record.text;
    }
    return "";
  }).join("").trim();
};
var humanMessageText = (item) => {
  if (!isHumanUserItem(item)) {
    return "";
  }
  const record = item;
  const data = record.data ?? {};
  const message = data.message;
  return visibleTextFromContent(record.content ?? data.content ?? message?.content);
};
var latestHumanText = (items) => {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const text = humanMessageText(items[index]);
    if (text.length > 0) {
      return text;
    }
  }
  return "";
};

// backend/src/infra/dsh/coach.ts
var PLUGIN_ID = "interview-dsh";
var FIRST_QUESTION_TIMEOUT_MS = 9e4;
var FIRST_QUESTION_POLL_MS = 300;
var WATCH_TIMEOUT_MS = 2e4;
var WATCH_POLL_MS = 300;
var firstQuestionFailed = () => ({
  ok: false,
  code: "first_question_failed",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.first_question_failed
});
var followUpFailed2 = () => ({
  ok: false,
  code: "follow_up_failed",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed
});
var injectUnavailable2 = () => ({
  ok: false,
  code: "inject_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable
});
var sourceKind2 = (item) => {
  if (item === null || typeof item !== "object") {
    return void 0;
  }
  const record = item;
  return record.source?.kind ?? record.data?.source?.kind ?? record.data?.message?.source?.kind;
};
var assistantMessageText = (item) => {
  if (item === null || typeof item !== "object" || sourceKind2(item) === "plugin") {
    return "";
  }
  const record = item;
  if (record.role === "assistant") {
    return visibleTextFromContent(record.content);
  }
  if (record.type !== "assistant/message") {
    return "";
  }
  const data = record.data ?? {};
  const message = data.message;
  return visibleTextFromContent(message?.content ?? data.content);
};
var chunkDelta = (item) => {
  if (item === null || typeof item !== "object") {
    return "";
  }
  const record = item;
  if (record.type !== "assistant/chunk") {
    return "";
  }
  const chunk = record.data?.chunk;
  if (chunk?.type !== "text-delta" || typeof chunk.text !== "string") {
    return "";
  }
  return chunk.text;
};
var currentQuestionText = (items) => {
  let lastHuman = -1;
  for (let index = 0; index < items.length; index += 1) {
    if (isHumanUserItem(items[index])) {
      lastHuman = index;
    }
  }
  let committed = "";
  let streamed = "";
  for (let index = lastHuman + 1; index < items.length; index += 1) {
    const item = items[index];
    const messageText = assistantMessageText(item);
    if (messageText.length > 0) {
      committed = messageText;
      streamed = "";
      continue;
    }
    streamed += chunkDelta(item);
  }
  const raw = committed.length > 0 ? committed : streamed.trim();
  return extractPendingQuestion(raw);
};
var sleep = (ms, signal) => new Promise((resolve) => {
  if (signal?.aborted) {
    resolve();
    return;
  }
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener(
    "abort",
    () => {
      clearTimeout(timer);
      resolve();
    },
    { once: true }
  );
});
var readCurrentQuestion = (session) => {
  const sources = [];
  if (Array.isArray(session.events) && session.events.length > 0) {
    sources.push(session.events);
  }
  if (typeof session.snapshotEvents === "function") {
    sources.push(session.snapshotEvents());
  }
  if (typeof session.deriveMessages === "function") {
    sources.push(session.deriveMessages());
  }
  for (const items of sources) {
    const text = currentQuestionText(items);
    if (text.length > 0) {
      return text;
    }
  }
  return "";
};
var readCurrentHuman = (session) => {
  const sources = [];
  if (Array.isArray(session.events) && session.events.length > 0) {
    sources.push(session.events);
  }
  if (typeof session.snapshotEvents === "function") {
    sources.push(session.snapshotEvents());
  }
  if (typeof session.deriveMessages === "function") {
    sources.push(session.deriveMessages());
  }
  for (const items of sources) {
    const text = latestHumanText(items);
    if (text.length > 0) {
      return text;
    }
  }
  return "";
};
var hasQuestionLogReader = (session) => typeof session.snapshotEvents === "function" || typeof session.deriveMessages === "function" || Array.isArray(session.events);
var asCoachAgent = (value) => {
  if (value === null || typeof value !== "object") {
    return void 0;
  }
  const agent = value;
  if (typeof agent.whenIdle !== "function" || agent.session === void 0) {
    return void 0;
  }
  return agent;
};
var createHostCoachRuntime = (ctx, options = {}) => ({
  async readLatestQuestion(sessionId) {
    const agent = asCoachAgent(ctx.agents?.get(sessionId));
    if (agent === void 0) {
      return injectUnavailable2();
    }
    if (!hasQuestionLogReader(agent.session)) {
      return firstQuestionFailed();
    }
    try {
      const deadline = Date.now() + FIRST_QUESTION_TIMEOUT_MS;
      const idle = agent.whenIdle().then(
        () => void 0,
        () => void 0
      );
      let idleDone = false;
      void idle.then(() => {
        idleDone = true;
      });
      while (Date.now() < deadline) {
        const text2 = readCurrentQuestion(agent.session);
        if (text2.length > 0 && idleDone) {
          return { ok: true, text: text2 };
        }
        const wait = Math.min(FIRST_QUESTION_POLL_MS, deadline - Date.now());
        if (wait <= 0) {
          break;
        }
        const pollAbort = new AbortController();
        await Promise.race([idle, sleep(wait, pollAbort.signal)]);
        pollAbort.abort();
      }
      const text = readCurrentQuestion(agent.session);
      if (text.length > 0) {
        return { ok: true, text };
      }
      return firstQuestionFailed();
    } catch {
      return firstQuestionFailed();
    }
  },
  async readLatestHuman(sessionId) {
    const agent = asCoachAgent(ctx.agents?.get(sessionId));
    if (agent === void 0) {
      return injectUnavailable2();
    }
    if (!hasQuestionLogReader(agent.session)) {
      return { ok: true, text: "" };
    }
    try {
      return { ok: true, text: readCurrentHuman(agent.session) };
    } catch {
      return firstQuestionFailed();
    }
  },
  async awaitNewQuestion(sessionId, baselineText, watchOptions) {
    const timeoutMs = watchOptions?.timeoutMs ?? options.timeoutMs ?? WATCH_TIMEOUT_MS;
    const pollMs = watchOptions?.pollMs ?? options.pollMs ?? WATCH_POLL_MS;
    const agent = asCoachAgent(ctx.agents?.get(sessionId));
    if (agent === void 0) {
      return injectUnavailable2();
    }
    if (!hasQuestionLogReader(agent.session)) {
      return followUpFailed2();
    }
    try {
      const deadline = Date.now() + timeoutMs;
      let stableText;
      let first = true;
      while (first || Date.now() < deadline) {
        first = false;
        const live = asCoachAgent(ctx.agents?.get(sessionId));
        if (live === void 0) {
          return injectUnavailable2();
        }
        if (!hasQuestionLogReader(live.session)) {
          return followUpFailed2();
        }
        const text = readCurrentQuestion(live.session);
        const hasStatus = live.status !== void 0;
        if (text.length > 0 && text !== baselineText) {
          const remaining = Math.max(0, deadline - Date.now());
          const idleWait = new AbortController();
          await Promise.race([
            live.whenIdle().then(
              () => void 0,
              () => void 0
            ),
            remaining > 0 ? sleep(remaining, idleWait.signal) : Promise.resolve()
          ]);
          idleWait.abort();
          const after = asCoachAgent(ctx.agents?.get(sessionId));
          if (after === void 0) {
            return injectUnavailable2();
          }
          if (!hasQuestionLogReader(after.session)) {
            return followUpFailed2();
          }
          const finalText = readCurrentQuestion(after.session);
          if (finalText.length > 0 && finalText !== baselineText) {
            if (after.status === "running") {
              stableText = void 0;
            } else if (!hasStatus) {
              if (stableText === finalText) {
                return { ok: true, status: "ready", text: finalText };
              }
              stableText = finalText;
            } else {
              return { ok: true, status: "ready", text: finalText };
            }
          }
        } else {
          stableText = void 0;
        }
        if (Date.now() >= deadline) {
          break;
        }
        const wait = Math.min(pollMs, deadline - Date.now());
        if (wait <= 0) {
          break;
        }
        await sleep(wait);
      }
      return { ok: true, status: "unchanged" };
    } catch {
      return followUpFailed2();
    }
  },
  async complete(system, user) {
    const llm = ctx.llm;
    const selection = ctx.agentDefaultModel?.currentSelection();
    if (typeof llm?.stream !== "function" || !selection?.provider || !selection.model) {
      return null;
    }
    const messages = [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: [{ type: "text", text: user }],
        source: { kind: "plugin", plugin: PLUGIN_ID }
      }
    ];
    let text = "";
    let failed = false;
    try {
      for await (const chunk of llm.stream({
        provider: selection.provider,
        model: selection.model,
        system,
        messages
      })) {
        if (chunk.type === "text-delta" && typeof chunk.text === "string") {
          text += chunk.text;
        }
        if (chunk.type === "finish" && (chunk.reason?.kind === "error" || chunk.reason?.kind === "aborted")) {
          failed = true;
        }
      }
    } catch {
      return null;
    }
    const trimmed = text.trim();
    if (failed || trimmed.length === 0) {
      return null;
    }
    return trimmed;
  },
  async whenIdle(sessionId) {
    const agent = asCoachAgent(ctx.agents?.get(sessionId));
    if (agent === void 0) {
      return;
    }
    try {
      await agent.whenIdle();
    } catch {
      return;
    }
  }
});

// backend/src/infra/dsh/jev-coverage.ts
var JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
var JEV_MODEL = "jev-1.13.0";
var JEV_TIMEOUT_MS = 2e3;
var JEV_PROBE_TIMEOUT_MS = 5e3;
var CRITERIA = {
  miss: "\u4F5C\u7B54\u4E0E\u8003\u5BDF\u610F\u56FE\u6CA1\u6709\u6709\u6548\u4EA4\u96C6\uFF1A\u7A7A\u767D\u3001\u53EA\u4F1A\u3001\u6216\u6574\u6BB5\u7B54\u6210\u522B\u7684\u77E5\u8BC6\u70B9\u3002\u53EA\u8981\u51FA\u73B0\u4E86\u672C\u9898\u6B63\u786E\u6982\u5FF5\u7684\u540D\u79F0\uFF0C\u5373\u4F7F\u540E\u534A\u53E5\u8BF4\u4E0D\u77E5\u9053\uFF0C\u4E5F\u4E0D\u662F miss\u3002",
  wide_gap: "\u5DF2\u7ECF\u78B0\u5230\u672C\u9898\u6982\u5FF5\uFF0C\u4F46\u6838\u5FC3\u673A\u5236\u51E0\u4E4E\u6CA1\u8BB2\u6E05\uFF0C\u8FD8\u6CA1\u6709\u4E00\u4E2A\u8BB2\u5BF9\u7684\u70B9\u53EF\u4EE5\u8FFD\u6DF1\uFF0C\u4E0B\u4E00\u6B65\u5E94\u7559\u5728\u539F\u9898\u5F15\u5BFC\u3002\u4E0D\u8981\u56E0\u4E3A\u63D0\u5230\u6B63\u786E\u540D\u8BCD\u5C31\u9009 miss\uFF0C\u4E5F\u4E0D\u8981\u5F00\u5B50\u95EE\u3002",
  deepen: "\u5DF2\u7ECF\u628A\u5F53\u524D\u610F\u56FE\u91CC\u7684\u4E00\u4E2A\u70B9\u8BB2\u5BF9\uFF0C\u4F46\u53EA\u505C\u5728\u73B0\u8C61\u6216\u7ED3\u8BBA\uFF0C\u8FD8\u6CA1\u8BB2\u6E05\u673A\u5236\u6216\u5BF9\u6BD4\uFF0C\u4E0B\u4E00\u6B65\u5E94\u5C31\u8FD9\u4E00\u70B9\u5F80\u4E0B\u6316\u3002\u4E0D\u8981\u628A\u300C\u8BB2\u5F97\u4E0D\u591F\u6DF1\u300D\u5F53\u6210\u53E6\u4E00\u4E2A\u5E76\u5217\u5927\u65B9\u9762\u3002",
  reask: "\u5019\u9009\u4EBA\u5DF2\u7ECF\u8BB2\u6E05\u4E86\u610F\u56FE\u4E2D\u7684\u4E00\u5757\uFF0C\u5E76\u4E14\u81EA\u5DF1\u70B9\u51FA\u4E86\u53E6\u4E00\u5757\u8FD8\u6CA1\u8BB2\uFF0C\u6216\u610F\u56FE\u91CC\u672C\u6765\u5C31\u6709\u4E24\u4E2A\u5E76\u5217\u5927\u65B9\u9762\u53EA\u7B54\u4E86\u5176\u4E2D\u4E00\u5757\u3002\u8FD9\u662F\u628A\u540C\u4E00\u9898\u62C6\u5F00\uFF0C\u4E0D\u662F\u628A\u540C\u4E00\u70B9\u95EE\u6DF1\u3002",
  next: "\u5C31\u5F53\u524D\u8003\u5BDF\u610F\u56FE\u800C\u8A00\uFF0C\u6838\u5FC3\u673A\u5236\u5DF2\u7ECF\u8BB2\u6E05\uFF0C\u53EF\u4EE5\u6362\u77E5\u8BC6\u70B9\u3002\u8FD8\u80FD\u5C55\u5F00\u5DE5\u7A0B\u7EC6\u8282\u4E0D\u7B97\u6CA1\u8BB2\u6E05\u3002\u628A\u540C\u4E00\u9898\u62C6\u5F00\u518D\u95EE\u4E0D\u662F next\u3002"
};
var INSTRUCTIONS = [
  "\u53EA\u5224\u65AD\u77E5\u8BC6\u94FE\u91CC\u300C\u5B9A\u6863=\u5F85\u5224\u65AD\u300D\u7684\u90A3\u4E00\u5F20\u5F53\u524D\u5361\uFF0C\u4E0D\u662F\u6574\u573A\u9762\u8BD5\u6253\u5206\u3002\u4E94\u6863\u4E92\u65A5\uFF0C\u53EA\u9009\u4E00\u4E2A\u3002",
  "\u77E5\u8BC6\u94FE\u4ECE\u6B63\u5F0F\u95EE Qn \u5230\u5F53\u524D\u5B50\u95EE Qn.m \u5168\u90E8\u7ED9\u51FA\uFF1A\u6BCF\u5F20\u5361\u7684\u9762\u8BD5\u5B98\u95EE\u9898\u3001\u8003\u5BDF\u610F\u56FE\u3001\u8981\u70B9\u3001\u5404\u8F6E\u4F5C\u7B54 a1/a2\u3001\u5DF2\u5B9A\u6863\u90FD\u8981\u8BFB\u3002",
  "\u786C\u6027\u89C4\u5219\uFF1A\u7EDF\u8BA1\u77E5\u8BC6\u94FE\u91CC\u5DF2\u7ECF\u5B9A\u6863\u4E3A reask \u7684\u6B21\u6570\u3002\u540C\u4E00\u77E5\u8BC6\u70B9\u6700\u591A 3 \u6B21 reask\uFF1B\u5DF2\u8FBE\u5230 3 \u6B21\u5219\u5FC5\u987B\u9009 next\uFF0C\u6362\u65B9\u5411\uFF0C\u4E0D\u5F97\u518D reask\u3001deepen\uFF0C\u4E5F\u4E0D\u5F97\u518D\u7559\u5728\u672C\u9898\u5F15\u5BFC\u3002",
  "\u672A\u6EE1 3 \u6B21\u65F6\u6309\u666E\u901A\u4E94\u6863\u5224\u65AD\u3002\u524D\u9762\u5361\u7247\u5DF2\u7ECF\u8BB2\u6E05\u7684\u5185\u5BB9\u4E0D\u8981\u518D\u5F53\u6210\u5F53\u524D\u5361\u7684\u7F3A\u53E3\u3002",
  "\u610F\u601D\u76F8\u8FD1\u7B97\u78B0\u5230\u3002\u53EA\u70B9\u5230\u6B63\u786E\u6982\u5FF5\u540D\u79F0\u3001\u6838\u5FC3\u673A\u5236\u6CA1\u8BB2\u6E05 \u2192 wide_gap\u3002\u5F53\u524D\u5361\u8FD8\u5269\u5E76\u5217\u5927\u65B9\u9762 \u2192 reask\u3002"
].join(" ");
var probeJevKey = async (apiKey, deps = {}) => {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const runFetch = deps.fetch ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, deps.timeoutMs ?? JEV_PROBE_TIMEOUT_MS);
  try {
    const response = await runFetch(JEV_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${trimmed}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: { probe: "connectivity" },
        questions: {
          coverage: {
            type: "choice",
            instructions: "connectivity probe only",
            criteria: CRITERIA
          }
        }
      })
    });
    return response.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
var readChoice = (body) => {
  if (body === null || typeof body !== "object") {
    return void 0;
  }
  const answers = body.answers;
  const choice = answers?.coverage?.choice;
  return isAnswerCoverage(choice) ? choice : void 0;
};
var createJevCoveragePort = (store, deps = {}) => {
  const runFetch = deps.fetch ?? globalThis.fetch;
  return {
    async settle(input, signal) {
      if (signal?.aborted) {
        return "unavailable";
      }
      const secret = await store.loadSecret(input.sessionId);
      if (!isJevConnected(secret)) {
        return "unavailable";
      }
      const controller = new AbortController();
      const onAbort = () => {
        controller.abort();
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      const timer = setTimeout(() => {
        controller.abort();
      }, JEV_TIMEOUT_MS);
      try {
        const response = await runFetch(JEV_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${secret.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: JEV_MODEL,
            state: jevStateFromInput(input),
            questions: {
              coverage: {
                type: "choice",
                instructions: INSTRUCTIONS,
                criteria: CRITERIA
              }
            }
          })
        });
        if (signal?.aborted || controller.signal.aborted) {
          return "unavailable";
        }
        if (!response.ok) {
          return "unavailable";
        }
        const body = await response.json();
        if (signal?.aborted || controller.signal.aborted) {
          return "unavailable";
        }
        return readChoice(body) ?? "unavailable";
      } catch {
        return "unavailable";
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    }
  };
};

// backend/src/infra/dsh/jev-config-fs.ts
var resolveTarget = async (fs, cwd, rel) => {
  if (typeof fs.resolve === "function") {
    return await fs.resolve(rel, { cwd });
  }
  return `${cwd.replace(/[/\\]+$/, "")}/${rel.replace(/^[/\\]+/, "")}`;
};
var workspaceWritePolicy = (cwd) => ({
  mode: "workspace-write",
  workspaceRoot: cwd,
  sessionId: "jev-config"
});
var readRel = async (fs, cwd) => {
  if (typeof fs.readText !== "function") {
    return void 0;
  }
  try {
    const target = await resolveTarget(fs, cwd, JEV_CONFIG_REL);
    return await fs.readText(target);
  } catch {
    return void 0;
  }
};
var writeRel = async (fs, cwd, text) => {
  const target = await resolveTarget(fs, cwd, JEV_CONFIG_REL);
  await fs.writeText(target, text, void 0, void 0, workspaceWritePolicy(cwd));
};
var createFsJevConfigStore = (fs, workspace) => {
  const cwdOf = (sessionId) => {
    if (sessionId === void 0 || sessionId.length === 0) {
      return void 0;
    }
    return workspace.cwdFor(sessionId);
  };
  const readSecret = async (sessionId) => {
    if (fs === void 0) {
      return { ok: false };
    }
    const cwd = cwdOf(sessionId);
    if (cwd === void 0 || cwd.length === 0) {
      return { ok: false };
    }
    return { ok: true, secret: parseJevFile(await readRel(fs, cwd)), cwd };
  };
  return {
    async loadPublic(sessionId) {
      const loaded = await readSecret(sessionId);
      if (!loaded.ok) {
        return {
          ok: false,
          code: "persist_unavailable",
          message: JEV_CONFIG_ERROR_MESSAGES.persist_unavailable
        };
      }
      const publicConfig = toPublicJevConfig(loaded.secret);
      return { ok: true, enabled: publicConfig.enabled, apiKeySet: publicConfig.apiKeySet };
    },
    async loadSecret(sessionId) {
      const loaded = await readSecret(sessionId);
      if (!loaded.ok) {
        return emptyJevSecret();
      }
      return loaded.secret;
    },
    async save(input, sessionId) {
      if (fs === void 0) {
        return persistUnavailable();
      }
      const cwd = cwdOf(sessionId);
      if (cwd === void 0 || cwd.length === 0) {
        return persistUnavailable();
      }
      const current = parseJevFile(await readRel(fs, cwd));
      const planned = planJevSave(current, input);
      if (!planned.ok) {
        return planned;
      }
      try {
        await writeRel(fs, cwd, `${JSON.stringify(planned.next, null, 2)}
`);
      } catch {
        return persistUnavailable();
      }
      const publicConfig = toPublicJevConfig(planned.next);
      return { ok: true, enabled: publicConfig.enabled, apiKeySet: publicConfig.apiKeySet };
    }
  };
};

// backend/src/infra/dsh/workspace-fs.ts
var resolveTarget2 = async (fs, cwd, rel) => {
  if (typeof fs.resolve === "function") {
    return await fs.resolve(rel, { cwd });
  }
  return joinWorkspacePath(cwd, rel);
};
var workspaceWritePolicy2 = (cwd, sessionId) => ({
  mode: "workspace-write",
  workspaceRoot: cwd,
  sessionId
});
var writeRel2 = async (fs, cwd, sessionId, rel, text) => {
  const target = await resolveTarget2(fs, cwd, rel);
  await fs.writeText(target, text, void 0, void 0, workspaceWritePolicy2(cwd, sessionId));
};
var readRel2 = async (fs, cwd, rel) => {
  if (typeof fs.readText !== "function") {
    return void 0;
  }
  try {
    return await fs.readText(await resolveTarget2(fs, cwd, rel));
  } catch {
    return void 0;
  }
};
var parseIndex = (raw) => {
  if (raw === void 0) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return void 0;
    }
    const record = parsed;
    if (record.status !== "in_progress" && record.status !== "ended") {
      return void 0;
    }
    if (typeof record.currentRound !== "number" || !Number.isInteger(record.currentRound) || record.currentRound < 1) {
      return void 0;
    }
    if (typeof record.currentRoundDir !== "string" || !record.currentRoundDir.includes("/round-")) {
      return void 0;
    }
    return {
      status: record.status,
      currentRound: record.currentRound,
      currentRoundDir: record.currentRoundDir,
      ...typeof record.closingSeed === "string" ? { closingSeed: record.closingSeed } : {}
    };
  } catch {
    return void 0;
  }
};
var parseDeck = (raw) => {
  if (raw === void 0) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return void 0;
    }
    return parsed;
  } catch {
    return void 0;
  }
};
var writeAll = async (fs, deck, cwd) => {
  const archiveDir = deck.archiveDir;
  await writeRel2(fs, cwd, deck.sessionId, `${archiveDir}/session.json`, `${JSON.stringify(deck, null, 2)}
`);
  for (const card of deck.cards) {
    await writeRel2(fs, cwd, deck.sessionId, `${archiveDir}/cards/${card.id}.md`, renderCardMarkdown(deck, card.id));
  }
};
var createFsWorkspaceArchive = (fs, workspace) => {
  const readIndex = async (sessionId) => {
    if (fs === void 0) {
      return void 0;
    }
    const cwd = workspace.cwdFor(sessionId);
    const root = sessionArchiveRoot(sessionId);
    if (cwd === void 0 || root === void 0) {
      return void 0;
    }
    return parseIndex(await readRel2(fs, cwd, `${root}/index.json`));
  };
  const writeIndex = async (sessionId, index) => {
    if (fs === void 0) {
      return persistUnavailable();
    }
    const cwd = workspace.cwdFor(sessionId);
    const root = sessionArchiveRoot(sessionId);
    if (cwd === void 0 || cwd.length === 0 || root === void 0) {
      return persistUnavailable();
    }
    try {
      await writeRel2(fs, cwd, sessionId, `${root}/index.json`, `${JSON.stringify(index, null, 2)}
`);
    } catch {
      return persistUnavailable();
    }
    return { ok: true, archiveDir: index.currentRoundDir };
  };
  const beginRound = async (sessionId, topic, options = {}) => {
    if (fs === void 0) {
      return persistUnavailable();
    }
    const cwd = workspace.cwdFor(sessionId);
    if (cwd === void 0 || cwd.length === 0) {
      return persistUnavailable();
    }
    const index = await readIndex(sessionId);
    let round;
    if (options.forceNext === true) {
      round = (index?.currentRound ?? 0) + 1;
    } else if (index?.status === "in_progress") {
      return { ok: true, archiveDir: index.currentRoundDir, round: index.currentRound };
    } else if (index?.status === "ended") {
      round = index.currentRound + 1;
    } else {
      round = 1;
    }
    const archiveDir = archiveDirFor(sessionId, round, topic);
    if (archiveDir === void 0) {
      return persistUnavailable();
    }
    const written = await writeIndex(sessionId, {
      status: "in_progress",
      currentRound: round,
      currentRoundDir: archiveDir
    });
    if (!written.ok) {
      return written;
    }
    return { ok: true, archiveDir, round };
  };
  return {
    beginRound,
    async writeDeck(deck) {
      if (fs === void 0) {
        return persistUnavailable();
      }
      const cwd = workspace.cwdFor(deck.sessionId);
      if (cwd === void 0 || cwd.length === 0) {
        return persistUnavailable();
      }
      let archiveDir = deck.archiveDir;
      if (!isRoundArchiveDir(deck.sessionId, archiveDir)) {
        const begun = await beginRound(deck.sessionId, deck.topic);
        if (!begun.ok) {
          return begun;
        }
        archiveDir = begun.archiveDir;
      }
      const next = { ...deck, archiveDir };
      try {
        await writeAll(fs, next, cwd);
      } catch {
        return persistUnavailable();
      }
      const index = await readIndex(deck.sessionId);
      if (index === void 0 || index.currentRoundDir !== archiveDir) {
        const roundMatch = archiveDir.match(/\/round-(\d+)-/);
        const round = roundMatch ? Number(roundMatch[1]) : 1;
        const indexed = await writeIndex(deck.sessionId, {
          status: "in_progress",
          currentRound: round,
          currentRoundDir: archiveDir
        });
        if (!indexed.ok) {
          return indexed;
        }
      }
      return { ok: true, archiveDir };
    },
    async readDeck(sessionId) {
      if (fs === void 0) {
        return void 0;
      }
      const cwd = workspace.cwdFor(sessionId);
      const root = sessionArchiveRoot(sessionId);
      if (cwd === void 0 || root === void 0) {
        return void 0;
      }
      const index = await readIndex(sessionId);
      if (index?.status === "ended") {
        return void 0;
      }
      if (index?.status === "in_progress") {
        return parseDeck(await readRel2(fs, cwd, `${index.currentRoundDir}/session.json`));
      }
      return parseDeck(await readRel2(fs, cwd, `${root}/session.json`));
    },
    async markEnded(sessionId, closingSeed) {
      const index = await readIndex(sessionId);
      if (index === void 0) {
        return persistUnavailable();
      }
      return writeIndex(sessionId, {
        ...index,
        status: "ended",
        closingSeed
      });
    },
    async writeRoundNotes(sessionId, notes) {
      if (fs === void 0) {
        return persistUnavailable();
      }
      const cwd = workspace.cwdFor(sessionId);
      const index = await readIndex(sessionId);
      if (cwd === void 0 || cwd.length === 0 || index === void 0) {
        return persistUnavailable();
      }
      const qaPath = `${index.currentRoundDir}/qa.md`;
      const summaryPath = `${index.currentRoundDir}/summary.md`;
      try {
        await writeRel2(fs, cwd, sessionId, qaPath, notes.qa.endsWith("\n") ? notes.qa : `${notes.qa}
`);
      } catch {
        return persistUnavailable();
      }
      try {
        await writeRel2(
          fs,
          cwd,
          sessionId,
          summaryPath,
          notes.summary.endsWith("\n") ? notes.summary : `${notes.summary}
`
        );
      } catch {
        return persistUnavailable();
      }
      return { ok: true, qaPath, summaryPath };
    },
    readRoundIndex: readIndex
  };
};

// backend/src/infra/dsh/adapter.ts
var name = "interview-dsh";
var inject = ["agents", "llm", "agentDefaultModel", "fs"];
var bindInterviewEntry = (service) => {
  Object.defineProperty(service, "typertRemote", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: { service, serviceKey: "interviewEntry", namespace: "interviewEntry" }
  });
  return service;
};
var asTextFs = (value) => {
  if (value === null || typeof value !== "object") {
    return void 0;
  }
  const fs = value;
  if (typeof fs.writeText !== "function") {
    return void 0;
  }
  return fs;
};
var readService = (ctx, key) => {
  if (typeof ctx.get === "function") {
    try {
      return ctx.get(key);
    } catch {
      return void 0;
    }
  }
  return ctx[key];
};
var sessionCwd = (value) => {
  if (value === null || typeof value !== "object") {
    return void 0;
  }
  const cwd = value.session?.header?.cwd;
  return typeof cwd === "string" && cwd.length > 0 ? cwd : void 0;
};
function apply(ctx) {
  const examSessions = createExamSessionStore();
  const fs = asTextFs(ctx.fs) ?? asTextFs(readService(ctx, "fs"));
  const workspace = {
    cwdFor(sessionId) {
      return sessionCwd(ctx.agents?.get(sessionId));
    }
  };
  const archive = createFsWorkspaceArchive(fs, workspace);
  const jevConfig = createFsJevConfigStore(fs, workspace);
  const coverage = createJevCoveragePort(jevConfig);
  ctx.provide(
    "interviewEntry",
    bindInterviewEntry(
      createInterviewEntryPort(
        void 0,
        {
          install(sessionId, text) {
            return attachInterviewerPersona(ctx, { sessionId, text });
          },
          installRoundClose(sessionId, text) {
            return installRoundClosingSection(ctx, { sessionId, text });
          },
          clearRoundClose(sessionId) {
            clearRoundClosingSection(sessionId);
          },
          installChain(sessionId, text) {
            return installChainSection(ctx, { sessionId, text });
          },
          clearChain(sessionId) {
            clearChainSection(sessionId);
          }
        },
        createHostCoachRuntime(ctx),
        examSessions,
        archive,
        { jevConfig, coverage, probeJev: (apiKey) => probeJevKey(apiKey) }
      )
    )
  );
}
export {
  apply,
  inject,
  name
};
