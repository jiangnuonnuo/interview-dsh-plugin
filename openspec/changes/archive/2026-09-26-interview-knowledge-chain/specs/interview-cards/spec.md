## MODIFIED Requirements

### Requirement: Each question is a durable card including follow-ups
系统 SHALL 为本场每一个待答问建立一张卡片，按出场顺序排列。编号 MUST 使用 `Q1`、`Q1.1`、`Q1.2`、`Q2` 这种知识链形式：同一知识点的第一问为 `Qn`，其上的追问为 `Qn.m`。新待答问对上当前知识链的「答到了 / 有缺口 / 没答上」时 MUST 记为追问；对上「换知识点」时 MUST 记为下一个 `Qn`。追问 MUST 新增卡片，MUST NOT 覆盖上一张卡的题干、要点、作答或分数。考场气泡 MUST 保持自然语言，MUST NOT 输出卡片编号、JSON 或知识链正文。

#### Scenario: First question is Q1
- **WHEN** 开始成功且第一问已出现
- **THEN** 甲板含恰好一张卡，编号为 `Q1`，状态为待答，含题干摘要与开卷要点，对照与五维为空

#### Scenario: Follow-up is Q1.1 not a rewrite of Q1
- **WHEN** 候选人已答完 `Q1`，且面试官下一问对上 `Q1` 知识链的三档之一
- **THEN** 甲板新增一张卡（编号为 `Q1.1`），`Q1` 卡的作答、对照与五维保持不变

#### Scenario: Next knowledge point is Q2
- **WHEN** 新待答问对上知识链中的换知识点，或代码已规定本题之后必须换知识点
- **THEN** 新卡编号为 `Q2`（或下一个未占用的 `Qn`），不是上一知识点的 `Qn.m+1`

#### Scenario: Numbering fallback never drops a card
- **WHEN** 新题对不上三档，也对不上换知识点
- **THEN** 系统仍创建新卡：优先记为上一张卡的追问 `Qn.m+1`，否则记为新的 `Q{n+1}`，MUST NOT 丢弃该待答问

#### Scenario: Exam chat stays natural language
- **WHEN** 面试官产出下一问
- **THEN** 宿主气泡中 MUST NOT 出现 `Q1.1`、`questionBrief`、知识链或其它面板专用载荷

### Requirement: Scoring happens when the candidate answers that question
当一张卡处于待答，且考场对话中出现相对该卡的**新的人类作答**时，会话 B SHALL 立刻为**这一张卡**生成对照与八股五维评分（基础扎实度 / 原理理解 / 场景迁移 / 深度边界 / 表达清晰度，1–5，允许 0.5）。评分 MUST NOT 等到整场结束。系统 MUST NOT 把插件开场种子气泡当作作答。对照 MUST 使用本题考察意图、所在层与该作答；开卷要点 MUST 从该考察意图拆出。知识链未能解析时，对照 MUST 退回使用本题开卷要点与该作答。评分 MUST NOT 把面试官讲评当作输入，MUST NOT 把三档约束或分数写入考场气泡。初级定义层 MUST NOT 因候选人未讲边界而压低原理理解以外的、本层并不考察的深度分；高级边界层只有说得出前提一变哪里会破，深度边界才能到 4 以上。前端 MUST NOT 计算或判定分数。

#### Scenario: Answer fills the same card
- **WHEN** 面板已展示待答的 `Q1` 开卷要点，候选人在宿主输入框提交回答
- **THEN** 仍是 `Q1` 卡，出现对照与五维分数，状态为已评；面板内 MUST NOT 出现该回答气泡

#### Scenario: Score follows the intent and layer
- **WHEN** 该卡已有考察意图与考察层，候选人提交了作答
- **THEN** 对照评的是该意图与该层，而不是另一套与意图无关的标准答

#### Scenario: Opening seed is not scored
- **WHEN** 考场对话里只有插件开场那条催开口的用户消息，第一问尚未被候选人回答
- **THEN** `Q1` 保持待答，MUST NOT 把开场文案写成作答或打分

#### Scenario: Scores are not deferred to session end
- **WHEN** 候选人已提交本题回答，且尚未点「结束本场」
- **THEN** 本题对照与五维已经可见，MUST NOT 要求先结束本场才出分

#### Scenario: Frontend does not compute scores
- **WHEN** 用户查看已评卡
- **THEN** 分数与对照来自后端只读字段，面板不自行算出分数或通过/不通过

### Requirement: The same panel has a full detail view
进行中面板 SHALL 提供与卡片流同一表面的完整详情态。用户从当前卡或「查看完整内容」进入详情后，MUST 看到该卡编号、短标题或题干摘要、本题题干、开卷要点、考察层与考察意图。作答、对照、五维评分 MUST 以可展开分区呈现：待答时为空占位，已评后可展开回看。详情 MUST NOT 展示三档下一问约束。详情态 MUST NOT 新开宿主页面、MUST NOT 使用遮挡 DSH 对话的额外窗。详情态 MUST 提供「返回卡片流」。详情态仍可切到相邻卡的完整内容。面板 MUST NOT 出现消息列表、聊天输入框或气泡。

#### Scenario: Open detail from the current flow card
- **WHEN** 卡片流当前卡为 `Q1`，用户点击当前卡或「查看完整内容」
- **THEN** 同一面板进入 `Q1` 详情，可见本题题干、开卷要点、考察层与考察意图，宿主对话仍可见

#### Scenario: Move constraints stay off the card
- **WHEN** 用户查看任一卡片的详情
- **THEN** 详情中看不到「答到了 / 有缺口 / 没答上」三档约束

#### Scenario: Detail sections stay empty until scored
- **WHEN** 用户在待答卡的详情态查看作答、对照与评分分区
- **THEN** 上述分区为空占位或折叠入口，其中没有任何由前端算出的分数或通过/不通过判定

#### Scenario: Return to card flow
- **WHEN** 详情态可见且用户点「返回卡片流」
- **THEN** 面板回到卡片流态，仍停在进入详情前的那张卡（若其间甲板已切到最新卡则跟最新卡），MUST NOT 关闭整个面试面板

#### Scenario: Detail can switch to the adjacent card
- **WHEN** 甲板含 `Q1` 与 `Q2`，用户在 `Q1` 详情态点「下一题」或向左滑动切题
- **THEN** 详情内容换成 `Q2`，仍为详情态，MUST NOT 因此打开聊天表面
