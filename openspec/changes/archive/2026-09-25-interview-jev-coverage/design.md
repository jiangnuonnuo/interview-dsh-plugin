## Context

见 `proposal.md` 的 Why。现状：`watchCoachTurnSession` 在读到新作答后调用一次 `runtime.complete`，`parseCoachScoreOutput` 同时拿出 `coverage`、对照和五维；`coverage` 合法才按 `interview-answer-guidance` 留卡或开卡。面试官在考生发送时已经生成，追问路径禁止再 `session.prompt`。

探针（`probe/jev-coverage-probe.mjs`）已打通 `POST https://api.typesafe.ai/v1/systemone`、`jev-1.13.0`：热身后约 300–450ms；完整 `Q1…Qn.m` 题链后，子问上的 `reask` / `next` 可重复。五档里 `wide_gap` 仍会与 `miss` / `deepen` 打架。同一知识点满 3 次 `reask` 后由代码强制 `next`，盖帽后金标 10/10。因此 Jev 只做可选加速，对照补全始终是默认路径和失败回退。

## Goals / Non-Goals

**Goals:**

- 入口可配置开启或关闭 Jev；默认关闭。
- 开启必须填齐必要信息（API 密钥）；缺项不得当作已开启。
- 领域层只有定档端口：开启且命中则用 Jev（再加 reask 盖帽），否则走现有对照 `coverage`。
- 发给 Jev 的是整条知识链，不是单句作答。
- 密钥与开关有固定落盘位置；不进各轮考场档案、不进卡片 md。

**Non-Goals:**

- 不让 Jev 指挥面试官开口，不申请发送拦截。
- 不上 Laya、不把五维改成 Jev `score`、不用 Jev 写要点或知识链。
- 不把 Jev 做成开始面试的必填第三步。
- 不让环境变量在开关关闭时自动开启 Jev。
- 不把密钥写入各轮 `round-*`、`cards/*.md`、`qa.md` 或 `summary.md`。
- 不用 `node:fs`、不用用户主目录、不猜 Host 官方密钥槽。

## Decisions

### 1. 默认关闭，配置固定写在 `.dsh-interview/config/jev.json`

本场是否走 Jev 只认该文件里的 `enabled`（缺省 `false`）且 `apiKey` 非空。入口「面试设置」下折叠「卡片判断」：开关 + 密钥框。主题与难度仍是开始主路径。

**固定路径（工作区相对，经 Host `ctx.fs.resolve` 再写）：** `.dsh-interview/config/jev.json`

文件形状：

```json
{ "enabled": false, "apiKey": "" }
```

文件不存在、无法解析或 `enabled` 不是 `true`：视为关闭，不发 Jev。`enabled` 为 `true` 但 `apiKey` 为空：配置区可见失败，视为未开启。该路径 MUST NOT 落在 `.dsh-interview/<sessionId>/` 或任何 `round-*` 下。`sessionArchiveRoot` MUST 拒绝 sessionId `config`，避免考场目录与配置目录撞车。`.dsh-interview/` 已在 `.gitignore`，本文件不得打进 git 或分发包。

读写走 `backend/src/data/` 的配置仓储，与 `workspace-archive` 同一套 Host `fs` 策略。入口用独立 `getJevConfig` / `saveJevConfig`：加载只回 `enabled` 与 `apiKeySet`（布尔），MUST NOT 把密钥回传前端。开启并写入前，infra 用该密钥对 Jev 做一次连通探测（HTTP 200 才算通过）；失败返回 `jev_unreachable`，MUST NOT 写文件。密钥框非空则覆盖 `apiKey`；框空且已有密钥则探测原密钥。关闭开关保存时不探测，`enabled=false` 且可保留密钥。点「开始模拟面试」且开关为开时，先走同一套探测再开考。落盘失败映射现有 `persist_unavailable`，在配置区可见，不得空 catch。infra 适配层经该仓储决定是否发 HTTP；`startInterview` / `watchCoachTurn` 请求体不得带密钥。

开启的必要信息只有密钥。接口与模型不开放配置：固定 `POST https://api.typesafe.ai/v1/systemone`，`model` 钉 `jev-1.13.0`。环境变量 `TYPESAFE_API_KEY` / `JEV_API_KEY` 不是运行时真源（探针除外），不得在文件 `enabled=false` 时自动走 Jev。

备选：只放 Host 内存、查不到官方槽就 `TODO`。否决，用户要固定位置、跨场复用。备选：写进各轮 `session.json`。否决，密钥进考场档案。备选：用户主目录或 `node:fs`。否决，沙箱只允许 Host `ctx.fs`。备选：入口把 Key 当开考必填。否决，主题与难度仍是主路径。

### 2. 领域端口，Jev SDK 不进 services

`backend/src/services/` 只依赖窄端口：「根据本条知识链给出五档或 `unavailable`」。未开启、密钥缺失、HTTP 失败都返回 `unavailable`。`watchCoachTurnSession` 在 `unavailable` 时把开卡真源留在 `parseCoachScoreOutput().coverage`。URL、Bearer、model 名只出现在 `backend/src/infra/`。领域层不 `fetch`、不读环境变量、不读开关。

备选：看守里直接调 Jev。否决，破坏「领域不引用 Host / 外部 SDK」。

### 3. 两条链路怎么并

**未开启或 `unavailable`：** 不拆并行，一次 `complete` 同时定档与评分，行为等于今天。

**已开启：** 定档请求与对照补全并行。定档命中：开卡所用 `coverage` 以 Jev 为准（先做 reask 盖帽），对照 JSON 里的 `coverage` 丢弃；评语和五维仍等补全写回原卡。`deepen` / `reask` / `next` 在评语未到时就可以进入现有 `appendNewCard`。`miss` / `wide_gap` 在评语未到时也不展示「正在准备下一题…」。挂或替换 `interview:chain` MUST 等考场 Agent `whenIdle`：Jev 比面试官开口快，中途改系统段会让宿主重走 route plan，表现为 `502` / `route_plan_error` / content blocked。面板仍可先按 Jev 档更新当前卡。宿主若把该 502 JSON 写进助手气泡，题干抽取 MUST 丢弃，不得 brief 成下一题。

Jev 命中且对照失败：开卡仍按 Jev；原卡对照按现有 `coach_unavailable`。两边都没有合法 `coverage`：现有 `coverage_unavailable`。Jev 失败且对照成功：按对照档开卡，不把 Jev 失败当成定档失败。

备选：始终等评语再开卡。否决，接 Jev 几乎不加快卡片。命中时对照 prompt 仍要 JSON 以免解析分叉，代码忽略其中的 `coverage`。

### 4. state 是整条 Qn…Qn.m 题链

`state` 为结构化对象：主题、难度、当前卡编号、同一知识点已 `reask` 次数、硬性上限 3，以及知识链数组。每张卡带：编号、关系（正式问/追问）、面试官题干、考察层、考察意图、摘要、要点、各轮作答 `a1/a2…`、已定档或「待判断」。`questions.coverage` 为 `choice`，键与 `AnswerCoverage` 一致。

备选：只发当前作答。否决，探针证明缺题干和父卡会把子问判飘。备选：等对照模型写完再交给 Jev。否决，定档又回到等生成。

### 5. 三次 reask 由代码盖帽

同一 `Qn` 链上，统计前面卡 `coverage === 'reask'` 的次数。已满 3 次：无论端口返回 `reask` / `deepen` / `miss` / `wide_gap`，开卡都按 `next`。未满 3 次不改档。提示词里同步写上限，但以实现层盖帽为准——探针里 Jev 在「满 3 次仍答不会」时仍会给 `miss`。

备选：只靠 Jev 提示词。否决，探针未 10/10。备选：连 `deepen` 次数也计入。否决，本刀只限制 `reask`。

### 6. 依赖、超时与取消

用运行时 `fetch`，不新增 npm 包。超时 2s。请求带 `AbortSignal`，会话结束或看守取消时中止。日志与错误码不得带 Token。Host 沙箱剥掉出网时表现为失败回退，不得空 catch 成成功定档。

备选：官方 Jev SDK。否决，本刀只多一个 POST。

### 7. 文档

`docs/architecture/ARCHITECTURE.md`：教练补全仍用 `llm` + `agentDefaultModel`；定档允许可选外部决策端口，默认关闭，失败回退对照 `coverage`；工作区配置文件是 `.dsh-interview/config/jev.json`，与 `<sessionId>/round-*` 分开。`docs/product/REQUIREMENTS.md`：入口可折叠卡片判断，默认关闭，开启需密钥并写入该固定路径，不是开考必填。方案图见 `SOLUTION.md` 与 `diagrams/`。

## Risks / Trade-offs

- [Desktop 读不到配置或不能出网] → 视为未开启或失败，回退对照；桌面验收以默认关闭路径为必核。
- [五档 `wide_gap` 仍可能被判成 `miss`/`deepen`] → 未开启不受影响；已开启时用整条题链降低子问误判，用三次 `reask` 盖帽防止同一题无限拆开。不承诺五档 10/10。
- [Jev 与面试官口头不一致] → 卡片以后判定档为准；不 `prompt` 改口。
- [密钥写进 round 档案或前端 remote 响应] → 契约与单测禁止；只允许 `.dsh-interview/config/jev.json`。
- [工作区 fs 写配置失败或没有 `header.cwd`] → `persist_unavailable` 显示在卡片判断区，本场视为未开启；不得改用 `node:fs` 或进程 cwd。
- [钉死 `jev-1.13.0`] → 换模型号另开 change。

## Migration Plan

进行中的轮次没有定档来源字段，不必迁档案。默认关闭，旧安装行为与本刀之前相同。回滚：去掉定档端口即回到一次对照 JSON。不改开场句、结束句、未满 3 次时的编号规则。

## Open Questions

无。开关默认、固定配置路径、回退、题链上下文和三次盖帽已由规格与本节钉死。
