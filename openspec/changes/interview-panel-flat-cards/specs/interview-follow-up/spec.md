## MODIFIED Requirements

### Requirement: This change is not accepted without a real DSH desktop follow-up test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「答完第一问后出现下一问，且面板已切到新卡，同时上一张卡仍可切回」才算交付。若某轮面试官在同一气泡中先点评再提问，验收 MUST 核对该新卡对齐文末待答问，而不是点评主题。验收 MUST 发生在真实 Desktop 窗口中的点击、输入与可见结果，MUST NOT 由实现者根据代码、人设或单测「认为会通过」而标完成。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、上一刀第一问的桌面记录、仅含「一问一答、气泡里只有问句」的三轮记录、Vite 预览、浏览器打开面板、`doc/entry-panel-mock.html`、新建 profile、升级 Desktop。未能启动该 Desktop 或未能在其窗口内走完场景时，本 capability MUST 视为未交付，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

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

### Requirement: Coach panel refreshes on the pending interviewer question
当考场对话中出现相对上一题发生变化的**当前待答问**，且该轮助手输出已经结束时，右侧面板 SHALL **追加一张新卡**并切到该卡，写入该待答问的题干摘要与标准答要点。标准答要点 MUST 在该待答问对用户可见后即可看见，MUST NOT 等到候选人再作答才刷新。在新卡开卷要点就绪之前，面板 MUST 继续展示上一张卡，MUST 展示生成中占位，MUST NOT 变成空白进行中，MUST NOT 删除或覆写已有卡片的对照与五维。生成中视觉 MUST 对齐 `docs/product-design/interview-panel-flat-live-update.png` 的结构（旧卡仍在、生成中可见）。面板 MUST NOT 由前端计算或判定分数。

#### Scenario: Points follow the new question
- **WHEN** 宿主对话中已出现与上一题不同的下一问，且面试官该轮已说完，且新卡开卷要点已生成
- **THEN** 面板仍为进行中，可见同一主题与难度，当前突出卡为该新题；进入详情后题干摘要与标准答要点对应该新题

#### Scenario: Previous snapshot remains until the new brief is ready
- **WHEN** 候选人已作答，面试官下一问尚未说完或要点尚未生成
- **THEN** 面板仍展示上一张卡的题干摘要入口，并可见生成中占位，MUST NOT 变成空白进行中

#### Scenario: Scoring stays a frontend placeholder
- **WHEN** 面板因新题刷新
- **THEN** 新卡的评分区没有任何由前端算出的分数或通过/不通过判定；已评卡上的后端分数 MUST 保持不变

### Requirement: Candidate can force-refresh the coach snapshot
进行中面板 SHALL 在卡片流态与详情态都提供「刷新本题」控件。候选人触发后，系统 MUST 按当前待答问重新生成**当前待答卡**的题干摘要与标准答要点，即使该待答问与内存中的上一题指纹相同。该控件 MUST NOT 向考场对话注入用户气泡，MUST NOT 成为聊天输入框，MUST NOT 清掉已评卡的对照与五维。刷新进行中 MUST 可见进行中状态（按钮禁用或「刷新中」）。刷新失败时面板 MUST 展示可见错误并保留当前甲板。

#### Scenario: Manual refresh rebriefs the current pending question
- **WHEN** 进行中面板已展示快照，候选人在流态或详情态点击「刷新本题」
- **THEN** 系统读取当前待答问并重新 brief；成功后当前待答卡展示新的题干摘要与要点，考场对话不因此多出用户气泡，其它卡不变

#### Scenario: Manual refresh failure keeps the last snapshot
- **WHEN** 候选人点击「刷新本题」但要点生成失败
- **THEN** 面板展示错误信息，当前甲板（含上一张卡的题干、要点与已有评分）仍然可见
