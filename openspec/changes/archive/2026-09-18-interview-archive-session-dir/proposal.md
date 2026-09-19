## Why

上一刀把甲板落到当前对话工作区，但相对路径写死为 `study/interview-dsh/<时间>-<主题>/`，和笔记目录抢名字，也不能用考场会话 id 直接找回。测试阶段要把档案绑在隐藏的 `.dsh-interview/<考场 sessionId>/`，避免冲突，旧目录不迁。

## What Changes

- 落盘相对路径改为当前工作区 `.dsh-interview/<考场会话 A 的 sessionId>/`（`session.json` + `cards/<编号>.md`）。工作区根仍来自该对话强制打开的 `header.cwd`。
- **BREAKING**（相对 `interview-question-cards`）：不再写入 `study/interview-dsh/<时间>-<主题>/`。新场只写点目录；不读取、不迁移、不删除已有 `study/` 档案。
- `archiveDir` 由考场 `sessionId` 决定，读盘不再依赖进程内路径表。
- 非法 `sessionId`（空、含路径分隔或 `..`）视为 `persist_unavailable`，面板可见失败。
- 开始前仍不弹文件夹选择；Client inject 仍是 `['slots','remote']`；禁止 `node:fs`。

## Capabilities

### New Capabilities

- （无）

### Modified Capabilities

- `interview-cards`: 工作区落盘目录从 `study/interview-dsh/<时间>-<主题>/` 改为 `.dsh-interview/<考场 sessionId>/`；恢复按 sessionId 直读；不迁旧场。

## Impact

- `backend/src/data/workspace-archive.ts`、`backend/src/infra/dsh/workspace-fs.ts` 与对应单测。
- `docs/architecture/ARCHITECTURE.md` 写明点目录与 sessionId 绑定。
- 面板契约不变；`shared/` 的 `archiveDir` 字段仍是相对路径字符串。
- 验收：本机已在使用的 DSH Desktop 实机，新开一场后工作区出现 `.dsh-interview/<sessionId>/`，且不再新建 `study/interview-dsh/` 目录。
