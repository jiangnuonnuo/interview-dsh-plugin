# interview-follow-up Specification

## Purpose

在第一问已经出现之后，让八股专项陪练进入多轮：候选人只在宿主对话里作答，面试官按人设追问，右侧教练面板对齐**当前待答问**的题干摘要与标准答要点，而不是整段点评或上一问。

## Requirements

### Requirement: This change is not accepted without a real DSH desktop follow-up test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「答完第一问后出现下一问，且面板已切到新卡的开卷要点，同时上一张卡仍可切回」才算交付。若某轮面试官在同一气泡中先点评再提问，验收 MUST 核对该新卡对齐文末待答问，而不是点评主题。验收 MUST 发生在真实 Desktop 窗口中的点击、输入与可见结果，MUST NOT 由实现者根据代码、人设或单测「认为会通过」而标完成。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、上一刀第一问的桌面记录、仅含「一问一答、气泡里只有问句」的三轮记录、Vite 预览、浏览器打开面板、`doc/entry-panel-mock.html`、新建 profile、升级 Desktop。未能启动该 Desktop 或未能在其窗口内走完场景时，本 capability MUST 视为未交付，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop follow-up is the gate
- **WHEN** 实现者启动本机已在使用的 DSH Desktop，用 `dsh plugin add` 把本包装进该 Desktop 正在使用的 profile，开始一场八股模拟面试并见到第一问与面板要点后，在宿主输入框提交对本题的回答
- **THEN** 同一条考场对话中出现面试官的下一问（恰好一个待答问题），右侧面板追加新卡并默认突出该新卡；进入详情可见该新题的题干摘要与标准答要点，且与第一问的要点不同；上一张卡仍在甲板中并可切回

#### Scenario: Mixed lecture and pending question on Desktop
- **WHEN** 宿主同一条面试官气泡先讲解或纠正上一问，再提出一个新的待答问（例如先讲页分裂与磁盘 I/O，再问联合索引最左匹配）
- **THEN** 新卡的题干摘要与标准答要点对应该待答问，MUST NOT 继续展示点评主题（例如页分裂 / 磁盘 I/O）作为本题，MUST NOT 用新题覆写上一张已评卡

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，或仅根据源码/人设推断宿主会追问，尚未在已打开的 DSH Desktop 窗口里作答并核对下一问与面板
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

#### Scenario: Inference and prior notes do not pass the change
- **WHEN** 实现者引用上一刀「第一问已在 Desktop 出现」的记录，或写「人设会追问所以面板应当会刷新」，但本会话没有打开 DSH Desktop、没有在宿主输入框提交回答
- **THEN** 本 requirement 仍为未满足；不得勾选桌面验收任务

#### Scenario: Desktop cannot be opened this session
- **WHEN** 本会话无法启动正在使用的 DSH Desktop，或无法在其 GUI 内完成作答路径
- **THEN** 桌面验收任务保持未勾选，本 change MUST 保持未完成，MUST NOT 改写为视为通过

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

### Requirement: Coach panel refreshes on the pending interviewer question
当考场对话中出现相对上一题发生变化的**当前待答问**，且该轮助手输出已经结束时，右侧面板 SHALL **追加一张新卡**并切到该卡，写入该待答问的题干摘要与标准答要点。标准答要点 MUST 在该待答问对用户可见后即可看见，MUST NOT 等到候选人再作答才刷新。在新卡开卷要点就绪之前，面板 MUST 继续展示上一张卡，MUST 展示下一张卡形生成中槽，MUST NOT 变成空白进行中，MUST NOT 把当前卡整页冻死，MUST NOT 删除或覆写已有卡片的对照与五维。生成中视觉 MUST 对齐 `docs/product-design/interview-panel-flat-live-update.png` 的结构（旧卡仍在、下一张卡槽可见）。面板 MUST NOT 由前端计算或判定分数。

#### Scenario: Points follow the new question
- **WHEN** 宿主对话中已出现与上一题不同的下一问，且面试官该轮已说完，且新卡开卷要点已生成
- **THEN** 面板仍为进行中，可见同一主题与难度，当前突出卡为该新题；进入详情后题干摘要与标准答要点对应该新题

#### Scenario: Previous snapshot remains until the new brief is ready
- **WHEN** 候选人已作答，面试官下一问尚未说完或要点尚未生成
- **THEN** 面板仍展示上一张卡的题干摘要入口，并可见下一张卡形生成中槽，MUST NOT 变成空白进行中，MUST NOT 只留下一张冻住的当前卡

#### Scenario: Scoring stays a frontend placeholder
- **WHEN** 面板因新题刷新
- **THEN** 新卡的评分区没有任何由前端算出的分数或通过/不通过判定；已评卡上的后端分数 MUST 保持不变

### Requirement: Watch publishes a scored deck before briefing the next card
当最新待答卡因作答被评为已评，且甲板中不再有 pending 卡时，系统 SHALL 先把该已评甲板持久化，并作为一次 `watchCoachTurn` 成功更新返回给面板。该次返回 MUST NOT 同时追加下一张卡。下一张卡的开卷要点 SHALL 在随后的看守周期生成并追加。等待下一问期间若作答已可读取，系统 MUST 为本题打分并按上款返回，MUST NOT 把打分阻塞到下一问 brief 完成。请求与响应形状 MUST NOT 增加 `briefing` 字段，MUST NOT 增加第三种卡片状态。

#### Scenario: First update after an answer is scored-only
- **WHEN** 候选人已作答且本题打分完成，下一张卡的开卷要点尚未生成
- **THEN** 面板收到的甲板最新卡为已评，卡片列表不含下一张 pending 卡

#### Scenario: Next card arrives on a later update
- **WHEN** 已评甲板已返回，随后面试官下一问说完且开卷要点生成成功
- **THEN** 另一次成功更新追加新的 pending 卡，面板默认突出该新卡

#### Scenario: Answer during wait is scored without waiting for the next brief
- **WHEN** 看守正在等待下一问，且候选人作答已经可读取
- **THEN** 系统为本题打分并返回已评甲板，MUST NOT 等到下一问 brief 完成后才返回分数

### Requirement: Mixed interviewer turns brief the pending question only
当最新面试官回合同时包含对上一问的点评、揭晓或讲解，以及一个新的待答问时，系统 SHALL 只把该待答问交给教练补全和面板快照。题干指纹 MUST 是抽出的待答问，MUST NOT 是整段助手气泡。若回合中带有 `【本题】` 标记，系统 SHALL 使用标记之后的文本作为待答问。

#### Scenario: Lecture plus new question
- **WHEN** 最后一条人类用户之后的面试官文本先纠正「页分裂对磁盘 I/O 没影响」，再问「联合索引在什么条件下最左匹配会失效」
- **THEN** 教练补全与面板题干摘要针对联合索引最左匹配，MUST NOT 把页分裂 / 磁盘 I/O 当作本题

#### Scenario: Pending question is not the last paragraph
- **WHEN** 面试官先抛出待答问，文末又补一句不含问号的议程（例如「说完这点后，我们再回头看另外两个维度」）
- **THEN** 系统仍使用该待答问 brief，MUST NOT 因文末没有问号而退回整段讲评

#### Scenario: Explicit pending-question marker
- **WHEN** 面试官文本在讲评之后包含 `【本题】` 及随后的问句
- **THEN** 系统使用 `【本题】` 之后的文本作为待答问，忽略标记之前的讲评

#### Scenario: First question without a trailing lecture
- **WHEN** 面试官回合本身就是一个待答问、没有前置讲评
- **THEN** 系统将该整段文本作为待答问 brief

### Requirement: Candidate can force-refresh the coach snapshot
进行中面板 SHALL 在卡片流态与详情态都提供「刷新本题」控件。候选人触发后，系统 MUST 按当前待答问重新生成**当前待答卡**的题干摘要与标准答要点，即使该待答问与内存中的上一题指纹相同。该控件 MUST NOT 向考场对话注入用户气泡，MUST NOT 成为聊天输入框，MUST NOT 清掉已评卡的对照与五维。刷新进行中 MUST 可见进行中状态（按钮禁用或「刷新中」）。刷新失败时面板 MUST 展示可见错误并保留当前甲板。

#### Scenario: Manual refresh rebriefs the current pending question
- **WHEN** 进行中面板已展示快照，候选人在流态或详情态点击「刷新本题」
- **THEN** 系统读取当前待答问并重新 brief；成功后当前待答卡展示新的题干摘要与要点，考场对话不因此多出用户气泡，其它卡不变

#### Scenario: Manual refresh failure keeps the last snapshot
- **WHEN** 候选人点击「刷新本题」但要点生成失败
- **THEN** 面板展示错误信息，当前甲板（含上一张卡的题干、要点与已有评分）仍然可见

### Requirement: Coach output and follow-up failures stay off the transcript
会话 B 为新题生成的要点 MUST NOT 进入对话气泡。看守或要点生成失败时，系统 SHALL 在面板展示可见错误，MUST NOT 把失败当成已刷新成功，MUST NOT 丢弃已有卡片，MUST NOT 静默忽略。关闭面板或卸载进行中视图时，系统 MUST 停止对本场的看守，MUST NOT 留下不可取消的异步刷新。

#### Scenario: New key points stay off the transcript
- **WHEN** 教练会话生成本题标准答要点
- **THEN** 考场对话气泡中 MUST NOT 出现该要点全文或评分过程

#### Scenario: Refresh failure is visible and keeps the last snapshot
- **WHEN** 下一问已出现但要点生成失败，或系统无法读取最新题干
- **THEN** 面板展示错误信息，已有卡片的题干摘要、要点与评分仍然可见

#### Scenario: Closing the panel cancels the watch
- **WHEN** 进行中面板被关闭或卸载，且当时仍有未完成的要点刷新
- **THEN** 该刷新 MUST 被取消或结果被丢弃，MUST NOT 在关闭后继续改写面板状态
