## MODIFIED Requirements

### Requirement: This change is not accepted without a real DSH desktop test
本 change SHALL 在真实 DSH 桌面端完成验收后才算交付。`npm test`、`npm run build`、Vite 预览或仅浏览器打开面板 MUST NOT 单独构成本 change 通过。未在桌面端点过「开始模拟面试」并见到第一问时，本 capability MUST 视为未交付，MUST NOT 归档。

#### Scenario: Desktop start is the gate
- **WHEN** 用 `dsh plugin add` 把本组合包装进 DSH 桌面端正在使用的 profile，打开当前对话，从输入栏打开「面试」，选好主题与难度并点「开始模拟面试」
- **THEN** 当前对话中出现面试官的第一问（开场可含主题与难度），右侧面板进入进行中并在卡片流展示编号为 `Q1` 的卡片；进入该卡详情后可见本题标准答要点

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，尚未在 DSH 桌面端完成上一场景
- **THEN** 本 requirement 仍为未满足，本 change 不得标为完成

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
