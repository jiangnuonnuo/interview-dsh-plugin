## MODIFIED Requirements

### Requirement: Generating the next card keeps the existing deck visible
当下一张卡的开卷要点尚未就绪时，进行中面板 MUST 继续展示已有卡片，MUST 展示**下一张卡正在生成**的卡片形槽，MUST NOT 变成空白进行中，MUST NOT 把当前卡整页冻成唯一表面，MUST NOT 用整卡转圈替换当前题干，MUST NOT 删除或覆写已有卡的对照与五维。生成中视觉 MUST 对齐 `docs/product-design/interview-panel-flat-live-update.png` 的流态邻卡槽：白底大圆角卡、橙色转圈、文案为「正在准备下一题…」。刷新本题时，被刷新的那张待答卡 MAY 使用同一视觉，文案为「正在生成本题…」，且 MUST 只出现在该待答卡上。

详情态展示任意已 brief 卡时，MUST 同时可见该卡编号、短标题、本题题干、标准答要点，以及作答 / 对照 / 评分折叠。下一张预生成 MUST NOT 插入该卡题干与折叠之间，MUST NOT 替换或隐藏该卡的标准答要点。流态 MUST 仍突出当前真卡；仅当当前突出卡已是甲板最新真卡、且下一张尚未就绪时，生成中槽占据下一张卡的位置（即将滑入的邻卡），不得只在当前卡底部贴一条状态，也不得出现在历史真卡上顶掉真实邻卡。预生成 MUST 视为该邻卡槽上的异步任务：MUST NOT 禁用上一题、历史邻卡 peek、分页点或当前卡「查看完整内容」；生成中槽 MUST NOT 拦截这些点击。分页指示 MAY 增加一个不可点的生成中点；点了仍停在最新真卡。要点就绪后 MUST 追加新卡，槽消失，且默认把当前卡定位到该新卡；若当时处于详情态，MUST 进入该新卡的详情，MUST NOT 无故退回入口。

#### Scenario: Generating placeholder appears before the new brief
- **WHEN** 候选人已完成本题作答且本题已评，或面试官下一问已出现，但新卡开卷要点尚未生成
- **THEN** 已有卡仍可见；若当前突出的是最新真卡，流态可见下一张卡形生成中槽；面板 MUST NOT 清空

#### Scenario: Generating looks like the next card not a frozen current card
- **WHEN** 面板处于下一张预生成且当前突出最新真卡（流态）
- **THEN** 当前卡编号与题干仍可读、仍可切回历史卡；可见独立的 `generating-next` 卡片槽（转圈 + 「正在准备下一题」）；MUST NOT 只显示当前卡而无下一张卡槽；MUST NOT 把整页锁成不可点

#### Scenario: Flow stays interactive while next is generating
- **WHEN** 最新卡已评、下一张开卷要点尚未就绪，用户在流态点历史邻卡 peek、或点「上一题」、或点当前卡「查看完整内容」
- **THEN** 切到对应历史卡，或进入当前卡详情；MUST NOT 被生成中槽拦截；进入的详情 MUST 无「正在准备下一题」

#### Scenario: Detail generating sits between stem and answer folds
- **WHEN** 用户在详情态且下一张卡正在生成
- **THEN** 本题题干与标准答要点仍可见；作答 / 对照 / 评分折叠仍属于当前卡；MUST NOT 在题干与作答之间插入「正在准备下一题」生成中槽；MUST NOT 隐藏标准答要点

#### Scenario: Existing card detail stays complete while next is generating
- **WHEN** 用户在任意已 brief 卡的详情态，且下一张卡开卷要点尚未就绪
- **THEN** 该卡题干与标准答要点仍可见；作答 / 对照 / 评分折叠仍属于该卡；MUST NOT 出现「正在准备下一题」生成中槽；MUST NOT 隐藏标准答要点

#### Scenario: History browsing ignores next-card generating
- **WHEN** 甲板最新卡已评、下一张尚未就绪，用户切到一张更早的历史卡（流态或详情态）
- **THEN** 该历史卡按已生成内容完整展示；MUST NOT 出现「正在准备下一题」

#### Scenario: Refresh generating stays on the refreshed card
- **WHEN** 用户正在刷新当前待答卡
- **THEN** 仅该待答卡可见「正在生成本题」；切到其它已生成卡后 MUST NOT 仍显示「正在生成本题」或「正在准备下一题」

#### Scenario: New card becomes current after brief
- **WHEN** 新卡的开卷要点已生成
- **THEN** 甲板含该新卡，生成中槽消失，面板默认突出该新卡（流态为当前卡，详情态则展示该新卡详情）
