# interview-dsh 架构开发规范

> 本文档是后续开发的**约束基线**，不是详尽规则手册。Agent 可在不违背核心边界的前提下自主实现。

## 1. 总体原则

- **前后端物理隔离**：`backend/` 与 `frontend/` 严格分离。
- **单一共享契约**：前后端通过 `shared/` 的 TypeScript 类型通信，禁止隐式契约。
- **DSH 运行时隔离**：DSH SDK/Hooks/Web API 集中在适配层，不散落在业务代码。
- **安全默认**：敏感数据默认加密、默认脱敏、默认不暴露给前端。

## 2. 目录结构

```
backend/     # 后端 TS 源码与测试
frontend/    # 前端 React + TS 源码与测试
shared/      # 前后端共享类型/接口
docs/architecture/  # 架构规范与图
openspec/    # OpenSpec 规划产物
Agent.md     # Agent 约束
```

**强制规则：**
- 新文件必须放入对应目录。
- `shared/` 只放类型/接口/常量，不放业务逻辑。

## 3. 后端规范

- TypeScript + strict 模式。
- 分层：`entrypoints/` → `services/` → `data/` → `infra/`。
- 只有 `infra/` 可直接调用 DSH API。
- 对外接口在 `shared/api/` 定义完整类型。
- 显式错误处理，禁止吞错。
- 面试活跃路径禁止高风险异步操作。

## 4. 前端规范

- React + TypeScript + Hooks。
- 禁止使用 `any`，除非文件头部注释说明原因。
- 通过 `shared/api/` 调用后端。
- 敏感字段默认脱敏。
- 样式使用 CSS Modules 或 Tailwind。

## 5. 安全规范

- 禁止硬编码密钥。
- 敏感数据存储/传输加密。
- 前端不做敏感逻辑（加密/解密/权限判断）。

## 6. 插件规范

- 通过 DSH 官方生命周期注册/卸载/热更新。
- 插件配置支持热加载。
- 不修改 DSH 核心文件。

## 7. 测试规范

- 后端核心逻辑附带单元测试。
- 前端优先快照/交互测试。

## 8. 变更规范

- Conventional Commits。
- 功能变更对应 OpenSpec change。
- 偏离本文档必须先更新文档并记录原因。

## 9. PR Checklist

- [ ] 代码在正确目录？
- [ ] 接口在 `shared/` 定义类型？
- [ ] 无硬编码密钥？
- [ ] 前端无敏感逻辑？
- [ ] 有显式错误处理？
- [ ] 无未验证依赖？
- [ ] TS strict 合规？
- [ ] 无面试活跃路径高风险异步？
- [ ] 偏离架构已更新文档？
- [ ] 提交信息规范？
