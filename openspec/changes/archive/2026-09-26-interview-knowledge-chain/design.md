## Context

行为见 `specs/interview-knowledge-chain/spec.md` 及对 `interview-session`、`interview-follow-up`、`interview-cards`、`interview-entry`、`interview-round-close` 的 delta。动机见 `proposal.md`。

现状：`assembleInterviewerPersona` 在开场把梯度口号写进人设；`INTERVIEW_OPENING_PROMPT` 与新一轮开口都把「请按人设…」放进 `session.prompt`，Desktop 上这会留下用户气泡。`assembleCoachBriefPrompt` 只收到主题、难度和抽出来的待答问，自己猜 `followup` / `next_topic`。评分对照的是事后要点。`systemPrompt.section` 已用于 `deployment:persona`（order 0）和 `deployment:round-close`（order 1），正文不进气泡。追问阶段禁止再 `session.prompt`。教练补全用 `agentDefaultModel`。

## Goals / Non-Goals

**Goals:**

- 题干落地时，同一次 brief 补全写出知识链；代码裁剪后挂上 `interview:chain`，替换上一题。
- 难度表在领域层，不在人设形容词里。
- 卡片详情只显示考察层和考察意图；编号按三档或换知识点判定。
- 插件可见用户句收成开场短句与「结束面试」。结束前摘掉知识链 section。

**Non-Goals:**

- 不上 Jev 或任何外部决策 API，不另配 Key，不新增会说话的 Agent。
- 不在面板展示三档约束，不加提示/跳过按钮。
- 不暂停宿主生成，不把评分回流进考场气泡。
- 不改 3.1 卡片流交互，只在详情增加两行。
- 不实现跑题专流程、项目深挖、死题库。

## Decisions

### 1. 知识链并进现有 brief 补全

`assembleCoachBriefPrompt` 的 JSON 增加 `pointName`、`layer`、`intent`、`moves`（`deep` / `partial` / `miss` 各一句）。仍是一次 `llm` 补全，模型仍是 `agentDefaultModel`。解析失败则整段知识链视为缺失，要点路径按今天的 `questionBrief` + `keyPoints` 回退，并返回可见错误码。

备选：知识链单独再调用一次。否决，题干落地到候选人开答之间会多一次等待，规格要求与要点同一次完成。

### 2. 难度裁剪在代码里，section 只接收裁剪结果

领域服务持有难度表（起手层、允许层、题数上限、高级「答到了」必须换前提或换规模、边界层最多 1 问）。模型给出的 `layer` 越界时改到允许的最高层。同一知识点已达上限时，section 正文只写「下一问必须换知识点」，不写三档深挖。section 由代码从裁剪后的对象渲染，不把模型原文原样挂上。

第一问的起手层写在 `assembleInterviewerPersona`，因为第一问发生在链之前。人设删掉「按梯度推进」作为追问策略的那条，改为：第一问之后只遵守 `interview:chain` 中的一档，一次一问，短讲评，可用 `【本题】`，禁止输出 JSON 与链上档名。

备选：把难度表写进系统提示让模型自己遵守。否决，初级仍可能被写成边界层。

### 3. section 名称与生命周期

新段名 `interview:chain`，order 2，排在人设和收尾段之后。每题替换前先 dispose 上一题的 disposer，接法与 `deployment:round-close` 相同：必须当方法调用 `systemPrompt.section`，不能拆下来当函数。Host 适配层只负责挂载和摘除，不组装文案。

结束本轮：先摘 `interview:chain`，再挂收尾段，然后才允许那一次「结束面试」`prompt`。新一轮开口前收尾段仍按现规格摘掉；知识链此时应已空，直到新一轮第一问 brief 成功再挂。

备选：把三档写进人设 section 末尾一起替换。否决，人设要跨题稳定，链要逐题替换，混在一段里容易把收尾也带上追问指令。

### 4. 对话里不出现导演句

`INTERVIEW_OPENING_PROMPT` 改为全文「开始本场八股专项模拟面试。」。新一轮可见开口改为「上一轮已经结束。开始新一轮：主题「{主题}」，难度「{难度}」。」。起手层、一次一问、「请按人设」只留在人设 section。知识链、评分 prompt、要点 JSON 没有通向 `session.prompt` 或消息 append 的函数。单测断言这两条可见常量，并断言组装出的 section 文本不会被传给 `prompt`。

面试官仍可能不服从 section。规格把这视为编号回退，不为此再发一条纠正消息。

### 5. 编号与卡片字段

下一题 brief 的 user 材料带上上一题裁剪后的三档或「必须换知识点」。补全增加 `matchedMove`：`deep` | `partial` | `miss` | `switch`。代码据此设 `relation`：前三者为 `followup`，`switch` 或配额已满为 `next_topic`。缺 `matchedMove` 时沿用 `assignCardId` 的现有回退。

`shared` 卡片增加 `layer` 与 `intent`，给详情展示。`moves` 不出 `shared` 的面板响应，前端拿不到三档。落盘的 `cards/<id>.md` 写入考察层与考察意图，不写三档。

评分 prompt 的 user 材料改为考察意图、考察层、要点、作答。链缺失时仍只送要点与作答。

### 6. 失败可见

section API 缺失或抛错：沿用 `inject_unavailable`，面板可见，不挂半截链。JSON 解析失败：沿用要点失败或单独的链失败可见文案，卡片不丢。两种失败都不得 `session.prompt`。

## Risks / Trade-offs

- [Risk] 面试官忽略 section，下一问仍跑题 → 不追加纠正气泡；编号走回退；桌面验收看气泡是否干净，不把「每一问都完美踩档」写成唯一过关条件。链挂不上时面板必须可见。
- [Risk] 开场短句改动让旧单测断言长文案失败 → tasks 里先改常量与对应测试，再改调用处。
- [Risk] 结束时链段还在，收尾句又被要求继续追问 → 结束路径先摘链，单测锁顺序。
- [Risk] 详情露出三档，候选人等于看到追问路径 → `moves` 不到前端；详情只渲染层和意图。

## Migration Plan

无磁盘迁移。已有轮次的卡片没有 `layer` / `intent` 时，详情不显示这两行，不回填旧档。回滚：去掉 `interview:chain` 的挂载与 brief 新字段，开场常量恢复长文案；已写出的新卡片多两行考察信息，旧读法可忽略。

## Open Questions

无。新一轮可见开口的句子已在 Decisions 第 4 点定死，实现不得再改成带「请按人设」的版本。
