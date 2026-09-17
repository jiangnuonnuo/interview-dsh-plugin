## Context

动机见 `proposal.md`。行为合同见 `specs/interview-follow-up/spec.md`。

已交付（仓库 HEAD）：Client `startExamRoom` 一次 `session.prompt` 开口；Host `briefCoach` / `watchCoachTurn` 从会话日志取最后一条人类用户之后的面试官可见文本，空闲后 `llm.stream` 写快照；进行中快照在模块状态，overlay 关闭后可恢复；`openDetails()` 让对话列让出右栏。人设已要求一次一问。Desktop 0.2.17 上考场 Agent 在用户从宿主输入框提交后会自己进入 `running` 再回到 `idle`。bundled `dsh-session` 仍是 `events` + `deriveMessages()`。Host `inject` 仍是 `['agents', 'llm', 'agentDefaultModel']`。Typert remote 只有 request/response，没有推送。

现行缺口已用失败测试钉死（`coach-runtime.test.ts`「uses only the pending question when the interviewer lectures then asks」）：`readLatestQuestion` 返回整段「点评 + 待答问」。看守能发现文本变了，但教练 user 吃进讲评，`questionBrief` 会停在上一主题。

约束不变：Host SDK 只在 `backend/src/infra/dsh/`，Client SDK 只在 `frontend/src/infra/dsh/`，禁止 `fetch('/api/...')`，禁止自建聊天。

## Goals / Non-Goals

**Goals:**

- 后续轮次只 **看守** 考场 Agent，不再 `session.prompt`。
- 读最后一条人类用户之后的面试官可见文本，再抽出 **当前待答问**；指纹与 brief 都用抽出结果，不用整段气泡。
- 提供面板「刷新本题」强制再 brief，作为抽取或轮询仍对不齐时的回退。
- Client 用短超时 remote 循环拉取；卸载后面板不再应用结果。
- 实现后改 `docs/architecture/ARCHITECTURE.md` 的会话与教练读日志约定，使其与本设计一致。

**Non-Goals:**

- 不把考场对话改成 JSON / 函数调用 / 面板专用载荷。
- 不在本设计里引入 `ctx.on('agent/status')` 作为交付依赖。
- 不改入口槽位、不新增 Client 顶层 `inject`、不把 `sessions` 写进顶层 inject。
- 不设计评分更新、提示/跳过、停止卸角。
- 不用第二次 LLM 专门做「从气泡里再抽一次题」；抽出是 Host 确定性规则，会话 B 只 brief 抽出后的待答问。

## Decisions

### 1. 追问走宿主回合，插件只刷新会话 B

候选人在考场对话输入框作答后，已挂上的 `deployment:persona` 驱动面试官下一问。插件不得再 `binding.session.prompt`，避免多一条催问用的用户种子气泡。

备选：每轮由插件 `prompt` 一次 — 否决，违反 spec「不得注入假用户回合」，也会打断宿主输入。

### 2. 题干指纹存在 Host 内存，比较的是待答问而不是整段气泡

`backend/src/data/` 本场记录：`sessionId`、`topic`、`difficulty`、`lastQuestionText`、最新 `snapshot`。`lastQuestionText` SHALL 存抽出后的待答问。面板 `questionBrief` 仍是摘要，不能当指纹。

备选：Client 把 `questionBrief` 传回当 baseline — 否决，摘要不等于题干。备选：指纹用整段助手气泡 — 否决，正是第 5 轮跟错讲评的原因。

### 3. `watchCoachTurn` 短超时轮询，而不是事件推送

新增 Host remote `watchCoachTurn({ sessionId, force? })`：

- 无本场记录 → `follow_up_failed`（可见）。
- `force !== true` 时：在时限内轮询 `agents.get(sessionId)`，取最后一条人类用户之后的面试官可见文本并抽出待答问；`status === 'running'` 时不 brief 半句；空闲且待答问非空且 ≠ `lastQuestionText` → brief。
- `force === true` 时：立刻读当前待答问并 brief，即使与 `lastQuestionText` 相同。
- 时限到仍无新待答问 → `{ ok: true, status: 'unchanged' }`。

Client 进行中视图 `useEffect` 循环调用（不带 `force`）；「刷新本题」另发一次 `force: true`。`cancelled` 后丢弃结果。features 只打在 port 上。

备选：Typert 事件推送 — 否决，当前 `events: []`。备选：插件根 `ctx.on('agent/status')` — 推迟。

### 4. 把「读最新助手文本」收成「读当前待答问」

`readLatestQuestion` / `awaitNewQuestion` 在拿到最后一条人类用户之后的面试官可见文本后，再走确定性抽出。教练 user 只放待答问，并写明忽略点评/揭晓。`llm.stream` 仍不得 append 到对话。

抽出规则（按顺序；2026-09-17 八轮实机校准）：

1. 存在 `【本题】`：取其后方非空文本。
2. 否则从文末向前**先跳过**不含 `？`/`?` 的议程/收束段（例如「说完这点后，我们再回头看另外两个维度」），再收集连续含问号的段落。列表里的两问算同一待答问。
3. 否则整段（首问、或没有问句的短回合）。

不要在第一步就 `break`：八轮里第 2 轮把待答问放在中间、文末是议程，若遇无问号立刻停止会退回整段讲评。

备选：考场气泡输出 JSON，面板抓 `question` 字段 — 否决。对话表面归宿主，JSON 会破坏面试口气，模型也常把 JSON 包进散文；会话 B 已经是面板用的结构化输出。备选：点刷新时再让 LLM 从整段气泡里抽题 — 否决为默认路径。多一次补全、仍可能抽偏；确定性规则可单测对齐第 5 轮原文。刷新按钮只负责「再 brief 一次已抽出的待答问」。

### 5. 取消语义落在 Client 循环 + Host 短超时

Typert 调用没有可靠 Abort。Host 单次看守必须超时返回。面板关闭后 Client 停循环并忽略 in-flight。强制刷新同样遵守卸载丢弃。

### 6. 人设只降低混合回合的概率，不代替抽出

人设可要求：纠正上一问时一两句说完，然后只留一个待答问；可用 `【本题】`。人设 **MUST NOT** 要求考场输出 JSON。第 5 轮已经证明模型会在同气泡里讲评 + 提问，抽出规则是合同，人设是减负。

## Risks / Trade-offs

- [Risk] 讲评里也有反问句，文末规则可能切错 → 人设把待答问放最后；`【本题】` 优先；刷新按钮可重 brief。单测覆盖：讲评无问句+文末一问；问句后跟议程；列表两问。
- [Risk] 面试官一次抛出两问 → 取跳过议程后的连续问句（联合索引那种两问算一题）；Desktop 抽查仍应是一个待答主题。
- [Risk] 要点晚于气泡（八轮第 5 轮对话已问页分裂、面板曾停在哈希）→ Client 立即再 watch；「刷新本题」可立刻重 brief。
- [Risk] 流式中途被当成新题 → 仅在 `status !== 'running'`（缺 `status` 则连续两拍文本稳定）后 brief。
- [Risk] 15–20s 超时导致要点晚于气泡出现 → Client 立即再 watch。
- [Risk] 教练刷新失败 → 面板报错并保留上一题快照。
- [Risk] `whenIdle` 在已空闲时立刻 resolve → 以待答问指纹变化为主，status/空闲只作「说完了」门闩。

## Migration Plan

- 已安装插件：重新 `dsh plugin add` / 重载后，**打开本机已装 DSH Desktop** 再测作答追问，并至少覆盖一轮混合「点评 + 新问」。三轮纯提问通过记录、上一刀第一问记录不得复用为本刀验收。
- 回滚：去掉抽出规则与 `force` 后，行为回到「整段气泡 brief」；考场对话里的原生追问仍在。
- 不迁移磁盘数据。归档上一刀时改写其「MUST NOT 处理追问」句，不在本刀回填 tasks。
- 打不开 Desktop 时停止在 tasks 5.3 未勾选，不把仓库测试写成交付。

## Open Questions

无。A（考场结构化）与 B（只手动刷新）已用八轮实机否决/改写为「Host 抽待答问 + 面板强制刷新」。Desktop 目标仍是 0.2.17。
