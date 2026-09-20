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
  seedUserText: input.seedUserText ?? ""
});
var createInterviewDeck = (input) => ({
  phase: "in_progress",
  sessionId: input.sessionId,
  topic: input.topic,
  difficulty: input.difficulty,
  archiveDir: input.archiveDir ?? "",
  cards: input.cards,
  currentCardId: input.currentCardId
});

// backend/src/data/workspace-archive.ts
var persistUnavailable = () => ({
  ok: false,
  code: "persist_unavailable",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.persist_unavailable
});
var ARCHIVE_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
var sessionArchiveRoot = (sessionId) => {
  if (!ARCHIVE_SESSION_ID.test(sessionId) || sessionId.includes("..")) {
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
    "",
    "## \u4F5C\u7B54",
    card.answer ?? "\u5F85\u4F5C\u7B54",
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
    ...extras?.closingSeed !== void 0 ? { closingSeed: extras.closingSeed } : {}
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

// backend/src/services/pending-question.ts
var hasInterrogative = (paragraph) => /[？?]/.test(paragraph);
var extractPendingQuestion = (assistantTurn) => {
  const text = assistantTurn.trim();
  if (text.length === 0) {
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
  questionText
}) => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  return {
    system: [
      "\u4F60\u662F\u672C\u573A\u6A21\u62DF\u9762\u8BD5\u7684\u9762\u677F\u6559\u7EC3\uFF0C\u53EA\u4E3A\u53F3\u4FA7\u9762\u677F\u4EA7\u51FA\u5BF9\u7167\u6750\u6599\u3002",
      "\u4E0D\u8981\u626E\u6F14\u9762\u8BD5\u5B98\uFF0C\u4E0D\u8981\u5411\u5019\u9009\u4EBA\u53D1\u95EE\uFF0C\u4E0D\u8981\u8F93\u51FA\u5206\u6570\u6216\u901A\u8FC7/\u4E0D\u901A\u8FC7\u5224\u5B9A\u3002",
      "\u53EA\u9488\u5BF9\u5F53\u524D\u5F85\u7B54\u95EE\u5199\u6458\u8981\u548C\u8981\u70B9\uFF1B\u5FFD\u7565\u540C\u4E00\u6BB5\u91CC\u5BF9\u4E0A\u4E00\u95EE\u7684\u70B9\u8BC4\u3001\u7EA0\u6B63\u6216\u63ED\u6653\u3002",
      "\u6839\u636E\u672C\u573A\u4E3B\u9898\u3001\u96BE\u5EA6\u548C\u9762\u8BD5\u5B98\u5DF2\u7ECF\u95EE\u51FA\u7684\u5F85\u7B54\u95EE\uFF0C\u53EA\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A",
      '{"questionBrief":"\u9898\u5E72\u6458\u8981","keyPoints":["\u6807\u51C6\u7B54\u8981\u70B91","\u6807\u51C6\u7B54\u8981\u70B92"],"cardId":"Q1","relation":"followup"}',
      "questionBrief \u662F\u672C\u9898\u9898\u5E72\u7684\u77ED\u6458\u8981\uFF1BkeyPoints \u662F\u672C\u9898\u6807\u51C6\u7B54\u8981\u70B9\uFF0C3 \u5230 6 \u6761\u3002",
      "cardId \u5FC5\u987B\u662F Qn \u6216 Qn.m\uFF1Brelation \u53EA\u80FD\u662F followup \u6216 next_topic\u3002",
      "\u4E0D\u8981\u4F7F\u7528 Markdown \u4EE3\u7801\u56F4\u680F\uFF0C\u4E0D\u8981\u9644\u52A0\u89E3\u91CA\u3002"
    ].join("\n"),
    user: [
      `\u4E3B\u9898\uFF1A${topic}`,
      `\u96BE\u5EA6\uFF1A${difficultyLabel}`,
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
    return {
      questionBrief,
      keyPoints,
      ...cardId ? { cardId } : {},
      ...relation ? { relation } : {}
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
var briefCoachSession = async (runtime, request, examSessions, archive) => {
  const question = await runtime.readLatestQuestion(request.sessionId);
  if (!question.ok) {
    return question;
  }
  const human = await runtime.readLatestHuman(request.sessionId);
  if (!human.ok) {
    return human;
  }
  const { system, user } = assembleCoachBriefPrompt({
    topic: request.topic,
    difficulty: request.difficulty,
    questionText: question.text
  });
  const raw = await runtime.complete(system, user);
  if (raw === null) {
    return coachUnavailable();
  }
  const parsed = parseCoachBriefOutput(raw);
  if (parsed === null) {
    return coachUnavailable();
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
  const card = createPendingCard({
    id: assignCardId([], { suggestedId: "Q1" }),
    questionText: question.text,
    questionBrief: parsed.questionBrief,
    keyPoints: parsed.keyPoints,
    seedUserText: human.text
  });
  const deck = createInterviewDeck({
    sessionId: request.sessionId,
    topic: request.topic,
    difficulty: request.difficulty,
    cards: [card],
    currentCardId: card.id,
    archiveDir
  });
  examSessions && saveExamRecord(examSessions, deck, question.text);
  const persisted = await persistDeck(archive, deck);
  if (persisted.ok) {
    examSessions && saveExamRecord(examSessions, persisted.deck, question.text);
  } else if (examSessions) {
    saveExamRecord(examSessions, persisted.deck ?? deck, question.text);
  }
  return persisted;
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
    "2. \u6309\u68AF\u5EA6\u63A8\u8FDB\uFF1A\u662F\u4EC0\u4E48\uFF08\u5B9A\u4E49\uFF09\u2192 \u4E3A\u4EC0\u4E48\uFF08\u539F\u7406/\u53D6\u820D\uFF09\u2192 \u573A\u666F\u5316 \u2192 \u6316\u5230\u8FB9\u754C\u3002",
    "3. \u5F00\u573A\u5148\u7528\u4E00\u4E24\u53E5\u8BF4\u660E\u672C\u8F6E\u4E3B\u9898\u548C\u96BE\u5EA6\uFF0C\u7136\u540E\u7ACB\u523B\u95EE\u7B2C\u4E00\u4E2A\u95EE\u9898\u3002",
    "4. \u4FDD\u6301\u5BF9\u8BDD\u611F\uFF0C\u50CF\u771F\u4EBA\u9762\u8BD5\u5B98\uFF1B\u4E0D\u8981\u5728\u5BF9\u8BDD\u91CC\u516C\u5E03\u5B8C\u6574\u89E3\u7B54\u6216\u5206\u6570\u3002",
    "5. \u672C\u573A\u4ECE\u8FD9\u6761\u65B0\u5BF9\u8BDD\u5F00\u59CB\uFF0C\u4E0D\u8981\u5047\u8BBE\u5B58\u5728\u66F4\u65E9\u7684\u804A\u5929\u5386\u53F2\u3002",
    "6. \u7EA0\u6B63\u4E0A\u4E00\u95EE\u6216\u8865\u5145\u8BB2\u89E3\u65F6\u53EA\u77ED\u8BF4\uFF0C\u7136\u540E\u7ACB\u523B\u7ED9\u51FA\u8FD9\u4E00\u8F6E\u552F\u4E00\u5F85\u7B54\u95EE\uFF1B\u53EF\u7528\u3010\u672C\u9898\u3011\u6807\u51FA\u5F85\u7B54\u95EE\u3002",
    "7. \u8003\u573A\u6C14\u6CE1\u5FC5\u987B\u662F\u81EA\u7136\u8BED\u8A00\u9762\u8BD5\u53E3\u6C14\uFF0C\u7981\u6B62\u8F93\u51FA JSON \u6216\u6559\u7EC3\u9762\u677F\u4E13\u7528\u8F7D\u8377\u3002",
    "",
    "\u3010\u96BE\u5EA6\u3011",
    difficulty === "junior" ? "\u521D\u7EA7\uFF1A\u5B9A\u4E49\u6E05\u695A + \u5E38\u89C1\u573A\u666F\uFF0C\u5C11\u6362\u7EA6\u675F\u3002" : difficulty === "senior" ? "\u9AD8\u7EA7\uFF1A\u6316\u5230\u8FB9\u754C\uFF0C\u53EF\u6362\u524D\u63D0 / \u6362\u89C4\u6A21\u3002" : "\u4E2D\u7EA7\uFF1A\u539F\u7406 / \u53D6\u820D + \u573A\u666F\u8FC1\u79FB\u3002"
  ].join("\n");
};

// backend/src/services/coach-score.ts
var assembleCoachScorePrompt = ({
  topic,
  difficulty,
  questionText,
  questionBrief,
  keyPoints,
  answer
}) => {
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const pendingQuestion = extractPendingQuestion(questionText);
  return {
    system: [
      "\u4F60\u662F\u672C\u573A\u6A21\u62DF\u9762\u8BD5\u7684\u9762\u677F\u6559\u7EC3\uFF0C\u53EA\u4E3A\u53F3\u4FA7\u9762\u677F\u8BC4\u5206\u3002",
      "\u4E0D\u8981\u626E\u6F14\u9762\u8BD5\u5B98\uFF0C\u4E0D\u8981\u5411\u5019\u9009\u4EBA\u53D1\u95EE\uFF0C\u4E0D\u8981\u628A\u7ED3\u679C\u5199\u8FDB\u5BF9\u8BDD\u3002",
      "\u53EA\u6839\u636E\u672C\u9898\u5F00\u5377\u8981\u70B9\u548C\u5019\u9009\u4EBA\u4F5C\u7B54\uFF0C\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A",
      '{"covered":["\u5DF2\u8986\u76D6\u8981\u70B9"],"missed":["\u672A\u8986\u76D6\u8981\u70B9"],"comment":"\u5BF9\u7167\u8BC4\u8BED","scores":[{"dimension":"\u57FA\u7840\u624E\u5B9E\u5EA6","score":3.5,"reason":"\u7406\u7531"}]}',
      `scores \u5FC5\u987B\u6070\u597D\u5305\u542B\u8FD9\u4E94\u4E2A\u7EF4\u5EA6\u4E14\u987A\u5E8F\u4E00\u81F4\uFF1A${BAGUA_SCORE_DIMENSIONS.join("\u3001")}\u3002`,
      "\u6BCF\u4E2A score \u662F 1 \u5230 5 \u7684\u6570\u5B57\uFF0C\u5141\u8BB8 0.5 \u6B65\u8FDB\u3002",
      "\u4E0D\u8981\u4F7F\u7528 Markdown \u4EE3\u7801\u56F4\u680F\uFF0C\u4E0D\u8981\u9644\u52A0\u89E3\u91CA\u3002"
    ].join("\n"),
    user: [
      `\u4E3B\u9898\uFF1A${topic}`,
      `\u96BE\u5EA6\uFF1A${difficultyLabel}`,
      "\u9762\u8BD5\u5B98\u5F53\u524D\u95EE\u9898\uFF1A",
      pendingQuestion,
      "\u672C\u9898\u6458\u8981\uFF1A",
      questionBrief,
      "\u6807\u51C6\u7B54\u8981\u70B9\uFF1A",
      ...keyPoints.map((point) => `- ${point}`),
      "\u5019\u9009\u4EBA\u4F5C\u7B54\uFF1A",
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
    return {
      comparison: { covered, missed, comment },
      scores
    };
  } catch {
    return null;
  }
};
var applyScoreToCard = (card, parsed, answer) => ({
  ...card,
  answer,
  comparison: parsed.comparison,
  scores: parsed.scores,
  status: "scored"
});

// backend/src/services/watch-coach-turn.ts
var WATCH_COACH_TURN_TIMEOUT_MS = 2e4;
var followUpFailed = (deck) => ({
  ok: false,
  code: "follow_up_failed",
  message: INTERVIEW_SESSION_ERROR_MESSAGES.follow_up_failed,
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
var watchCoachTurnSession = async (runtime, examSessions, request, clock = {}, archive) => {
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
  const persistAndReturn = async () => {
    saveExamRecord(examSessions, deck, lastQuestionText);
    const persisted = await persistDeck(archive, deck);
    if (!persisted.ok) {
      if (persisted.deck) {
        deck = persisted.deck;
        saveExamRecord(examSessions, deck, lastQuestionText);
      }
      return persisted;
    }
    deck = persisted.deck;
    saveExamRecord(examSessions, deck, lastQuestionText);
    return { ok: true, status: "updated", deck };
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
    const pending = pendingToScore(deck, human.text);
    if (pending === void 0) {
      return;
    }
    const { system, user } = assembleCoachScorePrompt({
      topic: record.topic,
      difficulty: record.difficulty,
      questionText: pending.questionText,
      questionBrief: pending.questionBrief,
      keyPoints: pending.keyPoints,
      answer: human.text
    });
    const raw = await runtime.complete(system, user);
    if (raw === null) {
      scoreError = coachUnavailable2(deck);
      return;
    }
    const parsed = parseCoachScoreOutput(raw);
    if (parsed === null) {
      scoreError = coachUnavailable2(deck);
      return;
    }
    deck = replaceCard(deck, applyScoreToCard(pending, parsed, human.text), pending.id);
    changed = true;
  };
  const briefQuestion = async (questionText) => {
    let pendingText = questionText;
    let parsed = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { system, user } = assembleCoachBriefPrompt({
        topic: record.topic,
        difficulty: record.difficulty,
        questionText: pendingText
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
      if (attempt < 2) {
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
    lastQuestionText = pendingText;
    return parsed;
  };
  const appendNewCard = async (questionText) => {
    const parsed = await briefQuestion(questionText);
    if (parsed === null) {
      return false;
    }
    const previous = deck.cards[deck.cards.length - 1];
    const seed = await runtime.readLatestHuman(request.sessionId);
    const card = createPendingCard({
      id: assignCardId(
        deck.cards.map((item) => item.id),
        {
          suggestedId: parsed.cardId,
          relation: parsed.relation,
          previousId: previous?.id
        }
      ),
      questionText: lastQuestionText,
      questionBrief: parsed.questionBrief,
      keyPoints: parsed.keyPoints,
      seedUserText: seed.ok ? seed.text : ""
    });
    deck = appendCard(deck, card);
    changed = true;
    return true;
  };
  const publishIfWaitingForNextBrief = async () => {
    const latest = deck.cards[deck.cards.length - 1];
    if (!changed || latest?.status !== "scored" || lastPending(deck) !== void 0) {
      return void 0;
    }
    return persistAndReturn();
  };
  const briefNewQuestion = async (questionText) => {
    if (isRoundClosingText(questionText)) {
      return { ok: true, status: "unchanged" };
    }
    await scorePendingIfAnswered();
    const published = await publishIfWaitingForNextBrief();
    if (published !== void 0) {
      return published;
    }
    await appendNewCard(questionText);
    return void 0;
  };
  await scorePendingIfAnswered();
  const scoredOnly = await publishIfWaitingForNextBrief();
  if (scoredOnly !== void 0) {
    return scoredOnly;
  }
  if (request.force === true) {
    const latest = await runtime.readLatestQuestion(request.sessionId);
    if (!latest.ok) {
      return { ...latest, deck };
    }
    if (isRoundClosingText(latest.text)) {
      return { ok: true, status: "unchanged" };
    }
    const pending = lastPending(deck);
    if (pending !== void 0 && latest.text === pending.questionText) {
      const parsed = await briefQuestion(latest.text);
      if (parsed !== null) {
        deck = replaceCard(
          deck,
          {
            ...pending,
            questionBrief: parsed.questionBrief,
            keyPoints: parsed.keyPoints
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
        return { ...waited, deck };
      }
      if (waited.status === "ready") {
        const published2 = await briefNewQuestion(waited.text);
        if (published2 !== void 0) {
          return published2;
        }
        break;
      }
      await scorePendingIfAnswered();
      const published = await publishIfWaitingForNextBrief();
      if (published !== void 0) {
        return published;
      }
      if (Date.now() - started < Math.min(50, waitMs)) {
        break;
      }
    }
  }
  if (changed) {
    const persisted = await persistAndReturn();
    if (!persisted.ok) {
      return persisted;
    }
    if (scoreError !== void 0 && briefError === void 0) {
      return { ...scoreError, deck: persisted.deck };
    }
    if (briefError !== void 0) {
      return { ...briefError, deck: persisted.deck };
    }
    return persisted;
  }
  if (scoreError !== void 0) {
    return { ...scoreError, deck };
  }
  if (briefError !== void 0) {
    return { ...briefError, deck };
  }
  return { ok: true, status: "unchanged" };
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
var createInterviewEntryService = (store, persona = unavailablePersona, coach = unavailableCoach, examSessions = createExamSessionStore(), archive) => ({
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
  attachInterviewer(request) {
    const text = assembleInterviewerPersona({
      topic: request.topic,
      difficulty: request.difficulty
    });
    return persona.install(request.sessionId, text);
  },
  briefCoach(request) {
    persona.clearRoundClose?.(request.sessionId);
    return briefCoachSession(coach, request, examSessions, archive);
  },
  watchCoachTurn(request) {
    return watchCoachTurnSession(coach, examSessions, request, {}, archive);
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
});

// backend/src/entrypoints/interview-entry.ts
var createInterviewEntryPort = (store = createEntryConfigStore(), persona = {
  install: () => ({
    ok: false,
    code: "inject_unavailable",
    message: INTERVIEW_SESSION_ERROR_MESSAGES.inject_unavailable
  })
}, coach, examSessions, archive) => coach === void 0 ? createInterviewEntryService(store, persona) : createInterviewEntryService(store, persona, coach, examSessions, archive);

// backend/src/infra/dsh/interviewer-persona.ts
var INTERVIEWER_PERSONA_SECTION = "deployment:persona";
var INTERVIEWER_PERSONA_ORDER = 0;
var ROUND_CLOSE_SECTION = "deployment:round-close";
var ROUND_CLOSE_ORDER = 1;
var roundCloseDisposers = /* @__PURE__ */ new Map();
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
var injectUnavailable = () => ({
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
      return injectUnavailable();
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
      return injectUnavailable();
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
      return injectUnavailable();
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
          return injectUnavailable();
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
            return injectUnavailable();
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
  }
});

// backend/src/infra/dsh/workspace-fs.ts
var resolveTarget = async (fs, cwd, rel) => {
  if (typeof fs.resolve === "function") {
    return await fs.resolve(rel, { cwd });
  }
  return joinWorkspacePath(cwd, rel);
};
var workspaceWritePolicy = (cwd, sessionId) => ({
  mode: "workspace-write",
  workspaceRoot: cwd,
  sessionId
});
var writeRel = async (fs, cwd, sessionId, rel, text) => {
  const target = await resolveTarget(fs, cwd, rel);
  await fs.writeText(target, text, void 0, void 0, workspaceWritePolicy(cwd, sessionId));
};
var readRel = async (fs, cwd, rel) => {
  if (typeof fs.readText !== "function") {
    return void 0;
  }
  try {
    return await fs.readText(await resolveTarget(fs, cwd, rel));
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
  await writeRel(fs, cwd, deck.sessionId, `${archiveDir}/session.json`, `${JSON.stringify(deck, null, 2)}
`);
  for (const card of deck.cards) {
    await writeRel(fs, cwd, deck.sessionId, `${archiveDir}/cards/${card.id}.md`, renderCardMarkdown(deck, card.id));
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
    return parseIndex(await readRel(fs, cwd, `${root}/index.json`));
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
      await writeRel(fs, cwd, sessionId, `${root}/index.json`, `${JSON.stringify(index, null, 2)}
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
        return parseDeck(await readRel(fs, cwd, `${index.currentRoundDir}/session.json`));
      }
      return parseDeck(await readRel(fs, cwd, `${root}/session.json`));
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
        await writeRel(fs, cwd, sessionId, qaPath, notes.qa.endsWith("\n") ? notes.qa : `${notes.qa}
`);
      } catch {
        return persistUnavailable();
      }
      try {
        await writeRel(
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
  const archive = createFsWorkspaceArchive(fs, {
    cwdFor(sessionId) {
      return sessionCwd(ctx.agents?.get(sessionId));
    }
  });
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
          }
        },
        createHostCoachRuntime(ctx),
        examSessions,
        archive
      )
    )
  );
}
export {
  apply,
  inject,
  name
};
