## Context

入口 change 已归档：`acceptEntryConfig` 只把主题/难度写入内存 store，面板成功后停在「待开考」。Host 适配层目前只 `provide('interviewEntry')`，没有 Agent 注入或第二条会话。见 `proposal.md` 的 Why。约束见 `docs/architecture/ARCHITECTURE.md` 的分层、DSH 适配层、会话隔离与安全边界：Host SDK 只在 `backend/src/infra/dsh/`，Client SDK 只在 `frontend/src/infra/dsh/`，禁止自建聊天，查不到注入 API 时标 `TODO` 而不是绕过。

当前 Desktop 目标仍是 0.2.17。本机 GUI 运行时是 harness **0.1.5-rc.1**（PATH 上的 CLI 仍可能显示 0.1.1-rc.2）。对照本机 SDK 后：没有「注入当前编码对话 / 原地切断历史 / 助手无用户消息先开口」的公开 API。开考改为新开一条 DSH 对话当考场 A。

## Goals / Non-Goals

**Goals:**

- 合法开始后：会话 A 是新开的 DSH 对话（考场）；会话 B 只服务面板；第一问进 A 的宿主气泡；要点进面板。`sessions.open` 之后用户看见的就是这条考场对话。
- 提示词从 `interviewer-role-prompt.md` 八股专项参数化（岗位/主题/难度），不另配模型。
- 注入失败对面板可见；适配层对缺失 API 写 `TODO` + 结构化错误码。
- 契约进 `shared/`；评分判定留在后端（本 change 面板只占位）。

**Non-Goals:**

- 不设计提示/跳过按钮、停止卸角、`study/` 落盘、作答后追问与五维打分更新（后续 change）。
- 不引入新 npm 依赖或修改 DSH 核心。
- 不把教练上下文拼进会话 A 的 system 提示。

## Decisions

### 1. 校验走 Host remote；考场 A 由 Client `sessions` 创建

保留 `acceptEntryConfig` 的校验与落 store。Client 不调 Host Agent API。开考编排在 Client 适配层：`acceptEntryConfig` → `sessions.create` → Host `attachInterviewer` → `session.prompt` → `sessions.open` → Host `briefCoach`。`sessions` 用嵌套 inject，不得写进 Client 顶层 `inject`。

备选：把面试官注入用户正在看的编码对话 — 否决，本机没有切断场前历史的公开 API。备选：Client 直接调 `agents` — 否决，沙箱没有 Agent 生命周期。

### 2. 会话 A = 新 DSH 对话 + Host persona；会话 B = Host `llm.stream`

- **A**：Client `sessions.create()` 得到空白会话（不 fork）。Host `ctx.agents.get(sessionId)` 在 **agent.ctx** 上 `systemPrompt.section({ name: 'deployment:persona', order: 0 })`，不要 `complete: true`。开口仍用 `session.prompt`（会留下用户种子气泡）。`sessions.open` 切到这条考场对话。
- **B**：Host `agent.whenIdle()` 后从会话日志取第一道助手题干（Desktop 0.2.17 bundled `dsh-session` 是 `deriveMessages()`，不是 0.1.5-rc.1 类型里的 `snapshotEvents()`），再 `ctx.llm.stream`（`agentDefaultModel.currentSelection()` 的同一模型）。输出只写入进行中快照，不 `append` 到对话。

备选：两条都显示在 DSH 对话 — 否决，违反双会话表。备选：面板 fetch 外网模型 — 否决，另配 AI。

### 3. 提示词组装在 `backend/src/services/`，注入在 `infra/dsh/`

服务层把八股模板填成纯文本；适配层只负责「交给哪条会话」。领域层不 import Host SDK。

### 4. 面板状态机：配置中 → 进行中（或错误）

去掉「待开考」作为成功终态。进行中视图仍在同一 overlay/右栏：主题、题干摘要、要点、五维空位。`features/` 不 import Client SDK；不出现消息列表。

### 5. 缺失 API 的失败契约

`StartInterviewResponse` 使用显式 `code`（如 `inject_unavailable` / `coach_unavailable` / `first_question_failed`），`message` 给人看。适配层注释写清查过的 Host 符号。禁止空 catch。

## Risks / Trade-offs

- [Risk] harness 0.1.1-rc.2 没有注入或不读历史的 API → 面板可见失败 + `TODO`，本 change 不得用自建聊天交付；桌面验收场景在 API 缺失时记为阻塞而非用预览代替。
- [Risk] 触发第一问被模型写成多问 → 提示词强调「每次只问一个」；测试断言服务层提示词含该约束，桌面抽查第一问数量。
- [Risk] 教练与面试官串台 → B 的 prompt 不含 A 的角色模板；A 的 prompt 不含要点/评分指令；单测锁住两份 prompt 互斥片段。
- [Risk] 开始异步偏长 → 面板展示进行中/加载，请求可取消；失败回错误态而非假成功。

## Migration Plan

- 已安装插件：重新 `dsh plugin add` / 重载后再测开始。
- 回滚：恢复只 `acceptEntryConfig` 的行为（待开考、不注入）。
- 不迁移磁盘数据（入口配置仍是内存 store）。

## Open Questions

无。Host 符号名称在实现任务里查 SDK，不改变本设计的失败/TODO 策略。
