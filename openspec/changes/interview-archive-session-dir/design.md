## Context

见 proposal.md 的 Why。上一刀 `interview-question-cards` 已用 `session.header.cwd` + `ctx.fs` 落盘；相对路径仍是 `study/interview-dsh/<yyyyMMdd-HHmm>-<slug>/`，`readDeck` 还把相对目录记在进程内 Map。工作区根绑定不变。测试阶段不迁旧场。

## Goals / Non-Goals

**Goals:**

- 相对路径改为 `.dsh-interview/<sanitize(sessionId)>/`，由考场会话 A 的 id 决定。
- `writeDeck` 始终按 sessionId 计算目录，忽略甲板里旧的 `study/` `archiveDir`。
- `readDeck(sessionId)` 用同一公式直读 `session.json`，不依赖 Map。
- 架构文档写明点目录；单测锁路径；Desktop 实机确认。

**Non-Goals:**

- 不迁、不读、不删 `study/interview-dsh/`。
- 不改双会话、评分、切卡、开考 cwd 解析。
- 不卸角、不选文件夹、不用 `node:fs`、不改 Client 顶层 inject。

## Decisions

### 1. 目录键是考场会话 A 的 id

开考会 `sessions.create` 得到新会话。源对话只提供 cwd。教练会话 B 无工作区档案。备选：用源对话 id — 否决，同聊天再开一场会互盖。备选：时间+主题 — 否决，正是本刀要去掉的。

### 2. sessionId 消毒后才进路径

合法：非空、仅 `[A-Za-z0-9._-]`、不以 `.` 或 `-` 打头以外的 traversal、不含 `..` `/` `\`，长度上限 128。Desktop 现网 id 形如 `session-<uuid>`。非法则 `persist_unavailable`。备选：原样拼接 — 否决，防路径穿越。

### 3. 写盘忽略旧 `archiveDir`

`archiveDirFor(sessionId)` 每次覆盖甲板字段再写。进程里若仍带着 `study/...` 也不会写回 study。备选：有值则沿用 — 否决，会把旧相对路径锁死。

### 4. 读盘公式化

`readDeck`：`cwdFor(sessionId)` + `.dsh-interview/<id>/session.json`。缺文件返回空，由上层走内存或 `follow_up_failed`。备选：扫描 `.dsh-interview/*` — 本刀不需要。

### 5. 点目录可写

`workspace-write` 只约束 cwd 树内，隐藏目录与 `study/` 同等合法。仍传 `{ mode: 'workspace-write', workspaceRoot: cwd, sessionId }`。

## Risks / Trade-offs

- [Risk] 点目录在 DSH 文件树里可能默认隐藏 → 验收用磁盘路径核对，不依赖树可见。
- [Risk] 非法 sessionId 导致整场不能落盘 → 面板可见错误，内存甲板保留。
- [Trade-off] 人读 md 藏在点目录 → 换不与 `study/` 冲突；需要时仍可直接打开文件。
- [Trade-off] 不迁旧场 → 测试阶段可接受；旧目录成为死档。

## Migration Plan

- 重载已安装插件后，新开一场只写 `.dsh-interview/`。
- 回滚：恢复 `archiveDirFor(topic, date)`；已写出的点目录保留不删。
- 不把本刀任务回填进 `interview-question-cards`。

## Open Questions

无。目录前缀、键、不迁旧场已由产品拍板。
