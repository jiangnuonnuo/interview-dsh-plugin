## Context

见 `proposal.md` 的 Why。当前 `frontend` 是占位页，`shared` 仍是预约模型，`backend` 没有 entrypoints / data，适配层是空 TODO。行为合同见 `specs/interview-entry/spec.md`。官方 Web Client 的 Sidebar / Slot 只能在浏览器半侧调用，不能写进 Host。

## Goals / Non-Goals

**Goals:**

- 用 CSS Modules 实现入口面板，对齐 `doc/entry-panel.png`。
- 契约、校验、内存保存、Client 注册分目录落地，符合 `entrypoints → services → data → infra`。
- 「开始」只保存配置并进入待开考，给下一刀留下读取点。

**Non-Goals:**

- 不注入面试官、不开教练会话、不评分、不落盘。
- 不引入 Tailwind 或社区 UI 库。
- 不把 Host 与 Client 合成一套 `src/client` 官方单包结构（保留本仓库三分目录）。

## Acceptance（本刀完成门槛）

本刀完成 = 下面全部在**真实 DSH 桌面端**上为真。仓库内测试只是前置，不是完成。

| 步骤 | 必须发生在 | 通过标准 |
|---|---|---|
| 安装 | DSH 桌面端正在使用的 profile | `dsh plugin add` 成功，profile 的 `dsh.profile.bundles` 含本包 |
| 打开 | 已启动的 DSH 桌面端窗口 | 新会话首页输入栏（「AI 优化」旁）点「面试」，右侧出现入口面板 |
| 对照 | 同一窗口 | 主题搜索、分类、预设、自定义、三档难度、开始按钮均在；无时长、无选文件夹；对照 `doc/entry-panel.png` |
| 开始 | 同一窗口 | 点「开始模拟面试」后面板待开考，对话无面试官消息 |

明确不算通过：只跑 `npm test` / `npm run build`；只开 Vite；只打开 `doc/entry-panel-mock.html`；只看截图。API 在已装桌面端版本中不存在时记版本并保持本刀未完成，禁止用自建网页代替。

未完成上述桌面端步骤，不得勾完 `tasks.md`，不得 archive。

## Decisions

### 1. 预设主题是标签，不是题库

清单放在 `shared` 常量（id、展示名、可选分类）。出题仍留给后续 LLM。不按难度过滤清单。

备选：只写在前端。否决：Host 校验与下一刀注入需要同一份字符串。

### 2. 难度用稳定枚举

`Difficulty = 'junior' | 'mid' | 'senior'`，默认 `'mid'`。界面文案为初级 / 中级 / 高级。本刀不做追问深浅映射。

### 3. 分类芯片不充当过滤器

`doc/entry-panel.png` 在选中「后端开发」时仍展示全部预设。因此分类芯片只作分组标签与可选高亮；搜索框才按名称过滤预设。自定义主题行在搜索时始终可见。

备选：芯片隐藏其他分类。否决：与参照图不符，也容易把自定义入口藏掉。

### 4. 自定义主题是列表行 + 输入框

点「自定义主题」后该行选中，并在行下（或行内）出现文本输入。再点某个预设则放弃这段自定义文本。开始时自定义行已选但输入为空白 → `custom_topic_empty`。

### 5. 开始写入 Host 内存，面板进入待开考

分层：

- `backend/src/data/entry-config-store.ts`：最近一次有效 `EntryConfig`
- `backend/src/services/interview-entry.service.ts`：校验，不引用 DSH
- `backend/src/entrypoints/interview-entry.ts`：暴露 `acceptEntryConfig` / `getEntryConfig`

`shared` 错误码：`topic_required` | `custom_topic_empty` | `invalid_difficulty`。前端即时提示，Host 再拒绝一次；错误必须在面板可见，禁止吞错。

成功后状态为 `accepted`（待开考）：展示已保存主题与难度，文案不得暗示面试官已在对话里说话。再次打开「面试」仍是本面板；若已有有效配置，表单回填该配置，仍不注入。

备选：只存 React state。否决：下一刀没有可靠读取点。

### 6. 删除脚手架预约 API

删除 `candidateId` / `online|offline`。新文件：`shared/src/api/interview-entry.ts`。

### 7. 视觉以 `doc/entry-panel.png` 为准

CSS Modules，不新增依赖。`doc/entrance.png` 只说明右侧栏位置；当前 Desktop 新会话首页没有顶栏 utilities，「面试」跟「AI 优化」一样挂输入栏。源稿：`doc/entry-panel-mock.html`。

### 8. Host 与 Client 分适配层，组合成一个 bundle

官方设置卡片把 Host 放 `src/`、Client 放 `src/client/`。本仓库按架构保留三分目录，在根包组装：

```
根 package.json
  main        -> backend 构建产物（Host apply）
  exports ./client + dsh.client -> frontend Client 入口
  dsh.bundle.patch -> ./cordis.patch.yml

backend/src/infra/dsh/     Host 生命周期（本刀不注册 UI）
frontend/src/infra/dsh/    Client：Slot / 输入栏触发 / 右侧 tab 或 overlay
frontend/src/features/     纯面板，禁止 import Sidebar SDK
```

Client 接线（适配层内，官方优先、本机 Slot 回退）：

- **触发「面试」**：`conversation.input.right`（与本机 `dsh-ai-prompt-optimizer` 的「AI 优化」同一 list slot；新会话首页输入条会渲染）。id `interview-dsh`，order 9（优化器为 10）。MUST NOT 把主入口放在 `conversation.session.header.utilities`——该槽只在已打开会话的 header 里，新会话首页不存在。
- **根包 `dsh.client.inject`**：与优化器相同，声明 `@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-api-remotes`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-conversation`。输入栏按钮依赖 conversation；`shell.overlay` 抽屉依赖 layout。不得只声明 conversation 而漏掉 overlay 宿主。
- **优先**（harness 带 `dsh-client-ui-sidebar-right` 时）：`ctx.sidebarRightTabs.register({ id: 'interview-dsh/entry', kind: 'interview' })`，正文 `sidebar.right.pane.tab`，点击 `ctx.sidebarRight.openTab('interview')`。该路径缺失时 MUST NOT 让 Client `apply` 失败。
- **回退**（Desktop 0.2.17 / 0.1.1-rc.2）：面板正文挂 `shell.overlay`（id `interview-dsh/entry-overlay`）右侧抽屉，展示与 `dsh-ai-prompt-optimizer` 错误弹窗相同：`position: fixed` + 高 z-index。「关闭」在面板左上角，标题「模拟面试」在其右侧；不得再放右上角。再次点「面试」或点「关闭」收起。不依赖 `dsh-better-sidebar`，不自建聊天页。
- **点击路径**：只有 `sidebarRightTabs.register` 已成功时才调用 `openTab`。Client 沙箱里 `ctx.get('sidebarRight')` 为 `undefined` 时 MUST NOT 再读 `ctx.sidebarRight`（未出现在 `inject: ['slots','remote']` 时动态 ctx 会 throw，表现为点「面试」无面板）。打开失败 MUST 在同一 overlay 里给出可见错误（对照优化器 `prompt-optimizer-error-dialog`），禁止静默无反应。
- 点击不得更换当前对话 / 不得把用户踢出新会话首页（尚未发消息时仍是新会话）

`@deepseek-ai/*` 只用桌面端已带的包，不算未验证依赖。Client 包遵守官方 bundle 纯净度：不得从 frontend 值导入 backend。

备选：把 Sidebar 注册写进 `backend/src/infra/dsh/`。否决：那是 Web Client API，在 Host 进程里不存在。

备选：查不到 API 就 TODO 并用 Vite 预览验收。否决：与桌面端验收冲突。0.1.1 没有 `sidebarRightTabs` 时用上面的官方 Slot 回退，禁止用 Vite / `entry-panel-mock.html` 冒充验收。

备选：`ctx.betterSidebar.registerTab`。否决：那是第三方服务，不是 DSH 已带 API；本机优化提示词也未走这条路。

## Risks / Trade-offs

- [Risk] 点「面试」无面板：动态 Client ctx 在服务未声明时访问 `ctx.sidebarRight` 会 throw → 只通过 `ctx.get` 探测；探测失败则打开 overlay，失败时用 overlay 错误层，不得静默。
- [Risk] 新会话首页 wallpaper 盖住 `position:absolute` 抽屉 → overlay 内容用 `position: fixed`（与「AI 优化」错误弹窗相同）。
- [Risk] 桌面端 DSH 过旧，没有 `sidebarRightTabs` → 适配层回退到 `shell.overlay` 右侧抽屉；触发仍在输入栏。
- [Risk] 新会话首页没有 session header → 主入口必须用 `conversation.input.right`，不能用 header utilities。
- [Risk] `ctx.remote` 形状因版本而异 → 入口服务与前端之间只认 `shared` 的两个方法；测试用假端口。
- [Trade-off] 配置只在进程内存 → 可接受；产品不要求跨重启记住主题。
- [Trade-off] 根包同时当 workspace 根与 dsh bundle → 比拆第四个顶层目录更符合架构。

## Migration Plan

1. 落地 `shared` 类型与预设常量并编译。
2. Host：data → service → entrypoint 与测试；删除预约占位。
3. 前端 `features/entry`，`App` 只挂面板。
4. `frontend/src/infra/dsh/` 注册输入栏触发与 overlay；根包补 `dsh.bundle` / `dsh.client`（inject 对齐优化器）。
5. `dsh plugin add` 进桌面端 profile，点「面试」对照 `doc/entry-panel.png`。
6. 回滚：从 profile 移除 bundle，还原脚手架类型。

## Open Questions

- 用户桌面端 DSH 的具体版本号，在任务 4.3 对照实机时填写；不改变本刀 spec 与任务切分。
