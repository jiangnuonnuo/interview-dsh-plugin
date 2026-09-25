## 1. 固定配置文件

- [x] 1.1 在 `shared/` 增加 Jev 配置契约：`enabled` 默认 `false`；读响应只有 `enabled` 与 `apiKeySet`；写请求可带 `apiKey`。面板与甲板类型不得出现密钥字段。`npm run build --workspace=interview-dsh-shared` 通过
- [x] 1.2 在 `backend/src/data/` 实现配置仓储，固定相对路径 `.dsh-interview/config/jev.json`，形状 `{ "enabled": false, "apiKey": "" }`。经 Host `ctx.fs.resolve` 再读写，禁止 `node:fs`。`sessionArchiveRoot('config')` 必须拒绝，避免与配置目录撞车。单测：缺文件视为关闭；坏 JSON 视为关闭；路径不是 `round-*`
- [x] 1.3 保存规则：`enabled=true` 且无新密钥、文件里也没有旧密钥 → 不把 enabled 写成 true，配置区可见失败。`enabled=true` 且密钥框空、但文件已有密钥 → 保留原密钥只改开关。关闭开关保存 → `enabled=false` 且保留已有密钥。没有工作区 `cwd` 或 Host fs 失败 → `persist_unavailable`，不得改用 `node:fs`。单测覆盖这四条
- [x] 1.4 `rg` 确认 `session.json`、`cards/`、`qa.md`、`summary.md` 的写盘路径不包含 `config/jev.json` 的密钥字段

## 2. 入口开关与回填

- [x] 2.1 入口「面试设置」下增加默认折叠的「卡片判断」：开关默认关、密钥为密码框。打开入口时从配置文件回填开关与「已保存密钥」，不回填明文。前端测试：不填密钥仍能点开始；打开开关但无密钥时配置区可见失败且开始仍可用；渲染树无五档英文名
- [x] 2.2 独立 remote `getJevConfig` / `saveJevConfig`，不要把密钥挂进 `acceptEntryConfig` 或 `startInterview`。GET 只回 `enabled` 与 `apiKeySet`。前端测试：保存成功后再次打开仍是开启且密钥框为空（已保存）；`features/` 日志不含密钥
- [x] 2.3 文件 `enabled=false` 时即使进程环境有 `TYPESAFE_API_KEY` 也不发 Jev。单测：零 HTTP
- [x] 2.4 开启写入前先测 Jev 连通：HTTP 200 才写文件；失败返回 `jev_unreachable` 且不落盘。点开始且开关为开时先走同一套探测。单测：探测失败零写入；前端连通失败仍能开始

## 3. 定档端口与回退

- [x] 3.1 在 `backend/src/services/` 增加定档端口（五档或 `unavailable`），领域文件不 `fetch`、不读 `jev.json`、不读环境变量。单测：无端口或 `unavailable` 时，开卡仍只用 `parseCoachScoreOutput` 的 `coverage`
- [x] 3.2 适配层读配置文件：仅 `enabled===true` 且 `apiKey` 非空才发 HTTP；领域层只调定档端口。已开启且端口命中时，开卡真源是端口结果（再加盖帽），对照 JSON 的 `coverage` 丢弃。单测：假端口返回 `deepen`、对照 JSON 为 `miss` 时仍开 `Qn.m`
- [x] 3.3 定档失败（超时、非法键）且对照 JSON 有合法 `coverage` 时走回退。单测：不出现「未开启 Jev」错误码，卡片按对照档开或留
- [x] 3.4 两边都没有合法 `coverage` 时仍返回现有 `coverage_unavailable`，作答留在原卡。单测锁住不编造档
- [x] 3.5 未开启时不拆并行，一次 `complete` 同时定档与评分。单测：与现有 `watch-coach-score` 锚点（引导两轮、`Qn.m`、`next`）仍过

## 4. Jev 适配与题链上下文

- [x] 4.1 在 `backend/src/infra/` 用 `fetch` 实现定档：未开启或无密钥不发请求；否则 `POST https://api.typesafe.ai/v1/systemone`，`model` 为 `jev-1.13.0`，`choice` 五键与 `AnswerCoverage` 一致。单测用假响应，不引入新 npm 包
- [x] 4.2 `state` 包含当前卡编号、已 reask 次数，以及 `Qn…Qn.m` 每张卡的题干、层、意图、要点、各轮作答、已定档。单测：当前卡为 `Q1.2` 时请求体同时含 `Q1` 与 `Q1.1`
- [x] 4.3 请求 2s 超时并带可取消的 `AbortSignal`。单测：取消后不再把迟到的 choice 当成定档成功；HTTP 4xx/非法 JSON/`AbortError` 返回 `unavailable`
- [x] 4.4 适配层日志与抛错文案不含 Bearer/密钥。`rg` 确认面板响应与 `shared/` 展示类型无 `apiKey`

## 5. 三次 reask 盖帽

- [x] 5.1 领域层统计本条 `Qn` 链上已落档为 `reask` 的次数；满 3 次则把本张卡的开卡档改成 `next`。单测：已有 2 次 `reask` 时第三次仍开 `Qn.m`；已有 3 次时即使端口返回 `reask`/`deepen`/`miss` 也开下一个 `Qn`
- [x] 5.2 盖帽在对照回退路径上同样生效。单测：未开启 Jev 时对照 JSON 已有 3 次 `reask` 后再给出 `reask`，仍开下一个 `Qn`

## 6. 并行开卡与对照正文

- [x] 6.1 Jev 命中 `deepen` / `reask` / `next` 且对照评语尚未返回时即可进入现有 `appendNewCard`。单测：`complete` 仍 pending 时甲板已按该档准备新卡关系
- [x] 6.2 Jev 命中 `miss` / `wide_gap` 且未触达盖帽时不追加新卡、不进入「正在准备下一题」。单测：评语后到仍叠在原卡
- [x] 6.3 对照补全成功后把评语和五维写回原卡，忽略 JSON 里的 `coverage`。单测：原卡 comment/scores 来自 `complete`，`coverage` 仍是 Jev（或盖帽后）那一档
- [x] 6.4 Jev 命中但 `complete` 失败：开卡按 Jev，对照走现有 `coach_unavailable`，不编造评语。单测覆盖

## 7. 面板隔离

- [x] 7.1 进行中顶栏仅在配置已开启且至少一次 Jev 命中后最多显示「判断已加速」。前端测试：卡片详情仍无 Jev、无 miss 等档名
- [x] 7.2 `rg` 确认追问/定档路径没有把 coverage 或 Jev 结果 `session.prompt` 进考场；`features/` 仍无聊天表面

## 8. 文档

- [x] 8.1 更新 `docs/architecture/ARCHITECTURE.md`：可选定档端口默认关闭；配置文件 `.dsh-interview/config/jev.json`；失败回退对照 `coverage`；开口仍不等定档；三次 reask 盖帽
- [x] 8.2 更新 `docs/product/REQUIREMENTS.md`：入口可折叠卡片判断，默认关闭，开启需密钥并写入上述固定路径，不是开考必填
- [x] 8.3 `SOLUTION.md` 与 `diagrams/` 与实现对齐，写明配置路径不进 round 档案

## 9. 仓库验证

- [x] 9.1 `npm test`、`npm run lint`、`npm run build` 通过
- [x] 9.2 `git check-ignore -q .dsh-interview/config/jev.json` 退出 0，确认不会被提交

## 10. 探针

- [x] 10.1 未设置密钥时 `node openspec/changes/interview-jev-coverage/probe/jev-coverage-probe.mjs` 以非 0 退出，且日志不含密钥
- [x] 10.2 有密钥时探针仍可跑通（含三次 reask 盖帽样例）。把本轮 `summary_capped` 的 `hits=` 与 `p95_ms=` 写进本任务注释

```
hits=10/10
p95_ms=772
```

本轮 `summary_jev` 为 8/10；两处 miss 都是满 3 次 reask 后模型仍给 `reask`/`miss`，代码盖帽成 `next`。插件适配层实打实测：关闭零 HTTP；开启后「不会。」返回 `miss`（646ms），日志不含密钥。

## 11. 桌面验收

- [ ] 11.1 在正在使用的 DSH Desktop 里核默认关闭、配置落盘与回退，勾选前把记录写进本任务注释。缺一项不得勾选。

```
Desktop 版本：0.2.17
Profile：web（interview-dsh 已是 link 到本仓库，需完全退出并重启 Desktop 才能加载刚打的 lib/）
默认关闭：答完一题后对照与五维是否仍出：
打开开关但不填密钥：配置区是否可见失败，开始是否仍可用：
连通成功后工作区是否出现 `.dsh-interview/config/jev.json`，失败是否不落盘，且不在 round 目录下：
再次打开入口：开关是否仍开、密钥框是否为空：
round 的 session.json / cards 是否不含 apiKey：
（可选）开启后作答：卡片是否听 Jev、满 3 次 reask 是否换 Qn、评语是否仍在：
气泡中是否没有档名、Jev 或 JSON：
```
