# 架构

本文是工程落地的依据：系统怎么拆、依赖朝哪边、DSH 怎么接、代码怎么写。

- 产品定位与使用者见 `docs/product/REQUIREMENTS.md`，不要用本文改写成产品说明书。
- 当前能力、交互和验收以 OpenSpec change 为准，不要用本文锁死产品主链路。
- 插件形态边界与提交评审见 `AGENTS.md`；已否决的做法见 `docs/FORBIDDEN.md`。

实现与本文冲突时，先改本文并说明原因，再改代码。

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
- 插件后端通过官方生命周期接入。
- 插件形态边界（面板只做教练、不自建聊天）见 `AGENTS.md`。

## 2. 目录与模块职责

```
backend/     TypeScript：用例入口、领域服务、落盘、DSH Host 适配
frontend/    React 面板；DSH Web Client 适配在 src/infra/dsh/
shared/      前后端共享类型与错误码，无业务逻辑
cordis.patch.yml / 根 package.json 的 dsh.bundle  组合包清单（不是业务目录）
docs/product/REQUIREMENTS.md
docs/architecture/ARCHITECTURE.md   本文
openspec/    实现 change
```

| 模块 | 职责 |
|---|---|
| `backend/` | 会话、提示词组装、校验、落盘、Host 适配 |
| `frontend/` | 入口与评估面板、Client 适配 |
| `shared/` | 跨端类型、API 契约、稳定错误码 |
| 根清单 | 声明 Host/Client 组合包 |

新文件必须落到对应目录。仓库根的 `package.json` / `cordis.patch.yml` 只作 DSH 组合包清单。

## 3. 分层与依赖

依赖方向：

```
frontend/features  →  shared  ←  backend/entrypoints → backend/services → backend/data
        ↓                         ↓
frontend/infra/dsh            backend/infra/dsh
   (Web Client SDK)              (Host SDK)
```

领域逻辑不引用 DSH。跨端只通过 `shared/` 的 TypeScript 类型沟通，禁止口头约定或重复内联一份契约。

### 3.1 后端

路径：`entrypoints/` → `services/` → `data/` → `infra/`。

- `entrypoints/`：对 Host 暴露的端口（如 `interviewEntry`），做参数校验与错误映射，不堆领域规则。
- `services/`：用例与领域规则（配置校验、提示词模板化、会话编排）。不 import Host SDK。
- `data/`：内存或工作区持久化。不引用 DSH。
- `infra/dsh/`：唯一可调用 Host API 的地方（Agent 注入、轮次、Typert、工作区文件、插件生命周期）。
- 根包 `main` 指向 `backend/dist/index.js`，该模块必须导出 `apply` 与 `name`。`backend/tsconfig.json` 的 `rootDir` 必须是 `./src`，否则 dist 布局对不上、插件树起不来。

### 3.2 前端

- React + TypeScript + Hooks。禁止无说明的 `any`。
- 只通过 `shared/` + 官方 `ctx.remote`（或等价桥接）调后端，禁止 `fetch('/api/...')`。
- 功能放在 `frontend/src/features/`，通过 port 接口拿数据；DSH Web Client API 只出现在 `frontend/src/infra/dsh/`。
- 样式：当前入口使用 CSS Modules。Client 构建必须把样式内联进 `frontend/dist/client.js`（DSH 只加载该文件，不加载旁路 `style.css`）。新增 UI 库或改用 Tailwind 须在对应 OpenSpec change 里说明。

### 3.3 shared

- 导出稳定类型、请求/响应、错误码。
- 前后端各自校验，但以 `shared` 的错误码为契约；前端即时提示不能代替 Host 再拒绝一次。

## 4. DSH 适配层

下面是装配设计，改接法先改本节。已否决的接法见 `docs/FORBIDDEN.md`。

### 4.1 Host 适配层

- 只出现在 `backend/src/infra/dsh/`。
- Host 需要的服务在 `apply` 的 `inject` 里声明（当前：`agents`、`llm`、`agentDefaultModel`、`fs`）。查不到时用 `ctx.get('…')` 探测，仍没有就返回对应错误码。
- 文件系统只走 Host `ctx.fs`：先 `ctx.fs.resolve(rel, { cwd })` 得到 FsTarget 再写，并带工作区写入策略。禁止 `node:fs`，不得把路径字符串直接传给 `writeText`。
- 禁止在 Host 注册 Slot、右栏 tab 或输入栏按钮。
- 端口清单、各端口的行为与错误码由对应 OpenSpec change 定义；本层只负责把能力交给正确的会话。
- 教练输出不得进对话气泡；插件不得再向考场会话 `prompt` 催题。
- 读会话日志的符号缺失时标 `TODO` 并返回对应错误码，禁止吞成 internal。

### 4.2 Client 适配层

- 只出现在 `frontend/src/infra/dsh/`；功能在 `frontend/src/features/`，通过 port 接口拿数据。
- 入口只展开面板：不跳转、不新建聊天、不更换当前对话。
- 根包 `dsh.client.inject` 声明要加载的官方包，当前为 runtime、api-remotes、ui-layout（`shell.overlay` 宿主）、ui-conversation（输入栏按钮）；用到新的官方能力就补声明。
- Client `apply` 的 `inject` 只声明沙箱确实提供的服务（当前 `['slots', 'remote']`）。额外服务只用 `ctx.get('…')` 探测，`get` 返回 `undefined` 后不得再直接读 `ctx.<service>`。
- 具体 Slot、id、打开与回退分支、失败呈现由对应 OpenSpec change 定义。
- 已否决的接法见 `docs/FORBIDDEN.md`：顶层声明本机没有的服务、`slots.inject('details')`、拿非官方 sidebar 顶替官方符号等。

## 5. 会话隔离

开始面试后是两条会话。会话 A 是 **新开的 DSH 对话**（Client `sessions.create`），不是把面试官注入用户正在看的那条编码对话。配置仍来自当前工作区 / 默认模型，插件不得另配 Key。具体开口文案与面板字段由当前 OpenSpec change 定义。

两条会话的产品角色见 `docs/product/REQUIREMENTS.md`。

| 会话 | 架构禁止 |
|---|---|
| A 对话 / 面试官 | 读场前历史；看见评分/标准答提示词；领域层直接调 Host SDK |
| B 面板 / 教练 | 任何输出进入气泡；读场前历史；前端做评分判定 |

允许：A 的问答作为材料单向交给 B。禁止：B 回流到 A。第一问之后的追问由宿主对话继续；插件只看守抽出后的当前待答问并刷新面板，不得再向 A `prompt`。

结束时必须能卸下面试官，当前对话恢复普通助手。面板「结束本场」只清掉进行中甲板并回到入口，不切换宿主当前会话。适配层查不到注入/卸载 API 时标 `TODO`，禁止用自建聊天绕过。

提示词在 `backend/src/services/` 模板化；`infra/dsh/` 只负责交给哪条会话。面试官口径来自 `interviewer-role-prompt.md`，不在适配层手写一套角色。

工作区写入走 `backend` 的 `data/` / `infra/`，失败必须映射到面板可见错误；前端不直接写文件。

## 6. 编码规范

- TypeScript ESM（`type: module`）。后端 `lint` 以 `tsc --noEmit` 为准。文件编码 UTF-8。
- 注释只写意图、约束、复杂流程；位于对应代码之前；禁止尾注释；禁止「已修改 / 新增 / 已修复」之类过程句。
- 日志与错误文案不得带密码、Token、API Key、Authorization 或其它敏感信息。
- 新增或修改跨端字段时，先改 `shared/`，再改两端实现，避免一端内联一份结构。
- 错误使用 `shared` 中的稳定错误码。禁止用空 catch、`null` 或静默成功表示失败。

## 7. 安全边界

- 禁止在业务代码中硬编码 API Key / Token / 密码。敏感数据默认脱敏，不暴露给前端。
- 前端不做加密、解密、权限判断、评分判定。
- 面试活跃路径禁止不可取消的异步工作；评估请求必须可随会话结束取消。
- 禁止引入未随桌面端提供、也未经当前 change 确认的依赖。

## 8. 测试约定

- 后端：会话编排、提示词组装、校验、落盘、错误映射要有单元测试。
- 前端：测入口/评估面板和适配层边界，不要为不存在的聊天页写测试。
- 适配层边界测试锁住「Host 不注册 Slot、Client 不把 Host SDK 引进 features」。
- 新功能、行为边界不清或风险较高的改动：先写失败测试再最小实现（TDD）；小型纠错不强制。
- 验收以本机 DSH Desktop 实机为准，是 OpenSpec change 的交付门闩；`npm test` 只是仓库内前置。被否决的验收替身见 `docs/FORBIDDEN.md`。

## 9. 变更规则

1. 改分层、目录、适配层或编码规范：先改本文。
2. 改用户可见行为：走 OpenSpec change（proposal / design / spec / tasks），实现必须仍符合本文。
3. 产品文档只用于校正方向（这是不是陪练插件、用户是谁），不要求实现去迎合其中的过时细节。
4. 偏离本文：先改本文并写明原因，再改代码。
