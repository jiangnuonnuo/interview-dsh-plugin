## Purpose

在候选人作答之前，按难度写好本题知识链并只交给面试官的系统段，使下一问有固定的层和档位；考场消息仍只是候选人与面试官的自然语言对话。

## ADDED Requirements

### Requirement: This change is not accepted without a real DSH desktop dialogue check
本 change SHALL 在实现者亲自打开本机已安装、正在使用的 DSH Desktop 之后，在该 GUI 里完成「初级一场至少两问、高级一场至少一问追问，且考场气泡中不出现知识链、三档约束、JSON 或请按人设一类导演句」才算交付。验收 MUST 发生在真实 Desktop 窗口中的可见对话。下列各项单独或组合 MUST NOT 构成本 change 通过：`npm test`、`npm run build`、代码审查、只核对 section 文本、Vite 预览、浏览器打开面板。未能在该窗口内看完对话气泡时，桌面验收任务 MUST 保持未勾选，MUST NOT 归档。

#### Scenario: Desktop dialogue stays a normal interview
- **WHEN** 实现者在正在使用的 DSH Desktop 中开始一场八股模拟面试，在宿主输入框作答，并看到面试官的下一问
- **THEN** 用户气泡只有候选人自己的回答，以及开场句「开始本场八股专项模拟面试。」；助手气泡是口语化的面试问句或短讲评加一个待答问；这些气泡中 MUST NOT 出现知识链正文、三档菜单、JSON、`questionBrief`、`keyPoints` 或「请按人设」

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在已打开的 DSH Desktop 窗口里核对对话气泡
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

### Requirement: A knowledge chain is ready before the candidate answers
待答问对候选人可见之后、候选人作答之前，系统 SHALL 为本题写好知识链：知识点名称、考察层（定义、原理、场景、边界之一）、考察意图（一句）、三档下一问约束（答到了、有缺口、没答上，各一句）。知识链 MUST 与该题开卷要点同一次补全产出。系统 MUST NOT 为知识链另起一个会说话的 Agent，MUST NOT 另配模型或外部决策服务，MUST NOT 调用宿主当前默认模型以外的模型。三档约束是下一问的边界，不是要念给候选人的题干。

#### Scenario: Chain exists while the question is still pending
- **WHEN** 面板已展示某题开卷要点且该卡仍为待答
- **THEN** 该题已有考察层、考察意图和三档约束，且这些内容尚未进入考场消息

#### Scenario: Same completion as the brief
- **WHEN** 系统为本题生成开卷要点
- **THEN** 同一次补全同时给出知识链字段，系统 MUST NOT 再为知识链单独向考场 `prompt`

### Requirement: Difficulty clips the chain in code
系统 SHALL 用代码按难度裁剪知识链，再把裁剪结果交给面试官。模型返回的层若不被该难度允许，系统 MUST 改到该难度允许的最高层，MUST NOT 原样挂上。

初级：第一问起手层为定义；允许定义与场景；同一知识点最多 2 问；「答到了」只能从定义升到场景，然后必须换知识点。
中级：第一问起手层为原理或场景；允许定义、原理、场景；同一知识点最多 3 问；「答到了」按定义、原理、场景逐层上升。
高级：第一问起手层为原理中的取舍或边界；四层都允许；同一知识点最多 4 问；原理及以上的「答到了」必须换前提或换规模；边界层在同一知识点最多 1 问。
问数达到该难度上限后，交给面试官的约束 MUST 只剩换知识点。

#### Scenario: Junior chain cannot enter the boundary layer
- **WHEN** 本场难度为初级，补全把当前层或下一档写成边界
- **THEN** 挂给面试官的知识链不含边界层，层被改到场景或定义

#### Scenario: Quota exhausted leaves only a topic switch
- **WHEN** 初级同一知识点已经有 `Q1` 与 `Q1.1`，下一问约束即将挂上
- **THEN** 交给面试官的约束只要求换知识点，不再包含同知识点的深挖档

#### Scenario: Senior deep move changes the premise
- **WHEN** 本场难度为高级，当前层是原理或边界，且「答到了」一档被写入
- **THEN** 该档要求换前提或换规模，而不是再问一次同义定义

### Requirement: The chain is mounted as a system section and never as a message
裁剪后的知识链 MUST 经考场 Agent 的 `systemPrompt.section` 挂上，并在下一题落地时替换上一题的该段。该段 MUST NOT 被 `session.prompt`、消息 append 或任何会留下气泡的接口发送。考场里插件写入的可见用户消息只允许两句：首轮开场「开始本场八股专项模拟面试。」，以及 `interview-round-close` 规定的「结束面试」。除此以外，刷新教练、挂知识链、评分与写要点 MUST NOT 增加用户气泡或助手气泡。

助手可见回复 MUST 保持自然语言面试口气：一次一个待答问，可以先有一两句短讲评。该回复 MUST NOT 包含知识链正文、三档菜单、档名列表、JSON、`questionBrief`、`keyPoints`、`cardId`、`relation` 或「请按人设」。`【本题】` 仍可用来标出待答问。结束本轮时系统 MUST 先摘掉知识链 section，再挂收尾段。

#### Scenario: Mounting the chain adds no bubble
- **WHEN** 某题知识链已挂上 section，候选人尚未作答
- **THEN** 考场消息相对挂载前不增加任何一条由插件写入的用户或助手气泡

#### Scenario: Follow-up speech is ordinary interview language
- **WHEN** 候选人作答后，面试官在同一考场对话中提出下一问
- **THEN** 该助手气泡是口语问句或短讲评加一个问句，其中看不到三档约束、JSON 或系统段标题

#### Scenario: Opening seed has no director clause
- **WHEN** 一场新的考场会话开始成功
- **THEN** 插件写下的那条用户消息全文为「开始本场八股专项模拟面试。」，其后没有「请按人设」或知识链说明

#### Scenario: Chain section is removed before the closing line
- **WHEN** 用户点「结束本场」且收尾流程开始
- **THEN** 知识链 section 已被摘掉，随后才挂收尾段；可见用户消息仍只是「结束面试」

### Requirement: Chain failure is visible and falls back without dropping cards
挂不上知识链 section，或补全结果无法解析为知识链时，面板 MUST 展示可见错误，MUST NOT 空 catch。面试官 MUST 退回不含本题三档约束的当前人设。卡片 MUST 仍按既有要点与评分路径写入，已有卡的题干、要点、作答与五维 MUST NOT 被丢弃。系统 MUST NOT 改用自建聊天或再 `prompt` 一条催问来绕过失败。

#### Scenario: Section mount failure keeps the interview usable
- **WHEN** 题干已出现，但知识链 section 挂载失败
- **THEN** 面板可见错误，考场不因此多出一条用户气泡，已有卡片仍然可见

#### Scenario: Unparseable chain does not block scoring
- **WHEN** 补全没有返回可解析的知识链，候选人仍对该题作答
- **THEN** 该卡仍可得到要点与评分，系统 MUST NOT 把失败当成已按知识链追问
