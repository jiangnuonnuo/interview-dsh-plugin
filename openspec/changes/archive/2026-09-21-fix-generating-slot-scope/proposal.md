## Why

下一张卡预生成时，面板把生成中当成整页状态：详情把「正在准备下一题…」插进当前浏览卡并藏掉要点；流态虽把转圈画在邻卡槽，但仍可能挡住或禁用历史 peek、「查看完整内容」和切题。已 brief 过的卡因此无法当普通卡回看。需要把预生成收成挂在「正在生成的那张卡」上的异步任务，流态和详情都不锁整页。

## What Changes

- 预生成 MUST 是卡槽级异步任务：loading 只属于尚未就绪的下一张卡（或正在被刷新的那张待答卡）。MUST NOT 把流态或详情打成整页生成中模式，MUST NOT 因此禁用切卡或打开详情。
- 生成中槽（`generating-next`，「正在准备下一题…」）MUST 只出现在流态最新真卡右侧的邻卡 peek。MUST NOT 写入任何已 brief 卡的详情正文，MUST NOT 盖住或拦截历史邻卡、当前卡、「查看完整内容」。
- 流态在下一张预生成时，当前真卡与历史真卡 MUST 仍可点：上一题 / 邻卡 peek / 分页点 / 「查看完整内容」。点历史卡后 MUST 能进入该卡详情并完整阅览。
- 用户切到或停留在已生成卡（含最新已评卡）的详情时，MUST 完整展示该卡编号、题干、**标准答要点**、作答 / 对照 / 评分。MUST NOT 用生成中槽替换要点列表。
- 「刷新本题」的「正在生成本题…」MUST 只作用在被刷新的那张待答卡；MUST NOT 出现在其它历史卡上，MUST NOT 禁止切到历史卡或打开其详情。
- **BREAKING**（相对现行 `interview-cards`「详情态把生成中槽插在题干与作答折叠之间、并为此隐藏标准答要点」）：详情态不再把下一张预生成状态画进当前卡。产品图 `interview-panel-flat-live-update.png` 仍作流态邻卡槽对照，不再作为「详情正文插入生成中」或「整页锁死」的依据。
- 不改 `watchCoachTurn` 契约，不改「已评先返回、下一拍再 brief」的预生成时序，不回填已归档的 `interview-panel-flat-cards`，不改编号、评分、落盘、双会话、入口。

## Capabilities

### New Capabilities

- （无。这是既有生成中槽的作用域修正。）

### Modified Capabilities

- `interview-cards`：生成中槽只绑定正在生成的下一张卡；流态与详情在预生成期间仍可切历史卡并打开详情。
- `interview-follow-up`：等待下一张开卷要点时，历史卡与当前已评卡仍可完整回看；生成中只作为下一张卡槽出现，且不锁交互。

## Impact

- `frontend/src/features/session/InProgressPanel.tsx` 与 `card-view.ts`：生成中可见性按卡拆开；流态生成中槽不得拦截历史 peek / 当前卡详情入口。
- `frontend/src/features/session/InProgressPanel.test.tsx`、`card-view.test.ts`、`frontend/src/features/entry/EntryPanel.watch.test.tsx`：覆盖历史详情无生成中、最新已评详情仍有要点、流态预生成时可点上一题和「查看完整内容」。
- 后端 `watch-coach-turn`、shared 甲板字段、Host remote 形状不改。
- 交付以本机 DSH Desktop 实机回看历史卡为准；不修改 DSH 核心。
