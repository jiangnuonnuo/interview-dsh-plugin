# 架构分层

`interview-dsh` 是接入 DSH 的插件，不是独立应用。分层图用于回答“每个能力放在哪里、谁可以调用谁”。

[打开可缩放分层图](22-architecture-layers.html)

## 分层职责

| 层 | 所在位置 | 责任 | 不负责 |
|---|---|---|---|
| DSH 宿主 | Desktop Runtime / Web | 生命周期、会话、Agent、模型、文件系统、Slot | 面试业务规则 |
| Client 适配 | `frontend/src/infra/dsh/` | 入口按钮、面板挂载、远程调用、会话打开 | 评分、落盘、系统提示编排 |
| 前端功能 | `frontend/src/features/` | 表单、卡片、状态和错误展示 | 直接读取 DSH SDK |
| Typert 端口 | `backend/src/typert.host.ts` + Client remote | 稳定的方法名、参数和响应契约 | 领域决策 |
| Host 入口 | `backend/src/entrypoints/` | 参数校验、错误映射、能力暴露 | 直接操作网页 |
| 后端服务 | `backend/src/services/` | 面试用例、提示词、轮次和覆盖决策 | 依赖 DSH SDK |
| 数据层 | `backend/src/data/` | 卡片、轮次、工作区文件模型 | 访问宿主对象 |
| Host 适配 | `backend/src/infra/dsh/` | `agents`、`llm`、`fs`、会话与生命周期接入 | 承担业务规则 |
| Shared | `shared/` | 跨端类型、响应结构、稳定错误码 | 运行时副作用 |

依赖方向为：

```text
frontend/features  →  frontend ports  →  frontend/infra/dsh
        ↓                 ↓                     ↓
      shared  ←  backend entrypoints  ←  backend services  ←  backend data
                                                        ↓
                                               backend/infra/dsh
```

## 关键原则

1. **宿主拥有对话**：面试官气泡由 DSH 会话生成，插件只通过系统段和允许的两次 `prompt` 控制开场与收尾。
2. **插件拥有编排**：题目知识链、评估、卡片关系和落盘属于插件领域层。
3. **适配层隔离 SDK**：只有两个 `infra/dsh` 目录知道 DSH API，业务层可在没有 DSH 的情况下单测。
4. **Typert 是唯一传菜口**：Client 不调用 Host 内部函数，Host 不读取前端状态；跨端只走已声明的端口。
5. **错误必须可见**：缺服务、挂段失败、评估失败和写盘失败都要映射为面板能展示的错误。
