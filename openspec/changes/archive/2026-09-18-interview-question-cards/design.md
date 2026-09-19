## Context

动机见 `proposal.md`。行为合同见 `specs/interview-cards/spec.md` 及对 `interview-session` / `interview-follow-up` 的 delta。

已交付：Client `startExamRoom` 空参数 `sessions.create()` → `attachInterviewer` → 一次 `session.prompt`；Host `briefCoach` / `watchCoachTurn` 抽出待答问后 `llm.stream` 写**单份** `InProgressSnapshot`（五维恒为 `null`）；甲板只在前端模块内存。`extractPendingQuestion` 与「插件不得再 prompt」保持有效。

本机 Desktop 0.2.17 所带 harness：`ctx.fs.writeText` 会递归创建缺失父目录；Host `session.create` 在未传 `workspaceId`/`cwd` 时使用 `defaults.cwd`（`process.cwd()`）。官方 runner 文档写明插件读文件用 `inject: ['fs']`。Client `sessions.list` 快照含 `current` 与每条 `cwd`。

约束不变：Host SDK 只在 `backend/src/infra/dsh/`，Client SDK 只在 `frontend/src/infra/dsh/`，禁止 `fetch('/api/...')`，禁止自建聊天，前端不算分。

## Goals / Non-Goals

**Goals:**

- 用卡片甲板替换单题快照；看守同时处理「新待答问 → 开卷卡」和「新人类作答 → 本题对照/五维」。
- 磁盘为真源：`session.json` + `cards/<id>.md`；overlay 重开从磁盘恢复。
- 开考把当前工作区目录传入 `sessions.create`。
- Host `inject` 增加 `fs`；查不到则可见失败 + `TODO`，禁止 `node:fs` 绕过。
- 改 `ARCHITECTURE.md` 的快照、看守与落盘约定。

**Non-Goals:**

- 不卸角、不场级长简报、不提示/跳过、不选文件夹。
- 不把 `sessions` 写入 Client 顶层 `inject`。
- 不把考场气泡改成 JSON。
- 不引入 `ctx.on('agent/status')` 作为交付依赖。
- 不把开卷 brief 与评分合成同一次 `llm.stream`（触发点不同）。

## Decisions

### 1. 契约改为甲板，而不是在单快照上叠字段

`shared` 以 `InterviewDeck`（`sessionId`、`topic`、`difficulty`、`archiveDir`、`cards`、`currentCardId`）取代「一份 `InProgressSnapshot`」。每张 `QuestionCard`：`id`（`Q1` / `Q1.1`）、`questionText`（抽出指纹）、`questionBrief`、`keyPoints`、`answer`（可空）、`comparison`（可空）、`scores`（维度 + `number | null`）、`status`（`pending` | `scored`）。

`watchCoachTurn` / `briefCoach` 成功时返回整份甲板。前端模块状态存甲板；「结束本场」仍 `set(null)` 并停看守。

备选：保留单快照另加 `history[]` — 否决，当前卡与历史卡形状不同，切卡会分叉 UI。

### 2. 看守两条边，配对「待答卡 ↔ 其后第一条人类作答」

现有 `awaitNewQuestion` 只比较待答问指纹。本刀在同一 `watchCoachTurn` 短超时循环里再读**最后一条非插件人类用户**可见文本：

- 待答问 ≠ 甲板最后一张卡的 `questionText` → brief 开卷、追加新卡、切到新卡、建 `cards/<id>.md`。
- 存在 `status === pending` 的当前待答卡，且出现一条人类作答，其指纹不等于该卡创建时记录的 `seedUserText` → 对该卡做对照评分、写回同一 md。

`seedUserText` 在创建卡时保存「当时日志里最后一条人类用户」文本。第一问创建时那条通常是 `INTERVIEW_OPENING_PROMPT`，因此开场种子不会被当成 `Q1` 的作答。

人类文本复用现有 events 遍历（`user/message` / `role === user`，跳过 `source.kind` 为 `tool`/`plugin`），用与助手相同的可见文本抽取。

备选：等下一问出现再评上一问 — 否决，与「交卷即评」冲突。备选：按整场结束一次评分 — 否决。

### 3. 编号由教练 JSON 给出，失败走确定性回退

开卷 brief 的 JSON 增加可选 `cardId` 与 `relation`（`followup` | `next_topic`）。合法 `cardId` 必须匹配 `^Q[1-9][0-9]*(?:\.[1-9][0-9]*)?$` 且本场未占用。

非法或缺失时：`relation === next_topic` 或无法判断且上一卡已是 `Qn.m` 的「新知识点」不确定 → 用 `Q{maxN+1}`；否则用上一卡的下一追问（`Q1` → `Q1.1`，`Q1.1` → `Q1.2`）。

评分 JSON：`covered[]`、`missed[]`、`comment`、`scores[{dimension, score, reason}]`。维度集合锁死 `BAGUA_SCORE_DIMENSIONS`。缺维或非法分数则该次评分失败（可见错误，卡仍为待答，开卷保留）。

### 4. 落盘走 `ctx.fs`，目录来自考场 `session.header.cwd`

Host `inject` 改为 `['agents', 'llm', 'agentDefaultModel', 'fs']`。适配层 `await resolve(rel, { cwd: header.cwd })` 得到 FsTarget 后调用 `writeText(target, text, undefined, undefined, { mode: 'workspace-write', workspaceRoot: header.cwd })`（本机 local backend 会 `mkdir` 父目录；不得把路径字符串直接传给 `writeText`；省略沙箱策略时部署默认 `read-only` 会拒绝写入）。相对路径：

```text
study/interview-dsh/<yyyyMMdd-HHmm>-<slug>/session.json
study/interview-dsh/<yyyyMMdd-HHmm>-<slug>/cards/<cardId>.md
```

`<slug>` 由主题生成（非空 ASCII/中文保留，空白改 `-`，长度上限避免超路径）。`session.json` 与甲板同构，是恢复真源；md 由同一对象渲染，失败只报错不回滚 JSON（JSON 已成功则面板仍可恢复）。

领域层只拿 `WorkspaceArchive` 端口（`writeDeck` / `readDeck`），不 import `fs`。

备选：`ctx.storage` JSON KV — 否决，产品要工作区可见文件。备选：Host 直接 `node:fs` — 否决，与官方 `inject: ['fs']` 冲突。

### 5. 开考必须显式传工作区，禁止空 `create()`

Client 在已探测的 `sessions` 上读 `list.getSnapshot()`：优先 `byId[current].cwd`，否则当前选中 workspace 的 path（若 `workspaces` 能 `ctx.get` 到）。将其作为 `create({ cwd })` **或** `create({ workspaceId })`（二者不可同时传，Host schema 会拒）。

Host `session.create` 源码：`cwd = workspace?.path ?? payload.cwd ?? process.cwd()`。空 create 会把 `study/` 写进 Desktop 进程目录，必须当成 `persist_unavailable`。

`briefCoach` 时 Host 再核对 `agents.get(sessionId).session.header.cwd`；缺失则可见失败，不写盘。

### 6. 面板一次一张卡，左右为按钮

`InProgressPanel` 接收甲板：编号条、上一题/下一题按钮、当前卡正文（开卷 / 作答 / 对照 / 五维）。切卡只改 `currentCardId`（可先改前端状态，下一次 watch 以 Host 甲板为准；Host 在用户切卡时不必同步，除非增加 `selectCard` remote — 本刀切卡为纯前端，重开 overlay 默认最新卡）。

备选：切卡也写 `session.json` 记住浏览位置 — 推迟，重开停在最新卡即可。

## Risks / Trade-offs

- [Risk] 开场 `session.prompt` 在日志里是普通用户消息，误评成 `Q1` → 创建卡时记下 `seedUserText`，只对**之后**的人类作答评分。
- [Risk] `inject: ['fs']` 在某 profile 失败导致整个 Host `apply` 挂掉 → 适配层对缺失 `fs` 映射 `persist_unavailable`；若顶层 inject 会使 apply 失败，则改为 `ctx.get('fs')` 探测（与 Client 对 `sidebarRight` 相同），并在面板可见失败。实现时以 Desktop 实机为准，不得用 `node:fs`。
- [Risk] `fs/write-intent` 无 actor 被沙箱拒绝 → 可见失败 + `TODO`；不降低为静默跳过落盘。
- [Risk] 省略 `writeText` 的 per-call `sandboxPolicy` 时，`dsh-fs-sandbox` 走插件根 `sandboxPolicy.resolve()`，部署默认 `read-only` 会拒绝工作区写入 → 必须显式传 `workspace-write` + 本场 `header.cwd`。
- [Risk] 教练编号抖动（同题先 `Q1.1` 后改 `Q2`） → 只在**新建卡**时取号，已有卡 id 永不改。
- [Risk] 两次 `llm.stream`（开卷 + 评分）拉长一轮 → 触发点不同，允许并行；失败互不影响已成功的那一侧。
- [Risk] `sessions.list` 形状与类型不完全一致 → 鸭子类型读 `cwd`；读不到则拒开考。
- [Trade-off] 切卡浏览位置不落盘 → 实现简单；重开总是最新卡。
- [Trade-off] 编号靠模型 → 回退规则保证不丢卡，链可能偶发不准，可用「刷新本题」重 brief 开卷但不改已占用 id。

## Migration Plan

- 已安装插件：重新 `dsh plugin add` / 重载。进行中的内存快照无磁盘，不迁移旧场。
- 回滚：去掉甲板与 `fs` inject，恢复单快照看守；工作区已写出的 `study/interview-dsh/` 文件保留不删。
- 归档时把主规格里「单快照替换」「五维恒为空」改为甲板语义，不得把本刀任务回填进已归档 change。

## Open Questions

无。编号回退、开考 cwd、`fs` 探测失败策略已在 Decisions 钉死；Desktop 上 `inject: ['fs']` 是否能进 apply 只影响适配层写法，不改 spec。
