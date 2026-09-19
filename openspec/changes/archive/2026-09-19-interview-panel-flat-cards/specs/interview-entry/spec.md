## ADDED Requirements

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

## MODIFIED Requirements

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
