## MODIFIED Requirements

### Requirement: Follow-up turns stay on the host conversation
第一问出现之后，考生发言 SHALL 只通过 DSH 原对话输入框。面试官的引导与追问 MUST 出现在同一条考场对话的宿主气泡中。插件 MUST NOT 为此新建聊天页，MUST NOT 在面板里画消息列表、输入框或气泡，MUST NOT 再向对话注入一条催促下一问或催促补充的用户消息。面试官气泡 MUST NOT 被要求改成 JSON 或 `questionBrief` 才能驱动面板。一点没答上或缺口大时，气泡 MUST 是对原题的口语引导，MUST NOT 是新的「【本题】」。追深、换大方面与下一正式问 MUST 一次只给一个待答问。结束本轮时允许且仅允许 `interview-round-close` 所定义的那一次收尾 `prompt`，该次可见正文 MUST 为「结束面试」，MUST NOT 被当作催促下一问。

#### Scenario: Candidate answers in the host composer
- **WHEN** 进行中面板已展示第一问要点，考生在考场对话的宿主输入框提交回答
- **THEN** 该回答出现在宿主对话气泡中，面板内不出现该回答气泡，也不出现聊天输入框

#### Scenario: A guide stays in the host transcript without a new question mark
- **WHEN** 对照结果是一点没答上或缺口大，面试官给出引导
- **THEN** 引导出现在同一条考场对话里，面板内 MUST NOT 出现该气泡，该气泡 MUST NOT 是新的「【本题】」

#### Scenario: Next interviewer question is in the host transcript
- **WHEN** 对照结果是追深、换大方面或下一正式问，面试官提出这个新问
- **THEN** 该问出现在同一条考场对话里，插件面板内 MUST NOT 出现该追问气泡

#### Scenario: Plugin does not inject a fake user turn
- **WHEN** 系统检测到需要刷新教练材料或重算对照（非结束本轮）
- **THEN** 考场对话中 MUST NOT 因此多出一条由插件写入的用户气泡

#### Scenario: Exam chat is not a structured payload
- **WHEN** 面试官在考场对话中产出引导或下一问
- **THEN** 该文本 MUST 保持自然语言面试口气；系统 MUST NOT 把考场气泡改成 JSON、`questionBrief` 或五种结果的名称

#### Scenario: End-round closing prompt is the only extra prompt
- **WHEN** 用户点「结束本场」且收尾 `prompt` 被发送
- **THEN** 考场中因此多出的插件用户种子只服务收尾且正文为「结束面试」，MUST NOT 再被用于催出下一问或引导，MUST NOT 在追问阶段再次 `prompt`

### Requirement: Coach panel refreshes on the pending interviewer question
当对照结果是追深、换大方面或下一正式问，且考场中出现相对上一正式问发生变化的当前待答问，该轮助手输出已经结束时，右侧面板 SHALL 追加一张新卡并切到该卡，写入该待答问的题干摘要与标准答要点。标准答要点 MUST 在该待答问对用户可见后即可看见。一点没答上或缺口大时，面板 MUST 更新原卡的叠加作答与对照，MUST NOT 追加新卡。在新卡开卷要点就绪之前，面板 MUST 继续展示上一张卡，MUST 展示下一张卡形生成中槽，MUST NOT 变成空白进行中，MUST NOT 删除或覆写原卡以外的历史卡。生成中槽 MUST 只属于尚未就绪的下一张正式问。面板 MUST NOT 由前端计算或判定分数。

#### Scenario: Points follow the new question
- **WHEN** 对照结果是追深、换大方面或下一正式问，宿主对话中已出现新的待答问，且新卡开卷要点已生成
- **THEN** 面板当前突出卡为该新题；进入详情后题干摘要与标准答要点对应该新题

#### Scenario: A guide refreshes the same card
- **WHEN** 对照结果是一点没答上或缺口大，考生已经补充作答
- **THEN** 面板仍突出原卡，作答中可见补充，对照是重算后的版本，卡片数量不变

#### Scenario: Previous snapshot remains until the new brief is ready
- **WHEN** 对照结果要求新卡，但新问尚未说完或要点尚未生成
- **THEN** 面板仍展示上一张卡；若当前突出最新真卡，流态可见下一张卡形生成中槽；MUST NOT 变成空白进行中

#### Scenario: History card remains fully readable while next brief is generating
- **WHEN** 最新卡已评、下一张开卷要点尚未生成，用户切回更早的已评卡并进入详情
- **THEN** 可见该历史卡的题干、标准答要点、作答、对照与五维；MUST NOT 出现「正在准备下一题」

#### Scenario: Flow can open previous detail while next brief is generating
- **WHEN** 最新卡已评、下一张开卷要点尚未生成，用户在流态点上一张邻卡或「上一题」，再点「查看完整内容」
- **THEN** 进入该历史卡详情且内容完整；MUST NOT 因预生成而点不到邻卡或详情入口

#### Scenario: Scoring stays a frontend placeholder
- **WHEN** 面板因新题或原卡重算而刷新
- **THEN** 新卡或原卡的评分区没有任何由前端算出的分数或通过/不通过判定

### Requirement: Watch publishes a scored deck before briefing the next card
当最新卡因作答被对照为已可展示，且该结果是追深、换大方面或下一正式问，系统 SHALL 先把含该对照的甲板持久化并返回给面板。该次返回 MUST NOT 同时追加下一张卡。下一张卡的开卷要点 SHALL 在随后的看守周期生成并追加。一点没答上或缺口大时，同一次返回 MUST 是原卡的叠加作答与重算对照，MUST NOT 追加新卡。请求与响应形状 MUST NOT 增加第三种卡片状态。

#### Scenario: First update after an answer is scored-only
- **WHEN** 考生已作答且对照完成，结果是追深、换大方面或下一正式问，下一张卡的开卷要点尚未生成
- **THEN** 面板收到的甲板最新卡已有对照，卡片列表不含下一张待答卡

#### Scenario: A guide update does not wait for another card
- **WHEN** 对照结果是一点没答上或缺口大
- **THEN** 返回的甲板更新了原卡，且不包含为这次引导新建的卡

#### Scenario: Answer during wait is scored without waiting for the next brief
- **WHEN** 看守正在等待下一正式问，且考生作答已经可读取
- **THEN** 系统为本题做对照并返回更新后的原卡或已评甲板，MUST NOT 等到下一问要点完成后才返回对照

#### Scenario: Next card arrives on a later update
- **WHEN** 已评甲板已返回，随后新的正式问说完且开卷要点生成成功
- **THEN** 另一次成功更新追加新的待答卡，面板默认突出该新卡
