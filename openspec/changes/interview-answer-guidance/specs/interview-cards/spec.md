## MODIFIED Requirements

### Requirement: Each question is a durable card including follow-ups
系统 SHALL 为本场每一个正式问建立一张卡片，按出场顺序排列。编号 MUST 使用 `Q1`、`Q1.1`、`Q1.2`、`Q2` 这种形式：同一知识点的第一问为 `Qn`，追深或换大方面为 `Qn.m`，下一个知识点为下一个 `Qn`。一点没答上或缺口大时 MUST 留在原卡，MUST NOT 新开卡片。追深或换大方面 MUST 新增子卡，MUST NOT 覆盖原卡的题干、要点、作答或分数。下一正式问 MUST 新增 `Qn`。考场气泡 MUST 保持自然语言，MUST NOT 输出卡片编号或 JSON。

#### Scenario: First question is Q1
- **WHEN** 开始成功且第一问已出现
- **THEN** 甲板含恰好一张卡，编号为 `Q1`，状态为待答，含题干摘要与开卷要点，对照与五维为空

#### Scenario: A total miss does not open Q1.1
- **WHEN** 考生已回答 `Q1`，对照结果是一点没答上或缺口大
- **THEN** 甲板仍只有 `Q1`，不出现 `Q1.1`

#### Scenario: Follow-up is Q1.1 not a rewrite of Q1
- **WHEN** 考生已答完 `Q1`，且对照结果是追深或换大方面
- **THEN** 甲板新增一张卡（编号为 `Q1.1`），`Q1` 卡的作答、对照与五维保持不变

#### Scenario: Next knowledge point is Q2
- **WHEN** 对照结果是下一正式问
- **THEN** 新卡编号为 `Q2`（或下一个未占用的 `Qn`），不是上一知识点的 `Qn.m+1`

#### Scenario: Numbering fallback never drops a card
- **WHEN** 对照结果是追深、换大方面或下一正式问，但没有给出可用编号
- **THEN** 系统仍创建新卡：追深与换大方面优先记为 `Qn.m+1`，下一正式问记为新的 `Q{n+1}`，MUST NOT 丢弃该正式问

#### Scenario: Exam chat stays natural language
- **WHEN** 面试官产出引导或下一问
- **THEN** 宿主气泡中 MUST NOT 出现 `Q1.1`、`questionBrief` 或其它面板专用载荷

### Requirement: Scoring happens when the candidate answers that question
当一张卡收到相对该卡的新的人类作答时，会话 B SHALL 立刻为这一张卡生成对照与八股五维评分（基础扎实度 / 原理理解 / 场景迁移 / 深度边界 / 表达清晰度，1–5，允许 0.5）。评分 MUST NOT 等到整场结束。系统 MUST NOT 把插件开场种子气泡当作作答。对照 MUST 使用本题考察意图、所在层与到当前为止叠在这张卡上的全部作答；开卷要点 MUST 从该考察意图拆出。一点没答上或缺口大之后的补充 MUST 叠进同一张卡的作答，并按叠加后的全文重算对照与五维。评分 MUST NOT 把面试官讲评当作输入，MUST NOT 把五种结果或分数写入考场气泡。初级定义层 MUST NOT 因考生未讲边界而压低这一层并不考察的深度分；高级边界层只有说得出前提一变哪里会破，深度边界才能到 4 以上。前端 MUST NOT 计算或判定分数，也 MUST NOT 判断五种结果。

#### Scenario: Answer fills the same card
- **WHEN** 面板已展示待答的 `Q1` 开卷要点，考生在宿主输入框提交回答
- **THEN** 仍是 `Q1` 卡，出现对照与五维分数；面板内 MUST NOT 出现该回答气泡

#### Scenario: A later reply stacks on the same card
- **WHEN** `Q1` 的对照是一点没答上或缺口大，考生又提交了一句补充
- **THEN** `Q1` 的作答同时保留前后两句，对照与五维按两句合在一起的全文重算，甲板不新增卡片

#### Scenario: Opening seed is not scored
- **WHEN** 考场对话里只有插件开场那条催开口的用户消息，第一问尚未被考生回答
- **THEN** `Q1` 保持待答，MUST NOT 把开场文案写成作答或打分

#### Scenario: Scores are not deferred to session end
- **WHEN** 考生已提交本题回答，且尚未点「结束本场」
- **THEN** 本题对照与五维已经可见，MUST NOT 要求先结束本场才出分

#### Scenario: Frontend does not compute scores
- **WHEN** 用户查看已评卡
- **THEN** 分数、对照与五种结果来自后端，面板不自行算出分数、通过/不通过或开卡档位

### Requirement: Generating the next card keeps the existing deck visible
当下一张正式问的开卷要点尚未就绪时，进行中面板 MUST 继续展示已有卡片，MUST 展示下一张卡正在生成的卡片形槽，MUST NOT 变成空白进行中，MUST NOT 把当前卡整页冻成唯一表面，MUST NOT 用整卡转圈替换当前题干，MUST NOT 删除或覆写已有卡的对照与五维。一点没答上或缺口大的引导 MUST NOT 展示「正在准备下一题…」，MUST NOT 因此追加新卡。生成中视觉 MUST 对齐 `docs/product-design/interview-panel-flat-live-update.png` 的流态邻卡槽：白底大圆角卡、橙色转圈、文案为「正在准备下一题…」。刷新本题时，被刷新的那张待答卡 MAY 使用同一视觉，文案为「正在生成本题…」，且 MUST 只出现在该待答卡上。

详情态展示任意已 brief 卡时，MUST 同时可见该卡编号、短标题、本题题干、标准答要点，以及作答 / 对照 / 评分折叠。引导后的作答 MUST 在作答折叠中按轮可见。下一张预生成 MUST NOT 插入该卡题干与折叠之间，MUST NOT 替换或隐藏该卡的标准答要点。流态 MUST 仍突出当前真卡；仅当当前突出卡已是甲板最新真卡、且下一张正式问尚未就绪时，生成中槽占据下一张卡的位置。预生成 MUST NOT 禁用上一题、历史邻卡 peek、分页点或当前卡「查看完整内容」。要点就绪后 MUST 追加新卡，槽消失，且默认把当前卡定位到该新卡；若当时处于详情态，MUST 进入该新卡的详情，MUST NOT 无故退回入口。

#### Scenario: Generating placeholder appears before the new brief
- **WHEN** 对照结果是追深、换大方面或下一正式问，新卡开卷要点尚未生成
- **THEN** 已有卡仍可见；若当前突出的是最新真卡，流态可见下一张卡形生成中槽；面板 MUST NOT 清空

#### Scenario: A guide does not show the next-card slot
- **WHEN** 对照结果是一点没答上或缺口大
- **THEN** 面板不出现「正在准备下一题…」，当前卡仍是这一题

#### Scenario: Generating looks like the next card not a frozen current card
- **WHEN** 面板处于下一张正式问的预生成且当前突出最新真卡（流态）
- **THEN** 当前卡编号与题干仍可读、仍可切回历史卡；可见独立的生成中卡片槽（转圈 + 「正在准备下一题」）；MUST NOT 把整页锁成不可点

#### Scenario: Flow stays interactive while next is generating
- **WHEN** 最新卡已评、下一张正式问的开卷要点尚未就绪，用户在流态点历史邻卡 peek、或点「上一题」、或点当前卡「查看完整内容」
- **THEN** 切到对应历史卡，或进入当前卡详情；MUST NOT 被生成中槽拦截；进入的详情 MUST 无「正在准备下一题」

#### Scenario: Detail generating sits between stem and answer folds
- **WHEN** 用户在详情态且下一张正式问正在生成
- **THEN** 本题题干与标准答要点仍可见；作答 / 对照 / 评分折叠仍属于当前卡；MUST NOT 在题干与作答之间插入「正在准备下一题」；MUST NOT 隐藏标准答要点

#### Scenario: Existing card detail stays complete while next is generating
- **WHEN** 用户在任意已 brief 卡的详情态，且下一张正式问的开卷要点尚未就绪
- **THEN** 该卡题干与标准答要点仍可见；作答 / 对照 / 评分折叠仍属于该卡；MUST NOT 出现「正在准备下一题」；MUST NOT 隐藏标准答要点

#### Scenario: History browsing ignores next-card generating
- **WHEN** 甲板最新卡已评、下一张正式问尚未就绪，用户切到一张更早的历史卡（流态或详情态）
- **THEN** 该历史卡按已生成内容完整展示；MUST NOT 出现「正在准备下一题」

#### Scenario: Refresh generating stays on the refreshed card
- **WHEN** 用户正在刷新当前待答卡
- **THEN** 仅该待答卡可见「正在生成本题」；切到其它已生成卡后 MUST NOT 仍显示「正在生成本题」或「正在准备下一题」

#### Scenario: New card becomes current after brief
- **WHEN** 追深、换大方面或下一正式问的开卷要点已生成
- **THEN** 甲板含该新卡，生成中槽消失，面板默认突出该新卡（流态为当前卡，详情态则展示该新卡详情）

## ADDED Requirements

### Requirement: Stacked answers stay on the guided card file
一点没答上或缺口大时，系统 SHALL 把补充作答写入原卡，并更新该卡在工作区中的同一份 `cards/<编号>.md`。文件 MUST 能看出各轮作答，对照 MUST 是按叠加全文重算后的最新一版。系统 MUST NOT 为引导另写一张卡的文件。

#### Scenario: A second reply updates Q1.md
- **WHEN** `Q1` 已有第一轮作答与对照，考生又补充了一句，且对照仍要求留在原卡
- **THEN** `cards/Q1.md` 同时含两轮作答和重算后的对照，工作区不出现 `cards/Q1.1.md`
