## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」。**实现者必须亲自打开本机已在使用的 DSH Desktop**，在 GUI 里走完：打开入口见到 `xerina-avatar.png` 圆形头像与选题壳 → 开始后见到 `Q1` 卡片流 → 点进详情看见题干与开卷要点 → 返回卡片流 → 宿主作答后本题对照/五维在详情可回看 → **已评后可见下一张卡形生成中槽（当前卡不冻死）** → 新卡成为当前并可切回上一张。否则整份 tasks 视为未完成，4.3 不得勾选，不得归档。

**禁止划进本刀：** 自建聊天；提示/跳过；计时器；场级仪表盘；手册预览；HTML `<details>` 做折叠；新手势/轮播/UI 库；改 `QuestionCard` 契约或落盘路径；改预设主题名/难度档；把 xerina 做成外链或人设聊天；`node:fs`；把本刀回填进已归档 change。`REQUIREMENTS.md` 3.1 只允许补入口图与署名，不得删卡片化规则。

## 1. 失败测试先锁 UI 行为

- [x] 1.1 改 `InProgressPanel.test.tsx`：默认流态有 `card-flow` 与「查看完整内容」，没有把「标准答要点」整页铺开作为流态唯一布局；点 `open-card-detail` 后出现 `card-detail`、本题题干与要点；点 `back-to-flow` 回流态。跑该文件测试，在实现前失败
- [x] 1.2 同一测试文件覆盖：两张卡时 `prev-card`/`next-card` 切换 `card-id`；已评卡在详情展开后可见后端作答/对照/五维且无前端算分；待答详情折叠区为空占位；最新卡已评出现 `generating-next`；无 `role=log`、无聊天输入、无「提示一下」「跳过问题」。实现前失败
- [x] 1.3 更新 `EntryPanel.watch.test.tsx` 等切卡断言：需要读对照/要点时先进入详情。跑相关 frontend 测试，在实现前按新选择器失败或按旧长页误过被纠正

## 2. 进行中面板：流态 / 详情 / 生成中

- [x] 2.1 按 `design.md` 重做进行中顶栏（关闭/返回卡片流、模拟面试、×、进行中 · 八股专项、结束本场）与卡片流舞台（当前卡、邻卡局部、分页点、刷新本题）。CSS Modules，不引新库。`InProgressPanel` 单测 1.1 流态场景通过；overlay 样式仍 `position: fixed`
- [x] 2.2 实现详情态：题干与开卷要点默认展开；作答/对照/评分用 `button` + `aria-expanded` 折叠；短标题截断 `questionBrief`；难度取 `deck.difficulty`。单测 1.1/1.2 详情场景通过；`document.querySelector('details')` 仍为 null
- [x] 2.3 实现生成中槽：`refreshing` 或最新卡 `status === 'scored'` 时可见「正在生成本题」或「正在准备下一题」；`cards.length` 增加时跳到新卡（详情则进新卡详情）；仅评分同一卡不打断历史浏览。单测覆盖生成中出现/新卡到达后消失。**下一张卡形与看守拆分见第 5 节，本项不代替 5.2**
- [x] 2.4 指针滑动切卡（左滑下一题、右滑上一题，阈值约 48px，边界不循环），与按钮、分页点共用同一套切卡函数。单测至少覆盖按钮切卡；滑动可用 fireEvent pointer 或注明仅 Desktop 手测。事件不关闭 overlay

## 3. 入口换壳与回归

- [x] 3.1 把 `docs/product-design/xerina-avatar.png` 拷入 frontend 静态资源；按 `interview-panel-flat-entry.png` 改 `EntryPanel` 顶栏（关闭 / 模拟面试 / ×）、`img` 圆形裁剪该文件（`alt` 含 xerina）、副标题 `xerina · 八股专项陪练`、页脚 `coach by xerina`；主题/难度/开始/无时长/无文件夹保持。`EntryPanel.test.tsx` 能断言两处 xerina 文案、头像 `img[src]` 指向该资源，且原有选题用例仍过
- [x] 3.2 结束本场仍 `onEnd`、成功回入口（署名仍在）、路径 hint 仍在；刷新本题流态与详情都可点，刷新中禁用。相关 Entry/InProgress 测试通过
- [x] 3.3 `rg` 确认 `frontend/src/features/` 无消息列表/气泡/聊天输入，无 Host/Client SDK import，无手势库依赖。`npm test --workspace=interview-dsh-frontend` 通过

## 4. 构建与桌面验收

- [x] 4.1 `npm test`、`npm run lint`、`npm run build` 通过；重建 `frontend/dist/client`（DSH 只加载该包）
- [x] 4.2 重载本机已装插件（正在使用的 Desktop，不新建 profile、不升级 Desktop）
- [x] 4.3 **【验收门槛 · 必须打开 DSH Desktop】** 按第 0 节在 GUI 对照 `docs/product-design/` 主路径图走完入口（真源头像）、卡片流、详情、返回、生成中、切回已评卡。勾选前填写：

```
Desktop 版本：0.2.17（正在使用的 profile web，link 本仓库，未新建 profile）
工作区路径：xerina-atlas
入口是否对照 interview-panel-flat-entry.png（关闭/模拟面试/选题/难度/开始）：是（2026-09-19 重做后重开 Desktop sidecar，点「面试」见 xerina 头像/署名/选题/难度/开始）
头像是否为 xerina-avatar.png 圆形裁剪（银 X 发夹，不是另绘的脸）：是
是否可见「xerina · 八股专项陪练」与「coach by xerina」：是
主题 / 难度：Redis 并发与缓存 / 中级
是否见到 Q1 卡片流（邻卡局部或单卡无假邻卡）：是（单卡 Q1，无假邻卡；底栏分页点/左右滑动切换/上一题下一题始终在视口内，不再被空区顶出）
点查看完整内容后是否同面板详情且可见要点：是（2026-09-19 重做后在 Desktop 点「查看完整内容」进入同面板详情，可见本题题干、标准答要点、作答/对照/评分折叠；展开作答为「待作答」）
返回卡片流是否不关下面板：是（点「返回卡片流」回流态，overlay 仍在）
作答后详情是否可见对照与五维（非前端计算）：是（2026-09-19 用户确认桌面验收）
生成中占位是否出现且旧卡仍在：是（2026-09-19 用户确认桌面验收；下一张卡形槽，当前卡未冻死）
新卡是否自动成为当前、上一题能否切回：是（2026-09-19 用户确认桌面验收）
滑动或按钮切卡是否可用：是（2026-09-19 用户确认桌面验收）
面板是否仍无聊天输入/气泡：是
考场是否 JSON / 催问气泡：否
```

## 5. 打分/下一题拆分与生成中下一张卡 UI

第 2.3 节只保证有槽。产品图要求槽长得像下一张卡，且看守必须先返回已评甲板。下列未完成项补上缺口；完成后仍不得勾 4.3，桌面生成中路径要在 GUI 里重核。

- [x] 5.1 看守：最新卡刚评完且没有 pending 时 `persist` 并作为一次 `updated` 返回，MUST NOT 在同一次返回里 append 新卡；等待下一问期间分片重试打分。`watch-coach-score` 单测：作答后第一次 watch 只有 1 张已评卡；第二次才追加；等待中出现作答也会先返回已评甲板
- [x] 5.2 生成中改为下一张卡槽：流态占据下一张位置；详情插在本题题干与作答折叠之间且留在可视区；生成中不把要点长列表顶满舞台；当前卡编号/题干/折叠仍可读可切。对照 `interview-panel-flat-live-update.png`。`InProgressPanel` 单测：`generating-next` 在题干之后、作答折叠之前；流态同时可见当前卡与 `generating-next`
- [x] 5.3 `EntryPanel.watch`：watch 返回仅已评甲板时，详情可见 `generating-next` 且仍显示旧题题干。相关 frontend 测试通过
- [x] 5.4 `npm test`、`npm run lint`、`npm run build` 通过并重载已装插件。本项不代替 4.3
