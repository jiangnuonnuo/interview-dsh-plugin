## Why

多轮陪练已经能开考、追问、并把面板对齐当前待答问，但教练表面仍是「一张会被覆写的要点快照」。候选人答完看不到本题对照和五维分数，追问会冲掉上一题，工作区也没有可调出的逐题记录。产品要的是开卷对照与留档：每题一张卡、交卷当时评分、Q1 / Q1.1 可左右切回看，并落入当前工作区磁盘。

## What Changes

- 进行中面板从单题快照改成**问题卡片甲板**：出场顺序一张卡，编号 `Q1`、`Q1.1`、`Q2`…；默认停在最新卡，可左右切换历史卡。
- **下一题 / 追问仍自动出开卷要点**（题一出现就写进该卡）。对照和五维属于**刚作答的那张卡**，在宿主提交回答后立刻由会话 B 生成，MUST NOT 等到整场结束，MUST NOT 由前端算分。
- 追问是新卡，不得把上一题改掉。知识链编号由教练判定；失败时回退为上一题的追问（`Qn.m+1`）或新的 `Q{n+1}`，不得丢卡。考场气泡仍是自然语言，MUST NOT 输出编号或 JSON。
- **BREAKING**（相对 `interview-follow-up` / `interview-session` 的进行中快照）：看守成功不再用下一题要点整份替换上一题；`InProgressSnapshot` 的五维不再永远为 `null` 占位。契约改为整场甲板（卡片列表 + 当前卡）。
- 每张卡写入当前工作区 `study/interview-dsh/<开考时间>-<主题>/`：`session.json` 为机器真源，`cards/Q1.md` 等为人读副本。题目出现即建文件，评分后改同一文件。关 overlay 再打开必须从磁盘恢复。
- 开考时 Client 必须把当前工作区的 `cwd` 或 `workspaceId` 传给 `sessions.create`。空参数会落到 Desktop `process.cwd()`，不得当作工作区落盘路径。
- 「结束本场」仍只停看守并回到入口。本 change **不**卸角，**不**做场级长简报（简报 = 可调出的逐题评分卡），**不**做提示/跳过/时长/倒计时。

## Capabilities

### New Capabilities

- `interview-cards`: 问题卡片甲板、Q1/Q1.1 编号、交卷即评（对照 + 八股五维）、左右切卡、工作区逐题落盘与重开恢复。

### Modified Capabilities

- `interview-session`: 第一问创建 `Q1` 卡（开卷要点立刻可见）；进行中状态改为甲板而非单题快照；开考必须带工作区目录。
- `interview-follow-up`: 新待答问**追加新卡并切过去**，已评卡保持不变；混合讲评仍只 brief 抽出的待答问；「刷新本题」只重 brief **当前待答卡**的开卷要点，不得抹掉已评卡的对照与分数。

## Impact

- `shared/`：甲板、卡片、编号、对照、可空或已填的五维分数、落盘错误码；Typert 同步。
- `backend/`：`data/` 以磁盘为真源；`services/` 配对「待答卡 ↔ 新人类作答」、编号判定、对照评分 prompt；`infra/dsh/` 读人类作答文本、Host `inject` 增加 `fs`，`writeText` 写入工作区。领域层不 import Host SDK。
- `frontend/`：进行中视图一次一张卡 + 左右切换；`features/` 不 import Client SDK，无消息列表/输入框/气泡。评分只渲染后端字段。
- `docs/architecture/ARCHITECTURE.md`：补上卡片甲板、交卷即评、`fs` 落盘、开考必须带 cwd。
- 依赖：仅 Desktop 已带 Host/Client SDK；无新密钥、无自建模型、无选文件夹。
- 验收：本机 DSH Desktop 实机。仓库测试不能单独过关。
