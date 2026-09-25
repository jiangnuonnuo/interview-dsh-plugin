## MODIFIED Requirements

### Requirement: Start uses two isolated sessions with the current conversation AI
开始成功后，系统 SHALL 同时存在会话 A（面试官，唯一可见说话表面）与会话 B（教练，用户只看见面板结果）。会话 A 的开口，以及会话 B 的开卷要点、知识链、对照评语与五维，MUST 使用当前这条 DSH 对话已经配置好的 AI（模型、参数、密钥来源）。系统 MUST NOT 为这些生成任务另配一套生成模型或硬编码密钥。可选的定档服务 MUST 仅用于五种覆盖结果，MUST NOT 生成气泡、要点、评语或分数文案。该定档服务默认关闭；未开启或调用失败时，五种覆盖结果 MUST 仍由会话 B 的对照补全给出。可选定档的密钥 MUST 只存在于工作区 `.dsh-interview/config/jev.json`，MUST NOT 写入各轮 `round-*` 档案。会话 A MUST NOT 看见面板的系统提示、评分过程或标准答生成过程。会话 B 的输出 MUST NOT 进入对话气泡。

#### Scenario: Dual session after valid start
- **WHEN** 用户合法点「开始模拟面试」且 Host 注入 API 可用
- **THEN** 系统建立会话 A 与会话 B，对话气泡中只出现面试官文案，教练产出只出现在面板

#### Scenario: Same AI configuration
- **WHEN** 当前 DSH 对话已配置某一模型，且未开启可选定档服务
- **THEN** 会话 A 与会话 B 都使用该配置，插件不要求用户再填 Key 或另选生成模型

#### Scenario: Optional coverage model does not replace the host AI
- **WHEN** 已开启可选定档服务
- **THEN** 面试官开口、开卷要点、对照评语与五维仍使用宿主当前默认模型；插件 MUST NOT 用定档服务生成这些文案

#### Scenario: Coach output stays off the transcript
- **WHEN** 教练会话生成本题标准答要点
- **THEN** 当前 DSH 对话气泡中 MUST NOT 出现该要点全文或评分过程

#### Scenario: Optional coverage secret stays out of the round archive
- **WHEN** 用户已保存 Jev 密钥并开始一轮面试
- **THEN** 该轮 `round-*` 下的 `session.json` 与 `cards/*.md` MUST NOT 含该密钥
