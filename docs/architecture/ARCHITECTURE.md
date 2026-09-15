# 架构

开发以本文为准。产品要做什么见 `docs/product/REQUIREMENTS.md`，不要用本文覆盖需求。

## 1. 系统位置

本仓库是 DSH 插件，不是独立应用。

```
DSH Web
  现有对话  = 面试官说话的唯一表面（宿主）
  右侧面板  = 本仓库前端（入口 + 评估）
       |
       v
  插件后端  = 提示词注入、双会话、评分、落盘
```

- 对话 UI、输入框、模型配置由 DSH 提供。
- 插件前端只做面板，禁止实现聊天页。
- 插件后端通过官方生命周期接入。
- DSH Host SDK 只出现在 `backend/src/infra/dsh/`；DSH Web Client SDK 只出现在 `frontend/src/infra/dsh/`。

## 2. 目录

```
backend/     TypeScript，会话、提示词、落盘、DSH Host 适配
frontend/    React 面板；DSH Web Client 适配在 src/infra/dsh/
shared/      前后端共享类型，无业务逻辑
cordis.patch.yml / 根 package.json 的 dsh.bundle  组合包清单（不是业务目录）
docs/product/REQUIREMENTS.md
docs/architecture/ARCHITECTURE.md   本文
openspec/    从需求拆出的实现 change
```

新文件必须落到对应目录，不要另起顶层业务文件夹。

## 3. 分层

后端：`entrypoints/` → `services/` → `data/` → `infra/`。

- 只有 `backend/src/infra/dsh/` 可调用 DSH **Host** API（Agent 注入、轮次、Typert、工作区文件、插件生命周期）。
- 领域逻辑不引用 DSH Web / 前端 API。
- 对外契约在 `shared/` 定义完整类型；禁止口头约定或重复内联类型。

前端：

- React + TypeScript + Hooks，禁止无说明的 `any`。
- 只通过 `shared/` + 官方 `ctx.remote`（或等价桥接）调后端，禁止 `fetch('/api/...')`。
- 功能放在 `frontend/src/features/`；此处不得出现消息列表、输入框、气泡。
- DSH **Web Client** API 只出现在 `frontend/src/infra/dsh/`。`features/` 不得直接 import 这些 SDK。
- 右侧入口的装配顺序：先用官方 `ctx.sidebarRightTabs` / `ctx.sidebarRight.openTab`（harness 0.1.5-rc.1+）。当前 Desktop 0.2.17 所带的 0.1.1-rc.2 **没有**该 API；此时适配层走与本机已装插件相同的官方 Slot 装配（对照 `dsh-ai-prompt-optimizer`：`inject: ['slots','remote']` + `ctx.slots.inject`）。**触发按钮**挂 `conversation.input.right`（与「AI 优化」同一列表、同一新会话首页输入条）；不要用 `conversation.session.header.utilities` 当主入口——新会话首页没有 session header，该槽不渲染。根包 `dsh.client.inject` 与优化器对齐（runtime / remotes / layout / conversation）：按钮靠 conversation，overlay 靠 layout。面板正文：有官方右栏且 `sidebarRightTabs.register` 已成功则 `openTab`，否则 `shell.overlay` 右侧抽屉（`position: fixed`，对照优化器错误弹窗）。探测官方 API 只用 `ctx.get`，不得在 `get` 已存在时再读未声明的 `ctx.sidebarRight`（沙箱会 throw，点按钮无面板）。打开失败必须在 overlay 给出可见错误。禁止为此引入 `dsh-better-sidebar` 或其它未随桌面端提供的包。
- 样式：CSS Modules 或 Tailwind。入口视觉以 `doc/entry-panel.png` 为准；`doc/entrance.png` / `doc/layout.png` 只说明宿主位置与后续评估布局，其中的时长、倒计时、非五维评分不要做。
- 仓库根的 `package.json` / `cordis.patch.yml` 可作为 DSH 组合包清单，不另起顶层业务目录。

## 4. 双会话（实现约束）

开始面试后必须是两条会话，配置都来自**当前这条 DSH 对话**，插件不得另配模型或 Key。

| 会话 | 职责 | 禁止 |
|---|---|---|
| A 对话 / 面试官 | 提问、追问、提示、换题、结束语 | 读场前历史；看见评分/标准答提示词 |
| B 面板 / 教练 | 要点、标准答、评分、简报 | 任何输出进入气泡；读场前历史 |

允许：A 的问答作为材料单向交给 B。禁止：B 回流到 A。

结束（停止或问完）必须卸下面试官，当前对话恢复普通助手。适配层查不到注入/卸载 API 时标 `TODO`，禁止用自建聊天绕过。

## 5. 提示词与出题

- 面试官行为从 `interviewer-role-prompt.md` 八股专项模板化后注入会话 A。
- 题目由 LLM 按主题与本场面试对话生成，禁止内置死题库作为主路径。
- 「提示一下」「跳过问题」只驱动会话 A；面板不生成这些文案。

## 6. 落盘

默认根目录：当前打开工作区下的 `study/`。一场一子目录，至少包含 `conversation.md`、`report.md`、`answers/`。开始不选文件夹。写入失败必须对面板可见。

## 7. 安全与稳定

- 禁止硬编码密钥；前端不做加密、解密、权限判断、评分判定。
- 敏感数据默认加密、脱敏、不暴露给前端。
- 显式错误处理，禁止吞错。
- 面试活跃路径禁止不可取消的异步工作；评估请求必须可随会话结束取消。
- 禁止修改 DSH 核心（官方 Hook 除外）。禁止未验证依赖。

## 8. 测试与变更

- 后端：会话、提示词组装、落盘、错误映射要有单元测试。
- 前端：测入口/评估面板，不要为不存在的聊天页写测试。
- 功能变更：先保证 `docs/product/REQUIREMENTS.md` 仍正确，再走 OpenSpec change，实现必须符合本文。
- 提交：Conventional Commits。
- 偏离本文：先改本文并写明原因，再改代码。

## 9. 过期材料

`openspec/changes/2026-09-12-interview-dsh-bagua-mode/` 按自建聊天编写，实现时不要遵循。
