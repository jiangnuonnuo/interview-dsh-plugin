## Why

开考已经会新建考场会话并带上当前目录，但只传 `cwd` 时 Host 不会把会话挂进工作区账户，侧栏会落到「未分组」，并从 A/C 项目页跳进那些残留考场。用户是在某个项目页点「开始」，考场必须留在该项目分组下。

## What Changes

- 解析当前工作区时优先得到 `workspaceId`，`sessions.create` 只传这一个字段，让 Host `attachSession`。
- 解析顺序：当前会话已属于某工作区 → 顶栏最近选中的工作区 → 当前会话 `cwd` 与工作区 path 对齐 → 才退回只传 `cwd`。
- `workspaces` 仍用 `ctx.get` / 嵌套 inject 探测，Client 顶层 inject 仍是 `['slots','remote']`。
- 仍新建考场会话 A 并 `open`，不把面试官注入正在写代码的那条对话。
- **不**迁移或删除已有「未分组」残留会话。

## Capabilities

### New Capabilities

- （无）

### Modified Capabilities

- `interview-session`: 开考创建的考场会话必须挂在用户当前所在的工作区分组下，不得因只传 `cwd` 进入「未分组」。

## Impact

- `frontend/src/infra/dsh/start-exam-room.ts`、`start-interview.ts`、`remote-port.ts`、`index.ts` 与对应单测。
- `docs/architecture/ARCHITECTURE.md`：写明必须 `create({ workspaceId })` 才会进项目分组。
- 后端落盘路径不变：考场 `header.cwd` 仍来自该工作区 path，档案仍写 `.dsh-interview/<sessionId>/`。
- 验收：在已打开的项目工作区（非「未分组」）点开始，新考场出现在该项目会话列表，不跳进「未分组」。
