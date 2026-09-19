## Why

八股陪练的卡片流已经能切题、进详情，但生成中仍达不到产品图：看守把「打分」和「下一张 brief」绑在同一次返回，面板看不到「已评、下一张还在生成」；生成中也没有「下一张卡片正在生成」的卡槽，当前卡像整页卡住。本刀按 `interview-panel-flat-live-update.png` 补看守中间态与生成中 UI。

## What Changes

- 进行中面板改为**卡片流态 / 完整详情态**，视觉与交互对齐：
  - [interview-panel-flat-card-flow.png](../../../docs/product-design/interview-panel-flat-card-flow.png)
  - [interview-panel-flat-detail.png](../../../docs/product-design/interview-panel-flat-detail.png)
  - [interview-panel-flat-live-update.png](../../../docs/product-design/interview-panel-flat-live-update.png)
- **BREAKING**（相对 `interview-cards`「一次只展示一张卡，滑动可选」）：流态一次突出当前卡，上一题/下一题露出局部；左右滑动为切题主操作，上一题/下一题按钮保留为辅助。点击当前卡或「查看完整内容」进入同面板详情态，不新开页面、不遮挡宿主对话。
- 详情态仍可左右滑动或点按钮切到相邻题的完整内容；「返回卡片流」回到流态。题干与开卷要点在详情中展开；作答、对照、评分用面板内折叠区，待答时为空占位，已评后可展开回看。
- 生成中必须是**下一张卡正在生成**的卡片形槽（白底圆角、橙色转圈、「正在准备下一题…」或刷新时「正在生成本题…」），对照 [interview-panel-flat-live-update.png](../../../docs/product-design/interview-panel-flat-live-update.png)。当前卡（编号、题干、作答/对照/评分）MUST 仍可读可切，MUST NOT 整页冻成唯一表面，MUST NOT 用整卡转圈替换当前题。
- 看守 `watchCoachTurn` **响应形状不变**（无 `briefing` 字段、无第三种 `CardStatus`），但已评且甲板没有 pending 时 MUST 先返回已评甲板；下一张开卷要点在随后一次 `updated` 再追加。打分与下一张 brief MUST NOT 塞进同一次返回。
- 不改双会话、编号规则、评分算法、落盘路径、结束本轮、入口选题/难度清单。不增加聊天输入、提示/跳过、计时器、场级仪表盘、手册预览。
- 入口待开考视觉改到与进行中同一套 DSH 构图，对齐 [interview-panel-flat-entry.png](../../../docs/product-design/interview-panel-flat-entry.png)：顶栏「关闭 / 模拟面试 / ×」，保留搜索、分类、预设、自定义、三档难度、「开始模拟面试」。旧图 `doc/entry-panel.png` 不再作为本刀视觉真源。
- 入口加入个人品牌 **xerina**：副标题 `xerina · 八股专项陪练`，页脚 `coach by xerina`，标题旁圆形动漫头像。头像真源是 [xerina-avatar.png](../../../docs/product-design/xerina-avatar.png)；入口及相关状态产品图、前端实现 MUST 圆形裁剪该文件，MUST NOT 另绘或再生成一张脸。这是推广署名，MUST NOT 变成聊天人设页或运营后台。
- 进行中顶栏与卡片流/详情/生成中三张图对齐（关闭、模拟面试、进行中 · 八股专项、结束本场、刷新本题）。
- 已有功能点的其余状态图也落在 `docs/product-design/`（首题单卡、已评详情、自定义主题、缺主题错误、开始中、打开失败、进行中错误、结束回入口）。`design.md` 的状态表是前端实现真源。产品图错字以 spec 文案为准。

## Capabilities

### New Capabilities

- （无。不新增产品能力，只改已有教练表面怎么看、怎么切。）

### Modified Capabilities

- `interview-cards`：进行中甲板从「一次一张长页」改为卡片流 + 同面板详情；滑动为必达；生成中是下一张卡槽且旧卡不冻死。
- `interview-session`：第一问出现后面板仍为进行中并落到 `Q1`，开卷要点在详情态完整可见；流态展示当前卡摘要与进入详情的入口，而不是把整卡长页一次性铺开。
- `interview-follow-up`：新题要点未就绪时必须露出下一张卡生成中；已评甲板与下一张 brief 分两次返回；刷新本题、切回已评卡在流态与详情态都成立。
- `interview-entry`：入口视觉改对照 `docs/product-design/interview-panel-flat-entry.png`（该图已贴入 `xerina-avatar.png` 真源）；露出 xerina 署名与同一头像文件；选题/难度/开始的信息架构不变。

## Impact

- `frontend/src/features/session/`：重做 `InProgressPanel`（流态舞台、详情分区、滑动/按钮、下一张卡形生成中槽）；CSS Modules，不引入 UI 库。
- `backend/src/services/watch-coach-turn.ts`：已评且无 pending 时先落盘返回，下一拍再 brief/追加；等待下一问期间重试打分。不改 `WatchCoachTurnRequest` / `WatchCoachTurnResponse` 字段。
- `frontend/src/features/entry/`：入口壳、xerina 署名与圆形动漫头像按新图重画；主题/难度/开始控件与校验不变；进行中仍由同一面板树切到 `InProgressPanel`。把头像文件从 `docs/product-design/xerina-avatar.png` 拷入 frontend 静态资源，`img` 引用该文件做圆形裁剪，MUST NOT 内联几何字标或另绘脸。
- `frontend/src/infra/dsh/`：overlay 仍 `position: fixed`；不改 Slot 挂载。滑动事件不得关掉抽屉、不得变成聊天表面。
- `shared/`：甲板字段不动。卡片短标题若教练未给，前端用 `questionBrief` 截断，不为此改评分/落盘契约。
- 单测覆盖流态/详情/切卡/已评先返回/生成中下一张卡槽；交付仍以本机 DSH Desktop 实机为准。
- 不修改 DSH 核心。`REQUIREMENTS.md` 3.1 视觉表补入口图与 xerina 署名；卡片化方向本身不改。
