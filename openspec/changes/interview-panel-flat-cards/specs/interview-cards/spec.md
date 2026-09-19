## ADDED Requirements

### Requirement: This change is not accepted without a real DSH desktop card-flow test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「进行中面板为卡片流、可进详情、可左右切回已评卡」才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击、滑动与可见结果。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、Vite 预览、浏览器打开面板、`doc/entry-panel-mock.html`、对照产品图而没有启动桌面端。未能启动该 Desktop 或未能在其 GUI 内走完场景时，本 capability MUST 视为未交付，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop card flow and detail are the gate
- **WHEN** 实现者启动本机已在使用的 DSH Desktop，用 `dsh plugin add` 把本包装进该 Desktop 正在使用的 profile，开始一场八股模拟面试并见到 `Q1` 卡片流
- **THEN** 当前卡突出、可见进入详情的入口；点「查看完整内容」或当前卡后，同一面板进入详情并可见本题题干与开卷要点；点「返回卡片流」回到流态，宿主对话不被新页面遮挡

#### Scenario: Desktop swipe or buttons switch scored history
- **WHEN** 上一场景之后至少存在一张已评卡与一张当前卡，实现者在流态或详情态切到上一题
- **THEN** 可见上一张卡的编号与已评内容入口，当前卡记录仍在甲板中

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里完成卡片流与详情核对
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

### Requirement: The same panel has a full detail view
进行中面板 SHALL 提供与卡片流同一表面的完整详情态。用户从当前卡或「查看完整内容」进入详情后，MUST 看到该卡编号、短标题或题干摘要、本题题干与开卷要点。作答、对照、五维评分 MUST 以可展开分区呈现：待答时为空占位，已评后可展开回看。详情态 MUST NOT 新开宿主页面、MUST NOT 使用遮挡 DSH 对话的额外窗。详情态 MUST 提供「返回卡片流」。详情态仍可切到相邻卡的完整内容。面板 MUST NOT 出现消息列表、聊天输入框或气泡。

#### Scenario: Open detail from the current flow card
- **WHEN** 卡片流当前卡为 `Q1`，用户点击当前卡或「查看完整内容」
- **THEN** 同一面板进入 `Q1` 详情，可见本题题干与开卷要点，宿主对话仍可见

#### Scenario: Detail sections stay empty until scored
- **WHEN** 用户在待答卡的详情态查看作答、对照与评分分区
- **THEN** 上述分区为空占位或折叠入口，其中没有任何由前端算出的分数或通过/不通过判定

#### Scenario: Return to card flow
- **WHEN** 详情态可见且用户点「返回卡片流」
- **THEN** 面板回到卡片流态，仍停在进入详情前的那张卡（若其间甲板已切到最新卡则跟最新卡），MUST NOT 关闭整个面试面板

#### Scenario: Detail can switch to the adjacent card
- **WHEN** 甲板含 `Q1` 与 `Q2`，用户在 `Q1` 详情态点「下一题」或向左滑动切题
- **THEN** 详情内容换成 `Q2`，仍为详情态，MUST NOT 因此打开聊天表面

### Requirement: Generating the next card keeps the existing deck visible
当下一张卡的开卷要点尚未就绪时，进行中面板 MUST 继续展示已有卡片，MUST 展示生成中占位（文案为「正在生成本题」或「正在准备下一题」），MUST NOT 变成空白进行中，MUST NOT 删除或覆写已有卡的对照与五维。要点就绪后 MUST 追加新卡，且默认把当前卡定位到该新卡；若当时处于详情态，MUST 进入该新卡的详情，MUST NOT 无故退回入口。

#### Scenario: Generating placeholder appears before the new brief
- **WHEN** 候选人已完成本题作答，或面试官下一问已出现，但新卡开卷要点尚未生成
- **THEN** 已有卡仍可见，并可见生成中占位，面板 MUST NOT 清空

#### Scenario: New card becomes current after brief
- **WHEN** 新卡的开卷要点已生成
- **THEN** 甲板含该新卡，面板默认突出该新卡（流态为当前卡，详情态则展示该新卡详情）

## MODIFIED Requirements

### Requirement: The panel shows one card at a time and can switch history
进行中面板 SHALL 使用轻量平面卡片流：一次突出一张当前卡，上一张与下一张（若存在）只露出局部。默认停在最新卡。系统 SHALL 把左右滑动作为切题主操作，并 SHALL 保留「上一题」「下一题」按钮作为辅助。候选人 MUST 能回到任意历史卡；流态展示该卡编号与题干摘要入口，详情态展示该题要点、作答、对照与分数。卡片流视觉 MUST 对齐 `docs/product-design/interview-panel-flat-card-flow.png` 的结构（当前卡、局部邻卡、分页指示、底栏切题），不得做成复杂 3D 轮播。面板 MUST NOT 出现消息列表、聊天输入框或气泡。

#### Scenario: Latest card is current after a new question
- **WHEN** 新卡的开卷要点已生成
- **THEN** 面板默认突出该新卡

#### Scenario: Switch back to a scored card
- **WHEN** 甲板至少有 `Q1`（已评）与 `Q1.1`（待答），用户切到上一张
- **THEN** 当前突出卡为 `Q1`；进入详情可见 `Q1` 的开卷要点、作答、对照与五维，`Q1.1` 记录仍在甲板中

#### Scenario: Peeked neighbors are not the only copy of history
- **WHEN** 甲板至少有三张卡且当前为中间一张
- **THEN** 流态同时露出上一张与下一张的局部，完整内容仍只属于当前突出卡或详情态中的那一张

#### Scenario: Swipe and buttons both change the current card
- **WHEN** 用户在卡片流向左滑动，或点「下一题」，且存在下一张卡
- **THEN** 下一张卡成为当前突出卡；向右滑动或「上一题」回到上一张；边界上对应方向不再切卡

#### Scenario: No chat surface on the deck
- **WHEN** 用户在卡片间切换或进入详情
- **THEN** 面板内仍无消息列表、输入框或气泡；发言仍只通过宿主输入框
