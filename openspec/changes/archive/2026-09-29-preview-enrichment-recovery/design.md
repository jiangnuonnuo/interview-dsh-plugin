## Context

上一轮把预览卡先落盘，但仍在 `watchCoachTurnSession` 内直接等待 `enrichPreviewCard`。Host 的模型流如果迟迟不结束，看守 single-flight 就一直占用；Client 的强制刷新也优先复用旧 flight，无法重试。Jev 覆盖和对照 promise 又是局部变量，watch 返回后下一次调用无法知道已经决定开追问。

## Goals / Non-Goals

**Goals:**

- 预览卡提交与补齐任务解耦，watch 快照不被慢模型阻塞。
- 对每个 session 保留唯一、可取消、可重试的补齐任务，并使失败/取消收敛到可见阶段。
- 持久化 Jev 路由计划，跨 watch 边界稳定开出追问或下一正式问。
- 保留同一卡片编号、题干、作答和历史卡，避免旧任务污染新版本。

**Non-Goals:**

- 不新增流式聊天表面，不修改 DSH 对话 API。
- 不把 Jev 变成参考要点或评分模型。
- 不改变默认关闭 Jev 和 miss/wide_gap 留在原卡的产品规则。

## Decisions

1. **Session-level enrichment registry.** `InterviewEntryService` 维护 session 到补齐任务的 registry。创建预览卡后注册后台 promise，watch 只读已落盘阶段；同一卡重复 watch 复用 registry。
2. **Bounded completion.** 模型补齐使用可取消 signal 和有限等待；超时统一写 `failed`，并释放 flight。刷新在旧任务已失败、取消或达到超时后递增版本重新补齐。
3. **Persistent route plan.** `ExamSessionRecord` 增加内部路由状态，至少包括覆盖档位、源卡 id、评估版本和是否等待下一题。下一次 watch 从记录恢复，不依赖局部 `pendingProse` promise。
4. **Refresh semantics.** `force` 不再被旧 watch flight 无条件吞掉；对正在运行的同卡任务返回预览快照，对已失败或过期任务取消旧任务并启动一次重试。
5. **No silent swallow.** 补齐、Jev、题干读取和知识链挂载失败都转成卡片阶段错误或面板错误，保留已有卡片。

## Risks / Trade-offs

- 超时会留下不完整卡片，但状态可见且可刷新恢复；比无限生成中更符合速度目标。
- 后台任务跨请求存在，需要版本与取消守卫；所有写回仍通过 session 与工作区统一落盘。
- 没有可用新题干时，路由计划只能等待；面板保留当前卡和可见等待/失败，不伪造题目。

## Migration Plan

先扩展会话记录和 shared 阶段契约，再改 service registry 与 watch 编排，随后补面板刷新文案和回归测试。构建后在 DSH Desktop 验证预览卡先出现、卡住后失败可刷新、Jev 判定最终生成追问、结束取消不再写回。
