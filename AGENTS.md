# AGENTS.md

## 架构实施

- 代码设计与落地必须遵守 [架构文档](docs/architecture/ARCHITECTURE.md)。
- 修改前先确认功能所属分层、模块职责和依赖方向。
- 实现与架构文档冲突时，先改架构并说明原因，不得自行绕过。
- 产品方向见 [产品文档](docs/product/REQUIREMENTS.md)；当前能力与验收以 OpenSpec change 为准。

## DSH 插件边界

- 本仓库是 DSH 插件，不是独立应用。对话表面归宿主；`frontend/src/features/` 不得出现消息列表、输入框、气泡。
- Host SDK 只出现在 `backend/src/infra/dsh/`；Web Client SDK 只出现在 `frontend/src/infra/dsh/`。跨端只通过 `shared/` 沟通，禁止 `fetch('/api/...')`。
- 主入口挂在 `conversation.input.right`，不得挂 `conversation.session.header.utilities`。
- Client 顶层 `inject` 仅为 `['slots', 'remote']`。`sidebarRight` / `sidebarRightTabs` 只用嵌套 inject 探测；额外服务只用 `ctx.get`，禁止直接读未声明的 `ctx.sidebarRight`。
- `shell.overlay` 回退面板必须 `position: fixed` 且 z-index 足够，`absolute` 会被壁纸盖住。
- 不得把 `dsh-better-sidebar` 当官方右栏；不得引入未随本机 Desktop 提供的包顶替官方符号。
- 查不到官方 API 时标 `TODO` 并在面板给出可见失败，禁止猜测 API 或自建聊天绕过。
- 禁止硬编码密钥；前端不做加密、解密、权限判断、评分判定。
- 禁止修改 DSH 核心或运行时（官方 Hook 除外）；`@deepseek-ai/*` 只用桌面端已带的包。
- 验收以本机 Desktop 实机为准；不得用升级 Desktop、新建 profile、Vite 预览或 `doc/entry-panel-mock.html` 充当验收。
- `openspec/changes/2026-09-12-interview-dsh-bagua-mode/` 按自建聊天写，实现时不遵循。

## 日志与注释

- 注释说明意图、约束和复杂流程，不复述代码。
- 注释位于对应代码之前，禁止尾注释。
- 禁止在代码和文档注释中写「已修改」「新增」「已修复」等本次改动过程。
- 日志不得输出密码、Token、API Key、Authorization 或其他敏感信息。
- 打开面板、开始面试、落盘失败必须在面板可见，禁止空 catch。

## 测试策略

- 小型纠错可以直接做，不强制新增测试。
- 新功能、行为边界不清或风险较高的改动必须 TDD：失败测试 → 最小实现 → 通过 → 整理。
- 仓库测试不能代替 DSH 桌面端验收。

## 增量开发

- 功能必须拆成可独立验证的小步；先最小可演示，再补后续能力。
- 当前功能完成并验证后，再推进下一项。
- 不把后续能力回填进已归档 change，也不一次性实现尚未验证的步骤。

## 子代理协作

- 多模块或可并行的工作时可以开子代理；由复杂度、并行价值和冲突风险决定，不设文件数门槛。
- 子代理要有明确范围，避免同时改同一文件。
- 主代理负责合并结果并核对架构边界。

## Git 提交与评审

- 可以查看工作区状态、检查差异、运行验证并汇报待提交内容。
- 未获明确要求时，不得执行 `git add`、`git commit`、`git push`、合并或发布。
- 完成后保留工作区变更，说明验证结果和待评审范围。
