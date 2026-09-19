## Context

动机见 `proposal.md`。行为见 `specs/interview-round-close/spec.md` 及对 `interview-cards` / `interview-session` / `interview-follow-up` 的 delta。

现状：`startExamRoom` 每次 `sessions.create` + `attachInterviewer` + 一次 `INTERVIEW_OPENING_PROMPT`；`archiveDirFor` 为 `.dsh-interview/<sessionId>/round-n-slug/`；结束把 `INTERVIEW_ROUND_CLOSING_PROMPT` 整段 `session.prompt` 出去，并写带 `<details>` 的 `handbook.md`。追问阶段禁止再 `prompt`。Host 适配层禁止 `session.prompt`。Desktop 0.2.17 的 `session.prompt` 一定会留下用户气泡；`systemPrompt.section` 不进气泡，且返回 disposer。

约束不变：Host SDK 只在 `backend/src/infra/dsh/`，Client SDK 只在 `frontend/src/infra/dsh/`，禁止 `fetch('/api/...')`，禁止自建聊天，禁止 `node:fs`。`docs/product/REQUIREMENTS.md` 的 **3.1 卡片化方向整段保持不动**，本刀不实现它。

## Goals / Non-Goals

**Goals:**

- 结束本轮：停看守 → Host 挂收尾 section → 一次短句 `prompt`「结束面试」→ 写 `qa.md` 与 `summary.md` → 面板回入口。
- 落盘按轮次分目录；`cards/` 过程存储不变；同会话第二轮不覆盖第一轮笔记文件。
- 当前会话已是已结束考场时，再开始先摘收尾段，复用该会话并开口新一轮。
- 改 `ARCHITECTURE.md`：结束不卸角；导演词不进用户气泡；开考可复用考场。

**Non-Goals:**

- 不摘人设。
- 不在面板预览 `qa.md` / `summary.md`，不引入 MD 编辑器。
- 不实现 3.1 卡片流/详情态/滑动切卡。
- 不把建议或分数写入考场气泡。
- 不迁/删 `study/` 旧档案。
- 不改开场那句「开始本场八股专项模拟面试。」的可见种子。

## Decisions

### 1. 一轮一个子目录，会话根只放索引

`archiveDir` 为 `.dsh-interview/<sessionId>/round-<n>-<topic-slug>/`。会话根写索引（`in_progress` | `ended`）。过程文件：`session.json`、`cards/<id>.md`。结束时写 `qa.md`、`summary.md`，索引改为 `ended`。不再写 `handbook.md`。

备选：整场仍写在 `<sessionId>/` 根下 — 否决，第二轮会覆盖。备选：每轮新建 DSH 会话 — 否决，产品要同一条考场对话。

### 2. 复用会话的判定只看「当前宿主会话」

`sessions.list` 的 `current` 等于本插件记录的考场 `sessionId`，且索引为 `ended` → 不 `create`、不 `open` 到别处、不重新 `attachInterviewer`，先摘收尾 section，只发新一轮开口 prompt。否则走现有新建考场 + `workspaceId` 挂分组。

### 3. 可见种子与导演词必须分渠

Desktop 没有改写输入框的官方拦截 API。能用的是：Host `systemPrompt.section`（模型可见、气泡不可见）+ Client `session.prompt`（会留下用户气泡）。

顺序：停看守 → `armRoundClose` 挂 `deployment:round-close`（文案为固定导演词，最后一句约束不变）→ 并行：短句 `prompt`「结束面试」与写笔记。收尾种子记为「结束面试」，看守 MUST 忽略该种子与含固定收尾句的气泡。

新一轮 `briefCoach` / 复用开口前 `clearRoundClose` 调用 disposer。不得在 `prompt()` 一返回就摘段：acceptance 早于面试官说完。

备选：把导演词放进 `session.prompt` — 否决，会进用户气泡。备选：只发「结束面试」不挂 section — 否决，无法约束末句且人设 §6 会把分数打进气泡。

### 4. 结束笔记是两份可导入 Markdown，不是面板页

`qa.md`：文首主题与难度，随后按甲板顺序每个编号一节（`## Q1` / `## Q1.1`），内含题干、开卷、作答、对照、五维。纯 Markdown 标题，MUST NOT 用 HTML `<details>`。待作答标待作答，不编分数。

`summary.md`：文首主题与难度，正文为本轮总结（薄弱点与下轮练法）。会话 B 只给这份文件供稿；失败时 `qa.md` 仍写出，`summary.md` 标明未生成。

前端最多展示两个相对路径。查官方打开文件符号则打开；没有则 `TODO` + 路径。

### 5. 前端结束仍回入口，不改卡片 UI

`onEnd` 调 `armRoundClose` + 短句 `prompt` + Host `endRound`。标记 `ended` 则回入口。不改 `InProgressPanel`。

## Risks / Trade-offs

- [Risk] 收尾后模型仍追问 → Mitigation：section 约束 + 看守已停；验收核对话末句且用户气泡仅为「结束面试」。
- [Risk] `prompt()` 返回后立刻摘段会打断收尾生成 → Mitigation：只在下一轮开始时摘。
- [Risk] Host 重启丢失 disposer → Mitigation：下一轮 `briefCoach` 仍尝试摘；无法摘时标可见失败，禁止猜其它卸载 API。
- [Risk] 复用判定把编码对话当成考场 → Mitigation：必须 `current ===` 已记录的考场 id。

## Migration Plan

新轮一律写 `round-*`。已有根目录 `session.json` 仍可按进行中恢复。已写出的 `handbook.md` 不删不迁，新结束只写 `qa.md` / `summary.md`。无回滚云端。产品文档 3.1 不随本刀改写。
