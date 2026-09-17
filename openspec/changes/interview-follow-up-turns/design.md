## Context

动机见 `proposal.md`。行为合同见 `specs/interview-follow-up/spec.md`。

当前实现：Client `startExamRoom` 一次 `session.prompt` 开口，Host `briefCoach` 用 `readFirstQuestion` 取 **第一条** 助手消息后 `llm.stream` 写快照。进行中面板把快照存在 React state，之后不再问 Host。人设已要求一次一问；Desktop 0.2.17 上考场 Agent 在用户从宿主输入框提交后会自己进入 `running` 再回到 `idle`。bundled `dsh-session` 仍是 `deriveMessages()`，没有 `snapshotEvents()`。Host `inject` 仍是 `['agents', 'llm', 'agentDefaultModel']`。Typert remote 只有 request/response，没有推送。

约束不变：Host SDK 只在 `backend/src/infra/dsh/`，Client SDK 只在 `frontend/src/infra/dsh/`，禁止 `fetch('/api/...')`，禁止自建聊天。

## Goals / Non-Goals

**Goals:**

- 后续轮次只 **看守** 考场 Agent，不再 `session.prompt`。
- 读 **最后一条人类用户之后** 的面试官可见题干（优先 `session.events`，含流式 `text-delta`）；与内存里上一题原文不同且 Agent 空闲后再 brief。
- Client 用短超时 remote 循环拉取；卸载后面板不再应用结果。
- 实现后改 `docs/architecture/ARCHITECTURE.md` 的会话与教练读日志约定，使其与本设计一致。

**Non-Goals:**

- 不在本设计里引入 `ctx.on('agent/status')` 作为交付依赖（符号存在，但插件根作用域是否收得到未在本机验过）。
- 不改入口槽位、不新增 Client 顶层 `inject`、不把 `sessions` 写进顶层 inject。
- 不设计评分更新、提示/跳过、停止卸角。

## Decisions

### 1. 追问走宿主回合，插件只刷新会话 B

候选人在考场对话输入框作答后，已挂上的 `deployment:persona` 驱动面试官下一问。插件不得再 `binding.session.prompt`，避免多一条催问用的用户种子气泡。

备选：每轮由插件 `prompt` 一次 — 否决，违反 spec「不得注入假用户回合」，也会打断宿主输入。

### 2. 题干指纹存在 Host 内存，不靠面板摘要比对

`backend/src/data/` 增加本场记录：`sessionId`、`topic`、`difficulty`、`lastQuestionText`、最新 `snapshot`。第一次 `briefCoach` 成功即写入。后续只比较 **助手原文**，因为面板 `questionBrief` 是摘要，不能当指纹。

备选：Client 把 `questionBrief` 传回当 baseline — 否决，摘要不等于题干，会误刷新或漏刷新。

### 3. `watchCoachTurn` 短超时轮询，而不是事件推送

新增 Host remote `watchCoachTurn({ sessionId })`：

- 无本场记录 → `follow_up_failed`（可见）。
- 在时限内（建议 15–20s）轮询 `agents.get(sessionId)`：优先 `session.events`（人类对话，含 `text-delta`）取 **最后一条人类用户之后** 的面试官可见题干；`deriveMessages()` / `snapshotEvents()` 作回退。题干变化后 `whenIdle()`，`status === 'running'` 时不 brief 半句。
- 空闲且文本非空且 ≠ `lastQuestionText` → 走现有教练补全，更新 store，返回 `{ ok: true, status: 'updated', snapshot }`。
- 时限到仍无新题 → `{ ok: true, status: 'unchanged' }`，让 Client 在仍挂载时再调。

Client 进行中视图 `useEffect` 循环调用；`cancelled` 后丢弃结果。features 只打在 port 上。

备选：Typert 事件推送 — 否决，当前 `events: []`，Desktop 0.2.17 未走这条。备选：插件根 `ctx.on('agent/status')` — 推迟；本刀用与第一问相同的鸭子类型轮询，失败则 `TODO` + 可见错误。

### 4. 把 `readFirstQuestion` 收成「读最新助手题干」

`coach.ts` 现有 `firstAssistantText` 在多轮会永远停在 Q1。服务层改为 `readLatestQuestion`；第一问时最新即第一问。教练 user 文案改为「面试官当前问题」，不要写死「第一问」。`llm.stream` 仍不得 append 到对话。

### 5. 取消语义落在 Client 循环 + Host 短超时

Typert 调用没有可靠 Abort。Host 单次看守必须超时返回，禁止无限挂起。面板关闭后 Client 停循环并忽略 in-flight；Host 即使把 store 写成新快照，也不再写已卸载的 React state。教练 `complete` 能接 AbortSignal 则接，接不到也不阻塞本刀。

## Risks / Trade-offs

- [Risk] 面试官一次输出多问 → 人设已约束一次一问；桌面抽查下一问数量。面板按整段最新助手消息 brief，不拆句。
- [Risk] 流式中途被当成新题 → 仅在 `status !== 'running'`（缺 `status` 则连续两拍文本稳定）后 brief。
- [Risk] 15–20s 超时导致要点晚于气泡出现 → Client 立即再 watch；可接受的延迟，换可取消性。
- [Risk] 教练刷新失败 → 面板报错并保留上一题快照；对话里的追问不受影响。
- [Risk] `whenIdle` 在已空闲时立刻 resolve，不能单独用来等下一轮 → 以题干指纹变化为主，status/空闲只作「说完了」门闩。

## Migration Plan

- 已安装插件：重新 `dsh plugin add` / 重载后，**打开本机已装 DSH Desktop** 再测作答追问。上一刀第一问通过记录不得复用为本刀验收。
- 回滚：去掉 `watchCoachTurn` 与 Client 循环，面板停在第一问；考场对话里的原生追问仍在（人设未卸）。
- 不迁移磁盘数据。归档上一刀时改写其「MUST NOT 处理追问」句，不在本刀回填 tasks。
- 打不开 Desktop 时停止在 tasks 5.3 未勾选，不把仓库测试写成交付。

## Open Questions

无。Desktop 目标仍是 0.2.17；读日志符号沿用上一刀的鸭子类型。
