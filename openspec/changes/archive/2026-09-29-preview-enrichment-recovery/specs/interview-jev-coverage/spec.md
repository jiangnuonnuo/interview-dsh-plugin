## MODIFIED Requirements

### Requirement: Coverage uses Jev when enabled and falls back otherwise
考生作答后，系统 SHALL 为开卡定档走两条链路之一。仅当本场已开启 Jev、必要信息已填齐、且一次调用返回可映射到五档之一的结果时，系统 MUST 用该结果作为 `coverage`（再经同一知识点的 reask 上限处理），取值仍只允许 `miss`、`wide_gap`、`deepen`、`reask`、`next`。当未开启、必要信息不全、超时、鉴权失败、网络失败、或返回值无法映射到这五档时，系统 MUST 改走当前对照补全里的 `coverage`，行为与现有对照定档一致。Jev 覆盖结果与对照 prose MAY 并行；覆盖档位、源卡 id、评估版本和“等待下一题”状态 MUST 跨 watch 调用保留，直到创建对应的 `Qn.m`/`Qn` 或明确失败。回退 MUST NOT 单独成为面板错误，MUST NOT 要求用户改用另一套生成模型。

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

## ADDED Requirements

### Requirement: Jev route survives a watch boundary
系统 SHALL 在 Jev 返回合法覆盖结果但面试官下一问尚未稳定出现时持久化待路由状态。状态 MUST 包含源卡编号、评估版本、覆盖档位和等待题干标记；下一次 watch 读取该状态后，题干出现时 MUST 创建对应的 `Qn.m` 或 `Qn` 预览卡。

#### Scenario: Jev route survives a watch boundary
- **WHEN** Jev 已返回 `deepen`、`reask` 或 `next`，但面试官下一问尚未在本次 watch 中稳定出现
- **THEN** 下一次 watch 仍能读取该路由状态；面试官产出题干后创建对应的新卡，原卡的覆盖与对照保持不变

#### Scenario: A valid interviewer follow-up opens a card
- **WHEN** Jev 已判定需要追问，面试官已经产出新的自然语言题干
- **THEN** 甲板出现 `Qn.m` 预览卡，后续补齐只更新同一张卡，不因对照 prose 尚未返回而丢失追问

#### Scenario: Invalid Jev route remains visible and recoverable
- **WHEN** Jev 返回非法档位、没有题干或请求超时
- **THEN** 面板保留当前卡并显示可定位的失败/等待状态；对照回退仍可继续，用户刷新后可以重新尝试
