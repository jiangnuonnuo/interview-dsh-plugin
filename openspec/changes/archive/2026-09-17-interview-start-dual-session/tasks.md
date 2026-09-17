## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」。**未在真实 DSH 桌面端点「开始模拟面试」并见到第一问与面板要点，整份 tasks 视为未完成，不得归档。**

勾选 5.3 之前必须已经发生：

1. `dsh plugin add` 装进桌面端正在使用的 profile
2. 启动 DSH 桌面端（不是 Vite / 浏览器预览）
3. 打开当前对话，点输入栏「面试」，选主题与难度，点「开始模拟面试」
4. 当前对话出现面试官第一问；面板进入进行中并展示本题标准答要点
5. 面板内没有消息列表 / 聊天输入 / 气泡

1.x–5.2 通过只证明仓库可构建；5.3 才是验收。Host 注入 API 缺失时按 spec 展示可见失败并 `TODO`，**不得**用自建聊天勾选 5.3。

## 1. 共享契约

- [x] 1.1 在 `shared/` 增加开始面试与进行中快照类型（阶段、主题、题干摘要、标准答要点、错误码如 `inject_unavailable` / `coach_unavailable` / `first_question_failed`），从 `shared/src/index.ts` 导出；`npm run build --workspace=interview-dsh-shared` 通过
- [x] 1.2 确认类型中不含前端可写的分数判定字段；`rg` 评分相关字段只作为后端只读展示结构（可空占位）

## 2. 提示词与会话服务

- [x] 2.1 在 `backend/src/services/` 把 `interviewer-role-prompt.md` 八股专项模板化（填入主题、难度），约束每次只问一题、不读场前历史、不含评分/标准答指令。单测断言面试官提示词含八股约束且不含教练片段
- [x] 2.2 实现教练提示词（只要题干摘要 + 标准答要点结构化输出），单测断言其不含面试官角色模板、且不会被拼进会话 A
- [x] 2.3 实现开始用例：先走现有 `acceptEntryConfig` 校验，成功后启动 A/B；失败返回显式 `code` + `message`，禁止空 catch。单测：校验失败不启动会话；注入失败映射为可见错误码。`npm test --workspace=interview-dsh-backend` 通过

## 3. Host 适配

- [x] 3.1 在 `backend/src/infra/dsh/` 对照本机 Host SDK 查找：注入当前对话、切断场前历史、同模型二次补全、触发助手开口。找到则封装端口；找不到则 `TODO` + `inject_unavailable` / `coach_unavailable`，MUST NOT 在 frontend 画聊天。边界测试：领域层不 import Host SDK；UI 注册仍不在 backend
- [x] 3.2 会话 B 的输出只写入进行中快照，测试断言适配层没有把教练文本 append 到对话气泡的方法

## 4. 进行中面板

- [x] 4.1 在 `frontend/src/features/`（入口同表面或并列 feature）增加进行中视图：进行中状态、当前主题、题干摘要、标准答要点、五维评分空位。无消息列表、无聊天输入、无气泡。测试覆盖进行中渲染与评分空位无前端计算分数
- [x] 4.2 「开始」成功后切到进行中并展示端口返回的快照；失败展示 `message`。禁止 `fetch('/api/...')`。测试：成功切进行中、校验错误仍留在入口、注入失败可见且不进入假进行中
- [x] 4.3 回归：`features/` 无 `chat` 目录；DOM 无时长/文件夹；`features/` 不 import Client SDK

## 5. 装配、构建、桌面验收

- [x] 5.1 Client 仍只通过 `ctx.remote` 调 Host；开始后不新建聊天页、不改入口槽位。适配层测试：无向面板写入气泡的 API
- [x] 5.2 `npm test`、`npm run lint`、`npm run build` 通过；若 frontend 源码有改则重建 `dist/client`（若仓库跟踪该产物）
- [x] 5.3 **【验收门槛 · 真实 DSH 桌面端】** 重装插件后，在 DSH 桌面端点「开始模拟面试」：对话出现第一问，面板出现本题要点，无自建聊天。把桌面端与 harness 版本写进本任务注释。注入 API 不可用时记录可见错误，不得勾选本项冒充完成

验收记录（2026-09-16）：Desktop **0.2.17**；当前 sidecar 实际加载的是 App 内 bundled harness **0.1.1-rc.2**（`DSH Desktop.app/.../dsh/lib/bin.js web`，端口 59780）。点输入栏「面试」→ MySQL 索引与优化 / 中级 →「开始模拟面试」：新开考场对话出现第一问（InnoDB 索引数据结构），进行中面板有题干摘要、标准答要点、五维 `—`，面板内无消息列表/输入框。Host 读第一问必须鸭子类型 `deriveMessages()`（bundled `dsh-session` 没有 `snapshotEvents()`）。
