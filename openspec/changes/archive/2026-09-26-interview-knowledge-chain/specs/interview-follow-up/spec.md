## MODIFIED Requirements

### Requirement: Follow-up turns stay on the host conversation
第一问出现之后，候选人发言 SHALL 只通过 DSH 原对话输入框。面试官的追问 MUST 出现在同一条考场对话的宿主气泡中，并且 MUST 遵守作答前已挂上的知识链系统段中的一档：答到了、有缺口、没答上，或代码写明的换知识点。插件 MUST NOT 为此新建聊天页，MUST NOT 在面板里画消息列表、输入框或气泡，MUST NOT 再向对话注入一条催促下一问的用户消息，MUST NOT 把知识链或三档约束 `prompt` 进对话。面试官气泡 MUST NOT 被要求改成 JSON 或 `questionBrief` 才能驱动面板，也 MUST NOT 出现三档菜单或知识链正文。结束本轮时允许且仅允许 `interview-round-close` 所定义的那一次收尾 `prompt`，该次可见正文 MUST 为「结束面试」，MUST NOT 被当作催促下一问。

#### Scenario: Candidate answers in the host composer
- **WHEN** 进行中面板已展示第一问要点，候选人在考场对话的宿主输入框提交回答
- **THEN** 该回答出现在宿主对话气泡中，面板内不出现该回答气泡，也不出现聊天输入框

#### Scenario: Next interviewer question is in the host transcript
- **WHEN** 候选人已提交对本题的回答，且面试官按已挂上的知识链继续提问
- **THEN** 下一问出现在同一条考场对话里，插件面板内 MUST NOT 出现该追问气泡，该气泡中也 MUST NOT 出现知识链或三档约束原文

#### Scenario: Plugin does not inject a fake user turn
- **WHEN** 系统检测到需要刷新教练材料或挂上知识链（非结束本轮）
- **THEN** 考场对话中 MUST NOT 因此多出一条由插件写入的用户气泡

#### Scenario: Exam chat is not a structured payload
- **WHEN** 面试官在考场对话中产出下一轮文本
- **THEN** 该文本 MUST 保持自然语言面试口气；系统 MUST NOT 把考场气泡改成 JSON、`questionBrief`、知识链或其它面板专用载荷

#### Scenario: End-round closing prompt is the only extra prompt
- **WHEN** 用户点「结束本场」且收尾 `prompt` 被发送
- **THEN** 考场中因此多出的插件用户种子只服务收尾且正文为「结束面试」，MUST NOT 再被用于催出下一问，MUST NOT 在追问阶段再次 `prompt`
