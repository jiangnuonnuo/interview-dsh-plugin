# Agent.md

每次开发必须遵守的原则和红线。目录、分层、DSH 接法见 `docs/architecture/ARCHITECTURE.md`。产品范围见 `docs/product/REQUIREMENTS.md`。

## 原则

- **对话表面归宿主**：插件不实现聊天页。
- **前后端物理隔离**：`backend/` 与 `frontend/` 严格分离。
- **单一共享契约**：只通过 `shared/` 的 TypeScript 类型通信。
- **DSH 运行时隔离**：SDK 只出现在适配层。
- **安全默认**：敏感数据默认加密、脱敏、不暴露给前端。
- **开发遵循架构**：实现不得偏离 `docs/architecture/ARCHITECTURE.md`。

## 红线

- 禁止自建聊天 UI。
- 禁止硬编码 API Key / Token / 密码。
- 禁止前端处理加密、解密、权限判断、评分判定。
- 禁止修改 DSH 核心或运行时（官方 Hook 除外）。
- 禁止引入未经验证的开源依赖。
- 禁止用猜测的 DSH API 绕过架构。

## 不确定时

- 查架构文档；再查产品需求。
- 偏离原则前，先改架构文档并记录原因。
