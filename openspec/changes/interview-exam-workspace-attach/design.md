## Context

见 proposal.md 的 Why。Host `session.create`：带 `workspaceId` 时才会 `workspace.attachSession`；只带 `cwd` 只写 `header.cwd`，侧栏进「未分组」。Client `SessionSummary` 没有 `workspaceId`。`workspaces.list` 快照有 `items[].workspaceId/path/sessionIds` 与 `recentWorkspaceId`。

## Goals / Non-Goals

**Goals:**

- 开考 `create` 在能解析到工作区时只传 `workspaceId`。
- 探测 `workspaces` 的方式与 `sessions` 相同：`ctx.get` 再嵌套 inject。
- 单测锁「有工作区 id 时不得只传 cwd」；Desktop 从项目页开始后新会话在该分组下。

**Non-Goals:**

- 不把面试官注入当前编码对话。
- 不改双会话、评分、切卡、`.dsh-interview/` 相对路径。
- 不清理已有「未分组」残留。
- 不把 `workspaces` 写入 Client 顶层 inject。
- 不用 `node:fs`、不选文件夹。

## Decisions

### 1. 用 `create({ workspaceId })`，不用 create-with-cwd 再补挂

Host 只有这条路径会 `attachSession`。Client 没有 `attachSession`。备选：`create({ cwd })` 再 `insertSessionBefore` — 否决，官方挂载点就是 create 时的 workspaceId。

### 2. 解析顺序

1. 当前会话 id 出现在某个 `items[].sessionIds` → 该 `workspaceId`（人已经在项目会话里）。
2. 否则 `recentWorkspaceId`（顶栏选中的项目 / 新会话页，当前会话可能在未分组）。
3. 否则当前会话 `cwd` 与 `items[].path` 对齐（去尾部斜杠后比较）。
4. 否则会话记录上的 `workspaceId`（若将来 list 带上）。
5. 否则 `create({ cwd })`，作为没有 `workspaces` 服务时的回退。

二者仍不可同时传。

### 3. `workspaces` 探测与 `sessions` 同构

`probeWorkspaces`：`ctx.get('workspaces')`，失败再 `ctx.inject(['workspaces'], …)`。顶层 `inject` 保持 `['slots','remote']`。点「开始」时再探，apply 时服务可能还没进 fiber。

### 4. 仍 `open` 新考场

产品仍是会话 A = 新对话。本刀只改它落在哪个分组，不改切过去说话。

## Risks / Trade-offs

- [Risk] `recentWorkspaceId` 与当前会话所属工作区不一致 → 先信会话所属，避免把编码会话所在项目错挂到上次点过的项目。
- [Risk] 嵌套 inject `workspaces` 在某版 Desktop 不可用 → 退回 cwd，面板仍能开考，但可能再进未分组；验收必须确认本机 0.2.x 能探到。
- [Trade-off] 不自动收拾历史未分组考场 → 测试残留仍在，新场不再继续堆进去。

## Migration Plan

- 重建 frontend `client.js` 后重载已装插件。
- 回滚：恢复只读 `byId[current].cwd` 的 `create({ cwd })`。
- 已产生的未分组会话不删。

## Open Questions

无。
