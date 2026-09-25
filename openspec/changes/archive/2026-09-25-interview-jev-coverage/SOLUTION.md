# 方案：可选 Jev 定档（默认关闭）

本文件是 `interview-jev-coverage` 的方案真源摘要。行为合同仍以 `specs/` 为准，技术选择以 `design.md` 为准。图在 `diagrams/`。

## 1. 现在的架构问题

考生发送后，宿主立刻让**会话 A**开口。插件拦不住。

卡片开不开卡，要等会话 B 一次生成式对照：JSON 里同时带 `coverage`、评语、五维。定档慢，JSON 还可能解析失败。

Jev 只回答固定五档，适合做开卡真源；它不能写评语，也不能替面试官说话。探针表明：必须把 `Q1` 到当前 `Qn.m` 整条题链交给它；五档里「缺口大」仍会偶发误判；**同一知识点最多 3 次 reask** 必须由代码强制换方向。

## 2. 目标架构

三层：

1. **表面**：考场对话（开口）+ 教练面板（卡片）+ 入口可折叠配置（默认关闭）
2. **插件领域**：看守编排；定档端口；对照补全；reask 次数盖帽
3. **模型**：DSH 默认模型（开口 / 要点 / 评语）+ 可选 Jev（`coverage`）

依赖仍是 `frontend/features → shared ← backend/entrypoints → services → data`，Jev 的 HTTP 只许出现在 `backend/src/infra/`。

图：

- [分层](diagrams/01-architecture.svg)
- [双链路](diagrams/02-dual-path.svg)
- [发送后时序](diagrams/03-sequence.svg)

## 3. 两条路径

配置在入口「卡片判断」：**开关默认关**。开启必须填密钥。

**路径 A（已开启且命中）**

作答 → 整条知识链交给 Jev `choice` → 代码做最多 3 次 `reask` 盖帽 → 立刻留卡 / 开 `Qn.m` / 开 `Qn` → DSH 模型后写评语与五维（忽略 JSON 里的 `coverage`）。

**路径 B（默认、文件未开启、密钥不全、或 Jev 失败）**

作答 → 现有一次对照 `complete` → JSON 的 `coverage` 开卡（同样走 reask 盖帽）。对用户不是错误。

面试官在两条路径之外已经开口。定档结果不得 `session.prompt` 回考场。`.dsh-interview/config/jev.json` 里 `enabled` 不是 true 时，不得因环境变量自动走路径 A。

## 4. 接入

必要信息：API 密钥。接口固定 `POST https://api.typesafe.ai/v1/systemone`，`model=jev-1.13.0`，2s 超时。非法五档即回退。

密钥只进工作区固定文件 `.dsh-interview/config/jev.json`，不进各轮 `round-*`，不进 `cards/*.md`，不进前端日志。环境变量不是运行时真源。

## 5. UI（入口，不是考场）

主题和难度仍是开始面试的主路径。其下增加一截可折叠的「卡片判断」：

- 默认：开关关，说明关闭时行为与现在完全一样
- 打开开关未填密钥：该区域可见失败，开始按钮仍可用，本场走路径 B
- 填写密钥后先测连通：通过才写入 `.dsh-interview/config/jev.json`，之后复用；密钥框不回显明文，显示「已保存密钥」
- 连通失败：不写文件，配置区可见失败，本场走路径 B，开始按钮仍可用
- 点开始且开关已开：先走同一套连通测试
- 进行中顶栏最多一句「判断已加速」；卡片上仍不出现五档英文名和 Jev

评审稿：`diagrams/ui-entry-coverage.html`

## 6. 硬性上限

同一 `Qn` 链上已落档 `reask` 满 3 次后，下一张卡不论模型给什么档，代码都按 `next` 换方向。第三次 `reask` 仍允许开 `Qn.m`。

## 7. 探针

`probe/jev-coverage-probe.mjs` 用于回归，密钥只进环境变量。实现以规格与 `design.md` 为准，不再用「五档 10/10」挡住落地。
