## Why

开不开卡已经由代码执行五种覆盖结果，但这五档仍捆在教练那一次生成式对照补全里，定档偏慢。探针证明 Jev 能加快定档，子问链上的 `reask` / `next` 可重复；未开启或调用失败时，必须仍走今天的对照 JSON，不能把默认用户变成残缺功能。

## What Changes

- 定档拆成两条可配置路径：**Jev 定档**与**现有对照补全**。对照评语、已覆盖/未覆盖、五维始终由宿主当前默认模型生成。
- **默认不开启 Jev。** 入口可折叠配置；开关与密钥固定写入工作区 `.dsh-interview/config/jev.json`（不进各轮 `round-*` 档案）。打开时 MUST 填齐密钥，缺项不得当作已开启。
- 未开启、必要信息不全、超时、鉴权失败、或返回无法映射到五档时，一律走今天的对照 `coverage`。这是正式回退，不是面板错误。
- 发给 Jev 的 `state` 是同一知识点从 `Q1` 到当前 `Qn.m` 的完整题链（题干、意图、要点、各轮作答、已定档），不是单句作答。
- 代码硬性：同一知识点最多 3 次 `reask`，再多强制 `next` 换方向；不把这条上限只写在提示词里。
- 面试官开口仍不等定档。不拦截发送、不把定档结果 `session.prompt` 回考场。
- **BREAKING**（相对主规格「插件不得另配模型」）：允许为定档这一件事可选接入 Jev；开口、要点、知识链、评语仍只用宿主当前默认模型。

## Capabilities

### New Capabilities

- `interview-jev-coverage`：可选开启 Jev 做五档定档；默认关闭；开启必填密钥；失败或未开启回退现有对照 `coverage`；整条知识链作为判断上下文；三次 `reask` 后强制换方向；不指挥面试官开口。

### Modified Capabilities

- `interview-session`：会话 A 与教练生成仍用宿主当前默认模型；可选定档只用于五种覆盖结果；未开启时五种覆盖仍由会话 B 对照补全给出。
- `interview-cards`：已开启且 Jev 命中时，开卡不必等对照评语；未开启或回退时仍等同一次对照 JSON 定档。同一知识点 `reask` 满 3 次后开下一个 `Qn`，不再开 `Qn.m`。

## Impact

- `shared/`：配置读写契约只暴露 `enabled` 与「是否已有密钥」；密钥不得出现在面板响应、卡片或 `session.json`。
- `backend/src/data/`：固定路径 `.dsh-interview/config/jev.json`，经 Host `ctx.fs` 读写。
- `backend/src/services/`：看守只依赖定档端口；开启且命中时开卡真源是 Jev（再加 reask 盖帽）；否则只用对照 `coverage`。
- `backend/src/infra/`：Jev HTTP 只出现在适配层；是否发请求由 data 层读到的文件决定。文件 `enabled=false` 时不发 Jev 请求。
- `frontend/`：入口折叠配置（开关 + 密钥）；开始不依赖它；进行中最多「判断已加速」。GET 配置不得带回密钥明文。
- `docs/architecture/ARCHITECTURE.md`、`docs/product/REQUIREMENTS.md`：写明可选定档、默认关闭、固定配置路径、回退对照。
- 验收：单测锁住「默认关走对照、开启且命中走 Jev、失败回退、满 3 次 reask 强制 next」；Desktop 至少核默认关闭路径。
