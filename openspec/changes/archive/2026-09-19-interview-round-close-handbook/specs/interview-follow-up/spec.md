## ADDED Requirements

### Requirement: Watch stops when the round ends and MUST NOT card the closing line
当用户点「结束本场」或本轮已进入结束流程时，系统 MUST 停止对该轮的看守。收尾气泡、短句「结束面试」种子、以及结束之后的闲聊 MUST NOT 被建成新卡，MUST NOT 覆盖已有卡。新一轮开始后，看守 MUST 只跟踪该新轮的待答问与作答。

#### Scenario: Closing line is not a new card
- **WHEN** 结束本轮已向考场 `prompt`「结束面试」，面试官产出含「此番 xerina 伴君至此，言尽于此，愿君面试顺遂，前程可期」的回复
- **THEN** 甲板 MUST NOT 因此新增卡片，已有卡的对照与五维保持不变

#### Scenario: End trigger is not scored as an answer
- **WHEN** 本轮仍有待答卡，结束流程向考场发送「结束面试」
- **THEN** 系统 MUST NOT 把该短句当作待答卡的作答来评分

#### Scenario: Watch does not resume after end until a new round starts
- **WHEN** 结束本轮成功，用户尚未再点开始
- **THEN** 系统 MUST NOT 继续对本场调用看守刷新面板甲板

## MODIFIED Requirements

### Requirement: Follow-up turns stay on the host conversation
第一问出现之后，候选人发言 SHALL 只通过 DSH 原对话输入框。面试官的追问 MUST 出现在同一条考场对话的宿主气泡中。插件 MUST NOT 为此新建聊天页，MUST NOT 在面板里画消息列表、输入框或气泡，MUST NOT 再向对话注入一条催促下一问的用户消息。面试官气泡 MUST NOT 被要求改成 JSON 或 `questionBrief` 才能驱动面板。结束本轮时允许且仅允许 `interview-round-close` 所定义的那一次收尾 `prompt`，该次可见正文 MUST 为「结束面试」，MUST NOT 被当作催促下一问。

#### Scenario: Candidate answers in the host composer
- **WHEN** 进行中面板已展示第一问要点，候选人在考场对话的宿主输入框提交回答
- **THEN** 该回答出现在宿主对话气泡中，面板内不出现该回答气泡，也不出现聊天输入框

#### Scenario: Next interviewer question is in the host transcript
- **WHEN** 候选人已提交对本题的回答，且面试官按人设继续提问
- **THEN** 下一问出现在同一条考场对话里，插件面板内 MUST NOT 出现该追问气泡

#### Scenario: Plugin does not inject a fake user turn
- **WHEN** 系统检测到需要刷新教练材料（非结束本轮）
- **THEN** 考场对话中 MUST NOT 因此多出一条由插件写入的、用于催促下一问的用户气泡

#### Scenario: Exam chat is not a structured payload
- **WHEN** 面试官在考场对话中产出下一轮文本
- **THEN** 该文本 MUST 保持自然语言面试口气；系统 MUST NOT 把考场气泡改成 JSON、`questionBrief` 或其它面板专用载荷

#### Scenario: End-round closing prompt is the only extra prompt
- **WHEN** 用户点「结束本场」且收尾 `prompt` 被发送
- **THEN** 考场中因此多出的插件用户种子只服务收尾且正文为「结束面试」，MUST NOT 再被用于催出下一问，MUST NOT 在追问阶段再次 `prompt`
