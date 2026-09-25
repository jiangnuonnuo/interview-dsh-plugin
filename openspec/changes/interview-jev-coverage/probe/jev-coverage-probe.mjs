/**
 * Offline-to-Jev coverage probe. Does not import plugin source.
 *
 *   JEV_API_KEY=... NODE_USE_ENV_PROXY=1 node --use-env-proxy \
 *     openspec/changes/interview-jev-coverage/probe/jev-coverage-probe.mjs
 *
 * Never print the key. Exit 0 only when the accuracy gate passes.
 * Run with NODE_USE_ENV_PROXY=1 so fetch honours HTTPS_PROXY.
 */

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MODEL = process.env.JEV_MODEL || 'jev-1.13.0';
const TIMEOUT_MS = Number(process.env.JEV_TIMEOUT_MS || 10_000);
const MIN_HITS = Number(process.env.JEV_MIN_HITS || 10);
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

const CRITERIA = {
  miss: '作答与考察意图没有有效交集：空白、只会、或整段答成别的知识点。只要出现了本题正确概念的名称，即使后半句说不知道，也不是 miss。',
  wide_gap: '已经碰到本题概念，但核心机制几乎没讲清，还没有一个讲对的点可以追深，下一步应留在原题引导。不要因为提到正确名词就选 miss，也不要开子问。',
  deepen: '已经把当前意图里的一个点讲对，但只停在现象或结论，还没讲清机制或对比，下一步应就这一点往下挖。不要把「讲得不够深」当成另一个并列大方面。',
  reask: '候选人已经讲清了意图中的一块，并且自己点出了另一块还没讲，或意图里本来就有两个并列大方面只答了其中一块。这是把同一题拆开，不是把同一点问深。',
  next: '就当前考察意图而言，核心机制已经讲清，可以换知识点。还能展开工程细节不算没讲清。把同一题拆开再问不是 next。',
};

const REDIS_EXPIRE_Q1 = {
  id: 'Q1',
  relation: '正式问',
  layer: '原理',
  intent: '说清 Redis 过期键是惰性删除加定期删除一起工作，而不是等到内存满才删。',
  question: 'Redis 里一个 key 过期了，它是什么时候从内存里拿掉的？只靠懒删除够不够？',
  brief: '过期删除是惰性访问时删，加上定期抽样删。',
  keyPoints: ['访问已过期 key 时惰性删除', '后台定期抽一批检查过期', '不是等到 maxmemory 才处理过期'],
};

const REDIS_EXPIRE_Q1_1 = {
  id: 'Q1.1',
  relation: '追问',
  layer: '原理',
  intent: '说清定期删除是抽样扫描，不是全库扫描。',
  question: '定期删除如果每次把整个 keyspace 扫一遍会怎样？实际是怎么做的？',
  brief: '定期删除抽样，控制单次耗时。',
  keyPoints: ['每次只抽一部分 expires 字典', '超时就停，避免阻塞', '不是全量扫描'],
};

const REDIS_EXPIRE_Q1_2 = {
  id: 'Q1.2',
  relation: '追问',
  layer: '场景',
  intent: '说清过期没及时删时，真正内存满走的是 maxmemory 淘汰，不是过期策略。',
  question: '如果过期 key 还占着内存，写请求已经顶到 maxmemory，接下来谁说了算？',
  brief: '内存满走 LRU/LFU 等淘汰策略，和过期删除是两套。',
  keyPoints: ['maxmemory 触发淘汰', 'allkeys-lru 等与过期字典无关', '过期策略删不完时淘汰顶上'],
};

const HASHMAP_Q1 = {
  id: 'Q1',
  relation: '正式问',
  layer: '原理',
  intent: '说清 JDK8 HashMap 链表为什么在长度和容量条件满足后改红黑树。',
  question: 'HashMap 什么时候把某个桶从链表改成红黑树？为什么要两个条件一起看？',
  brief: '树化要桶长到 8 且表容量到 64，否则先扩容。',
  keyPoints: ['单个桶链表长度达到 8', '数组容量小于 64 时先 resize', '两个条件一起是为了避免过早树化'],
};

const HASHMAP_Q1_1 = {
  id: 'Q1.1',
  relation: '追问',
  layer: '原理',
  intent: '说清扩容时下标要么不变要么加 oldCap，来自高位 hash。',
  question: '扩容之后，原来的节点新下标怎么算？为什么不是把 hash 再对长度取一次模？',
  brief: '新下标 = 原下标或原下标 + oldCap，看 hash 的高一位。',
  keyPoints: ['长度是 2 的幂', '用 hash & oldCap 决定是否搬到新半区', '不必重新计算 hash % newCap'],
};

const HASHMAP_Q1_2 = {
  id: 'Q1.2',
  relation: '追问',
  layer: '原理',
  intent: '说清 1.8 扩容链表用尾插保持相对顺序，以及为什么还要分 lo/hi 两条链。',
  question: '1.8 扩容时链表怎么接到新数组上？为什么要拆成低位链和高位链？',
  brief: '尾插保序，按高位拆成两条链分别接到 i 和 i+oldCap。',
  keyPoints: ['尾插避免 1.7 头插成环', 'lo 链下标不变', 'hi 链下标加 oldCap'],
};

const HASHMAP_Q1_3 = {
  id: 'Q1.3',
  relation: '追问',
  layer: '原理',
  intent: '说清树化后桶上节点变少为什么会退回链表，以及为什么退树阈值是 6 不是 8。',
  question: '红黑树什么时候退回链表？为什么拆树阈值是 6，不是还用 8？',
  brief: '节点降到 6 退树，和树化阈值 8 错开，避免来回抖。',
  keyPoints: ['桶上节点少到 6 退回链表', '8 和 6 错开避免临界来回转换', '退树后仍是链表结构'],
};

const HTTP_Q1_3 = {
  id: 'Q1.3',
  relation: '追问',
  layer: '场景',
  intent: '说清 404 和 403 的差别：资源不存在还是存在但不让看。',
  question: '有人扫到不该暴露的路径，回 404 还是 403 更合适？和权限不足怎么区分？',
  brief: '不想暴露资源存在性时用 404；已认证无权限才是 403。',
  keyPoints: ['403 等于承认资源在', '隐藏存在性用 404', '和未认证的 401 不是同一层'],
};

const MAX_REASK = 3;

const countReask = (thread) => thread.filter((card) => card.coverage === 'reask').length;

const applyReaskCap = (got, reaskCount) => {
  if (got == null) {
    return got;
  }
  if (reaskCount >= MAX_REASK && got !== 'next') {
    return 'next';
  }
  return got;
};

const SYNC_Q1 = {
  id: 'Q1',
  relation: '正式问',
  layer: '原理',
  intent: '说清 synchronized 如何从偏向锁升级到轻量再升级重量，以及什么时候会膨胀。',
  question: 'synchronized 的锁升级是怎么走的？什么情况下会从轻量级变成重量级？',
  brief: '偏向 → 轻量自旋 → 重量级 monitor，竞争升级后不降级。',
  keyPoints: ['无竞争可偏向第一个线程', '有竞争先自旋的轻量级锁', '自旋失败进入重量级队列'],
};

const HB_Q1 = {
  id: 'Q1',
  relation: '正式问',
  layer: '原理',
  intent: '说清 volatile 写为什么 happens-before 后续的读。',
  question: 'volatile 写和一个线程稍后的读，为什么能保证看见最新值？只说「禁止指令重排」够不够？',
  brief: 'volatile 写冲刷到主存，后续读从主存加载，写 happens-before 读。',
  keyPoints: ['写带 release 语义冲刷工作内存', '读带 acquire 语义从主存加载', '构成 happens-before，不只是禁重排'],
};

const HB_Q1_1 = {
  id: 'Q1.1',
  relation: '追问',
  layer: '原理',
  intent: '说清 volatile 不能替代锁去组复合操作，例如 i++。',
  question: '那两个线程同时做 volatile int 的 i++，为什么还是会丢更新？',
  brief: 'i++ 是读改写三步，volatile 只保证单次读写可见，不保证复合操作原子。',
  keyPoints: ['i++ 不是单条原子', '中间结果可以交错', '复合更新仍要锁或 CAS'],
};

const HTTP_Q1 = {
  id: 'Q1',
  relation: '正式问',
  layer: '场景',
  intent: '说清 401 是未认证，403 是已认证但没权限。',
  question: '接口回 401 和回 403，分别表示请求卡在哪一步？',
  brief: '401 要补身份，403 身份有了但授权不够。',
  keyPoints: ['401 Unauthorized 未通过认证', '403 Forbidden 认证过但无权限', '补 token 可能把 401 变成 200，补 token 变不成 403'],
};

const HTTP_Q1_1 = {
  id: 'Q1.1',
  relation: '追问',
  layer: '场景',
  intent: '说清 WWW-Authenticate 出现在 401 而不是 403。',
  question: '什么时候响应头里会出现 WWW-Authenticate？403 会带这个头吗？',
  brief: '401 用 WWW-Authenticate 告诉客户端怎么认证。',
  keyPoints: ['401 可带 WWW-Authenticate', '403 不靠这个头要凭证', '浏览器弹登录框通常跟 401 走'],
};

const HTTP_Q1_2 = {
  id: 'Q1.2',
  relation: '追问',
  layer: '场景',
  intent: '说清登录过期应回 401 让客户端重新拿票，而不是 403。',
  question: '用户 token 过期了，网关应该回 401 还是 403？为什么？',
  brief: '过期是认证失效，应 401 触发刷新或重登。',
  keyPoints: ['过期=未认证状态', '回 401 客户端才知道该刷新 token', '回 403 会被理解成权限不足'],
};

const currentOf = (thread) => thread[thread.length - 1];

const FIXTURES = [
  {
    id: 'cap-miss-under',
    expected: 'miss',
    topic: 'Redis 过期与淘汰',
    thread: [{ ...REDIS_EXPIRE_Q1, answerTurns: ['不会。'], coverage: null }],
  },
  {
    id: 'cap-reask-first',
    expected: 'reask',
    topic: 'Java 并发锁',
    thread: [
      {
        id: 'Q1',
        relation: '正式问',
        layer: '原理',
        intent: '说清 synchronized 锁升级路径，以及它和 ReentrantLock 在等待队列上的差别。',
        question: 'synchronized 怎么从偏向升级到重量级？和 ReentrantLock 的等待队列有什么不一样？',
        brief: '锁升级路径要说清；和 AQS 队列的差别是另一块。',
        keyPoints: ['偏向到轻量再到重量', '重量级走 monitor 队列', 'ReentrantLock 走 AQS，可公平可中断'],
        answerTurns: [
          '没人抢可以偏向第一个线程，有人抢就变成轻量级自旋。',
          '自旋还抢不到就膨胀成重量级。和 ReentrantLock 队列怎么排，我还没说。',
        ],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-reask-third-allowed',
    expected: 'reask',
    topic: 'HashMap 结构',
    thread: [
      {
        ...HASHMAP_Q1,
        answerTurns: [
          '桶上链表到 8 且数组已经 64 才树化。',
          '容量不够就先扩容。树化之后扩容下标怎么算，我还没说。',
        ],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_1,
        answerTurns: [
          '长度是 2 的幂，用 hash 多出来的那一位决定还在原下标还是加 oldCap。',
          '1.8 扩容链表怎么接到新数组上，我还没讲。',
        ],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_2,
        answerTurns: [
          '1.8 用尾插，相对顺序能保住，不会像 1.7 头插那样成环。',
          '低位链和高位链怎么拆、分别接到哪，我还没讲。',
        ],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-next-natural',
    expected: 'next',
    topic: 'Java 内存模型',
    thread: [
      {
        ...HB_Q1,
        answerTurns: [
          '写 volatile 会把本地改动冲到主存。',
          '另一个线程再读同一个 volatile，从主存拿，写 happens-before 读。',
        ],
        coverage: 'deepen',
      },
      {
        ...HB_Q1_1,
        answerTurns: [
          'i++ 先读再加再写，两个线程会基于旧值写回。',
          'volatile 管不了这三步绑在一起，要锁或 CAS。这一问已经说完。',
        ],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-force-reask-to-next',
    expected: 'next',
    topic: 'HashMap 结构',
    thread: [
      {
        ...HASHMAP_Q1,
        answerTurns: ['链表到 8 且容量到 64 才树化，否则先扩容。扩容下标我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_1,
        answerTurns: ['新下标看 hash 高一位，不是重新取模。尾插怎么接，我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_2,
        answerTurns: ['尾插保序，再按高位拆成 lo/hi 两条链。退树条件我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_3,
        answerTurns: ['节点少了会退回链表。为什么阈值是 6 不是 8，我还没讲。'],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-force-deepen-to-next',
    expected: 'next',
    topic: 'HashMap 结构',
    thread: [
      {
        ...HASHMAP_Q1,
        answerTurns: ['链表到 8 且容量到 64 才树化。扩容下标我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_1,
        answerTurns: ['新下标看 hash 高一位。尾插怎么接我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_2,
        answerTurns: ['尾插保序，拆 lo/hi 两条链。退树条件我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_3,
        answerTurns: ['短了就变回链表。'],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-force-wide-gap-to-next',
    expected: 'next',
    topic: 'HTTP 状态码',
    thread: [
      {
        ...HTTP_Q1,
        answerTurns: ['401 没认证，403 没权限。WWW-Authenticate 我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_1,
        answerTurns: ['401 才带 WWW-Authenticate。token 过期回哪个码我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_2,
        answerTurns: ['过期该回 401 去刷新。不想暴露资源在不在时用啥码，我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_3,
        answerTurns: ['404 和 403 都是失败吧，具体怎么选我不太清楚。'],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-force-miss-to-next',
    expected: 'next',
    topic: 'HTTP 状态码',
    thread: [
      {
        ...HTTP_Q1,
        answerTurns: ['401 没认证，403 没权限。Authenticate 头我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_1,
        answerTurns: ['401 才带 WWW-Authenticate。过期回哪个我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_2,
        answerTurns: ['过期回 401。资源存在性怎么藏，我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_3,
        answerTurns: ['不会。'],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-force-complete-stays-next',
    expected: 'next',
    topic: 'HashMap 结构',
    thread: [
      {
        ...HASHMAP_Q1,
        answerTurns: ['8 且 64 才树化。扩容下标我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_1,
        answerTurns: ['高一位决定下标。尾插我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_2,
        answerTurns: ['尾插保序，拆 lo/hi。退树我还没说。'],
        coverage: 'reask',
      },
      {
        ...HASHMAP_Q1_3,
        answerTurns: [
          '桶上节点降到 6 退回链表。和树化的 8 错开，避免在临界长度上来回抖。这一问已经说完。',
        ],
        coverage: null,
      },
    ],
  },
  {
    id: 'cap-two-reasks-next-ok',
    expected: 'next',
    topic: 'HTTP 状态码',
    thread: [
      {
        ...HTTP_Q1,
        answerTurns: ['401 没认证，403 已认证没权限。Authenticate 头我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_1,
        answerTurns: ['401 带 WWW-Authenticate。过期回哪个我还没说。'],
        coverage: 'reask',
      },
      {
        ...HTTP_Q1_2,
        answerTurns: [
          'token 过期是认证失效，回 401 让客户端刷新。回 403 会被当成权限不够。这一问已经说完。',
        ],
        coverage: null,
      },
    ],
  },
];

const key = process.env.JEV_API_KEY || process.env.TYPESAFE_API_KEY;
if (!key) {
  console.error('missing_key: 设置 JEV_API_KEY 或 TYPESAFE_API_KEY 后再跑。未写入任何五档。');
  process.exit(2);
}

const instructions = [
  '只判断知识链里「定档=待判断」的那一张当前卡，不是整场面试打分。五档互斥，只选一个。',
  '知识链从正式问 Qn 到当前子问 Qn.m 全部给出：每张卡的面试官问题、考察意图、要点、各轮作答 a1/a2、已定档都要读。',
  '硬性规则：统计知识链里已经定档为 reask 的次数。同一知识点最多 3 次 reask；已达到 3 次则必须选 next，换方向，不得再 reask、deepen，也不得再留在本题引导。',
  '未满 3 次时按普通五档判断。前面卡片已经讲清的内容不要再当成当前卡的缺口。',
  '意思相近算碰到。只点到正确概念名称、核心机制没讲清 → wide_gap。当前卡还剩并列大方面 → reask。',
].join(' ');

const ROUTE = {
  miss: 'stay',
  wide_gap: 'stay',
  deepen: 'child',
  reask: 'child',
  next: 'next',
};

const noul = (p) => (typeof p === 'number' ? p : 0);

const mapCascade = (answers) => {
  const hit = noul(answers?.hits_intent?.noul) >= 0.5;
  const complete = noul(answers?.intent_complete?.noul) >= 0.5;
  const solid = noul(answers?.one_point_solid?.noul) >= 0.5;
  const sibling = noul(answers?.sibling_open?.noul);
  const depth = noul(answers?.remaining_depth?.noul);
  if (!hit) {
    return 'miss';
  }
  if (complete) {
    return 'next';
  }
  if (sibling >= 0.5 && sibling >= depth) {
    return 'reask';
  }
  if (depth >= 0.5 || solid) {
    return 'deepen';
  }
  return 'wide_gap';
};

const toState = (fixture) => {
  const current = currentOf(fixture.thread);
  const reaskCount = countReask(fixture.thread);
  return {
    主题: fixture.topic,
    难度: '中级',
    当前卡: current.id,
    同一知识点已reask次数: reaskCount,
    硬性上限: MAX_REASK,
    硬性规则:
      reaskCount >= MAX_REASK
        ? '已满 3 次 reask，必须换方向，只能选 next。'
        : `还可以 reask ${MAX_REASK - reaskCount} 次，未满上限时按五档判断。`,
    知识链: fixture.thread.map((card) => ({
      编号: card.id,
      关系: card.relation,
      考察层: card.layer,
      面试官问题: card.question,
      考察意图: card.intent,
      本题摘要: card.brief,
      标准答要点: card.keyPoints,
      作答轮次: card.answerTurns.map((内容, index) => ({ 轮次: `a${index + 1}`, 内容 })),
      定档: card.coverage ?? '待判断',
    })),
  };
};

const decide = async (fixture) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        state: toState(fixture),
        questions: {
          coverage: {
            type: 'choice',
            instructions,
            criteria: CRITERIA,
          },
          hits_intent: {
            type: 'noul',
            instructions: '作答是否与考察意图有有效交集？提到本题正确概念名称也算有交集。答成别的知识点或只说不会则没有。',
            criteria: {
              true: '碰到了本题概念或机制的一部分。',
              false: '空白、不会、或整段跑题。',
            },
          },
          intent_complete: {
            type: 'noul',
            instructions: '就当前考察意图而言，核心机制是否已经讲清？能继续展开工程细节不算没讲清。',
          },
          one_point_solid: {
            type: 'noul',
            instructions: '是否已经把意图里的某一个点讲对、讲清，值得就这一点追深？只点到名词不算。',
          },
          sibling_open: {
            type: 'noul',
            instructions:
              '候选人是否已经点出另一块还没讲的并列大方面，或意图里本来就有两块只答了一块，因此应把同一题拆开再问？仅仅「同一点还不够深」不算并列方面。',
          },
          remaining_depth: {
            type: 'noul',
            instructions:
              '下一步是否应该就候选人已经说到的那一点继续往下挖机制或对比，而不是换到另一个并列方面？',
          },
          route: {
            type: 'choice',
            instructions:
              '只决定当前卡的卡片动作。已 reask 满 3 次必须选 next。未满 3 次时：留原卡、开子问、或换知识点。',
            criteria: {
              stay: '留在原卡继续引导。空白、跑题、只点到正确名词、或核心机制几乎没讲清。不要开新卡。',
              child: '开子问题卡片。已经有一个点讲对，应就这一点追深，或把同一题另一块拆开再问。当前意图还没走完。',
              next: '当前考察意图已经讲清，换下一个知识点。同一题拆开再问不是 next。',
            },
          },
        },
      }),
    });
    const elapsedMs = Date.now() - started;
    if (!response.ok) {
      const text = await response.text();
      const snippet = text.replace(/\s+/g, ' ').slice(0, 180);
      return {
        id: fixture.id,
        expected: fixture.expected,
        got: null,
        cascade: null,
        elapsedMs,
        error: `http_${response.status}:${snippet}`,
        confidence: null,
      };
    }
    const body = await response.json();
    const answer = body?.answers?.coverage;
    const got = answer?.choice ?? null;
    const reaskCount = countReask(fixture.thread);
    const capped = applyReaskCap(got, reaskCount);
    return {
      id: fixture.id,
      expected: fixture.expected,
      got,
      capped,
      reaskCount,
      cascade: applyReaskCap(mapCascade(body?.answers), reaskCount),
      elapsedMs,
      error: null,
      confidence: typeof answer?.confidence === 'number' ? answer.confidence : null,
      probabilities: answer?.probabilities ?? null,
      noul: {
        hits_intent: body?.answers?.hits_intent?.noul ?? null,
        intent_complete: body?.answers?.intent_complete?.noul ?? null,
        one_point_solid: body?.answers?.one_point_solid?.noul ?? null,
        sibling_open: body?.answers?.sibling_open?.noul ?? null,
        remaining_depth: body?.answers?.remaining_depth?.noul ?? null,
      },
      route: body?.answers?.route?.choice ?? null,
      routeExpected: ROUTE[fixture.expected],
    };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    const name = error instanceof Error ? error.name : 'error';
    return {
      id: fixture.id,
      expected: fixture.expected,
      got: null,
      cascade: null,
      elapsedMs,
      error: name,
      confidence: null,
    };
  } finally {
    clearTimeout(timer);
  }
};

const printRow = (row, field) => {
  const value = row[field];
  const mark = value === row.expected ? 'ok' : 'miss';
  const extra =
    field === 'got'
      ? `\tconf=${row.confidence == null ? '-' : row.confidence.toFixed(2)}`
      : row.noul
        ? `\tnoul=${JSON.stringify(row.noul)}`
        : '';
  process.stdout.write(
    `${mark}\t${row.id}\texpected=${row.expected}\t${field}=${value ?? row.error}\t${row.elapsedMs}ms${extra}\n`,
  );
  if (field === 'got' && value !== row.expected && row.probabilities) {
    process.stdout.write(`\tprobs\t${JSON.stringify(row.probabilities)}\n`);
  }
};

process.stdout.write(
  `model\t${MODEL}\tendpoint\t${ENDPOINT}\ttimeout_ms=${TIMEOUT_MS}\tproxy=${proxyUrl ? 'env' : 'direct'}\n`,
);

process.stdout.write('warmup\n');
await decide(FIXTURES[0]);

const rows = [];
for (const fixture of FIXTURES) {
  process.stdout.write(`running\t${fixture.id}\t${fixture.topic}\t${currentOf(fixture.thread).id}\n`);
  const row = await decide(fixture);
  rows.push(row);
  printRow(row, 'got');
  if (row.capped !== row.got) {
    process.stdout.write(
      `\tcap\treaskCount=${row.reaskCount}\tjev=${row.got}\tcapped=${row.capped}\n`,
    );
  }
}

const summarize = (field, label) => {
  const hits = rows.filter((row) => row[field] === row.expected).length;
  const latencies = rows.map((row) => row.elapsedMs).sort((a, b) => a - b);
  const p95 = latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)];
  const minMs = latencies[0];
  const maxMs = latencies[latencies.length - 1];
  process.stdout.write(
    `${label}\thits=${hits}/${rows.length}\tmin_ms=${minMs}\tp95_ms=${p95}\tmax_ms=${maxMs}\tgate_hits>=${MIN_HITS}\tgate_p95<800\n`,
  );
  return { hits, p95 };
};

process.stdout.write('--- cascade from noul ---\n');
for (const row of rows) {
  printRow(row, 'cascade');
}

process.stdout.write('--- 3-way route ---\n');
for (const row of rows) {
  const mark = row.route === row.routeExpected ? 'ok' : 'miss';
  process.stdout.write(
    `${mark}\t${row.id}\texpected=${row.routeExpected}\troute=${row.route ?? row.error}\t${row.elapsedMs}ms\n`,
  );
}
const routeHits = rows.filter((row) => row.route === row.routeExpected).length;
process.stdout.write(`summary_route\thits=${routeHits}/${rows.length}\n`);

const choice = summarize('got', 'summary_jev');
const capped = summarize('capped', 'summary_capped');
const cascade = summarize('cascade', 'summary_cascade');

if (capped.hits < MIN_HITS || choice.p95 >= 800) {
  process.exit(1);
}
