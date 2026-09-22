## MODIFIED Requirements

### Requirement: Interviewer asks the first question in the host conversation
会话 A SHALL 使用八股专项人设（填入本场主题与难度）。开场说明本轮主题和难度后立刻问第一个问题，且每次只问一个问题。第一问的起手层由难度决定：初级只问定义，中级问原理或场景，高级问原理中的取舍或边界。题目 MUST 由模型按主题、难度起手层与本场面试对话动态生成。系统 MUST NOT 用预写死题库驱动第一问。难度 MUST NOT 通过同一知识点的题数上限决定何时换题；允许层与引导尺度由 `interview-answer-guidance` 规定。用户发言仍只通过 DSH 原对话输入框。

#### Scenario: First question appears in the current chat
- **WHEN** 开始成功
- **THEN** 当前这条 DSH 对话中出现面试官消息：含本轮主题与难度说明，并包含恰好一个待答问题

#### Scenario: Junior opens on a definition
- **WHEN** 本场难度为初级且第一问已出现
- **THEN** 这一问考察的是定义，而不是边界

#### Scenario: No homemade chat surface
- **WHEN** 第一问已经出现
- **THEN** 插件面板内 MUST NOT 出现消息列表、聊天输入框或气泡；用户仍只在 DSH 原输入框回复

#### Scenario: No dead question bank
- **WHEN** 系统生成第一问
- **THEN** 问题来自模型对本场主题与难度起手层的生成，而不是插件内置固定题面列表的按序取出

#### Scenario: Question count does not switch the topic
- **WHEN** 同一知识点上的正式问尚未被对照判为下一正式问
- **THEN** 系统不得仅因已经问过固定题数就换知识点
