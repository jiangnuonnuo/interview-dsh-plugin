# Agent.md — interview-dsh 插件开发约束

> 只记录**不变的原则和红线**。会变的规则、流程、目录细节见 `docs/architecture/ARCHITECTURE.md`。

## 项目是什么

- DSH 面试插件，空项目从零搭建。
- 后端 TypeScript，前端 React。

## 核心原则（不可违背）

- **前后端物理隔离**：`backend/` 与 `frontend/` 严格分离。
- **单一共享契约**：前后端只能通过 `shared/` 的 TS 类型通信，禁止隐式契约。
- **DSH 运行时隔离**：DSH SDK/Hooks/Web API 集中在适配层，不散落进业务代码。
- **安全默认**：敏感数据默认加密、默认脱敏、默认不暴露给前端。

## 红线（绝对禁止）

- 禁止硬编码 API Key / Token / 密码。
- 禁止前端直接处理后端敏感逻辑（加密、解密、权限判断）。
- 禁止修改 DSH 核心文件或运行时行为（官方 Hook 除外）。
- 禁止引入未经验证的开源依赖。

## 遇到不确定时

- 不确定的 DSH API，先查文档，否则标注 `TODO`。
- 需要偏离上述原则时，先更新 `docs/architecture/ARCHITECTURE.md` 并记录原因。
