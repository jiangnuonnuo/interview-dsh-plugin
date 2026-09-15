# Agent.md


- 目录、分层、适配层、编码规范：`docs/architecture/ARCHITECTURE.md`
- 产品是什么、给谁用：`docs/product/REQUIREMENTS.md`
- 这一刀做什么、验收什么：当前 OpenSpec change（`openspec/changes/`）



## 架构实施

- 写代码前确认功能落在哪一层、依赖朝哪边，按架构文档落地。
- 不要另起顶层业务目录，不要用 `fetch('/api/...')` 或自建聊天绕过 `shared/` 与适配层。
- DSH 符号以本机已装桌面端和官方文档为准；查不到就 `TODO` + 面板可见失败，禁止猜测 API，禁止用第三方包或自建 UI 顶替。
- 完成openspec 任务归档之后，发现架构文档有误的需要及时更新

## 容易遗忘的事实与决策

对照本机已装官方插件 **`dsh-ai-prompt-optimizer`**。不要重开下列结论。

| 事实 | 不要忘记 |
|---|---|
| 本仓库是 DSH 插件，不是独立应用 | 对话表面归宿主；禁止自建聊天页、消息列表、输入框、气泡 |
| 本机 Desktop **0.2.17** / 官方 **0.2.18** 仍 pin harness **0.1.1-rc.2** | 没有官方 `sidebarRightTabs` / `sidebarRight.openTab`（那是 0.1.5-rc.1+） |
| 入口跟「AI 优化」同槽 | 触发用 `conversation.input.right`；新会话首页没有 session header，禁止把主入口挂 `conversation.session.header.utilities` |
| 面板回退 | 当前桌面端走 `shell.overlay`；overlay 必须 `position: fixed` + 足够 z-index，`absolute` 会被壁纸盖住 |
| 官方右栏 | 仅当嵌套 `inject(['sidebarRightTabs'])` **已经 register 成功** 才 `openTab`；不得把 `sidebarRight` 写进 Client 顶层 `inject` |
| `dsh-better-sidebar` | 生态自绘栏，不是 DSH SDK；禁止当官方右栏用 |
| Client 沙箱 | 探测服务只用 `ctx.get`；直接读未声明的 `ctx.sidebarRight` 会 throw，点击表现为没反应 |
| 密钥与判定 | 禁止硬编码密钥；前端不做加密、解密、权限判断、评分判定 |
| DSH 核心 | 禁止修改 DSH 核心或运行时（官方 Hook 除外）；`@deepseek-ai/*` 只用桌面端已带的包 |
| 验收 | 桌面端实机才算；禁止用升级/换签 Desktop、新建 profile、Vite、`doc/entry-panel-mock.html` 充当验收 |
| 过期材料 | `openspec/changes/2026-09-12-interview-dsh-bagua-mode/` 按自建聊天写，实现时不要遵循 |

装配细节（inject 清单、Slot id、打开分支）在架构文档的 Client 适配层，改接法先改架构，再改代码。

## 增量开发

- 功能必须拆成可独立验证的小步；先最小可演示，再补后续能力。
- 当前 OpenSpec change 的任务做完并验证后，再开下一刀。
- 不要把后续 change 的能力回填进已归档 change，也不要一次性实现尚未写入当前 change 的步骤。

## 日志与注释

- 注释说明意图、约束和复杂流程，不复述代码；写在对应代码之前，禁止尾注释。
- 禁止在代码和文档注释里写「已修改」「新增」「已修复」等本次改动过程。
- 日志不得输出密码、Token、API Key、Authorization 或其他敏感信息。
- 禁止吞错：打开面板、开始面试、落盘失败必须在面板可见。

## 测试策略

- 小型纠错可以直接做，不强制新增测试。
- 新功能、行为边界不清或风险较高的改动必须 TDD：失败测试 → 最小实现 → 通过 → 整理。
- 仓库测试不能代替 DSH 桌面端验收。

## 子代理协作

- 多模块或可并行的工作时可以开子代理；由复杂度、并行价值和冲突风险决定，不设文件数门槛。
- 子代理要有明确范围，避免同时改同一文件。主代理负责合并结果并核对架构边界。

## Git

- 可以查看状态、差异、跑验证并汇报待提交内容。
- 未获用户明确要求时，不得自行 `git add` / `git commit` / `git push`。

## 不确定时

- 代码放哪、DSH 怎么接：架构文档。
- 产品是什么：产品文档。
- 这一刀做什么：当前 OpenSpec change。
- 偏离架构前，先改架构文档并写明原因。
