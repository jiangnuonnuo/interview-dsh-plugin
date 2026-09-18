# 禁区清单

本文只列**以后都不要碰的做法**：已经被否决的方案，以及踩过的错误边界。

不是决策记录——决策与取舍在对应 OpenSpec change 的 design 里。这里只留结论：这条路走不通，别再试。

正确做法不在这里：接法见 `docs/architecture/ARCHITECTURE.md`，插件形态边界见 `AGENTS.md`，本期行为见对应 change。

## 1. 判据：本机环境

以下结论基于这套环境得出。换机器或升版本后先复核本节，版本变了结论可能不再成立。

- DSH Desktop 0.2.17（`/Applications`，`com.yeagoo.dsh-desktop`）。
- sidecar 实际加载的是 App 内 bundled harness 0.1.1-rc.2，**没有** `sidebarRightTabs`。
- 本机已装 `dsh-ai-prompt-optimizer`，其「AI 优化」与本插件入口同在输入栏。

## 2. 不要碰

| 禁区 | 为什么 | 该怎么做 |
|---|---|---|
| 拿 `dsh-better-sidebar` 当官方右栏 | 未随本机 Desktop 提供，不是官方符号 | 官方 `conversation.input.right` 触发 + `shell.overlay` 抽屉回退 |
| 把 `sidebarRight` / `sidebarRightTabs` 写进 Client 顶层 `inject` | 当前 harness 没有这些服务，顶层声明会让 `apply` 失败 | 只用嵌套 `ctx.inject` 探测，取服务只用 `ctx.get` |
| `ctx.get` 已返回 `undefined` 后再直接读 `ctx.<service>` | 未声明的服务直接读会 throw，表现为点击无反应 | 判空后走回退分支 |
| `slots.inject('details')` 挂面板 | 会盖掉宿主 DetailsPanel | `shell.overlay` 抽屉 |
| 用 `node:fs` 直接落盘 | 插件沙箱按部署策略拒绝无策略写入 | Host `ctx.fs.resolve` + `writeText`，带工作区写入策略 |
| 把路径字符串直接传给 `writeText`、或省略沙箱策略 | 部署默认 `read-only`，插件根 ctx 上的无策略写入会被拒绝 | 先 `resolve` 出 FsTarget 再写 |
| 用 Vite 预览 / `doc/entry-panel-mock.html` 冒充验收 | 与桌面端实机验收冲突 | 本机 Desktop 实机验收 |
| 靠升级 Desktop / 新建 profile 绕开适配问题 | 不是本机可交付状态 | 适配层标 `TODO` 并在面板给出可见失败 |
| 查不到官方 API 就自建聊天绕过 | 对话表面归宿主，插件不提供聊天 | 标 `TODO` + 面板可见失败 |
| 猜测官方 API 形状 | 猜错只会静默失败 | 查不到就标 `TODO` |
| 教练输出 `append` 进对话气泡 | 教练只服务面板 | 教练结果只写面板 |
| 插件向考场会话再发 `session.prompt` 催题 | 提问由宿主对话继续 | 插件只看守并刷新面板 |
| 把读日志抛错吞成 internal | 故障不可见 | 映射成对应错误码并在面板可见 |
