## Why

上一刀已经能开始一场八股陪练：新开考场对话、面试官问出第一问、面板给出本题要点。人设里写了「一次一问、答完再追」，宿主对话也会继续，但插件只 brief 了第一问，面板不再跟着走。现在要把「多轮」接到教练面板上，否则对照材料停在 Q1，开卷陪练不成立。

## What Changes

- 合法开始并出现第一问之后，候选人仍只在 **DSH 原输入框** 作答；插件 **MUST NOT** 再 `session.prompt` 催下一问，也 **MUST NOT** 自建聊天。
- 考场 Agent 进入空闲且最新助手题干相对上一题变化时，会话 B 重新生成本题题干摘要与标准答要点，面板替换为新快照。
- 刷新失败时面板展示可见错误，**MUST NOT** 清掉上一题快照，**MUST NOT** 空 catch。
- 五维评分区继续占位，本 change **不** 根据作答打分。
- 本 change 不做：提示/跳过、停止卸角、`study/` 落盘、项目深挖/混合模式。
- 查不到读最新题干或等待空闲的官方符号时，适配层标 `TODO` 并给出可见失败；**不得**用自建聊天或二次注入假用户气泡绕过。

上一刀 `interview-start-dual-session` **先不归档**。那份 spec 里「MUST NOT 处理用户作答后的追问」只约束那一刀；本 change 交付后，归档上一刀时须删掉或改写该句，避免主规格自相矛盾。不得把本刀任务回填进上一刀。

## Capabilities

### New Capabilities

- `interview-follow-up`: 第一问之后的多轮：宿主对话里面试官按人设追问；面板在新题出现后刷新要点；失败可见且可取消。

### Modified Capabilities

- （无。`interview-session` 尚未进入 `openspec/specs/`，本刀不改入口校验。）

## Impact

- `shared/`：增加「看守下一轮教练快照」的请求/响应与错误码（如 `follow_up_failed`）；进行中快照仍不含前端可写分数。
- `backend/`：`data/` 记住本场 `sessionId`、上一题原文与最新快照；`services/` 用最新助手题干 brief 教练（文案不再写死「第一问」）；`infra/dsh/` 读 **最后一条** 助手消息并等待 Agent 空闲。Host `inject` 仍是 `agents` / `llm` / `agentDefaultModel`。
- `frontend/`：进行中面板在挂载期间通过 `ctx.remote` 循环看守；新快照替换题干与要点；关闭或卸载必须取消看守。`features/` 不 import Client SDK，无消息列表。
- `docs/architecture/ARCHITECTURE.md`：补上「后续轮次只看守、不再 prompt」和「读最后一条助手消息」。
- 依赖：仅已随 Desktop 提供的 Host/Client SDK；无新密钥、无自建模型。
- 验收：实现者 MUST 亲自打开本机已在使用的 DSH Desktop，在 GUI 里走完「开始 → 第一问 → 宿主输入框作答 → 下一问 + 面板换要点」。`npm test`、代码审查、人设推理、上一刀第一问记录、Vite / 浏览器预览、`doc/entry-panel-mock.html`、新建 profile 或升级 Desktop **都不得**当作本刀通过。打不开 Desktop 则本刀未完成，不得勾选验收。
