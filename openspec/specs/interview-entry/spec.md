# interview-entry Specification

## Purpose

为候选人提供 DSH 右侧八股专项入口：在不离开当前对话、不自建聊天页的前提下选择主题与难度，并校验「开始模拟面试」所需配置。

## Requirements

### Requirement: This change is not accepted without a real DSH desktop test
本 capability 的入口打开验收仍以真实 DSH 桌面端为准。合法「开始模拟面试」的会话行为由 `interview-session` 约束；入口侧 MUST 在桌面端确认开始不再停在「待开考」。

#### Scenario: Desktop smoke test is the gate
- **WHEN** 用 `dsh plugin add` 把本组合包装进 DSH 桌面端正在使用的 profile，启动桌面端，打开新会话首页，点输入栏「面试」（「AI 优化」旁）
- **THEN** 当前对话不变，右侧出现入口面板，可见「选择面试主题」「面试设置」「开始模拟面试」，圆形头像为 `xerina-avatar.png` 的裁剪，并可见 `xerina · 八股专项陪练` 与 `coach by xerina`，结构对照 `docs/product-design/interview-panel-flat-entry.png`

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，或仅在浏览器里打开入口预览，尚未在 DSH 桌面端点过「面试」
- **THEN** 本 requirement 仍为未满足

#### Scenario: Start is verified on desktop without injecting interviewer
- **WHEN** 在 DSH 桌面端入口面板选好主题与难度并点「开始模拟面试」，且 Host 注入 API 可用
- **THEN** 面板不再停留在仅展示已保存配置的待开考状态，而是进入 `interview-session` 所定义的进行中（对话出现第一问、面板出现本题要点）。本场景名称沿用上一刀；行为已改为必须注入面试官

### Requirement: Entry panel shows xerina personal brand
入口待开考面板 SHALL 露出个人品牌 **xerina**，作为推广署名而不是新功能。系统 MUST 展示副标题 `xerina · 八股专项陪练`，MUST 在面板底部展示 `coach by xerina`，MUST 在标题旁展示圆形裁剪的动漫头像。头像 MUST 使用 `docs/product-design/xerina-avatar.png` 这一文件本身（实现时拷入 frontend 静态资源后仍是同一图像），MUST NOT 另绘、再生成或用几何 `x` 字标顶替。头像与署名 MUST NOT 替换「模拟面试」产品名，MUST NOT 改成其它人名或其它形象，MUST NOT 可点击成聊天、人设页或外链。视觉结构 MUST 对齐 `docs/product-design/interview-panel-flat-entry.png` 的入口壳（关闭、模拟面试、×、真源头像、主题区、设置区、开始按钮）；产品图里的错字或 OCR 噪声 MUST NOT 覆盖下列功能文案真源：「选择面试主题」「面试设置」「开始模拟面试」以及既有预设主题名。

#### Scenario: Brand is visible on the entry surface
- **WHEN** 用户打开入口面板且尚未开始
- **THEN** 可见圆形裁剪的 `xerina-avatar.png`、`xerina · 八股专项陪练` 与 `coach by xerina`，标题仍为「模拟面试」

#### Scenario: Avatar is the source file not a lookalike
- **WHEN** 入口面板渲染头像
- **THEN** `img`（或等价资源）指向由 `docs/product-design/xerina-avatar.png` 拷入的同一文件，MUST NOT 使用另一张生成脸或内联几何字标

#### Scenario: Brand does not add a chat surface
- **WHEN** 入口面板展示 xerina 署名
- **THEN** 面板内仍无消息列表、输入框或气泡；署名与头像不可点击成独立聊天或外链运营页

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

### Requirement: User can choose a topic from presets or a custom value
系统 SHALL 提供可搜索、可点选的预设主题，并 SHALL 允许用户输入自定义主题。预设清单 MUST 覆盖：MySQL 索引与优化、Redis 并发与缓存、消息队列、分布式系统设计、Spring / Spring Boot、Java 并发编程、数据库实战场景，并 MUST 提供自定义主题入口。入口壳的视觉对照 `docs/product-design/interview-panel-flat-entry.png`；主题名以本段清单为准，MUST NOT 被产品图里的错字替换。系统 MAY 展示分类标签；分类标签 MUST NOT 把其他预设从列表中移除。搜索框 MUST 按名称过滤预设；自定义主题入口在搜索时仍可见。

#### Scenario: Select a preset topic
- **WHEN** 用户点选「MySQL 索引与优化」
- **THEN** 该主题成为当前选中主题，开始前配置中的主题等于该预设名

#### Scenario: Search presets
- **WHEN** 用户在主题搜索框输入「Redis」
- **THEN** 可见预设中至少包含「Redis 并发与缓存」，不匹配的预设不再作为可选结果突出展示

#### Scenario: Custom topic
- **WHEN** 用户点选「自定义主题」并输入非空文本「Kafka 分区与副本」
- **THEN** 出现可编辑输入，当前选中主题为该自定义文本，且可用于开始前校验

#### Scenario: Switching from custom to a preset
- **WHEN** 用户已输入自定义主题，再点选「MySQL 索引与优化」
- **THEN** 当前选中主题改回该预设名，开始前配置不再使用那段自定义文本

### Requirement: User can choose difficulty without changing the question bank
系统 SHALL 让用户在初级、中级、高级三者中选择恰好一个难度。默认 MUST 为中级。难度在本 change 只作为入口配置保存；系统 MUST NOT 因难度切换而改用另一套预写死题。

#### Scenario: Default difficulty
- **WHEN** 入口面板首次打开且用户尚未改难度
- **THEN** 当前难度为中级

#### Scenario: Change difficulty
- **WHEN** 用户点选「高级」
- **THEN** 开始前配置中的难度为高级

### Requirement: Entry MUST NOT collect duration or a folder
入口面板 MUST NOT 提供时长或倒计时选择，MUST NOT 在开始前要求用户选择保存文件夹。

#### Scenario: No duration control
- **WHEN** 用户查看入口面板
- **THEN** 界面中不存在时长选项（例如 30 分钟）或倒计时设置

#### Scenario: No folder picker before start
- **WHEN** 用户准备点「开始模拟面试」
- **THEN** 系统不弹出文件夹选择，也不把选目录当作开始的前置条件

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

### Requirement: Packaged bundle declares Host and Client halves
系统 SHALL 以 DSH 组合包交付：根 `package.json` 声明 `dsh.bundle` 与 `dsh.client`（`./client` 导出浏览器半侧），并提供 `cordis.patch.yml`。此声明是桌面端安装的前置，不替代上一节的实机打开验收。

#### Scenario: Manifest is installable
- **WHEN** 检查根包 `package.json` 与 `cordis.patch.yml`
- **THEN** 存在 `dsh.bundle`、`dsh.client` 与 `./client` 导出，可供 `dsh plugin add` 使用
