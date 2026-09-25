/**
 * Local LLM latency/accuracy baseline for the same fixtures as the Jev probe.
 * Uses Ollama; does not call TypeSafe.
 *
 *   node openspec/changes/interview-jev-coverage/probe/llm-coverage-baseline.mjs
 */
const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.LLM_MODEL || 'qwen3.5:4b';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 60_000);

const CRITERIA = [
  'coverage 只能是 miss、wide_gap、deepen、reask、next 之一。',
  'miss 表示一点没答上，换了说法也没碰到考察意图。wide_gap 表示碰到了一部分但缺口大。',
  'deepen 表示对已经说到的某一个点追深。reask 表示把同一题拆开，或换一个大方面再问。',
  'next 只表示这层意图已经达到，或该换知识点。同一题拆开再问不是 next。',
  '意思相近算碰到。不要用未覆盖条数决定 coverage。',
].join('\n');

const FIXTURES = [
  { id: 'miss-blank', expected: 'miss', intent: '说清聚簇索引为什么把完整行放在叶子页。', answer: '不会。' },
  {
    id: 'miss-wrong-topic',
    expected: 'miss',
    intent: '说清聚簇索引为什么把完整行放在叶子页。',
    answer: 'Redis 是把热数据放内存里，所以快。',
  },
  {
    id: 'wide-gap-name-only',
    expected: 'wide_gap',
    intent: '说清聚簇索引为什么把完整行放在叶子页。',
    answer: '聚簇索引就是主键索引吧，具体叶子里放什么我不太清楚。',
  },
  {
    id: 'wide-gap-half',
    expected: 'wide_gap',
    intent: '说清聚簇索引为什么把完整行放在叶子页。',
    answer: 'InnoDB 按主键把数据排在一起。至于为什么回表少，我没想清楚。',
  },
  {
    id: 'deepen-one-point',
    expected: 'deepen',
    intent: '不仅要说出叶子放整行所以主键不用回表，还要说清为什么不采用叶子放指针、行放堆表。',
    answer: '叶子放整行，主键顺着 B+ 树找到叶子就能拿到记录，不必再回表。',
  },
  {
    id: 'deepen-paraphrase',
    expected: 'deepen',
    intent: '在订单查询里说明最左匹配：为什么最左列必须出现，以及只给范围列为什么走不了联合索引。',
    answer: '联合索引 (user_id, created_at) 必须先带 user_id，我们列表就是按用户再按时间翻页。',
  },
  {
    id: 'reask-other-aspect',
    expected: 'reask',
    intent: '说清叶子为何放整行，以及二级索引为什么必须再回表。',
    answer: '叶子放整行，主键点查一次就能拿到记录，不用回表。二级索引怎么走我还没说。',
  },
  {
    id: 'reask-split',
    expected: 'reask',
    intent: '解释红黑树插入为什么最多三次旋转就能恢复，并说明插入后的变色发生在什么位置。',
    answer: '插入按二叉搜索树挂上，再通过旋转把连续红边拆开，最坏三次旋转就能恢复黑高。变色发生在哪一层我还没讲。',
  },
  {
    id: 'next-intent-done',
    expected: 'next',
    intent: '说清聚簇索引为什么把完整行放在叶子页。',
    answer:
      '聚簇索引叶子放整行，主键点查一次 IO 就能拿到记录；若叶子只放指针还要再回堆表。二级索引叶子只放主键，还要回表。这一层意图已经说完。',
  },
  {
    id: 'next-scene-done',
    expected: 'next',
    intent: '在订单查询场景里说明最左匹配。',
    answer:
      '联合索引 (user_id, created_at) 上只给 created_at 用不了索引，必须先带 user_id。我们列表就是按用户再按时间翻页，所以这个顺序是对的。',
  },
];

const parseCoverage = (text) => {
  const match = text.match(/"coverage"\s*:\s*"(miss|wide_gap|deepen|reask|next)"/);
  return match ? match[1] : null;
};

const complete = async (fixture, mode) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  const full =
    mode === 'full'
      ? '同时给出 covered、missed、comment，以及五维 scores：基础扎实度、原理理解、工程判断、表达结构、深度边界。每个 score 1 到 5，允许 0.5。'
      : '只返回 coverage 一个字段。';
  try {
    const response = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        messages: [
          {
            role: 'system',
            content: `你是本场模拟面试的面板教练，只为右侧面板评分。只返回 JSON。${CRITERIA}\n${full}\n不要使用 Markdown 代码围栏。`,
          },
          {
            role: 'user',
            content: `主题：MySQL 索引与优化\n难度：中级\n考察意图：${fixture.intent}\n候选人作答：${fixture.answer}\n返回 JSON。`,
          },
        ],
      }),
    });
    const elapsedMs = Date.now() - started;
    if (!response.ok) {
      return { id: fixture.id, expected: fixture.expected, got: null, elapsedMs, error: `http_${response.status}` };
    }
    const body = await response.json();
    const text = body?.message?.content ?? '';
    return {
      id: fixture.id,
      expected: fixture.expected,
      got: parseCoverage(text),
      elapsedMs,
      error: parseCoverage(text) ? null : 'parse',
    };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    const name = error instanceof Error ? error.name : 'error';
    return { id: fixture.id, expected: fixture.expected, got: null, elapsedMs, error: name };
  } finally {
    clearTimeout(timer);
  }
};

const runMode = async (mode) => {
  process.stdout.write(`mode\t${mode}\tmodel\t${MODEL}\n`);
  process.stdout.write('warmup\n');
  await complete(FIXTURES[0], mode);
  const rows = [];
  for (const fixture of FIXTURES) {
    const row = await complete(fixture, mode);
    rows.push(row);
    const mark = row.got === row.expected ? 'ok' : 'miss';
    process.stdout.write(
      `${mark}\t${row.id}\texpected=${row.expected}\tgot=${row.got ?? row.error}\t${row.elapsedMs}ms\n`,
    );
  }
  const hits = rows.filter((row) => row.got === row.expected).length;
  const latencies = rows.map((row) => row.elapsedMs).sort((a, b) => a - b);
  const p95 = latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)];
  process.stdout.write(
    `summary_${mode}\thits=${hits}/${rows.length}\tmin_ms=${latencies[0]}\tp95_ms=${p95}\tmax_ms=${latencies[latencies.length - 1]}\n`,
  );
};

await runMode('coverage_only');
await runMode('full');
