## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」。**实现者必须亲自打开本机已在使用的 DSH Desktop**，走完：答完至少 `Q1` → 点「结束本场」→ 可见用户气泡仅为「结束面试」→ 考场最后一句为「此番 xerina 伴君至此，言尽于此，愿君面试顺遂，前程可期」且不再提问 → 该轮目录有 `qa.md` 与 `summary.md` → 不换会话再开一轮，旧笔记仍在。否则整份 tasks 视为未完成，6.3 不得勾选，不得归档。

**禁止划进本刀：** 摘人设；`REQUIREMENTS.md` 3.1 卡片流/详情态/滑动切卡；笔记文件的面板预览；Markdown 编辑器；自建聊天；`node:fs`；把本刀回填进已归档 change。产品文档 3.1 整段不得删改。

## 1. 共享契约

- [x] 1.1 在 `shared/` 增加结束本轮请求/响应（`sessionId`、`qaPath`、`summaryPath`）、短句「结束面试」、收尾原文与导演词常量、轮次目录/索引类型与错误码；从 `index.ts` 导出。`npm run build --workspace=interview-dsh-shared` 通过
- [x] 1.2 Typert 与 frontend remote 同步 `endRound` / `armRoundClose` / `clearRoundClose`（名称以实现为准）。`rg` 确认 `features/` 不写分数字段、不引入手册预览组件，Client 收尾 `prompt` 正文为「结束面试」

## 2. 一轮一目录

- [x] 2.1 `archiveDirFor` 改为 `.dsh-interview/<sessionId>/round-<n>-<slug>/`，会话根写 `in_progress` | `ended` 索引。单测：第一轮 round-1；第二轮新目录且不覆盖上一轮 `session.json`
- [x] 2.2 `writeDeck` / `readDeck` 走当前轮目录；已结束轮 `loadDeck` 不得当成进行中。假 fs 单测覆盖进行中恢复与结束后不恢复
- [x] 2.3 兼容旧的 `.dsh-interview/<id>/session.json` 进行中读盘；新写只走 `round-*`。单测：旧根目录仍可读，不迁 `study/`

## 3. 结束：停看守、短句收尾、两份笔记

- [x] 3.1 Host `armRoundClose` 挂收尾 `systemPrompt.section`（导演词不进气泡）；Client 再 `prompt`「结束面试」。单测：可见种子为短句；导演词含固定末句且不要再问；失败映射可见错误
- [x] 3.2 `renderQaMarkdown` / `renderSummaryMarkdown`：`qa.md` 纯标题汇总全部问；`summary.md` 只放总结。单测：`Q1`+`Q1.1` 两节；无 `<details>`；待作答空分；总结失败仍写出 `qa.md`
- [x] 3.3 会话 B 生成本轮总结只写 `summary.md`；写两份文件用既有 `fs.resolve` + `workspace-write`。单测：总结不进考场文本；写失败 `persist_unavailable` 且收尾仍被调用
- [x] 3.4 前端「结束本场」先注入再短句 `prompt` 再写笔记，停看守，成功回入口，MAY 展示两份路径。测试：回入口可再开始；无预览、无 3.1 滑动/详情态

## 4. 同会话再开一轮

- [x] 4.1 `startExamRoom`：`current ===` 已记录考场 id 且索引 `ended` 时不 `create`、不重挂人设，先 `clearRoundClose` 再发新一轮开口 prompt。单测：不调用 `create`；开口含新主题且声明上一轮已结束；有 clear
- [x] 4.2 当前不是该考场时仍 `create({ workspaceId })` 并挂分组。单测：编码对话开始仍 create，不 attach 到 `current` 编码会话
- [x] 4.3 新一轮 `briefCoach` 写出新的 `Q1` 到新 round 目录。单测：两轮 `Q1.md` 路径不同；看守忽略「结束面试」与收尾句

## 5. 架构与仓库验证

- [x] 5.1 更新 `docs/architecture/ARCHITECTURE.md`：结束不卸角；导演词走 Host section；可见种子为「结束面试」；落盘 `qa.md`/`summary.md`；开考可复用已结束考场。与代码一致。**不得改** `docs/product/REQUIREMENTS.md` 的 3.1
- [x] 5.2 `npm test`、`npm run lint`、`npm run build` 通过；frontend 有改则重建 `dist/client`。`rg` 确认无手册预览页、无 3.1 新滑动详情实现、收尾 `prompt` 不用导演词全文

## 6. 桌面验收

- [x] 6.1 重载本机已装插件（正在使用的 Desktop 0.x，不新建 profile）
- [x] 6.2 勾选前确认未实现 3.1 卡片流、未做面板笔记预览
- [x] 6.3 **【验收门槛】** 按第 0 节在 GUI 走完结束收尾、两份笔记落盘、同会话再开一轮。勾选前填写：

```
Desktop 版本：0.2.17（profile web，link 本仓库，未新建 profile）
工作区路径：/Users/jiang/Item/Java/xerina-atlas
考场 sessionId：session-f0ed506d-2028-4625-ab9d-e52b672a986f
可见用户气泡是否仅为「结束面试」：是（无导演词全文）
收尾最后一句是否原文：是（此番 xerina 伴君至此，言尽于此，愿君面试顺遂，前程可期）
本轮 qa.md 路径：.dsh-interview/session-f0ed506d-2028-4625-ab9d-e52b672a986f/round-1-Redis-并发与缓存/qa.md
本轮 summary.md 路径：.dsh-interview/session-f0ed506d-2028-4625-ab9d-e52b672a986f/round-1-Redis-并发与缓存/summary.md
qa.md 是否含全部问且无 details：是（Q1 已评、Q2 待作答；无 <details>）
summary.md 是否可当笔记导入：是（# 本轮总结 + 表现与建议，独立 md）
再开一轮是否同一 sessionId：是（round-2-Spring-Spring-Boot，面板仍挂同一考场对话）
上一轮 qa.md / summary.md 是否仍在：是
是否摘人设 / 是否 3.1 卡片流 / 是否面板预览：否 / 否 / 否
```
