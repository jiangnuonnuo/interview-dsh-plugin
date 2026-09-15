## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」。**未在真实 DSH 桌面端打开面板，整份 tasks 视为未完成，不得归档。**

勾选 4.3 之前必须已经发生：

1. `dsh plugin add` 装进桌面端正在使用的 profile
2. 启动 DSH 桌面端（不是 Vite / 浏览器预览）
3. 打开 DSH 桌面端新会话首页，点输入栏「面试」（「AI 优化」旁）
4. 右侧出现入口面板，对照 `doc/entry-panel.png`
5. 选主题与难度，点「开始模拟面试」，待开考且对话无面试官消息

1.x–4.2 通过只证明仓库可构建；4.3 才是验收。4.3 未勾不得把本刀标完成。

## 1. 共享契约

- [x] 1.1 在 `shared` 新增预设主题常量（覆盖参照图中的 MySQL / Redis / 消息队列 / 分布式系统设计 / Spring / Java 并发 / 数据库实战场景 + 自定义入口）、`Difficulty`（`junior` | `mid` | `senior`，默认 `mid`）、`EntryConfig`、`EntryErrorCode` 以及 `acceptEntryConfig` / `getEntryConfig` 的请求响应类型，并从 `shared/src/index.ts` 导出；`npm run build --workspace=interview-dsh-shared` 通过
- [x] 1.2 删除 `shared/src/api/interviews.ts` 预约模型及所有 `candidateId` / `scheduledAt` / `online|offline` 引用；`rg candidateId` 在 `shared/` `backend/` `frontend/` 无匹配

## 2. Host：校验与保存

- [x] 2.1 实现 `backend/src/data/entry-config-store.ts` 与 `backend/src/services/interview-entry.service.ts`：校验主题（预设或非空自定义）+ 难度后写入内存，提供读取；缺主题 / 空白自定义 / 非法难度返回对应 `EntryErrorCode`。单测覆盖成功、`topic_required`、`custom_topic_empty`；`npm test --workspace=interview-dsh-backend` 通过
- [x] 2.2 实现 `backend/src/entrypoints/interview-entry.ts`，把 remote 映射到 service；删除 `createInterview` 占位及其预约 mock 测试。确认无测试再引用 `interviewerId`。本层与 service MUST NOT 调用 Sidebar / Slot
- [x] 2.3 `backend/src/infra/dsh/` 只保留 Host 生命周期入口，本刀 MUST NOT 在 backend 注册 `sidebarRightTabs` 或顶栏按钮。用目录/测试断言 UI 注册不在 backend

## 3. 入口面板

- [x] 3.1 新增 `frontend/src/features/entry/`（React + CSS Modules），信息结构对齐 `doc/entry-panel.png`：搜索、分类芯片（不隐藏其他预设）、预设列表、自定义行点选后出现输入框、难度三档默认中级、主按钮「开始模拟面试」、无时长。`App` 只挂该面板。测试：默认中级、点选 MySQL、搜索 Redis 可见对应预设、点自定义出现输入。`npm test --workspace=interview-dsh-frontend` 通过
- [x] 3.2 将「开始」接到入口端口（测试用内存假实现，运行时 `ctx.remote`，禁止 `fetch('/api/...')`）：成功进入「待开考」且不渲染气泡；失败时面板可见错误。测试覆盖成功、无主题拒绝、空白自定义拒绝
- [x] 3.3 回归测试：入口 DOM 中不存在时长/倒计时、文件夹选择、消息列表、聊天输入框或气泡角色。失败则不得勾选

## 4. Client 适配与桌面端安装

- [x] 4.1 在 `frontend/src/infra/dsh/` 把「面试」注册到 `conversation.input.right`（与 `dsh-ai-prompt-optimizer` 的「AI 优化」同槽，新会话首页可见）。有 `sidebarRightTabs` 时注册 `kind: interview`、`id: interview-dsh/entry` 并 `openTab('interview')`；没有时打开 `shell.overlay`（id `interview-dsh/entry-overlay`）右侧抽屉。MUST NOT 把主入口放在 `conversation.session.header.utilities`。features 目录 MUST NOT 直接 import Sidebar SDK。测试：适配层没有向对话气泡写内容的方法；无 `openTab` 时不得 throw；源码含 `conversation.input.right`
- [x] 4.2 根包声明 `dsh.bundle`、`cordis.patch.yml`、`exports["./client"]` 与 `dsh.client`；Client 入口指向 frontend 构建产物。`npm test`、`npm run build`、`npm run lint` 通过，且无 `features/chat` 目录
- [x] 4.3 **【验收门槛 · 真实 DSH 桌面端】** 用 `dsh plugin add` 把本包装进桌面端正在使用的 profile，启动 DSH 桌面端（禁止用 Vite / `entry-panel-mock.html` / 普通浏览器代替），打开新会话首页，点输入栏「面试」（「AI 优化」旁）：当前视图不变，右侧出现入口面板；对照 `doc/entry-panel.png` 确认主题搜索、分类、预设、自定义、难度、开始按钮存在且无时长/文件夹；点「开始模拟面试」后面板待开考、对话无面试官消息。把所用桌面端版本号写进本任务注释。未完成上述实机步骤不得勾选，也不得 archive
  <!-- 实机通过 2026-09-15：DSH Desktop 0.2.17（/Applications，com.yeagoo.dsh-desktop，窗口「DSH Desktop — Harness 控制台」/ Xerina Harness）；GUI harness @deepseek-ai/dsh 0.1.1-rc.2（无 sidebarRightTabs，走 shell.overlay）；profile web 已 link 本包。用户在新会话输入栏「AI 优化」旁点「面试」打开入口；点「开始模拟面试」后面板「待开考」（主题 Java 并发编程、难度中级、文案「配置已记下，面试官尚未接入。」）。本刀不注入面试官。 -->
