# interview-session Specification

## Purpose

在合法「开始模拟面试」之后，在当前项目工作区下新开一场八股专项考场对话，并行建立教练会话，使第一问出现在该考场、本题标准答要点出现在右侧面板；不自建聊天页，不把教练输出写入气泡，也不把面试官注入用户正在写代码的那条对话。

## Requirements

### Requirement: This change is not accepted without a real DSH desktop test
本 change SHALL 在真实 DSH 桌面端完成验收后才算交付。`npm test`、`npm run build`、Vite 预览或仅浏览器打开面板 MUST NOT 单独构成本 change 通过。未在桌面端点过「开始模拟面试」并见到第一问时，本 capability MUST 视为未交付，MUST NOT 归档。

#### Scenario: Desktop start is the gate
- **WHEN** 用 `dsh plugin add` 把本组合包装进 DSH 桌面端正在使用的 profile，打开当前对话，从输入栏打开「面试」，选好主题与难度并点「开始模拟面试」
- **THEN** 当前对话中出现面试官的第一问（开场可含主题与难度），右侧面板进入进行中并在卡片流展示编号为 `Q1` 的卡片；进入该卡详情后可见本题标准答要点

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在 DSH 桌面端完成上一场景
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

### Requirement: Start uses two isolated sessions with the current conversation AI
开始成功后，系统 SHALL 同时存在会话 A（面试官，唯一可见说话表面）与会话 B（教练，用户只看见面板结果）。会话 A 的开口，以及会话 B 的开卷要点、知识链、对照评语与五维，MUST 使用当前这条 DSH 对话已经配置好的 AI（模型、参数、密钥来源）。系统 MUST NOT 为这些生成任务另配一套生成模型或硬编码密钥。可选的定档服务 MUST 仅用于五种覆盖结果，MUST NOT 生成气泡、要点、评语或分数文案。该定档服务默认关闭；未开启或调用失败时，五种覆盖结果 MUST 仍由会话 B 的对照补全给出。可选定档的密钥 MUST 只存在于工作区 `.dsh-interview/config/jev.json`，MUST NOT 写入各轮 `round-*` 档案。会话 A MUST NOT 看见面板的系统提示、评分过程或标准答生成过程。会话 B 的输出 MUST NOT 进入对话气泡。

#### Scenario: Dual session after valid start
- **WHEN** 用户合法点「开始模拟面试」且 Host 注入 API 可用
- **THEN** 系统建立会话 A 与会话 B，对话气泡中只出现面试官文案，教练产出只出现在面板

#### Scenario: Same AI configuration
- **WHEN** 当前 DSH 对话已配置某一模型，且未开启可选定档服务
- **THEN** 会话 A 与会话 B 都使用该配置，插件不要求用户再填 Key 或另选生成模型

#### Scenario: Optional coverage model does not replace the host AI
- **WHEN** 已开启可选定档服务
- **THEN** 面试官开口、开卷要点、对照评语与五维仍使用宿主当前默认模型；插件 MUST NOT 用定档服务生成这些文案

#### Scenario: Coach output stays off the transcript
- **WHEN** 教练会话生成本题标准答要点
- **THEN** 当前 DSH 对话气泡中 MUST NOT 出现该要点全文或评分过程

#### Scenario: Optional coverage secret stays out of the round archive
- **WHEN** 用户已保存 Jev 密钥并开始一轮面试
- **THEN** 该轮 `round-*` 下的 `session.json` 与 `cards/*.md` MUST NOT 含该密钥

### Requirement: Sessions MUST NOT read pre-start history
从**新建考场会话**的第一次「开始」起，会话 A 与会话 B SHALL 使用新建的面试上下文。系统 MUST NOT 把点开始之前那条编码对话里的消息当作本场面试材料。当同一条考场会话上开始**新的一轮**时，上一轮问答可以留在该会话记录中，但开口 MUST 把上一轮视为已结束，MUST NOT 把上一轮待答问或收尾句当作本轮第一问的素材。

#### Scenario: Pre-start messages are ignored
- **WHEN** 当前对话在开始前已有用户或助手消息，用户随后合法开始模拟面试并因此新建考场会话
- **THEN** 第一问与本题要点不引用那些场前编码消息作为本场素材

#### Scenario: A later round does not continue the previous pending question
- **WHEN** 同一考场会话上上一轮已结束（含收尾句），用户再次开始新一轮
- **THEN** 本轮第一问针对新的主题与难度，MUST NOT 把上一轮最后一问或收尾句当作本题

### Requirement: Start binds the exam room to the current workspace directory
合法开始**新建**考场会话时，系统 SHALL 把当前工作区目录传给会话创建（`workspaceId` 或 `cwd` 恰好一个）。系统 MUST NOT 以空参数创建考场并指望 Desktop 进程目录就是工作区。无法解析当前工作区目录时，面板 MUST 展示可见错误，MUST NOT 注入面试官，MUST NOT 假装已开始。当当前宿主会话已是本插件考场且本轮已结束、系统复用该会话时，MUST NOT 再 `create` 空参数会话；落盘仍使用该考场已绑定的工作区目录。

#### Scenario: Exam session receives workspace cwd
- **WHEN** 用户在已打开某工作区的 DSH 对话中合法点「开始模拟面试」且因此新建考场
- **THEN** 新考场会话的工作目录等于该工作区路径，后续卡片落盘使用该目录

#### Scenario: Missing workspace directory is visible
- **WHEN** 用户合法点开始，但 Client 无法得到当前工作区的 `cwd` 或 `workspaceId`，且需要新建考场
- **THEN** 面板展示可见失败，对话中不出现面试官，工作区不被错误写入 Desktop 进程目录

#### Scenario: Reused exam session keeps its workspace
- **WHEN** 当前会话已是已结束的考场会话，用户再次合法开始
- **THEN** 系统不新建会话，本轮档案仍写入该考场原工作区，MUST NOT 写到 Desktop 进程目录

### Requirement: Exam session joins the current workspace group
合法开始创建考场会话时，系统 SHALL 把该会话挂到用户当前所在的 DSH 工作区分组（用户正在看的项目，而不是「未分组」）。当 Client 能解析到该工作区的稳定 id 时，创建参数 MUST 只带这个工作区 id，MUST NOT 只带目录路径——只带路径时会话会进入「未分组」。系统 MUST NOT 以空参数创建考场。无法解析当前工作区时，面板 MUST 展示可见错误，MUST NOT 注入面试官，MUST NOT 假装已开始。新考场仍是单独的面试官会话，MUST NOT 把面试官注入用户正在写代码的那条对话。

#### Scenario: Start from a project page stays in that project
- **WHEN** 用户在已打开某项目工作区的 DSH 页面合法点「开始模拟面试」，且 Client 能解析到该工作区 id
- **THEN** 新考场会话出现在该项目的会话列表中，工作目录等于该工作区路径，系统 MUST NOT 把当前视图切到「未分组」里的其它会话

#### Scenario: Ungrouped leftover chats are not the landing place
- **WHEN** 侧栏「未分组」里已有标题为开始本场模拟面试的旧会话，用户从另一个已打开的项目页再次开始
- **THEN** 本场新考场仍挂在该项目分组下，MUST NOT 把用户重定向进那些未分组旧会话

#### Scenario: Missing workspace is visible
- **WHEN** 用户合法点开始，但 Client 无法得到当前工作区的 id 或目录
- **THEN** 面板展示可见失败，对话中不出现面试官，工作区不被错误写入 Desktop 进程目录

### Requirement: Interviewer asks the first question in the host conversation
会话 A SHALL 使用 `interviewer-role-prompt.md` 的八股专项模板（填入本场主题与难度），开场说明本轮主题和难度后立刻问第一个问题，且每次只问一个问题。题目 MUST 由模型按主题与本场面试对话动态生成。系统 MUST NOT 用预写死题库驱动第一问。用户发言仍只通过 DSH 原对话输入框。

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
面试进行中，右侧面板 SHALL 展示本场进行中状态、当前主题，以及第一张卡片 `Q1`。标准答要点 MUST 在题目一出现即可取得，MUST NOT 等到用户作答之后才生成。卡片流态 MUST 展示 `Q1` 编号、题干摘要入口与「查看完整内容」；完整题干与开卷要点 MUST 在详情态可见。`Q1` 在作答前 MUST 将对照与五维留空；面板 MUST NOT 由前端计算或判定分数。面板 MUST NOT 提供「提示一下」「跳过问题」的内容生成。进行中顶栏结构 MUST 对齐 `docs/product-design/interview-panel-flat-card-flow.png`：关闭、模拟面试、进行中标识、结束本场；刷新本题可用。

#### Scenario: Points appear with the first question
- **WHEN** 对话中已出现第一问
- **THEN** 面板为进行中，可见当前主题与 `Q1` 卡片；进入详情后可见本题题干摘要与标准答要点，该卡状态为待答

#### Scenario: Card flow does not dump the full long page
- **WHEN** 第一问已出现且面板处于卡片流态
- **THEN** 当前卡突出并提供进入详情的入口；MUST NOT 把作答、对照、五维以不可折叠的整页长列表作为流态的唯一布局

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
