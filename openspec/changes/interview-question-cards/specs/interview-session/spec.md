## ADDED Requirements

### Requirement: Start binds the exam room to the current workspace directory
合法开始创建考场会话时，系统 SHALL 把当前工作区目录传给会话创建（`workspaceId` 或 `cwd` 恰好一个）。系统 MUST NOT 以空参数创建考场并指望 Desktop 进程目录就是工作区。无法解析当前工作区目录时，面板 MUST 展示可见错误，MUST NOT 注入面试官，MUST NOT 假装已开始。

#### Scenario: Exam session receives workspace cwd
- **WHEN** 用户在已打开某工作区的 DSH 对话中合法点「开始模拟面试」
- **THEN** 新考场会话的工作目录等于该工作区路径，后续卡片落盘使用该目录

#### Scenario: Missing workspace directory is visible
- **WHEN** 用户合法点开始，但 Client 无法得到当前工作区的 `cwd` 或 `workspaceId`
- **THEN** 面板展示可见失败，对话中不出现面试官，工作区不被错误写入 Desktop 进程目录

## MODIFIED Requirements

### Requirement: This change is not accepted without a real DSH desktop test
本 change SHALL 在真实 DSH 桌面端完成验收后才算交付。`npm test`、`npm run build`、Vite 预览或仅浏览器打开面板 MUST NOT 单独构成本 change 通过。未在桌面端点过「开始模拟面试」并见到第一问时，本 capability MUST 视为未交付，MUST NOT 归档。

#### Scenario: Desktop start is the gate
- **WHEN** 用 `dsh plugin add` 把本组合包装进 DSH 桌面端正在使用的 profile，打开当前对话，从输入栏打开「面试」，选好主题与难度并点「开始模拟面试」
- **THEN** 当前对话中出现面试官的第一问（开场可含主题与难度），右侧面板进入进行中并展示编号为 `Q1` 的卡片及其标准答要点

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在 DSH 桌面端完成上一场景
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

### Requirement: Coach panel shows the first question brief and standard-answer points
面试进行中，右侧面板 SHALL 展示本场进行中状态、当前主题，以及第一张卡片 `Q1` 的题干摘要与本题标准答要点。标准答要点 MUST 在题目一出现即可看见，MUST NOT 等到用户作答之后才出现。`Q1` 在作答前 MUST 将对照与五维留空；面板 MUST NOT 由前端计算或判定分数。面板 MUST NOT 提供「提示一下」「跳过问题」的内容生成。

#### Scenario: Points appear with the first question
- **WHEN** 对话中已出现第一问
- **THEN** 面板为进行中，可见当前主题、`Q1` 题干摘要与本题标准答要点，该卡状态为待答

#### Scenario: Scoring is not decided on the frontend
- **WHEN** 用户查看进行中面板
- **THEN** 若展示评分区，其中没有任何由前端算出的分数或通过/不通过判定

#### Scenario: Hint and skip are not coach duties
- **WHEN** 进行中面板可见
- **THEN** 面板不生成、不展示「提示一下」或「跳过问题」的引导文案
