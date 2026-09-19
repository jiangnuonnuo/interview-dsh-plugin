## Purpose

把「结束本场」做成结束当前这一轮八股：用户气泡只出现「结束面试」，面试官用固定收尾句收场，本轮问答汇总与总结落到工作区，人设与考场会话保持，同一条对话可以再开一轮。笔记文件只写盘，不在面板里预览。

## ADDED Requirements

### Requirement: This change is not accepted without a real DSH desktop round-close test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「答完至少一题后点结束本场：可见用户气泡仅为「结束面试」、考场出现固定收尾句且不再提问、工作区出现本轮 `qa.md` 与 `summary.md`、不换会话再开一轮且旧笔记仍在」才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击、输入与可见文件。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、Vite 预览、浏览器打开面板、新建 profile、升级 Desktop、仅改产品文档。未能启动该 Desktop 或未能在其 GUI 内走完场景时，本 capability MUST 视为未交付，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop end writes closing line and note files
- **WHEN** 实现者在本机已在使用的 DSH Desktop 中开始一轮八股并见到 `Q1`，在宿主输入框作答后点面板「结束本场」
- **THEN** 同一条考场对话因此多出的用户气泡正文为「结束面试」，MUST NOT 出现收尾导演词；面试官收尾最后一句为「此番 xerina 伴君至此，言尽于此，愿君面试顺遂，前程可期」，其后 MUST NOT 再出现新的待答问；工作区该轮目录存在 `qa.md` 与 `summary.md`

#### Scenario: Desktop next round reuses the exam session
- **WHEN** 上一场景之后不切换会话，在入口再选主题与难度并点「开始模拟面试」
- **THEN** 仍是同一条考场会话 id；出现本轮新的第一问；上一轮 `qa.md` 与 `summary.md` 仍在且未被覆盖

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里完成结束、笔记文件与再开一轮
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

### Requirement: Ending a round speaks a fixed closing line and MUST NOT unload the persona
当用户点「结束本场」且本轮甲板存在时，系统 SHALL 先停止对本轮的看守，再由 Host 把收尾导演词注入考场 Agent 的 `systemPrompt.section`（MUST NOT 写入对话气泡），然后对考场会话 **恰好 `prompt` 一次**，该次可见正文 MUST 为「结束面试」。面试官可见回复 MUST 包含原文「此番 xerina 伴君至此，言尽于此，愿君面试顺遂，前程可期」作为本轮最后一句。该回复 MUST NOT 再提出待答问题，MUST NOT 把对照、五维分数或本轮建议写入气泡。系统 MUST NOT 卸下面试官人设，MUST NOT 切换宿主当前会话，MUST NOT 删除该考场对话。收尾 `prompt` 或导演词注入失败时面板 MUST 展示可见错误，MUST NOT 空 catch；系统仍 SHALL 尝试写 `qa.md` 与 `summary.md`。

#### Scenario: Closing line appears in the exam chat
- **WHEN** 进行中面板可见且用户点「结束本场」，且 Host 能向该考场 `prompt`
- **THEN** 考场出现面试官收尾气泡，最后一句为「此番 xerina 伴君至此，言尽于此，愿君面试顺遂，前程可期」，其后无新的待答问

#### Scenario: Director prompt stays off the user bubble
- **WHEN** 用户点「结束本场」且收尾 `prompt` 被发送
- **THEN** 因此多出的用户气泡正文为「结束面试」，MUST NOT 包含「请用面试官口吻」或「最后一句必须原文」

#### Scenario: Scores stay out of the closing bubble
- **WHEN** 本轮已有已评卡，用户点「结束本场」
- **THEN** 收尾气泡中 MUST NOT 出现五维分数、对照条目或本轮建议全文

#### Scenario: Persona and session stay
- **WHEN** 结束本轮成功
- **THEN** 当前仍是该考场会话，面试官人设仍挂在该会话上，侧栏 MUST NOT 因结束而切到其它会话

#### Scenario: Closing prompt failure is visible
- **WHEN** 用户点「结束本场」但收尾 `prompt` 或导演词注入失败
- **THEN** 面板展示可见错误，系统 MUST NOT 把失败标成已成功收尾

### Requirement: Ending a round writes importable Q&A and summary files
结束本轮时，系统 SHALL 把本轮笔记写入当前工作区该轮目录：`qa.md` 为本轮全部问答汇总，`summary.md` 为本轮总结。两份文件 MUST 是纯 Markdown，MUST NOT 使用 HTML `<details>`。`cards/<编号>.md` 过程存储 MUST 保持一问一文件，MUST NOT 因结束而合并或删除。

`qa.md` MUST 包含本轮方向（主题与难度），并按甲板顺序为每一问写一节（编号与甲板一致，含题干、开卷要点、作答、对照、五维）。待作答卡 MUST 保留并标明待作答，MUST NOT 编造分数。

`summary.md` MUST 包含本轮方向，正文为本轮总结。本轮总结 MUST 由会话 B 根据本轮已评卡生成且只写入 `summary.md`；生成失败时 `qa.md` 仍 MUST 写出，`summary.md` MUST 标明未生成，面板 MUST 可见失败。

系统 MUST NOT 在插件面板内渲染这两份文件的目录/折叠预览，MUST NOT 引入 Markdown 编辑器。查不到官方打开文件符号时，面板 MUST 展示其相对路径，适配层 MAY 标 `TODO`。写笔记失败时面板 MUST 展示可见错误，MUST NOT 空 catch；系统仍 SHALL 尝试收尾 `prompt`。开始前 MUST NOT 弹出文件夹选择。

#### Scenario: Q&A file lists every card in one markdown
- **WHEN** 本轮至少有 `Q1` 且结束本轮时工作区可写
- **THEN** 该轮目录存在 `qa.md`，文首含本轮主题与难度，含 `## Q1`，含题干与五维（待作答则为空分），MUST NOT 含 `<details>`

#### Scenario: Follow-up cards are separate sections
- **WHEN** 本轮甲板含 `Q1` 与 `Q1.1`
- **THEN** `qa.md` 中 `Q1` 与 `Q1.1` 各为一节，MUST NOT 把追问覆写成 `Q1`

#### Scenario: Summary file is notes-only
- **WHEN** 会话 B 生成本轮总结成功
- **THEN** 总结出现在 `summary.md`，考场气泡中 MUST NOT 出现该总结全文

#### Scenario: Advice failure still writes Q and A
- **WHEN** 本轮总结生成失败但甲板可写
- **THEN** `qa.md` 仍含方向与各问，`summary.md` 标明未生成，面板展示可见错误

#### Scenario: Per-card files stay
- **WHEN** 结束本轮成功
- **THEN** 该轮 `cards/` 下既有逐题 md 仍在，MUST NOT 被 `qa.md` 替换掉

#### Scenario: No note preview or editor this change
- **WHEN** 结束本轮成功且面板回到入口
- **THEN** 面板 MUST NOT 出现手册目录树或折叠阅读器，MUST NOT 出现 Markdown 编辑器；MAY 展示 `qa.md` 与 `summary.md` 路径

### Requirement: A closed exam session can start another round in place
当宿主当前会话就是本插件的考场会话、且该会话上的当前轮已结束时，合法「开始模拟面试」MUST 复用该会话：MUST NOT 调用新建考场会话，MUST NOT 把面试官注入用户正在写代码的那条对话，MUST NOT 卸再挂人设（人设已在则保持）。系统 MUST 在新一轮开口前摘掉收尾 `systemPrompt` 段。新一轮开口 MUST 说明上一轮已结束，带上新的主题与难度，立刻问本轮第一问，MUST NOT 续问上一轮。新一轮 MUST 使用新的一轮档案目录。从并非本场考场的项目对话点开始时，系统仍 SHALL 新开考场并挂到当前项目分组（既有 `interview-session`）。

#### Scenario: Start after end keeps the same session id
- **WHEN** 用户在已结束的考场会话上再次合法开始，且当前宿主会话 id 等于该考场 id
- **THEN** 系统不新建 DSH 会话，本轮第一问出现在同一条对话，新轮档案目录与上一轮不同

#### Scenario: Start from a coding chat still creates an exam room
- **WHEN** 用户当前不在本插件考场会话上，从某项目页合法开始
- **THEN** 系统仍新建考场会话并挂入该项目分组，MUST NOT 把面试官注入那条编码对话

#### Scenario: New round does not overwrite the previous notes
- **WHEN** 同一考场会话上第二轮开始成功
- **THEN** 上一轮 `qa.md`、`summary.md` 与 `cards/` 仍在原轮目录，MUST NOT 被第二轮覆写
