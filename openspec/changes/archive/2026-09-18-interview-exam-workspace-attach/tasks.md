## 0. 本刀完成门槛（先读）

实现者必须在本机已在使用的 DSH Desktop 里，从某个**已打开的项目工作区**（顶栏不是空、侧栏能看到该项目会话）点「开始模拟面试」，确认新考场出现在该项目分组下，而不是「未分组」。仓库测试不能单独过关。

不得卸角、不得注入当前编码对话、不得扩大 Client 顶层 inject、不得 `node:fs`。

## 1. 解析与创建

- [x] 1.1 单测先失败：当前会话已在某 `workspaces.list` 项的 `sessionIds` 里时，`sessions.create` 只收到 `{ workspaceId }`，不得带 `cwd`
- [x] 1.2 单测：当前会话在未分组、但 `recentWorkspaceId` 指向项目 A 时，create 使用 A 的 id
- [x] 1.3 实现上述解析顺序；没有 `workspaces` 服务时仍允许只传 `cwd`（旧回退）。相关 frontend 单测通过

## 2. Client 探测与架构

- [x] 2.1 `apply` 点开始时探测 `workspaces`（`ctx.get` 再嵌套 inject），与 `sessions` 同构；`export const inject` 仍为 `['slots','remote']`。boundary 单测锁住这两点
- [x] 2.2 更新 `docs/architecture/ARCHITECTURE.md`：考场 `create` 必须带 `workspaceId` 才会进入项目分组；仅 `cwd` 会进未分组

## 3. 桌面验收

- [x] 3.1 重建 frontend `client.js` 并重载本机已装插件（正在使用的 Desktop 0.x，不新建 profile）
- [x] 3.2 **【验收门槛】** 从已打开的项目工作区开始一场，见到 `Q1` 后核对该会话在该项目分组下。勾选前填写：

```
Desktop 版本：0.2.17（/Applications/DSH Desktop.app，sidecar 127.0.0.1:64085）
起始工作区（顶栏名称与路径）：xerina-atlas /Users/jiang/Item/Java/xerina-atlas（从该分组下 skills 会话开始）；对照：interview-dsh /Users/jiang/Item/plugin/interview-dsh
新考场 sessionId：session-c0ccfd6d-42db-44cb-a729-370eca313e94（atlas）；对照 session-2f36cf3c-6c1f-4928-a80a-dfe8d31ec315（interview-dsh）
是否出现在该项目分组：是（workspace.json 将该 id 插到 xerina-atlas.sessionIds 首位；侧栏 xerina-atlas 下出现本场）
是否跳进「未分组」：否（未分组仍只有旧残留）
```
