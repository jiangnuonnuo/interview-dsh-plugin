## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」。**实现者必须亲自打开本机已在使用的 DSH Desktop**，在 GUI 里走完：`Q1` 开卷 → 宿主作答后本题对照与五维出现 → 追问出新卡且 `Q1` 仍可切回带分数 → 工作区 `study/interview-dsh/` 有 `session.json` 与 `cards/Q1.md`。否则整份 tasks 视为未完成，7.3 不得勾选，不得归档。

勾选 7.3 之前必须已经在 **已打开的 Desktop 窗口** 里发生：

1. 启动本机已装 DSH Desktop（正在用的那份，不是新建 profile、不是升级 Desktop）
2. `dsh plugin add` 装进该 Desktop 正在使用的 profile 并重载
3. 点「面试」，选主题与难度，点「开始模拟面试」，见到 `Q1` 卡与开卷要点
4. 在宿主输入框作答（不要在面板里打字），同一张 `Q1` 出现对照与五维
5. 下一问出现后面板切到新卡；左切回 `Q1` 分数仍在
6. 至少一轮同一气泡先点评再提问：新卡对齐待答问；对话无催问用户气泡、无考场 JSON
7. 工作区该场目录可见 `session.json` 与 `cards/*.md`；关掉面板再打开，「面试」仍能恢复甲板
8. 把 7.3 验收记录字段写全

下列 **不得** 代替 7.3：`npm test` / `npm run build`、代码审查、人设推断、上一刀追问记录、Vite、浏览器预览、`doc/entry-panel-mock.html`。打不开 Desktop 则停在 7.3 未勾选。不得卸角、不得自建聊天、不得 `node:fs` 绕过、不得把本刀回填进已归档 change。

## 1. 共享契约

- [x] 1.1 在 `shared/` 用 `InterviewDeck` / `QuestionCard`（含 `id`、开卷、作答、对照、`scores` 为后端只读 `number | null`）替换单份进行中快照；`briefCoach` / `watchCoachTurn` 成功返回甲板；增加错误码 `persist_unavailable`。从 `shared/src/index.ts` 导出；`npm run build --workspace=interview-dsh-shared` 通过
- [x] 1.2 Typert 与 frontend remote 同步甲板响应；`rg` 确认 `features/` 没有写入分数字段。构建 shared 后 frontend 类型能编过

## 2. 编号与开卷建卡

- [x] 2.1 实现 `cardId` 校验与回退（合法 `Q1` / `Q1.1`；占用则回退；缺省追问 `Qn.m+1` 或新 `Qn+1`）。单测覆盖合法、非法、占用、`Q1→Q1.1`、`Q1.1→Q1.2`
- [x] 2.2 开卷 brief JSON 可带 `cardId`/`relation`；`briefCoach` 写出 `Q1` 待答卡。单测：第一问生成一张 `Q1` 卡且五维为空；prompt 不含面试官角色模板
- [x] 2.3 `watchCoachTurn` 在待答问变化时**追加**新卡并切到新卡，已评卡不变。单测：两卡共存；失败时旧卡不丢

## 3. 交卷即评

- [x] 3.1 Host 读最后一条非插件人类可见文本；创建卡时记下 `seedUserText`。单测：开场种子不等于作答；其后一条人类文本可被读出
- [x] 3.2 待答卡遇到新作答则会话 B 生成对照 + 八股五维，写回同一张卡。单测：成功已评；缺维/非法分失败且卡仍待答、开卷保留；前端路径不算分
- [x] 3.3 评分与开卷失败互不影响：新题 brief 失败不抹已评分；评分失败不删开卷要点。`npm test --workspace=interview-dsh-backend` 覆盖

## 4. 工作区落盘

- [x] 4.1 `WorkspaceArchive` 端口 + 相对路径 `study/interview-dsh/<time>-<slug>/`；`writeDeck` 写 `session.json` 与 `cards/<id>.md`（出现即建，评分改同一文件）。单测不碰真实 Desktop：用假 fs 断言路径与内容
- [x] 4.2 Host 用 `session.header.cwd` + `ctx.fs.resolve`/`writeText` 实现端口；缺 `fs` 或 cwd 返回 `persist_unavailable` 且面板可见。边界测试：services 不 import Host SDK；禁止 `node:fs`
- [x] 4.3 `briefCoach`/`watchCoachTurn` 成功后写盘；提供读盘恢复。单测：假档案读回两张卡；写失败返回错误且内存甲板仍在

## 5. 开考 cwd 与 Host inject

- [x] 5.1 Client `startExamRoom` 从 `sessions.list` 快照取当前 `cwd`（或 `workspaceId`）再 `create`；拿不到则失败不注入。测试：有 cwd 则传入；无 cwd 不调用空 `create()`
- [x] 5.2 Host `inject` 增加 `fs`；若顶层声明导致 apply 失败则改为 `ctx.get('fs')` 探测，并在适配层 `TODO`。`rg` 确认 `inject` 不含未用服务；Client 顶层仍是 `['slots','remote']`

## 6. 面板切卡

- [x] 6.1 `InProgressPanel` 展示当前卡：编号、开卷、作答/对照/五维、上一题/下一题。测试：待答卡五维为空；已评卡显示后端分数；切卡不出现消息列表/输入框/气泡
- [x] 6.2 `examPanelState` 存整份甲板；watch `updated` 替换甲板；关闭 overlay 再打开从 Host 读盘恢复（Host 不可用则模块缓存）。测试：恢复两张卡；卸载后忽略迟到 watch
- [x] 6.3 「刷新本题」只重 brief 当前待答卡开卷；「结束本场」仍清甲板停看守。测试：刷新不改已评卡；结束可重新开始

## 7. 架构、构建、桌面验收

- [x] 7.1 更新 `docs/architecture/ARCHITECTURE.md`：甲板、交卷即评、`fs` 落盘、开考必须带 cwd。与代码一致
- [x] 7.2 `npm test`、`npm run lint`、`npm run build` 通过；frontend 有改则重建 `dist/client`
- [x] 7.3 **【验收门槛 · 必须打开 DSH Desktop】** 按第 0 节在本机 GUI 走完 `Q1` 评分、新卡、切回、落盘、重开恢复（无自建聊天、无催问气泡、无考场 JSON、无选文件夹）。勾选前 MUST 填写完整验收记录

```
Desktop 版本：0.2.17（/Applications/DSH Desktop.app，com.yeagoo.dsh-desktop）
harness / sidecar：bundled bin.js web PID 87523 监听 127.0.0.1:53962；主进程 deepseek-harness-desktop PID 87511；sidecar PID 87521。未用 Vite / 新建 profile / 升级 Desktop。
工作区路径：/Users/jiang/Item/plugin/interview-dsh
主题 / 难度：MySQL 索引与优化 / 中级（八股专项，模型 step-3.7-flash）
Q1 题干摘要：覆盖索引（Covering Index）定义及与回表查询的性能对比
Q1 作答后五维是否可见：是。宿主输入作答后同一张 Q1 出现对照（已覆盖/未覆盖）与五维 4.5 / 4.5 / 3.5 / 4 / 5。面试官首轮点评生成曾「已停止」，分数由会话 B 独立写出。
新卡编号（Q1.1 或 Q2…）：Q1.1（联合索引 idx_abc 三条查询是否 Using index；待作答、开卷要点已出）
左切 Q1 分数是否仍在：是（上一题切回 Q1，五维数字仍在）
是否混合讲评+待答问：是。同一气泡「好，我们继续。」后接【本题】联合索引覆盖判断；面板切到 Q1.1 对齐该待答问。对话无催问用户气泡、无考场 JSON。
落盘目录与文件：study/interview-dsh/20260918-1042-MySQL-索引与优化/{session.json, cards/Q1.md, cards/Q1.1.md}
关闭再打开是否恢复：是。关 overlay 再点「面试」，恢复进行中甲板（当前 Q1.1 待作答），上一题仍能切回已评 Q1。
考场是否 JSON / 催问气泡：否
```
