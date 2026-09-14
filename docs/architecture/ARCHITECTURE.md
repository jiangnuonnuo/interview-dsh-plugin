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
- 插件后端通过官方生命周期接入；DSH SDK 只出现在适配层。

## 2. 目录

```
backend/     TypeScript，会话、提示词、落盘、DSH 适配
frontend/    React，入口面板与评估面板
shared/      前后端共享类型，无业务逻辑
docs/product/REQUIREMENTS.md
docs/architecture/ARCHITECTURE.md   本文
openspec/    从需求拆出的实现 change
```

新文件必须落到对应目录，不要另起顶层业务文件夹。

## 3. 分层

后端：`entrypoints/` → `services/` → `data/` → `infra/`。

- 只有 `infra/dsh/` 可调用 DSH API（Agent 注入、轮次、Typert、工作区文件）。
- 领域逻辑不引用 DSH Web / 前端 API。
- 对外契约在 `shared/` 定义完整类型；禁止口头约定或重复内联类型。

前端：

- React + TypeScript + Hooks，禁止无说明的 `any`。
- 只通过 `shared/` + 官方 `ctx.remote`（或等价桥接）调后端，禁止 `fetch('/api/...')`。
- 功能放在 `frontend/src/features/`；此处不得出现消息列表、输入框、气泡。
- 样式：CSS Modules 或 Tailwind。视觉参考 `doc/entrance.png`、`doc/layout.png`。

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
