# interview-cards Specification

## Purpose

把八股陪练的教练表面从单题快照改成可落盘的问题卡片甲板：每题一张卡，追问单独编号，交卷当时给出对照与五维评分，并允许左右切换回看。

## Requirements

### Requirement: This change is not accepted without a real DSH desktop card test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「答完一题见到本题对照与五维、追问出现新卡且旧卡仍带分数、工作区出现逐题文件」才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击、输入与可见结果。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、上一刀追问记录、Vite 预览、浏览器打开面板、`doc/entry-panel-mock.html`、新建 profile、升级 Desktop。未能启动该 Desktop 或未能在其 GUI 内走完场景时，本 capability MUST 视为未交付，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop card scoring is the gate
- **WHEN** 实现者启动本机已在使用的 DSH Desktop，用 `dsh plugin add` 把本包装进该 Desktop 正在使用的 profile，开始一场八股模拟面试并见到 `Q1` 开卷要点后，在宿主输入框提交对本题的回答
- **THEN** 面板仍停在 `Q1` 卡，可见对照（覆盖/缺口）与八股五维分数，工作区 `.dsh-interview/<该场 sessionId>/` 下已有 `cards/Q1.md` 且含作答与分数

#### Scenario: Desktop follow-up keeps the scored card
- **WHEN** 上一场景之后面试官提出下一问（含同一气泡先讲评再提问）
- **THEN** 面板出现新卡并默认切到新卡，新卡有自己的开卷要点；左切回到 `Q1` 时对照与五维仍在，且 `cards/Q1.md` 未被新题覆写

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里完成评分卡与落盘核对
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

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

### Requirement: Each question is a durable card including follow-ups
系统 SHALL 为本场每一个待答问建立一张卡片，按出场顺序排列。编号 MUST 使用 `Q1`、`Q1.1`、`Q1.2`、`Q2` 这种知识链形式：同一知识点的第一问为 `Qn`，其上的追问为 `Qn.m`。追问 MUST 新增卡片，MUST NOT 覆盖上一张卡的题干、要点、作答或分数。考场气泡 MUST 保持自然语言，MUST NOT 输出卡片编号或 JSON。

#### Scenario: First question is Q1
- **WHEN** 开始成功且第一问已出现
- **THEN** 甲板含恰好一张卡，编号为 `Q1`，状态为待答，含题干摘要与开卷要点，对照与五维为空

#### Scenario: Follow-up is Q1.1 not a rewrite of Q1
- **WHEN** 候选人已答完 `Q1` 且面试官在同一条考场对话中追问同一知识点
- **THEN** 甲板新增一张卡（编号为 `Q1.1` 或教练判定的等价追问编号），`Q1` 卡的作答、对照与五维保持不变

#### Scenario: Next knowledge point is Q2
- **WHEN** 教练判定新待答问已切到下一个知识点
- **THEN** 新卡编号为 `Q2`（或下一个未占用的 `Qn`），不是上一知识点的 `Qn.m+1`

#### Scenario: Numbering fallback never drops a card
- **WHEN** 教练未能给出可用编号
- **THEN** 系统仍创建新卡：优先记为上一张卡的追问 `Qn.m+1`，否则记为新的 `Q{n+1}`，MUST NOT 丢弃该待答问

#### Scenario: Exam chat stays natural language
- **WHEN** 面试官产出下一问
- **THEN** 宿主气泡中 MUST NOT 出现 `Q1.1`、`questionBrief` 或其它面板专用载荷

### Requirement: Scoring happens when the candidate answers that question
当一张卡处于待答，且考场对话中出现相对该卡的**新的人类作答**时，会话 B SHALL 立刻为**这一张卡**生成对照与八股五维评分（基础扎实度 / 原理理解 / 场景迁移 / 深度边界 / 表达清晰度，1–5，允许 0.5）。评分 MUST NOT 等到整场结束。系统 MUST NOT 把插件开场种子气泡当作作答。对照 MUST 只使用本题开卷要点与该作答；MUST NOT 把面试官讲评当作评分输入。前端 MUST NOT 计算或判定分数。

#### Scenario: Answer fills the same card
- **WHEN** 面板已展示待答的 `Q1` 开卷要点，候选人在宿主输入框提交回答
- **THEN** 仍是 `Q1` 卡，出现对照与五维分数，状态为已评；面板内 MUST NOT 出现该回答气泡

#### Scenario: Opening seed is not scored
- **WHEN** 考场对话里只有插件开场那条催开口的用户消息，第一问尚未被候选人回答
- **THEN** `Q1` 保持待答，MUST NOT 把开场文案写成作答或打分

#### Scenario: Scores are not deferred to session end
- **WHEN** 候选人已提交本题回答，且尚未点「结束本场」
- **THEN** 本题对照与五维已经可见，MUST NOT 要求先结束本场才出分

#### Scenario: Frontend does not compute scores
- **WHEN** 用户查看已评卡
- **THEN** 分数与对照来自后端只读字段，面板不自行算出分数或通过/不通过

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

### Requirement: Cards persist to the current workspace
系统 SHALL 把**当前这一轮**甲板写入当前工作区目录 `.dsh-interview/<考场会话 id>/<轮次目录>/`：`session.json` 为机器可读真源，`cards/<编号>.md` 为人读副本。工作区根 MUST 是该对话强制打开的目录（会话 `cwd`）。考场会话 id MUST 是面试官会话 A 的 id，MUST NOT 使用教练会话 B 的 id，MUST NOT 使用点「开始」之前那条源对话的 id（复用考场再开一轮时除外：此时会话 id 仍是该考场 A）。题目一出现 MUST 建立该卡文件；作答评分后 MUST 更新同一文件。同一考场会话上的新一轮 MUST 使用不同的轮次目录，MUST NOT 覆盖上一轮文件。关上面板再打开「面试」时，若当前轮仍进行中，系统 MUST 从该轮目录恢复全部卡片与当前卡；若当前轮已结束，系统 MUST NOT 把已结束轮恢复成进行中甲板。MUST NOT 依赖仅存活于进程内的路径表。开始前 MUST NOT 弹出文件夹选择。查不到工作区目录、会话 id 非法（空、含 `/` `\` 或 `..`）或 `fs` 写入失败时，面板 MUST 展示可见错误，MUST NOT 丢掉已有卡片，MUST NOT 空 catch。系统 MUST NOT 再向 `study/interview-dsh/` 写入新场；MUST NOT 读取、迁移或删除既有 `study/` 档案。

#### Scenario: Files appear with the first question
- **WHEN** `Q1` 开卷要点已生成且工作区目录与合法考场会话 id 已知
- **THEN** 工作区存在 `.dsh-interview/<该 sessionId>/<轮次目录>/session.json` 与 `.dsh-interview/<该 sessionId>/<轮次目录>/cards/Q1.md`，其中含编号、题干与开卷要点

#### Scenario: Scoring updates the same markdown file
- **WHEN** `Q1` 完成对照与五维
- **THEN** 同一轮次路径下的 `cards/Q1.md` 含作答、对照与分数，系统 MUST NOT 另起一份把 `Q1` 覆盖成下一题

#### Scenario: Overlay remount restores the deck
- **WHEN** 当前轮仍进行中、已有至少两张卡并已落盘，用户关闭面板后再点「面试」
- **THEN** 甲板、编号、分数与关闭前一致，无需重新开考

#### Scenario: Overlay remount after end does not revive the round
- **WHEN** 用户已点「结束本场」且本轮已结束，关闭面板后再点「面试」
- **THEN** 面板为入口而非进行中甲板，MUST NOT 把已结束轮当成当前待答场

#### Scenario: Persist failure is visible
- **WHEN** 无法解析工作区目录、会话 id 非法或写入失败
- **THEN** 面板展示错误，已生成的卡片仍可查看，系统 MUST NOT 把失败标成落盘成功

#### Scenario: Legacy study archives stay untouched
- **WHEN** 工作区里已有 `study/interview-dsh/` 旧场目录，用户开始一场新的模拟面试
- **THEN** 新轮只写入 `.dsh-interview/<sessionId>/<轮次目录>/`，MUST NOT 改写或删除该 `study/` 目录

#### Scenario: A second round uses a new directory
- **WHEN** 同一考场会话上第一轮已结束并已落盘，第二轮 `Q1` 开卷要点已生成
- **THEN** 第二轮文件在新的轮次目录下，第一轮 `session.json`、`cards/` 与 `qa.md` / `summary.md`（若有）仍在原目录

### Requirement: This change is not accepted without a Desktop path test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里新开一场八股模拟面试，确认工作区出现 `.dsh-interview/<考场 sessionId>/<轮次目录>/` 且含 `session.json` 与 `cards/Q1.md`，才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击与可见文件。`npm test`、Vite、新建 profile、升级 Desktop MUST NOT 代替本 requirement。未能在 GUI 内确认点目录时，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop writes the hidden session directory
- **WHEN** 实现者在本机已在使用的 DSH Desktop 中开始一场模拟面试并见到 `Q1` 开卷
- **THEN** 当前工作区存在 `.dsh-interview/<该场 sessionId>/<轮次目录>/session.json` 与 `cards/Q1.md`，本场 MUST NOT 在 `study/interview-dsh/` 下新建目录

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里核对该点目录
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成
