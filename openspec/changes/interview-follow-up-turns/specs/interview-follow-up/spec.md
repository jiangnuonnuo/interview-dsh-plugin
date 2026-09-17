## Purpose

在第一问已经出现之后，让八股专项陪练进入多轮：候选人只在宿主对话里作答，面试官按人设追问，右侧教练面板在新题落地后换成该题要点。

## ADDED Requirements

### Requirement: This change is not accepted without a real DSH desktop follow-up test
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「答完第一问后出现下一问，且面板要点已更换」才算交付。验收 MUST 发生在真实 Desktop 窗口中的点击、输入与可见结果，MUST NOT 由实现者根据代码、人设或单测「认为会通过」而标完成。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、上一刀第一问的桌面记录、Vite 预览、浏览器打开面板、`doc/entry-panel-mock.html`、新建 profile、升级 Desktop。未能启动该 Desktop 或未能在其窗口内走完场景时，本 capability MUST 视为未交付，tasks 中的桌面验收项 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop follow-up is the gate
- **WHEN** 实现者启动本机已在使用的 DSH Desktop，用 `dsh plugin add` 把本包装进该 Desktop 正在使用的 profile，开始一场八股模拟面试并见到第一问与面板要点后，在宿主输入框提交对本题的回答
- **THEN** 同一条考场对话中出现面试官的下一问（恰好一个待答问题），右侧面板展示该新题的题干摘要与标准答要点，且与第一问的要点不同

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
第一问出现之后，候选人发言 SHALL 只通过 DSH 原对话输入框。面试官的追问 MUST 出现在同一条考场对话的宿主气泡中。插件 MUST NOT 为此新建聊天页，MUST NOT 在面板里画消息列表、输入框或气泡，MUST NOT 再向对话注入一条催促下一问的用户消息。

#### Scenario: Candidate answers in the host composer
- **WHEN** 进行中面板已展示第一问要点，候选人在考场对话的宿主输入框提交回答
- **THEN** 该回答出现在宿主对话气泡中，面板内不出现该回答气泡，也不出现聊天输入框

#### Scenario: Next interviewer question is in the host transcript
- **WHEN** 候选人已提交对本题的回答，且面试官按人设继续提问
- **THEN** 下一问出现在同一条考场对话里，插件面板内 MUST NOT 出现该追问气泡

#### Scenario: Plugin does not inject a fake user turn
- **WHEN** 系统检测到需要刷新教练材料
- **THEN** 考场对话中 MUST NOT 因此多出一条由插件写入的、用于催促下一问的用户气泡

### Requirement: Coach panel refreshes on the latest interviewer question
当考场对话中出现相对上一题发生变化的新面试官问题，且该轮助手输出已经结束时，右侧面板 SHALL 替换为该新题的题干摘要与标准答要点。标准答要点 MUST 在新题对用户可见后即可看见，MUST NOT 等到候选人再作答才刷新。在新快照就绪之前，面板 MUST 继续展示上一题快照。面板 MAY 提示正在更新；MUST NOT 由前端计算或判定分数。

#### Scenario: Points follow the new question
- **WHEN** 宿主对话中已出现与上一题不同的下一问，且面试官该轮已说完
- **THEN** 面板仍为进行中，可见同一主题与难度，题干摘要与标准答要点对应该新题

#### Scenario: Previous snapshot remains until the new brief is ready
- **WHEN** 候选人已作答，面试官下一问尚未说完或要点尚未生成
- **THEN** 面板仍展示上一题的题干摘要与要点，MUST NOT 变成空白进行中

#### Scenario: Scoring stays a frontend placeholder
- **WHEN** 面板因新题刷新
- **THEN** 若展示评分区，其中仍然没有任何由前端算出的分数或通过/不通过判定

### Requirement: Coach output and follow-up failures stay off the transcript
会话 B 为新题生成的要点 MUST NOT 进入对话气泡。看守或要点生成失败时，系统 SHALL 在面板展示可见错误，MUST NOT 把失败当成已刷新成功，MUST NOT 丢弃上一题快照，MUST NOT 静默忽略。关闭面板或卸载进行中视图时，系统 MUST 停止对本场的看守，MUST NOT 留下不可取消的异步刷新。

#### Scenario: New key points stay off the transcript
- **WHEN** 教练会话生成本题标准答要点
- **THEN** 考场对话气泡中 MUST NOT 出现该要点全文或评分过程

#### Scenario: Refresh failure is visible and keeps the last snapshot
- **WHEN** 下一问已出现但要点生成失败，或系统无法读取最新题干
- **THEN** 面板展示错误信息，上一题的题干摘要与要点仍然可见

#### Scenario: Closing the panel cancels the watch
- **WHEN** 进行中面板被关闭或卸载，且当时仍有未完成的要点刷新
- **THEN** 该刷新 MUST 被取消或结果被丢弃，MUST NOT 在关闭后继续改写面板状态
