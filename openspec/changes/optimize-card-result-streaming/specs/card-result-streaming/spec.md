## Purpose

让卡片评估在并发、慢模型和外部定档服务存在时仍保持单次处理、逐阶段可见和可恢复，缩短用户等待并避免重复结果覆盖已有卡片。

## ADDED Requirements

### Requirement: 同一作答只产生一次有效评估
系统 SHALL 按面试会话、当前卡片和作答内容识别同一评估任务。后台看守、手动刷新或重复 remote 请求命中同一任务时 MUST 复用已有任务结果，MUST NOT 重复调用评分模型、Jev 定档或下一题 brief。不同作答内容或不同题目 MUST 创建新的评估任务。

#### Scenario: Background watch and manual refresh overlap
- **WHEN** 后台看守正在处理 `Q1` 的一条作答，用户同时触发刷新本题
- **THEN** 系统只产生一组有效的评分与定档调用，两个请求最终看到同一份卡片结果

#### Scenario: Repeated remote request after completion
- **WHEN** 同一作答的评估已经完成，客户端再次请求看守
- **THEN** 系统返回已保存结果，MUST NOT 再次调用评分模型或 Jev

#### Scenario: A later answer starts a new evaluation
- **WHEN** 候选人在同一张引导卡提交新的补充作答
- **THEN** 系统按叠加后的作答创建新的评估版本，旧版本不会覆盖新版本

### Requirement: 卡片结果按阶段可见
系统 SHALL 允许同一张卡的作答、覆盖路由、对照与五维、下一张卡 brief 分阶段到达。任何阶段已经产生的合法结果 MUST 先对面板可见；后续阶段完成后 MUST 只补充缺失字段或新增卡片，不得清空已有卡片。

#### Scenario: Coverage arrives before comparison prose
- **WHEN** Jev 或其他合法定档来源已经返回覆盖结果，而对照评语和五维仍在生成
- **THEN** 面板先展示当前卡的作答与可用卡片路由状态，并保留对照和评分的生成状态

#### Scenario: Comparison arrives after routing
- **WHEN** 对照与五维随后生成完成
- **THEN** 它们写回原卡，已展示的题干、作答、编号和路由不被重置或改写

#### Scenario: Brief arrives after the current card update
- **WHEN** 下一张卡的摘要和要点尚未完成
- **THEN** 面板保留当前卡及其阶段性结果；新卡仅在 brief 完成后加入甲板

### Requirement: 生成期间卡片流保持可交互
在任何结果阶段生成期间，面板 SHALL 继续显示当前卡和已有历史卡。用户 MUST 能切换历史卡、打开详情和查看已完成字段；生成中的下一卡 MUST 使用独立槽位，不得遮挡或替换当前卡。

#### Scenario: Current card remains visible during evaluation
- **WHEN** 当前卡正在生成对照或五维
- **THEN** 当前卡题干、编号和已有作答保持可见，用户可以打开详情

#### Scenario: History remains available while next card is generating
- **WHEN** 下一张正式问的 brief 尚未完成
- **THEN** 用户可以切换到已有历史卡，历史卡的对照与评分保持可见

#### Scenario: Failed later stage preserves earlier result
- **WHEN** 对照、五维或 brief 阶段失败
- **THEN** 面板显示该阶段的可见错误，已经完成的作答、定档和卡片内容仍然保留

### Requirement: 评估任务可取消且不会污染下一轮
当面试结束、会话被销毁或当前评估被更新版本替代时，系统 SHALL 取消或使旧任务失效。旧任务完成后 MUST NOT 覆盖新作答、新一轮或已结束会话的甲板；取消失败 MUST 在面板可见且不得伪装成成功结果。

#### Scenario: End round cancels pending evaluation
- **WHEN** 用户在对照或 brief 生成期间结束本轮
- **THEN** 待处理任务不再写入新卡或旧卡，结束结果和已落盘问答保持一致

#### Scenario: New answer supersedes old evaluation
- **WHEN** 同一张卡已有补充作答，上一版本评估随后才返回
- **THEN** 系统丢弃过期版本的写入，不覆盖补充作答对应的最新结果

#### Scenario: Cancelled task is visible
- **WHEN** 取消导致当前阶段没有结果可展示
- **THEN** 面板展示可见的生成失败或已取消状态，MUST NOT 静默显示完成

### Requirement: 阶段结果与工作区落盘保持一致
系统 SHALL 在每个可持久化阶段保存与当前版本匹配的 session 和 card 内容。重复保存同一版本 MUST 幂等；部分阶段失败时 MUST 保留上一个完整有效版本，MUST NOT 生成含新旧版本混合字段的卡片文件。

#### Scenario: Stage update writes only the current version
- **WHEN** 作答结果先完成，随后对照结果完成
- **THEN** 工作区中的同一张卡先反映作答阶段，最终反映完整对照，文件内容与面板最新版本一致

#### Scenario: Duplicate persistence is idempotent
- **WHEN** 同一阶段因重复请求再次要求落盘
- **THEN** session 与 card 文件内容不增加重复作答、不改变卡片编号，结果保持不变

#### Scenario: Persistence failure is visible
- **WHEN** 某阶段无法写入工作区
- **THEN** 面板展示现有持久化错误，内存中的已知结果仍可继续查看，系统不得静默报告已保存

### Requirement: Jev 连接状态在同一轮复用
当用户已经完成一次成功的 Jev 连通测试且配置未变化时，系统 SHALL 在同一面试轮次复用该成功状态。系统 MUST NOT 因开始面试或重复看守再次执行相同连通探测；配置变化、探测失效或新轮次需要重新确认时才允许重新探测。

#### Scenario: Start after successful connection test
- **WHEN** 用户在入口已成功测试 Jev 连通，随后直接开始面试
- **THEN** 开始流程复用该状态，不额外发送同一连通探测请求

#### Scenario: Changed key requires a new probe
- **WHEN** 用户修改 Jev 密钥或切换启用状态后开始面试
- **THEN** 系统重新测试新配置，测试失败时仍按既有规则回退对照

#### Scenario: Disabled Jev does not probe
- **WHEN** 用户未启用 Jev 或本轮已确认回退
- **THEN** 看守和卡片生成 MUST NOT 发起 Jev 连通探测或定档请求
