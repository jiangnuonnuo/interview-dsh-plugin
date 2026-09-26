## MODIFIED Requirements

### Requirement: A closed exam session can start another round in place
当宿主当前会话就是本插件的考场会话、且该会话上的当前轮已结束时，合法「开始模拟面试」MUST 复用该会话：MUST NOT 调用新建考场会话，MUST NOT 把面试官注入用户正在写代码的那条对话，MUST NOT 卸再挂人设（人设已在则保持）。系统 MUST 在新一轮开口前摘掉收尾 `systemPrompt` 段。新一轮可见用户开口 MUST 用自然语言说明上一轮已结束，并带上新的主题与难度，MUST NOT 包含「请按人设」、知识链、JSON 或「只问第一个问题」这类导演句。面试官接着 MUST 说明本轮主题与难度并立刻问本轮第一问，MUST NOT 续问上一轮。新一轮 MUST 使用新的一轮档案目录。从并非本场考场的项目对话点开始时，系统仍 SHALL 新开考场并挂到当前项目分组（既有 `interview-session`）。

#### Scenario: Start after end keeps the same session id
- **WHEN** 用户在已结束的考场会话上再次合法开始，且当前宿主会话 id 等于该考场 id
- **THEN** 系统不新建 DSH 会话，本轮第一问出现在同一条对话，新轮档案目录与上一轮不同

#### Scenario: New round opening bubble has no director clause
- **WHEN** 同一考场会话上新一轮开口被发送
- **THEN** 该条可见用户消息说明上一轮已结束并带有新主题与难度，其中没有「请按人设」或知识链正文

#### Scenario: Start from a coding chat still creates an exam room
- **WHEN** 用户当前不在本插件考场会话上，从某项目页合法开始
- **THEN** 系统仍新建考场会话并挂入该项目分组，MUST NOT 把面试官注入那条编码对话

#### Scenario: New round does not overwrite the previous notes
- **WHEN** 同一考场会话上第二轮开始成功
- **THEN** 上一轮 `qa.md`、`summary.md` 与 `cards/` 仍在原轮目录，MUST NOT 被第二轮覆写
