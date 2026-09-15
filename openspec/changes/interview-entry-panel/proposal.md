## Why

仓库已有 `backend/`、`frontend/`、`shared/` 脚手架，但面板仍是占位页，共享契约还是与产品无关的 `candidateId` / `online|offline`。MVP 主链路的第一步是：候选人在 DSH 里点「面试」，只打开右侧入口并配好主题与难度。不先把入口做对，后面的双会话注入没有可操作表面，也容易滑回自建聊天页。

## 验收门槛（本刀完成条件）

本 change **未在真实 DSH 桌面端打开面板之前，不得标为完成、不得归档**。下列任何一项单独成立都不够：

- `npm test` / `npm run build` 通过
- Vite 或浏览器打开 `doc/entry-panel-mock.html` / 前端 dev server
- 对照截图而没有启动桌面端

必须同时满足：

1. 组合包已 `dsh plugin add` 进**正在使用的 DSH 桌面端 profile**。
2. 启动 DSH 桌面端（不是仓库内预览页）。
3. 打开 DSH 桌面端新会话首页（或一条已有对话），点输入栏「面试」（「AI 优化」旁）。
4. 当前对话不变，右侧出现入口面板，信息结构对照 `doc/entry-panel.png`（有主题/难度/开始，无时长/无选文件夹）。
5. 选主题与难度后点「开始模拟面试」，面板进入待开考，对话里不出现面试官消息。

## What Changes

- 把插件前端做成入口面板：搜索或点选预设主题、自定义主题、选择初级/中级/高级、主按钮「开始模拟面试」。
- 打开入口时不跳转、不新建聊天、不更换当前 DSH 对话；前端不得出现消息列表、输入框或气泡。
- 入口不提供时长选择，开始前不强制选文件夹。预设主题清单以 `doc/entry-panel.png` 为准，自定义主题必须可用。
- 用主题、难度、入口状态替换 `shared` 里与产品不符的面试预约类型。
- 「开始模拟面试」在本 change 只校验并记下本次配置，不注入面试官、不创建双会话、不向对话发消息。真正开考留给后续 change。
- 入口面板视觉以 `doc/entry-panel.png` 为准（无时长、无选文件夹）；宿主里的位置仍参考 `doc/entrance.png`。
- 本刀验收必须把组合包装进 DSH 桌面端 profile：新会话首页输入栏能看到并点「面试」，不能只在仓库里用 Vite 预览代替。
- Host 提供保存/回读入口配置的 remote；Client 把「面试」挂在 `conversation.input.right`（与 `dsh-ai-prompt-optimizer` 的「AI 优化」同槽）。有官方 `sidebarRightTabs` 时点开右侧 tab；没有则打开 `shell.overlay` 抽屉。不自建聊天壳，不依赖 better-sidebar。不把主入口放在 `conversation.session.header.utilities`（新会话首页不渲染该槽）。

## Capabilities

### New Capabilities

- `interview-entry`: 输入栏打开右侧入口、主题（预设+自定义）、难度、开始配置校验、桌面端组合包安装；保证无聊天页、无时长、无选文件夹。

### Modified Capabilities

- （无。主规格目录目前为空。）

## Impact

- `frontend/src/features/entry/`：入口面板；`frontend/src/infra/dsh/`：Client 适配（Slot / 输入栏触发 / 右侧 tab 或 overlay）。
- `shared/src/`：以 `EntryConfig` 与 `acceptEntryConfig` / `getEntryConfig` 替换预约类型（**BREAKING**，仅影响仓库内部脚手架）。
- `backend/src/entrypoints/`、`services/`、`data/`：校验与内存保存；`backend/src/infra/dsh/` 只保留 Host 生命周期，不注册 UI。
- 根包 `package.json` 声明 `dsh.bundle`、`dsh.client`（`./client`）与 `cordis.patch.yml`，用 `dsh plugin add` 装进桌面端 profile。
- 无新运行时依赖；样式用 CSS Modules；`@deepseek-ai/*` 仅使用桌面端已带的包。
- 不修改 DSH 核心。
