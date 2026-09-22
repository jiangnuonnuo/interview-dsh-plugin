## MODIFIED Requirements

### Requirement: Interviewer asks the first question in the host conversation
会话 A SHALL 使用八股专项人设（填入本场主题与难度）。开场说明本轮主题和难度后立刻问第一个问题，且每次只问一个问题。第一问的起手层由难度决定：初级只问定义，中级问原理或场景，高级问原理中的取舍或边界。题目 MUST 由模型按主题、难度起手层与本场面试对话动态生成。系统 MUST NOT 用预写死题库驱动第一问。第一问落地之后的追问 MUST 遵守当时挂上的知识链系统段，人设 MUST NOT 再靠梯度口号充当追问策略。用户发言仍只通过 DSH 原对话输入框。插件为开口写入的可见用户消息 MUST 全文等于「开始本场八股专项模拟面试。」，MUST NOT 包含「请按人设」、起手层说明、知识链或评分指令；这些约束留在系统段。

#### Scenario: First question appears in the current chat
- **WHEN** 开始成功
- **THEN** 当前这条 DSH 对话中出现面试官消息：含本轮主题与难度说明，并包含恰好一个待答问题；该问题的层次符合本场难度的起手层

#### Scenario: Opening user bubble is a normal start line
- **WHEN** 开始成功且插件已写下开场用户消息
- **THEN** 该消息全文为「开始本场八股专项模拟面试。」，对话中看不到「请按人设」或知识链正文

#### Scenario: No homemade chat surface
- **WHEN** 第一问已经出现
- **THEN** 插件面板内 MUST NOT 出现消息列表、聊天输入框或气泡；用户仍只在 DSH 原输入框回复

#### Scenario: No dead question bank
- **WHEN** 系统生成第一问
- **THEN** 问题来自模型对本场主题与难度起手层的生成，而不是插件内置固定题面列表的按序取出
