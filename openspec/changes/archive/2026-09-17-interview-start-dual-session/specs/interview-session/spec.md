## Purpose

在合法「开始模拟面试」之后，把当前 DSH 对话套成八股专项面试官，并行建立教练会话，使第一问出现在宿主对话、本题标准答要点出现在右侧面板；不自建聊天页，不把教练输出写入气泡。

## ADDED Requirements

### Requirement: This change is not accepted without a real DSH desktop test
本 change SHALL 在真实 DSH 桌面端完成验收后才算交付。`npm test`、`npm run build`、Vite 预览或仅浏览器打开面板 MUST NOT 单独构成本 change 通过。未在桌面端点过「开始模拟面试」并见到第一问时，本 capability MUST 视为未交付，MUST NOT 归档。

#### Scenario: Desktop start is the gate
- **WHEN** 用 `dsh plugin add` 把本组合包装进 DSH 桌面端正在使用的 profile，打开当前对话，从输入栏打开「面试」，选好主题与难度并点「开始模拟面试」
- **THEN** 当前对话中出现面试官的第一问（开场可含主题与难度），右侧面板进入进行中并展示本题标准答要点

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在 DSH 桌面端完成上一场景
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

### Requirement: Start uses two isolated sessions with the current conversation AI
开始成功后，系统 SHALL 同时存在会话 A（面试官，唯一可见说话表面）与会话 B（教练，用户只看见面板结果）。两条会话 MUST 使用当前这条 DSH 对话已经配置好的 AI（模型、参数、密钥来源）。插件 MUST NOT 另配一套模型或硬编码密钥。会话 A MUST NOT 看见面板的系统提示、评分过程或标准答生成过程。会话 B 的输出 MUST NOT 进入对话气泡。

#### Scenario: Dual session after valid start
- **WHEN** 用户合法点「开始模拟面试」且 Host 注入 API 可用
- **THEN** 系统建立会话 A 与会话 B，对话气泡中只出现面试官文案，教练产出只出现在面板

#### Scenario: Same AI configuration
- **WHEN** 当前 DSH 对话已配置某一模型
- **THEN** 会话 A 与会话 B 都使用该配置，插件不要求用户再填 Key 或另选模型

#### Scenario: Coach output stays off the transcript
- **WHEN** 教练会话生成本题标准答要点
- **THEN** 当前 DSH 对话气泡中 MUST NOT 出现该要点全文或评分过程

### Requirement: Sessions MUST NOT read pre-start history
从「开始」这一刻，会话 A 与会话 B SHALL 使用新建的面试上下文。系统 MUST NOT 把本对话里开始之前的消息当作本场面试材料。

#### Scenario: Pre-start messages are ignored
- **WHEN** 当前对话在开始前已有用户或助手消息，用户随后合法开始模拟面试
- **THEN** 第一问与本题要点不引用那些场前消息作为本场素材

### Requirement: Interviewer asks the first question in the host conversation
会话 A SHALL 使用 `interviewer-role-prompt.md` 的八股专项模板（填入本场主题与难度），开场说明本轮主题和难度后立刻问第一个问题，且每次只问一个问题。题目 MUST 由模型按主题与本场面试对话动态生成。系统 MUST NOT 用预写死题库驱动第一问。用户发言仍只通过 DSH 原对话输入框。本 change MUST NOT 处理用户作答后的追问、提示或跳过。

#### Scenario: First question appears in the current chat
- **WHEN** 开始成功
- **THEN** 当前这条 DSH 对话中出现面试官消息：含本轮主题与难度说明，并包含恰好一个待答问题

#### Scenario: No homemade chat surface
- **WHEN** 第一问已经出现
- **THEN** 插件面板内 MUST NOT 出现消息列表、聊天输入框或气泡；用户仍只在 DSH 原输入框回复

#### Scenario: No dead question bank
- **WHEN** 系统生成第一问
- **THEN** 问题来自模型对本场主题与难度的生成，而不是插件内置固定题面列表的按序取出

### Requirement: Coach panel shows the first question brief and standard-answer points
面试进行中，右侧面板 SHALL 展示：本场进行中状态、当前主题、当前题干摘要、本题标准答要点。标准答要点 MUST 在题目一出现即可看见，MUST NOT 等到用户作答之后才出现。面板 MAY 展示八股五维评分区占位；本 change 中评分区 MUST NOT 由前端计算或判定分数。面板 MUST NOT 提供「提示一下」「跳过问题」的内容生成。

#### Scenario: Points appear with the first question
- **WHEN** 对话中已出现第一问
- **THEN** 面板为进行中，可见当前主题、本题题干摘要与本题标准答要点

#### Scenario: Scoring is not decided on the frontend
- **WHEN** 用户查看进行中面板
- **THEN** 若展示评分区，其中没有任何由前端算出的分数或通过/不通过判定

#### Scenario: Hint and skip are not coach duties
- **WHEN** 进行中面板可见
- **THEN** 面板不生成、不展示「提示一下」或「跳过问题」的引导文案

### Requirement: Inject failure is visible and MUST NOT be bypassed with a custom chat
适配层查不到把面试官注入当前对话、或不读场前历史、或隔离教练会话的官方 API 时，系统 SHALL 在面板展示可见错误，并 MAY 在适配层用 `TODO` 标明缺失的 API 名称。系统 MUST NOT 为此实现自建聊天页、MUST NOT 把面试官回复画在面板里冒充对话、MUST NOT 静默假装已开始。

#### Scenario: Missing host inject API
- **WHEN** 用户合法点「开始模拟面试」，且 Host 无法注入面试官或无法建立隔离的教练会话
- **THEN** 面板展示可见失败，当前对话不出现伪造的插件内气泡，插件源码不新增聊天页

#### Scenario: Start error is not swallowed
- **WHEN** 开始过程中注入、出题或要点生成失败
- **THEN** 面板展示错误信息，系统 MUST NOT 把失败当成成功的进行中状态
