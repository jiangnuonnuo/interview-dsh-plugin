## Why

「结束本场」已经能停看守、收尾、落盘，但收尾把整段导演词当成用户气泡发出去；所谓手册又把问答和总结揉进一份带 HTML 折叠的 `handbook.md`，面板几乎看不见，也不适合直接导入笔记库。结束的是这一轮，不是人设，也不是这条考场会话。

## What Changes

- 点「结束本场」：先停看守，Host 把收尾导演词注入 `systemPrompt.section`（不进气泡），再对考场 **`prompt` 一次**短句「结束面试」。面试官最后一句必须是：`此番 xerina 伴君至此，言尽于此，愿君面试顺遂，前程可期`。不得再提问，不得把对照/五维/建议念进气泡。考场可见用户气泡 MUST NOT 出现导演词。
- **不摘人设**，不切换会话，不删对话。新一轮开口前 MUST 摘掉收尾段。
- 过程存储照旧：`cards/<编号>.md` + `session.json`。
- 结束时写两份纯 Markdown、可供笔记库导入的文件：`qa.md`（本轮全部问答汇总）与 `summary.md`（本轮总结）。不再把这两件事揉进 `handbook.md`。失败可见。
- **BREAKING**（相对 `interview-cards` 落盘）：档案按「考场会话 + 轮次」分目录，新轮不得覆盖旧轮的 `session.json` / `cards/` / `qa.md` / `summary.md`。
- **BREAKING**（相对 `interview-session` 开考）：当前会话已是本插件考场且本轮已结束时，再点开始必须复用该会话，不得 `create` 新对话。从非考场的项目对话开始仍新开考场并挂项目分组。
- 面板结束后面回入口，可再开一轮；结束成功可展示 `qa.md` 与 `summary.md` 相对路径。本 change **不**做这两份文件的面板预览，**不**改 3.1 卡片流/详情态，**不**引入 Markdown 编辑器。

## Capabilities

### New Capabilities

- `interview-round-close`：结束本轮（短句触发、隐藏导演词、固定收尾句、停看守、写 `qa.md`/`summary.md`、同会话再开一轮）；人设保持；笔记文件只落盘。

### Modified Capabilities

- `interview-cards`：进行中甲板与逐题文件改到当前轮目录；结束轮次后该目录冻结，新轮另起目录。
- `interview-session`：已结束的考场会话上再开始时复用该会话并开口新一轮第一问；不得注入编码对话、不得摘人设。
- `interview-follow-up`：结束本轮后看守必须停；「结束面试」种子、收尾句与其后闲聊 MUST NOT 建成新卡；允许且仅允许这一次结束 `prompt`，且该次可见正文只为「结束面试」。

## Impact

- `shared/`：轮次、结束请求/响应（`qaPath` / `summaryPath`）、短句常量、导演词常量、错误码；Typert 同步。
- `backend/`：`data/` 一轮一目录 + `qa.md` / `summary.md`；`services/` 收尾导演词、本轮总结（会话 B，只写 `summary.md`）、结束态；`infra/dsh/` Host 挂/摘收尾 section、`fs` 写两份笔记。领域层不 import Host SDK。
- `frontend/`：`onEnd` 先 `armRoundClose` 再短句 `prompt` 并写笔记；复用当前考场会话再开始前摘收尾段。`features/` 不 import Client SDK。不改卡片流 UI、不做文件预览页。
- `docs/architecture/ARCHITECTURE.md`：结束不卸角；收尾导演词走 Host section；可见种子为「结束面试」；落盘按轮次写 `qa.md`/`summary.md`；开考可复用考场会话。
- `docs/product/REQUIREMENTS.md`：3.1 卡片化方向保持不动；本刀不实现 3.1。
- 验收：本机 DSH Desktop 实机。`npm test` 不能单独过关。
