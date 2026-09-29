## 1. Shared 契约与兼容读取

- [x] 1.1 在 `shared` 增加评估阶段、阶段状态、generation/version 和可见错误的可选类型，保持旧 `InterviewDeck`、`QuestionCard` 与旧 remote 响应可解析；用 TypeScript 类型检查和旧 fixture 读取测试验证兼容性
- [x] 1.2 为阶段性 watch 响应补充严格的 remote schema，确保未知阶段、负版本和不匹配 session 被拒绝；运行 shared/remote 契约测试验证错误映射
- [x] 1.3 为阶段合并与版本比较增加纯函数，验证旧快照、重复快照、过期快照和补充作答快照的合并结果

## 2. 后端 single-flight 与版本协调

- [x] 2.1 在 services 层实现按 `sessionId + cardId + answerVersion` 复用的评估任务表，验证同一并发请求只创建一个任务且不同作答创建不同任务
- [x] 2.2 为任务加入 AbortController、结束清理和完成/失败 TTL，验证结束本轮或任务取消后不会继续写入甲板
- [x] 2.3 将 `watchCoachTurnSession` 和 force 刷新接入任务表，验证后台看守与手动刷新收到相同 deck/generation 且模型调用次数为一次
- [x] 2.4 增加阶段提交的版本守卫，验证旧评分、旧 brief 和旧 Jev 返回时不会覆盖新作答或已结束轮次

## 3. 评估阶段编排

- [x] 3.1 将现有评分流程拆为作答接收、coverage 定档、对照/五维、下一题 brief 四个可发布阶段，验证每一阶段均可单独持久化和返回
- [x] 3.2 保留未开启 Jev 时的一次对照补全回退路径，验证未开启场景不会新增 Jev 请求且 coverage/对照/五维行为与现有测试一致
- [x] 3.3 让 Jev 合法命中先发布路由结果，再异步补齐对照/五维；验证 `deepen`、`reask`、`next` 可先准备下一卡，`miss`、`wide_gap` 不出现下一卡槽
- [x] 3.4 将 brief repair 限制为单次有界重试，并缓存相同题干与上下文指纹的 brief；验证相同题目不会重复补全，非法结果仍返回可见 coach 错误
- [x] 3.5 缩短新题稳定等待窗口，避免在发现新题后等待完整看守超时；增加运行时测试验证题干稳定后立即进入 brief 阶段

## 4. Jev 与持久化优化

- [x] 4.1 为成功 Jev 探测保存配置指纹和有效状态，验证同配置开始面试不会二次探测，修改密钥或开关会重新探测
- [x] 4.2 扩展 `WorkspaceArchive` 支持按版本幂等写入 session 与变化卡片，验证重复提交不重复作答、不改变卡片编号
- [x] 4.3 将阶段性落盘接入任务编排并保留整副牌回退路径，验证局部写入失败时面板显示 `persist_unavailable` 且旧有效文件不被混写
- [x] 4.4 增加磁盘恢复测试，验证进程重启后以 session.json 恢复已有阶段结果，未完成阶段可以安全重试

## 5. 前端阶段更新与卡片体验

- [x] 5.1 将 `EntryPanel` 的后台看守、force 刷新和组件卸载改为共享订阅，验证并发入口不会产生多个 remote 评估请求
- [x] 5.2 在 `exam-panel-state` 与 `InProgressPanel` 接入 generation/stage 合并，验证旧快照被丢弃、已有卡片内容不被清空
- [x] 5.3 为当前卡增加对照/五维生成中状态，为下一卡保留独立生成槽；验证流态、详情态和历史卡切换均保持可交互
- [x] 5.4 为阶段失败、取消和持久化失败增加面板可见错误，验证失败不会伪装成完成或返回空白进行中面板
- [x] 5.5 保持前端不计算 coverage、分数或开卡关系，运行边界测试确认业务判定只来自后端响应

## 6. 测试与回归

- [x] 6.1 增加后端 single-flight、版本覆盖、取消和重复落盘单测，并通过 `npm test --workspace backend`
- [x] 6.2 增加 Jev 先到、对照后到、Jev 回退和 brief 延迟的编排测试，并通过相关 backend Jest 测试
- [x] 6.3 增加 EntryPanel 与 InProgressPanel 的阶段更新、历史卡可交互和错误可见性测试，并通过 `npm test --workspace frontend`
- [x] 6.4 运行 `npm run lint`、`npm run build` 和根目录 `npm test`，确认 shared、backend、frontend、bundle 全部通过

## 7. DSH Desktop 验收

- [x] 7.1 在当前正在使用的 DSH Desktop 中验证同一作答只触发一次有效评估，记录模型/Jev 调用次数或可观测请求证据
- [x] 7.2 在真实 Desktop 中验证 Jev 先到时卡片先更新、对照和五维随后补齐，期间可切换历史卡并进入详情
- [x] 7.3 在真实 Desktop 中验证下一卡生成槽、阶段失败提示、结束本轮取消和工作区 session/cards 文件内容；未完成项不得勾选或归档
