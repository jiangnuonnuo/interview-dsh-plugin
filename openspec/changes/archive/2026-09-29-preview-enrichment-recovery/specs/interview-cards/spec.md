## ADDED Requirements

### Requirement: 预览卡补齐任务不会永久阻塞看守
系统 SHALL 在预览卡提交后把参考要点、考察层、意图和知识链补齐作为会话级后台任务运行。watch 请求 MUST 在预览阶段快照提交后返回，不得等待补齐模型或知识链挂载；补齐任务 MUST 有可取消、可超时或失败收敛的终态。卡片在成功时变为 `brief_ready`，失败或取消时 MUST 变为可见的 `failed` 或 `cancelled`，不得永久停留在 `preview_ready`。

#### Scenario: Preview response returns before a stuck brief
- **WHEN** 新题干已出现且参考模型不返回
- **THEN** watch 先返回 `preview_ready` 卡片，后台任务最终将卡片标为失败或取消，面板不永久显示“正在生成参考要点”

#### Scenario: A failed brief can be retried
- **WHEN** 预览卡补齐失败或超时，用户点击“刷新本题”
- **THEN** 系统复用同一张卡片和编号重新补齐，刷新请求不被旧任务占用，成功后更新为 `brief_ready`

#### Scenario: Repeated watch does not duplicate enrichment
- **WHEN** 同一预览卡已有补齐任务，后台看守和用户刷新同时到达
- **THEN** 系统只运行一个补齐任务；刷新只能等待当前任务的快照或在失败/超时后显式重试，不得重复创建卡片

### Requirement: 预览卡和补齐阶段可恢复
系统 SHALL 为预览、补齐成功、补齐失败和取消分别落盘同一张卡片的阶段与错误信息。重新挂载面板或重启看守后，已失败或已取消的预览卡 MUST 可以被刷新重试；旧任务完成 MUST NOT 覆盖新的补齐版本、作答、题干或卡片编号。

#### Scenario: Remount preserves a failed preview
- **WHEN** 面板关闭后重新打开，卡片上一轮补齐已失败
- **THEN** 面板显示题干和失败原因，刷新本题可以重新发起补齐

#### Scenario: Cancelled enrichment cannot overwrite a retry
- **WHEN** 用户结束本轮或刷新后产生新版本，旧补齐任务随后返回
- **THEN** 旧结果被丢弃，不改变当前卡片阶段和参考内容
