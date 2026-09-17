## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」，也没有「推理会通过就算完」。**实现者必须亲自打开本机已在使用的 DSH Desktop，在 GUI 里答完第一问并见到下一问与面板新要点；若出现同一气泡先点评再提问，面板必须对齐待答问。否则整份 tasks 视为未完成，5.3 不得勾选，不得归档。**

勾选 5.3 之前必须已经在 **已打开的 Desktop 窗口** 里发生（禁止只跑命令或读代码）：

1. 启动本机已装 DSH Desktop（`/Applications` 里正在用的那份，不是新建 profile、不是升级 Desktop 来过关）
2. `dsh plugin add` 装进该 Desktop 正在使用的 profile 并重载
3. 点输入栏「面试」，选主题与难度，点「开始模拟面试」，见到第一问与面板要点
4. 在宿主输入框提交对本题的回答（不要在面板里打字）
5. 同一条考场对话出现下一问；面板要点换成该新题；面板内无消息列表 / 聊天输入 / 气泡
6. 至少一轮「同一气泡先点评/揭晓再提问」：面板题干摘要对应文末待答问，而不是点评主题
7. 对话里没有多出一条插件写入的催问用户气泡；面试官气泡不是 JSON
8. 把下面「验收记录」字段全部写进 5.3 注释；缺任何一项不得勾选

下列 **不得** 代替 5.3：`npm test` / `npm run build`、代码审查、人设「会追问」的推断、上一刀第一问桌面记录、仅三轮纯提问的桌面记录、Vite、浏览器预览、`doc/entry-panel-mock.html`、让用户代验后自己勾选。本会话打不开 Desktop 则停在 5.3 未勾选并写明阻塞。

1.x–5.2、6.x 记录的是已经落地的看守与 overlay。第 5 轮混合回合使 5.2 / 5.3 重新打开。不得用自建聊天或二次 `session.prompt` 勾选 5.3。不得把本刀回填进 `interview-start-dual-session`。第 7 节未完成前不得写实现以外的「已经过关」。

## 1. 共享契约

- [x] 1.1 在 `shared/` 增加 `WatchCoachTurnRequest` / `WatchCoachTurnResponse`（`updated` 带 snapshot / `unchanged` / 失败）和错误码 `follow_up_failed`，从 `shared/src/index.ts` 导出；`npm run build --workspace=interview-dsh-shared` 通过
- [x] 1.2 确认快照仍无前端可写分数字段；`rg` 评分相关字段只作为后端只读展示结构（可空占位）

## 2. 本场状态与教练用例

- [x] 2.1 在 `backend/src/data/` 增加本场内存 store（`sessionId`、主题、难度、`lastQuestionText`、最新 snapshot）。单测：写入后可读，未知 session 为空
- [x] 2.2 第一次 `briefCoach` 成功后写入 store；教练 user 文案改为「面试官当前问题」且不含面试官角色模板。单测：prompt 含当前题干、不含「扮演面试官」
- [x] 2.3 实现 `watchCoachTurn`：无本场记录返回 `follow_up_failed`；时限内无新题返回 `unchanged`；最新助手题干变化则 brief 并 `updated`；brief 失败返回错误且 store 仍保留上一快照。`npm test --workspace=interview-dsh-backend` 覆盖上述分支
- [x] 2.4 回归：backend 的追问路径不调用 `session.prompt` / 不向对话 append 教练文本。测试或 `rg` 锁定适配层没有把教练输出写进气泡的方法

## 3. Host 适配

- [x] 3.1 在 `backend/src/infra/dsh/coach.ts` 改为读 **最后一条** 非空助手消息；`status === 'running'` 时不把半句当新题（缺 status 则连续两拍文本稳定才算）。单测：两条助手消息时返回第二条；running 时不返回半句
- [x] 3.2 把 `watchCoachTurn` 挂到 `interviewEntry`，同步 `backend/src/typert.host.ts` 与 `frontend/src/infra/dsh/remote.ts`。边界测试：领域层不 import Host SDK；UI 注册仍不在 backend
- [x] 3.3 查不到读最新题干的符号时标 `TODO` 并映射 `follow_up_failed` / `inject_unavailable`，禁止空 catch

## 4. 进行中面板看守

- [x] 4.1 `EntryPort` 增加 `watchCoachTurn`；内存假实现可在第二次调用返回新 snapshot。测试用假实现，运行时 `ctx.remote`，禁止 `fetch('/api/...')`
- [x] 4.2 进行中视图挂载后循环 `watchCoachTurn`：`updated` 替换题干与要点；失败展示 `message` 且保留上一快照；卸载后不再 `setState`。测试：成功刷新、失败保留旧快照、卸载后忽略迟到结果。评分区仍是 `—`
- [x] 4.3 回归：`features/` 无 `chat` 目录、不 import Client SDK；DOM 无消息列表/聊天输入/气泡；Client 顶层 `inject` 仍为 `['slots', 'remote']`

## 5. 架构、构建、桌面验收

- [x] 5.1 更新 `docs/architecture/ARCHITECTURE.md`：后续轮次只看守不 prompt；教练读最后一条助手消息。与代码一致
- [x] 5.2 `npm test`、`npm run lint`、`npm run build` 通过；若 frontend 源码有改则重建 `dist/client`（若仓库跟踪该产物）。混合回合失败测试转绿之前本项保持未勾选
- [x] 5.3 **【验收门槛 · 必须打开 DSH Desktop】** 实现者亲自启动本机已装 Desktop，重装插件，在 GUI 点「开始模拟面试」，在宿主输入框作答，亲眼见到下一问与面板要点更换，并至少覆盖一轮「点评 + 新问」且面板对齐待答问（无自建聊天、无催问用户气泡、无考场 JSON）。勾选前 MUST 在本条下填写完整验收记录；空注释、「应该可以」、只贴单测日志、只写三轮纯提问均不得勾选

```
验收失败（2026-09-16，使用者实机）：
- 已打开本机 DSH Desktop：是
- 判定：不通过。5.3 收回勾选。
- 1 开始后点关闭/收回面板，考场对话记录从当前视图消失
- 2 宿主已出现下一问，进行中面板仍停在上一题要点
- 3 overlay 抽屉盖住对话列（壁纸与气泡叠在面板下面），不是让出右栏
- 此前 sidecar 自动化不得再当作通过
```

```
验收记录（2026-09-17，三轮纯提问，不能代替第 5 轮）：
- 已打开本机 DSH Desktop：是
- Desktop 版本 / bundle id：0.2.17 / com.yeagoo.dsh-desktop
- 实际加载的 harness / sidecar：App 内 bundled `@deepseek-ai/dsh` 0.1.1-rc.2；重启后 sidecar `127.0.0.1:61915`
- 主题 / 难度：Redis 并发与缓存 / 高级
- 第一问题干摘要：先更新数据库再删缓存 vs 先删缓存再更新数据库的并发问题
- 宿主输入框实际提交的回答：不知道，下一题
- 下一问题干摘要：秒杀场景 Redis 库存预扣减超卖风险
- 面板要点是否已换成新题：是（Q2 题干「秒杀等高并发场景下Redis库存预扣减引发超卖…」）
- 第三问（使用者此前对不上的那一轮）：对话为缓存穿透/击穿/雪崩定义与应对；面板题干「缓存穿透、击穿、雪崩三者的定义区分及生产环境最有效应对方案」。会话 3 轮 · 3 步
- 自建聊天或催问用户气泡：无（仅开考那一条 prompt + 候选人自己的跳过回答）
- 对话列与面板：对话可见，面板在右侧 details 列，未盖住气泡
```

```
验收失败（2026-09-17，第 5 轮混合回合）：
- 已打开本机 DSH Desktop：是
- 判定：不通过。5.3 再次收回勾选。
- 对话当前待答问：联合索引
- 面板仍展示：InnoDB 页分裂后物理数据存储状态及对磁盘 I/O 的影响
- 根因（仓库现行测试）：`readLatestQuestion` 返回整段「点评 + 待答问」，教练 brief 跟着讲评走
- 三轮纯提问记录不得复用为本刀通过
```

```
验收记录（2026-09-17，抽出 + 刷新本题落地后）：
- 已打开本机 DSH Desktop：是
- Desktop 版本 / bundle id：0.2.17 / com.yeagoo.dsh-desktop
- 实际加载的 harness / sidecar：App 内 bundled `@deepseek-ai/dsh` 0.1.1-rc.2；重启后 sidecar `127.0.0.1:54691`；模型 step-3.7-flash
- 主题 / 难度：MySQL 索引与优化 / 高级
- 第一问题干摘要：InnoDB 索引底层数据结构，以及二级索引为何选 B+ 树而非 B 树或 Hash
- 宿主输入框实际提交的回答：不知道，Hash 更快吧，下一题
- 下一问题干摘要：联合索引 (a, b, c) 在 WHERE b=1 AND a=1 AND c>10 时是否生效、优化器如何处理条件顺序与最左前缀
- 混合回合：同一气泡先纠正 Hash/B+（并标【本题】），再问联合索引；面板题干与要点对齐联合索引最左前缀，未停留在 Hash / B+ 讲评
- 面板要点是否已换成新题：是（会话 2 轮 · 2 步）；进行中面板可见「刷新本题」；评分区仍为 —
- 自建聊天或催问用户气泡：无（仅开考那一条 prompt + 候选人自己的跳过回答）；考场气泡不是 JSON
- 对话列与面板：对话可见，面板在右侧 details 列
```

## 6. 实机失败后的修复

- [x] 6.1 overlay 打开时用 `ctx.get('layout').openDetails()` 让对话列让出右栏；关闭时 `closeDetails`，并用 `sessions.open` 钉住考场会话。禁止注册 `details` 槽。单测覆盖 open/close
- [x] 6.2 进行中快照不随 overlay 卸载丢失；关闭后重开仍是进行中并恢复看守。测试：卸载再挂载仍显示上一快照
- [x] 6.3 抽屉不得用铺满 overlay 层的可点背景盖住对话；宽度对齐官方 details 列。修完后按 5.3 重新做 Desktop GUI 验收，三项都过才能勾 5.3
- [x] 6.4 看守读「最后一条人类用户之后」的面试官题干，优先 `session.events`（含 text-delta）；新题出现后 `whenIdle` 再 brief；教练补全期间若已出现更新的题则改 brief 新题。单测覆盖三轮。Desktop 连问到第三问时面板与对话必须一致，才能勾 5.3

## 7. 当前待答问与手动刷新（第 5 轮之后，测试先行）

实现前先保持 `backend/tests/coach-runtime.test.ts` 中「uses only the pending question when the interviewer lectures then asks」失败：现行 `readLatestQuestion` 必须仍返回整段点评+问句。不要先改产品代码再补测试。不要在考场气泡里输出 JSON。

- [x] 7.1 为抽出规则补纯函数单测，先红后绿：`【本题】`；讲评无问句+文末一问；问句后跟无问号议程（八轮第 2 轮形态）；列表两问算同一待答问；无问句则整段。`npx jest tests/pending-question.test.ts`（或同等路径）覆盖这些例子
- [x] 7.2 把抽出接到 `readLatestQuestion` / `awaitNewQuestion`；`lastQuestionText` 存抽出后的待答问。`coach-runtime` 混合回合测试转绿；纯问句三轮回归仍通过
- [x] 7.3 教练 prompt 只针对当前待答问，并写明忽略点评/揭晓。`coach-brief.service.test.ts` 断言 system/user 含该约束，且 user 在混合文本场景下只含待答问
- [x] 7.4 人设要求纠正上一问时短说、然后只留一个待答问；可用 `【本题】`；**禁止**考场 JSON / `questionBrief`。`interviewer-persona.service.test.ts` 覆盖约束且仍不含教练 JSON 字段
- [x] 7.5 `WatchCoachTurnRequest` 增加可选 `force`；`force === true` 时不比较指纹、按当前待答问 brief。`watch-coach-turn.test.ts`：指纹未变时普通 watch 仍 `unchanged`，`force` 则 `updated`。同步 `typert.host.ts` 与 `remote.ts`
- [x] 7.6 进行中面板增加「刷新本题」，经 port 调 `watchCoachTurn({ force: true })`；失败保留旧快照；卸载丢弃结果。`EntryPanel.watch.test.tsx` / `InProgressPanel` 测试覆盖点击与 loading；DOM 仍无聊天输入/气泡
- [x] 7.7 更新 `docs/architecture/ARCHITECTURE.md`：brief 的是当前待答问，不是整段点评；与代码一致
- [x] 7.8 `npm test`、`npm run lint`、`npm run build` 通过后勾 5.2；frontend 有改则重建 `dist/client`（若仓库跟踪该产物）
- [x] 7.9 按第 0 节在本机 DSH Desktop 重做 GUI 验收，写完 5.3 记录（含混合回合）后才能勾 5.3。八轮链路实测只证明方案可行，抽出未落地前不得勾 5.3。三轮纯提问旧记录不得勾选

```
链路实测（2026-09-17，方案可行性，不是 5.3 通过）：
- Desktop 0.2.17 / sidecar 127.0.0.1:61915 / step-3.7-flash
- 主题 / 难度：MySQL 索引与优化 / 高级；会话 8 轮 · 8 步
- 作答：含糊部分正确、跳过、哈希跑题、页分裂博客、加锁填料、没影响、覆盖索引乱猜
- 混合回合是常态；第 2 轮待答问在中间、文末是议程；第 5 轮对话已问页分裂时面板曾停在哈希
- 判定：Host 抽待答问（先跳过文末无问号段）+ 刷新本题 行得通；考场 JSON 不需要
```
