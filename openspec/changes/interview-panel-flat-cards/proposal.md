## Why

八股陪练的数据甲板、开卷要点、交卷即评和结束本轮已经可用，但右侧教练面板仍是一次一张的纵向长页。产品方向（`REQUIREMENTS.md` 3.1）要求轻量平面折叠卡片：卡片流快速切题、同面板详情、生成中旧卡仍在。上一刀刻意没做这块视觉，现在要按 `docs/product-design/` 把已有功能的教练表面改完，才能按图开发前端。

## What Changes

- 进行中面板改为**卡片流态 / 完整详情态**，视觉与交互对齐：
  - [interview-panel-flat-card-flow.png](../../../docs/product-design/interview-panel-flat-card-flow.png)
  - [interview-panel-flat-detail.png](../../../docs/product-design/interview-panel-flat-detail.png)
  - [interview-panel-flat-live-update.png](../../../docs/product-design/interview-panel-flat-live-update.png)
- **BREAKING**（相对 `interview-cards`「一次只展示一张卡，滑动可选」）：流态一次突出当前卡，上一题/下一题露出局部；左右滑动为切题主操作，上一题/下一题按钮保留为辅助。点击当前卡或「查看完整内容」进入同面板详情态，不新开页面、不遮挡宿主对话。
- 详情态仍可左右滑动或点按钮切到相邻题的完整内容；「返回卡片流」回到流态。题干与开卷要点在详情中展开；作答、对照、评分用面板内折叠区，待答时为空占位，已评后可展开回看。
- 面试官已出下一问但开卷要点未就绪时，旧卡保持可见，流态/详情展示「正在生成本题」（或等价文案），要点完成后追加新卡并自动定位到最新卡。
- 本 change **只改教练面板呈现**。不改双会话、编号、评分、落盘、结束本轮、入口选题/难度清单。不增加聊天输入、提示/跳过、计时器、场级仪表盘、手册预览。
- 入口待开考视觉改到与进行中同一套 DSH 构图，对齐 [interview-panel-flat-entry.png](../../../docs/product-design/interview-panel-flat-entry.png)：顶栏「关闭 / 模拟面试 / ×」，保留搜索、分类、预设、自定义、三档难度、「开始模拟面试」。旧图 `doc/entry-panel.png` 不再作为本刀视觉真源。
- 入口加入个人品牌 **xerina**：副标题 `xerina · 八股专项陪练`，页脚 `coach by xerina`，标题旁圆形动漫头像。头像真源是 [xerina-avatar.png](../../../docs/product-design/xerina-avatar.png)；入口及相关状态产品图、前端实现 MUST 圆形裁剪该文件，MUST NOT 另绘或再生成一张脸。这是推广署名，MUST NOT 变成聊天人设页或运营后台。
- 进行中顶栏与卡片流/详情/生成中三张图对齐（关闭、模拟面试、进行中 · 八股专项、结束本场、刷新本题）。
- 已有功能点的其余状态图也落在 `docs/product-design/`（首题单卡、已评详情、自定义主题、缺主题错误、开始中、打开失败、进行中错误、结束回入口）。`design.md` 的状态表是前端实现真源。产品图错字以 spec 文案为准。

## Capabilities

### New Capabilities

- （无。不新增产品能力，只改已有教练表面怎么看、怎么切。）

### Modified Capabilities

- `interview-cards`：进行中甲板从「一次一张长页」改为卡片流 + 同面板详情；滑动为必达；生成中占位不丢旧卡。
- `interview-session`：第一问出现后面板仍为进行中并落到 `Q1`，开卷要点在详情态完整可见；流态展示当前卡摘要与进入详情的入口，而不是把整卡长页一次性铺开。
- `interview-follow-up`：新题要点未就绪时必须露出生成中状态且保留旧卡；刷新本题、切回已评卡在流态与详情态都成立。
- `interview-entry`：入口视觉改对照 `docs/product-design/interview-panel-flat-entry.png`（该图已贴入 `xerina-avatar.png` 真源）；露出 xerina 署名与同一头像文件；选题/难度/开始的信息架构不变。

## Impact

- `frontend/src/features/session/`：重做 `InProgressPanel`（流态舞台、详情分区、滑动/按钮、生成中占位）；CSS Modules，不引入 UI 库。
- `frontend/src/features/entry/`：入口壳、xerina 署名与圆形动漫头像按新图重画；主题/难度/开始控件与校验不变；进行中仍由同一面板树切到 `InProgressPanel`。把头像文件从 `docs/product-design/xerina-avatar.png` 拷入 frontend 静态资源，`img` 引用该文件做圆形裁剪，MUST NOT 内联几何字标或另绘脸。
- `frontend/src/infra/dsh/`：overlay 仍 `position: fixed`；不改 Slot 挂载。滑动事件不得关掉抽屉、不得变成聊天表面。
- `shared/`：甲板字段原则上不动。卡片短标题若教练未给，前端用 `questionBrief` 截断，不为此改评分/落盘契约。
- 单测覆盖流态/详情/切卡/生成中；交付仍以本机 DSH Desktop 实机为准。
- 不修改 DSH 核心。`REQUIREMENTS.md` 3.1 视觉表补入口图与 xerina 署名；卡片化方向本身不改。
