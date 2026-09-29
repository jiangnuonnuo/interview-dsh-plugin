## Why

当前预览卡可以先出现，但参考要点补齐仍绑定在同一个看守请求中；一旦模型或知识链挂载变慢，该请求持续占用 single-flight，面板显示“正在生成参考要点”，刷新本题也只能等待原任务，无法恢复。Jev 的覆盖结果与待补齐对照又只保存在单次调用内，调用结束后追问路由状态丢失，造成“有判断、无追问”。

## What Changes

- 将预览卡创建与参考内容补齐任务解耦：预览提交后立即结束本次 watch，补齐在会话级后台任务中运行。
- 为补齐任务增加会话级 single-flight、取消、版本守卫和可重试状态；刷新本题在失败或卡住时可以重新启动补齐，不重复创建卡片。
- 补齐过程按阶段落盘：题干预览、参考要点、知识链挂载和失败信息分别可恢复；成功或失败都不让卡片永久停留在生成中。
- 持久化 Jev 覆盖路由与待生成面试官题干之间的状态，使下一次 watch 能继续创建 `Qn.m` 或 `Qn` 追问卡。
- 对无效、超时或未返回题干的 Jev 结果给出可见降级状态，继续使用已有对照路径，不吞掉追问失败。
- 增加回归测试，覆盖卡住恢复、刷新重试、后台补齐唯一性、Jev 追问恢复和结束取消。

## Capabilities

### New Capabilities

### Modified Capabilities

- `interview-cards`: 预览卡补齐必须可独立后台恢复，失败或刷新后不得永久卡在生成中。
- `interview-jev-coverage`: Jev 定档后的追问路由状态必须跨 watch 调用保留，并最终产生追问或下一正式问。

## Impact

- 影响 `backend/src/services/interview-entry.service.ts` 与 `backend/src/services/watch-coach-turn.ts` 的任务编排、状态存储和取消逻辑。
- 影响 shared 卡片阶段/路由契约、Host/Client remote 响应和面板刷新错误呈现。
- 不新增模型、外部依赖或聊天表面；继续遵守 DSH 对话唯一问答表面和工作区 Host fs 落盘边界。
