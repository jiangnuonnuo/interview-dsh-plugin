## MODIFIED Requirements

### Requirement: Coach panel refreshes on the pending interviewer question
当考场对话中出现相对上一题发生变化的**当前待答问**，且该轮助手输出已经结束时，右侧面板 SHALL **追加一张新卡**并切到该卡，写入该待答问的题干摘要与标准答要点。标准答要点 MUST 在该待答问对用户可见后即可看见，MUST NOT 等到候选人再作答才刷新。在新卡开卷要点就绪之前，面板 MUST 继续展示上一张卡，MUST 展示下一张卡形生成中槽，MUST NOT 变成空白进行中，MUST NOT 把当前卡整页冻死，MUST NOT 删除或覆写已有卡片的对照与五维。生成中槽 MUST 只属于尚未就绪的下一张卡；已 brief 卡的详情 MUST 仍展示该卡标准答要点。预生成期间流态 MUST 仍可点历史邻卡与「查看完整内容」。生成中视觉 MUST 对齐 `docs/product-design/interview-panel-flat-live-update.png` 的结构（旧卡仍在、下一张卡槽可见）。面板 MUST NOT 由前端计算或判定分数。

#### Scenario: Points follow the new question
- **WHEN** 宿主对话中已出现与上一题不同的下一问，且面试官该轮已说完，且新卡开卷要点已生成
- **THEN** 面板仍为进行中，可见同一主题与难度，当前突出卡为该新题；进入详情后题干摘要与标准答要点对应该新题

#### Scenario: Previous snapshot remains until the new brief is ready
- **WHEN** 候选人已作答，面试官下一问尚未说完或要点尚未生成
- **THEN** 面板仍展示上一张卡的题干摘要入口；若当前突出最新真卡，流态可见下一张卡形生成中槽；MUST NOT 变成空白进行中，MUST NOT 只留下一张冻住的当前卡，MUST NOT 用生成中槽替换上一张卡详情里的标准答要点

#### Scenario: History card remains fully readable while next brief is generating
- **WHEN** 最新卡已评、下一张开卷要点尚未生成，用户切回更早的已评卡并进入详情
- **THEN** 可见该历史卡的题干、标准答要点、作答、对照与五维；MUST NOT 出现「正在准备下一题」

#### Scenario: Flow can open previous detail while next brief is generating
- **WHEN** 最新卡已评、下一张开卷要点尚未生成，用户在流态点上一张邻卡或「上一题」，再点「查看完整内容」
- **THEN** 进入该历史卡详情且内容完整；MUST NOT 因预生成而点不到邻卡或详情入口

#### Scenario: Scoring stays a frontend placeholder
- **WHEN** 面板因新题刷新
- **THEN** 新卡的评分区没有任何由前端算出的分数或通过/不通过判定；已评卡上的后端分数 MUST 保持不变
