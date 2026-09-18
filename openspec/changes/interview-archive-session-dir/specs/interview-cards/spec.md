## MODIFIED Requirements

### Requirement: Cards persist to the current workspace
系统 SHALL 把本场甲板写入当前工作区目录 `.dsh-interview/<考场会话 id>/`：`session.json` 为机器可读真源，`cards/<编号>.md` 为人读副本。工作区根 MUST 是该对话强制打开的目录（会话 `cwd`）。考场会话 id MUST 是新建的面试官会话 A 的 id，MUST NOT 使用教练会话 B 的 id，MUST NOT 使用点「开始」之前那条源对话的 id。题目一出现 MUST 建立该卡文件；作答评分后 MUST 更新同一文件。关上面板再打开「面试」时，系统 MUST 用该考场会话 id 从磁盘恢复全部卡片与当前卡，MUST NOT 依赖仅存活于进程内的路径表。开始前 MUST NOT 弹出文件夹选择。查不到工作区目录、会话 id 非法（空、含 `/` `\` 或 `..`）或 `fs` 写入失败时，面板 MUST 展示可见错误，MUST NOT 丢掉已有卡片，MUST NOT 空 catch。系统 MUST NOT 再向 `study/interview-dsh/` 写入新场；MUST NOT 读取、迁移或删除既有 `study/` 档案。

#### Scenario: Files appear with the first question
- **WHEN** `Q1` 开卷要点已生成且工作区目录与合法考场会话 id 已知
- **THEN** 工作区存在 `.dsh-interview/<该 sessionId>/session.json` 与 `.dsh-interview/<该 sessionId>/cards/Q1.md`，其中含编号、题干与开卷要点

#### Scenario: Scoring updates the same markdown file
- **WHEN** `Q1` 完成对照与五维
- **THEN** 同一路径下的 `cards/Q1.md` 含作答、对照与分数，系统 MUST NOT 另起一份把 `Q1` 覆盖成下一题

#### Scenario: Overlay remount restores the deck
- **WHEN** 本场已有至少两张卡并已落盘，用户关闭面板后再点「面试」
- **THEN** 甲板、编号、分数与关闭前一致，无需重新开考

#### Scenario: Persist failure is visible
- **WHEN** 无法解析工作区目录、会话 id 非法或写入失败
- **THEN** 面板展示错误，已生成的卡片仍可查看，系统 MUST NOT 把失败标成落盘成功

#### Scenario: Legacy study archives stay untouched
- **WHEN** 工作区里已有 `study/interview-dsh/` 旧场目录，用户开始一场新的模拟面试
- **THEN** 新场只写入 `.dsh-interview/<新 sessionId>/`，MUST NOT 改写或删除该 `study/` 目录

## ADDED Requirements

### Requirement: This change is not accepted without a Desktop path test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里新开一场八股模拟面试，确认工作区出现 `.dsh-interview/<考场 sessionId>/` 且含 `session.json` 与 `cards/Q1.md`，才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击与可见文件。`npm test`、Vite、新建 profile、升级 Desktop MUST NOT 代替本 requirement。未能在 GUI 内确认点目录时，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop writes the hidden session directory
- **WHEN** 实现者在本机已在使用的 DSH Desktop 中开始一场模拟面试并见到 `Q1` 开卷
- **THEN** 当前工作区存在 `.dsh-interview/<该场 sessionId>/session.json` 与 `cards/Q1.md`，本场 MUST NOT 在 `study/interview-dsh/` 下新建目录

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里核对该点目录
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成
