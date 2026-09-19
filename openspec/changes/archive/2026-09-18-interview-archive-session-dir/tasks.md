## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」。**实现者必须亲自打开本机已在使用的 DSH Desktop**，新开一场八股模拟面试，确认当前工作区出现 `.dsh-interview/<考场 sessionId>/{session.json,cards/Q1.md}`，且本场 **没有** 在 `study/interview-dsh/` 下新建目录。否则 3.2 不得勾选，不得归档。

不得卸角、不得自建聊天、不得 `node:fs`、不得弹文件夹选择、不得把本刀回填进 `interview-question-cards`。旧 `study/` 档案不迁不删。

## 1. 路径与读写

- [x] 1.1 将 `archiveDirFor` 改为 `.dsh-interview/<合法 sessionId>`；非法 id 不可用。单测：合法 `session-…` 得到点目录；含 `/`、`..` 或空串失败
- [x] 1.2 `writeDeck` 始终按 sessionId 计算目录，忽略甲板里旧的 `study/` `archiveDir`；假 fs 断言写出 `.dsh-interview/<id>/session.json` 与 `cards/Q1.md`，且带 `workspace-write`
- [x] 1.3 `readDeck(sessionId)` 按同一公式读盘，不依赖进程内路径表。单测：写后清掉任何内部表仍能读回两张卡

## 2. 架构与仓库验证

- [x] 2.1 更新 `docs/architecture/ARCHITECTURE.md`：落盘相对路径为 `.dsh-interview/<考场 sessionId>/`，工作区根仍是会话 cwd
- [x] 2.2 `npm test --workspace=interview-dsh-backend` 与相关 lint/build 通过；frontend 无行为改动则不必重建 client

## 3. 桌面验收

- [x] 3.1 重载本机已装插件（正在使用的 Desktop 0.x，不新建 profile）
- [x] 3.2 **【验收门槛】** 在 GUI 开始一场，见到 `Q1` 开卷后核对该场点目录。勾选前填写：

```
Desktop 版本：0.2.17（/Applications/DSH Desktop.app，com.yeagoo.dsh-desktop）
工作区路径：/Users/jiang/Item/plugin/interview-dsh
考场 sessionId：session-2262c2a1-269a-4f19-aaff-76d9a291f981
落盘目录：.dsh-interview/session-2262c2a1-269a-4f19-aaff-76d9a291f981/{session.json,cards/Q1.md}
本场是否新建 study/interview-dsh/：否（仍仅 20260918-1036 与 20260918-1042 两场旧目录）
关闭 overlay 再打开是否仍能恢复：是（恢复 Q1 开卷与待作答）
```
