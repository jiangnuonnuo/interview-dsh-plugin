## Context

入口 change 已归档：`acceptEntryConfig` 只把主题/难度写入内存 store，面板成功后停在「待开考」。Host 适配层目前只 `provide('interviewEntry')`，没有 Agent 注入或第二条会话。见 `proposal.md` 的 Why。约束见 `ARCHITECTURE.md` §3–§5、§7：Host SDK 只在 `backend/src/infra/dsh/`，Client SDK 只在 `frontend/src/infra/dsh/`，禁止自建聊天，查不到注入 API 时标 `TODO` 而不是绕过。

当前 Desktop 目标仍是 0.2.17 / harness 0.1.1-rc.2。Agent 注入、会话隔离、触发助手开口的具体 Host 符号在实现前必须对照本机已装 SDK 与官方文档核实，不得臆造。

## Goals / Non-Goals

**Goals:**

- 合法开始后：会话 A 套在**当前**对话上；会话 B 只服务面板；第一问进宿主气泡；要点进面板。
- 提示词从 `interviewer-role-prompt.md` 八股专项参数化（岗位/主题/难度），不另配模型。
- 注入失败对面板可见；适配层对缺失 API 写 `TODO` + 结构化错误码。
- 契约进 `shared/`；评分判定留在后端（本 change 面板只占位）。

**Non-Goals:**

- 不设计提示/跳过按钮、停止卸角、`study/` 落盘、作答后追问与五维打分更新（后续 change）。
- 不引入新 npm 依赖或修改 DSH 核心。
- 不把教练上下文拼进会话 A 的 system 提示。

## Decisions

### 1. 开始仍走现有 remote，成功后由 Host 侧启动双会话

保留 `acceptEntryConfig` 的校验与落 store。校验成功后同一 Host 用例调用会话端口（新建 `shared` 类型，例如 `StartInterviewResponse`：`ok` + 进行中快照或 `code`）。Client 不直接调 Host Agent API。

备选：Client 注入对话 — 否决，违反 Host/Client 边界，且 Client 沙箱没有 Agent 生命周期。

### 2. 会话 A = 当前对话 + 面试官提示词；会话 B = 插件内不可见补全

- **A**：官方注入/覆盖当前会话 system（或等价 Agent 角色）后，触发一次助手回合，让第一问出现在原气泡。注入时显式切断场前历史（官方「新上下文 / 忽略已有 messages」若存在则用；否则 `TODO`，并在面板失败，禁止把场前 transcript 拼进 prompt 假装隔离）。
- **B**：Host 内第二次补全（同一模型配置），输入仅为「本场主题/难度 + 第一问题干」，输出 JSON/结构化要点，只写面板状态，不 `append` 到对话。

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
