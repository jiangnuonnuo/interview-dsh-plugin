# interview-cards Specification

## Purpose

把八股陪练的教练表面从单题快照改成可落盘的问题卡片甲板：每题一张卡，追问单独编号，交卷当时给出对照与五维评分，并允许左右切换回看。

## Requirements

### Requirement: This change is not accepted without a real DSH desktop card test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「答完一题见到本题对照与五维、追问出现新卡且旧卡仍带分数、工作区出现逐题文件」才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击、输入与可见结果。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、上一刀追问记录、Vite 预览、浏览器打开面板、`doc/entry-panel-mock.html`、新建 profile、升级 Desktop。未能启动该 Desktop 或未能在其 GUI 内走完场景时，本 capability MUST 视为未交付，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop card scoring is the gate
- **WHEN** 实现者启动本机已在使用的 DSH Desktop，用 `dsh plugin add` 把本包装进该 Desktop 正在使用的 profile，开始一场八股模拟面试并见到 `Q1` 开卷要点后，在宿主输入框提交对本题的回答
- **THEN** 面板仍停在 `Q1` 卡，可见对照（覆盖/缺口）与八股五维分数，工作区 `.dsh-interview/<该场 sessionId>/` 下已有 `cards/Q1.md` 且含作答与分数

#### Scenario: Desktop follow-up keeps the scored card
- **WHEN** 上一场景之后面试官提出下一问（含同一气泡先讲评再提问）
- **THEN** 面板出现新卡并默认切到新卡，新卡有自己的开卷要点；左切回到 `Q1` 时对照与五维仍在，且 `cards/Q1.md` 未被新题覆写

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里完成评分卡与落盘核对
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

### Requirement: Each question is a durable card including follow-ups
系统 SHALL 为本场每一个待答问建立一张卡片，按出场顺序排列。编号 MUST 使用 `Q1`、`Q1.1`、`Q1.2`、`Q2` 这种知识链形式：同一知识点的第一问为 `Qn`，其上的追问为 `Qn.m`。追问 MUST 新增卡片，MUST NOT 覆盖上一张卡的题干、要点、作答或分数。考场气泡 MUST 保持自然语言，MUST NOT 输出卡片编号或 JSON。

#### Scenario: First question is Q1
- **WHEN** 开始成功且第一问已出现
- **THEN** 甲板含恰好一张卡，编号为 `Q1`，状态为待答，含题干摘要与开卷要点，对照与五维为空

#### Scenario: Follow-up is Q1.1 not a rewrite of Q1
- **WHEN** 候选人已答完 `Q1` 且面试官在同一条考场对话中追问同一知识点
- **THEN** 甲板新增一张卡（编号为 `Q1.1` 或教练判定的等价追问编号），`Q1` 卡的作答、对照与五维保持不变

#### Scenario: Next knowledge point is Q2
- **WHEN** 教练判定新待答问已切到下一个知识点
- **THEN** 新卡编号为 `Q2`（或下一个未占用的 `Qn`），不是上一知识点的 `Qn.m+1`

#### Scenario: Numbering fallback never drops a card
- **WHEN** 教练未能给出可用编号
- **THEN** 系统仍创建新卡：优先记为上一张卡的追问 `Qn.m+1`，否则记为新的 `Q{n+1}`，MUST NOT 丢弃该待答问

#### Scenario: Exam chat stays natural language
- **WHEN** 面试官产出下一问
- **THEN** 宿主气泡中 MUST NOT 出现 `Q1.1`、`questionBrief` 或其它面板专用载荷

### Requirement: Scoring happens when the candidate answers that question
当一张卡处于待答，且考场对话中出现相对该卡的**新的人类作答**时，会话 B SHALL 立刻为**这一张卡**生成对照与八股五维评分（基础扎实度 / 原理理解 / 场景迁移 / 深度边界 / 表达清晰度，1–5，允许 0.5）。评分 MUST NOT 等到整场结束。系统 MUST NOT 把插件开场种子气泡当作作答。对照 MUST 只使用本题开卷要点与该作答；MUST NOT 把面试官讲评当作评分输入。前端 MUST NOT 计算或判定分数。

#### Scenario: Answer fills the same card
- **WHEN** 面板已展示待答的 `Q1` 开卷要点，候选人在宿主输入框提交回答
- **THEN** 仍是 `Q1` 卡，出现对照与五维分数，状态为已评；面板内 MUST NOT 出现该回答气泡

#### Scenario: Opening seed is not scored
- **WHEN** 考场对话里只有插件开场那条催开口的用户消息，第一问尚未被候选人回答
- **THEN** `Q1` 保持待答，MUST NOT 把开场文案写成作答或打分

#### Scenario: Scores are not deferred to session end
- **WHEN** 候选人已提交本题回答，且尚未点「结束本场」
- **THEN** 本题对照与五维已经可见，MUST NOT 要求先结束本场才出分

#### Scenario: Frontend does not compute scores
- **WHEN** 用户查看已评卡
- **THEN** 分数与对照来自后端只读字段，面板不自行算出分数或通过/不通过

### Requirement: The panel shows one card at a time and can switch history
进行中面板 SHALL 一次只展示一张卡，默认停在最新卡。系统 SHALL 提供左右切换（按钮即可，滑动可选），使候选人回到任意历史卡查看该题要点、作答、对照与分数。面板 MUST NOT 出现消息列表、聊天输入框或气泡。

#### Scenario: Latest card is current after a new question
- **WHEN** 新卡的开卷要点已生成
- **THEN** 面板默认展示该新卡

#### Scenario: Switch back to a scored card
- **WHEN** 甲板至少有 `Q1`（已评）与 `Q1.1`（待答），用户切到上一张
- **THEN** 可见 `Q1` 的开卷要点、作答、对照与五维，`Q1.1` 记录仍在甲板中

#### Scenario: No chat surface on the deck
- **WHEN** 用户在卡片间切换
- **THEN** 面板内仍无消息列表、输入框或气泡；发言仍只通过宿主输入框

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

### Requirement: This change is not accepted without a Desktop path test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里新开一场八股模拟面试，确认工作区出现 `.dsh-interview/<考场 sessionId>/` 且含 `session.json` 与 `cards/Q1.md`，才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击与可见文件。`npm test`、Vite、新建 profile、升级 Desktop MUST NOT 代替本 requirement。未能在 GUI 内确认点目录时，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop writes the hidden session directory
- **WHEN** 实现者在本机已在使用的 DSH Desktop 中开始一场模拟面试并见到 `Q1` 开卷
- **THEN** 当前工作区存在 `.dsh-interview/<该场 sessionId>/session.json` 与 `cards/Q1.md`，本场 MUST NOT 在 `study/interview-dsh/` 下新建目录

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里核对该点目录
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成
