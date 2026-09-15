## RENAMED Requirements

- FROM: `### Requirement: Start validates configuration without starting an interviewer session`
- TO: `### Requirement: Start validates configuration and starts the dual session`

## MODIFIED Requirements

### Requirement: This change is not accepted without a real DSH desktop test
本 capability 的入口打开验收仍以真实 DSH 桌面端为准。合法「开始模拟面试」的会话行为由 `interview-session` 约束；入口侧 MUST 在桌面端确认开始不再停在「待开考」。

#### Scenario: Desktop smoke test is the gate
- **WHEN** 用 `dsh plugin add` 把本组合包装进 DSH 桌面端正在使用的 profile，启动桌面端，打开新会话首页，点输入栏「面试」（「AI 优化」旁）
- **THEN** 当前对话不变，右侧出现入口面板，可见「选择面试主题」「面试设置」「开始模拟面试」，结构对照 `doc/entry-panel.png`

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，或仅在浏览器里打开入口预览，尚未在 DSH 桌面端点过「面试」
- **THEN** 本 requirement 仍为未满足

#### Scenario: Start is verified on desktop without injecting interviewer
- **WHEN** 在 DSH 桌面端入口面板选好主题与难度并点「开始模拟面试」，且 Host 注入 API 可用
- **THEN** 面板不再停留在仅展示已保存配置的待开考状态，而是进入 `interview-session` 所定义的进行中（对话出现第一问、面板出现本题要点）。本场景名称沿用上一刀；行为已改为必须注入面试官

### Requirement: Opening the interview panel does not change the host conversation
当用户从 DSH 输入栏打开「面试」时，系统 SHALL 只展开本插件的右侧面板。系统 MUST NOT 跳转到新页面、MUST NOT 新建聊天、MUST NOT 更换当前正在查看的 DSH 对话。主入口 MUST 注册在 `conversation.input.right`（与「AI 优化」同槽），MUST NOT 以 `conversation.session.header.utilities` 作为唯一或主入口。打开面板本身 MUST NOT 向对话注入面试官；注入只发生在合法开始之后，且说话表面仍是当前这条 DSH 对话。

#### Scenario: User opens Interview from the composer
- **WHEN** 用户在新会话首页输入栏点「面试」
- **THEN** 右侧出现入口面板，当前仍是新会话首页（或打开前的那条对话），地址与会话身份不变

#### Scenario: Host without official right-tab API still opens the panel
- **WHEN** 当前桌面端 harness 没有 `ctx.sidebarRight.openTab`（例如 DSH Desktop 0.2.17 所带的 0.1.1-rc.2）
- **THEN** 系统仍从输入栏「面试」打开入口面板（`shell.overlay` 抽屉），MUST NOT 跳转、MUST NOT 新建聊天、MUST NOT 更换当前对话

#### Scenario: Open failure is visible
- **WHEN** 用户点输入栏「面试」，且官方右栏 API 不可用或打开抛错
- **THEN** 系统 MUST 展开入口面板或同一 `shell.overlay` 上的可见错误，MUST NOT 让点击无任何界面变化

#### Scenario: Panel is the plugin surface
- **WHEN** 入口或进行中面板处于打开状态
- **THEN** 面板内 MUST NOT 出现消息列表、聊天输入框或气泡；用户发言仍只通过 DSH 原对话输入框。打开面板 MUST NOT 写入面试官消息；合法开始后面试官消息 MUST 出现在宿主对话中，MUST NOT 出现在面板气泡里

### Requirement: Start validates configuration and starts the dual session
主操作 SHALL 为「开始模拟面试」。当主题（预设或非空自定义）与难度均已选定，系统 SHALL 接受并记下本次配置，并 SHALL 启动 `interview-session`（注入面试官、建立教练会话、产出第一问）。面板 MUST NOT 把「待开考」当作合法开始的终态。若缺少主题或自定义主题为空，系统 SHALL 拒绝开始并在面板上显示错误，MUST NOT 静默成功，MUST NOT 注入面试官。

#### Scenario: Valid start records config only
- **WHEN** 用户已选预设主题「MySQL 索引与优化」和难度「中级」，并点「开始模拟面试」，且 Host 注入 API 可用
- **THEN** 系统保存该主题与难度，面板进入进行中，当前 DSH 对话中出现面试官第一问。本场景名称沿用上一刀；行为已改为记录配置并启动双会话

#### Scenario: Start without a topic is rejected
- **WHEN** 用户未选择任何预设主题且自定义主题为空，并点「开始模拟面试」
- **THEN** 系统不保存有效开考配置，面板展示可见错误，DSH 对话内容不变，不注入面试官

#### Scenario: Start with empty custom topic is rejected
- **WHEN** 用户选了自定义主题但输入为空白，并点「开始模拟面试」
- **THEN** 系统拒绝开始并在面板展示可见错误，不注入面试官
