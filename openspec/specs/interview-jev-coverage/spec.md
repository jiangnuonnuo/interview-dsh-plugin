# interview-jev-coverage Specification

## Purpose

让卡片所用的五种覆盖结果可以走可选的 Jev 定档。默认关闭，行为与现有对照补全一致。用户显式开启且填齐必要信息后，定档可走 Jev；失败时回退对照。不改变面试官在考生发送后立刻开口的时机。

## Requirements

### Requirement: Jev coverage is off by default
系统 SHALL 默认不开启 Jev 定档。未开启时，开卡与引导 MUST 只使用对照补全返回的 `coverage`，行为与引入本 capability 之前一致。进程环境里即使存在 Jev 或 TypeSafe 密钥，只要用户未开启，系统 MUST NOT 自动改走 Jev。未开启 MUST NOT 单独成为面板错误。

#### Scenario: Default start uses comparison coverage
- **WHEN** 用户未打开卡片判断开关，直接开始面试并作答
- **THEN** 开卡与引导使用对照补全的 `coverage`，面板不出现因未开启 Jev 而产生的错误文案

#### Scenario: Env key does not auto-enable Jev
- **WHEN** 运行环境中有 `TYPESAFE_API_KEY` 或 `JEV_API_KEY`，但 `.dsh-interview/config/jev.json` 不存在或 `enabled` 不是 true
- **THEN** 本场定档 MUST NOT 调用 Jev，MUST 走对照补全

### Requirement: Enabling Jev requires the necessary fields
入口 MAY 在面试设置下提供默认折叠的「卡片判断」配置。用户 SHALL 能自行打开或关闭 Jev。打开时系统 MUST 要求填齐必要信息：至少一份可用的 Jev / TypeSafe API 密钥。写入前系统 MUST 用该密钥测试 Jev 连通；仅当连通成功时 MUST 把开关与密钥写入 `.dsh-interview/config/jev.json`。连通失败时系统 MUST NOT 写入该文件，MUST 在配置区给出可见失败，本场 MUST 走对照回退，MUST NOT 挡住「开始模拟面试」。开关为开且密钥为空时，系统 MUST NOT 把本场视为已开启 Jev。密钥 MUST NOT 写入各轮 `round-*`、`session.json`、卡片 md、考场气泡或前端日志。开始面试若开关已开，MUST 先走同一套连通测试；开始面试 MUST NOT 把填密钥当成第三项必填。

#### Scenario: Toggle on without a key is not connected
- **WHEN** 用户打开卡片判断开关但未填密钥，且该文件里也没有已保存的密钥
- **THEN** 配置区可见需要密钥；本场定档仍走对照补全，MUST NOT 对 Jev 发请求

#### Scenario: Toggle on with a key is connected
- **WHEN** 用户打开开关并填入非空密钥，连通测试成功后开始面试
- **THEN** 工作区存在 `.dsh-interview/config/jev.json` 且 `enabled` 为 true；密钥框不回显明文，面板表明已保存；本场定档 MUST 尝试 Jev；进行中面板 MAY 显示「判断已加速」

#### Scenario: Failed connectivity does not save the key
- **WHEN** 用户打开开关并填入密钥，但连通测试失败
- **THEN** 系统 MUST NOT 写入 `.dsh-interview/config/jev.json` 的新密钥；配置区可见失败；开始按钮仍可用；本场定档 MUST 走对照回退

#### Scenario: Config file is outside round archives
- **WHEN** 用户保存卡片判断配置
- **THEN** 文件路径 MUST 是 `.dsh-interview/config/jev.json`，MUST NOT 出现在 `.dsh-interview/<sessionId>/round-*` 下；`session.json` 与 `cards/*.md` MUST NOT 含密钥

#### Scenario: Entry keeps topic and difficulty as the main path
- **WHEN** 用户打开面试入口且未展开卡片判断
- **THEN** 仍先看到主题与难度，开始按钮可用，MUST NOT 要求先填密钥

#### Scenario: Collapsed connection does not block start
- **WHEN** 用户不开启 Jev 并直接开始
- **THEN** 本场定档走对照回退，面板不出现因未连接而产生的错误

#### Scenario: Reload keeps enabled without echoing the key
- **WHEN** 已保存过密钥且 `enabled` 为 true，用户再次打开入口
- **THEN** 开关为开，面板只表明密钥已保存，MUST NOT 把密钥明文写回输入框或响应 JSON

#### Scenario: Toggle off keeps the stored key
- **WHEN** 用户关闭卡片判断开关并保存成功
- **THEN** 文件 `enabled` 为 false，已有 `apiKey` 可以保留；之后定档 MUST NOT 发 Jev

### Requirement: Coverage uses Jev when enabled and falls back otherwise
考生作答后，系统 SHALL 为开卡定档走两条链路之一。仅当本场已开启 Jev、必要信息已填齐、且一次调用返回可映射到五档之一的结果时，系统 MUST 用该结果作为 `coverage`（再经同一知识点的 reask 上限处理），取值仍只允许 `miss`、`wide_gap`、`deepen`、`reask`、`next`。当未开启、必要信息不全、超时、鉴权失败、网络失败、或返回值无法映射到这五档时，系统 MUST 改走当前对照补全里的 `coverage`，行为与现有对照定档一致。回退 MUST NOT 单独成为面板错误，MUST NOT 要求用户改用另一套生成模型。

#### Scenario: Enabled Jev supplies coverage
- **WHEN** 本场已开启 Jev，且定档调用返回五档之一
- **THEN** 开卡与引导使用该档（若未触达 reask 上限）；系统 MUST NOT 再用对照 JSON 里的 `coverage` 覆盖这一档

#### Scenario: Disabled Jev uses comparison coverage
- **WHEN** 本场未开启 Jev
- **THEN** 开卡与引导仍使用对照补全返回的 `coverage`

#### Scenario: Failed Jev falls back to comparison coverage
- **WHEN** 本场已开启 Jev，但定档调用超时、鉴权失败、或返回无法映射到五档
- **THEN** 系统改用同一次作答的对照补全 `coverage` 开卡；只要对照补全成功，面板 MUST NOT 把 Jev 失败展示成定档失败

#### Scenario: Both coverage sources fail
- **WHEN** Jev 未给出合法五档，且对照补全也没有合法 `coverage`
- **THEN** 面板展示现有的对照失败（作答留在原卡、不新开卡），MUST NOT 编造一档

### Requirement: Jev state is the full question thread
当本场已开启 Jev 并发起定档时，系统 SHALL 把同一知识点从正式问 `Qn` 到当前子问 `Qn.m` 的完整材料作为判断上下文，包括每张卡的面试官题干、考察层、考察意图、开卷要点、按轮作答，以及前面卡已定档结果。系统 MUST NOT 只提交当前这一句作答。判断对象 MUST 是当前待定档卡片，MUST NOT 把上一张卡已经讲清的点再当成当前缺口。

#### Scenario: Child card judgment includes the parent question
- **WHEN** 当前卡为 `Q1.2`，且 `Q1`、`Q1.1` 已有题干与作答
- **THEN** 发给定档服务的材料 MUST 同时包含 `Q1`、`Q1.1` 与 `Q1.2`，不得只含 `Q1.2` 的最后一轮作答

### Requirement: Three reasks force a topic change
同一知识点上，系统 SHALL 统计已经落档为 `reask` 的次数。当该次数已经达到 3，本张卡无论 Jev 或对照给出 `reask`、`deepen`、`miss` 或 `wide_gap`，开卡 MUST 按 `next` 执行：不再开 `Qn.m`，不再留在本题引导，改为下一个 `Qn`。该上限 MUST 由代码执行，MUST NOT 只写在定档提示词里。未满 3 次时，系统 MUST NOT 因该上限改档。

#### Scenario: A third reask is still allowed
- **WHEN** 本知识点已有 2 次 `reask`，当前定档再次为 `reask`
- **THEN** 系统仍开 `Qn.m`，MUST NOT 提前换知识点

#### Scenario: A fourth reask is forced to next
- **WHEN** 本知识点已有 3 次 `reask`，定档服务对本张卡给出 `reask` 或 `deepen`
- **THEN** 甲板按 `next` 开下一个 `Qn`，MUST NOT 再开子问

#### Scenario: Blank answer after three reasks still changes topic
- **WHEN** 本知识点已有 3 次 `reask`，当前作答为「不会」
- **THEN** 系统仍换方向开下一个 `Qn`，MUST NOT 留在原卡继续引导

### Requirement: Comparison prose stays on the host default model
无论定档是否走 Jev，系统 SHALL 仍用宿主当前默认模型为该卡生成已覆盖、未覆盖、评语和八股五维。Jev MUST NOT 生成这些给人看的句子，MUST NOT 生成开卷要点、知识链正文或面试官气泡。定档与对照正文 MAY 并行；Jev 命中时，开卡 MUST 在对照评语写完之前就可以按该档执行。

#### Scenario: Jev does not write the comparison
- **WHEN** 已开启 Jev 且定档成功
- **THEN** 该卡仍出现对照评语与五维，且这些文案来自宿主当前默认模型，而不是定档服务

#### Scenario: Card routing does not wait for comparison prose
- **WHEN** Jev 已给出 `deepen`、`reask` 或 `next`（且未触达 reask 上限），对照评语尚未返回
- **THEN** 代码仍按该档准备新卡（引导则不新开卡）；面板 MUST NOT 因为评语未到而改用另一档

#### Scenario: Fallback keeps a single comparison completion
- **WHEN** 未开启 Jev 或 Jev 已回退
- **THEN** 定档与对照评语、五维仍来自同一次对照补全，行为与未引入 Jev 时一致

### Requirement: The interviewer still speaks before coverage is known
考生发送后，面试官 SHALL 仍按作答前已挂上的系统段立刻开口。系统 MUST NOT 为等待 Jev 或对照定档而拦截发送，MUST NOT 把定档结果 `session.prompt` 回考场，MUST NOT 新增会说话的 Agent。卡片仍以定档结果为准：面试官已经问出下一问，而定档是 `miss` 或 `wide_gap` 且未触达 reask 上限时，MUST 留在原卡。

#### Scenario: Sending is not blocked by Jev
- **WHEN** 考生在宿主输入框提交作答，无论是否已开启 Jev
- **THEN** 面试官在同一条考场对话中开始回复，插件 MUST NOT 等到定档完成才允许该回复

#### Scenario: Coverage is not prompted back to the exam
- **WHEN** Jev 或对照补全得出五档之一
- **THEN** 考场对话中 MUST NOT 因此多出一条由插件写入的用户气泡，气泡中 MUST NOT 出现档名、Jev 或 JSON

#### Scenario: Chain is not replaced while the interviewer is still speaking
- **WHEN** Jev 已给出 `deepen`、`reask` 或 `next`，且考场 Agent 仍在生成本轮回复
- **THEN** 系统 MUST NOT 立刻替换 `interview:chain`；MUST 等到该 Agent idle 后再挂下一问约束

#### Scenario: A host route-plan 502 is not opened as a card
- **WHEN** 考场助手气泡是 `502` 且正文含 `route_plan_error` 或 content blocked
- **THEN** 系统 MUST NOT 把该段当作待答问去 brief 或开卡

### Requirement: Jev stays off the card body
进行中面板 MAY 显示「判断已加速」，MUST NOT 出现五种覆盖结果名称，MUST NOT 把 Jev 写在卡片正文里。

#### Scenario: Panel does not name the five coverage values
- **WHEN** 用户查看已评卡或引导中的卡
- **THEN** 渲染树中 MUST NOT 出现 `miss`、`wide_gap`、`deepen`、`reask`、`next` 的展示文案
