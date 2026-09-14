# interview-dsh

DSH 八股专项模拟面试插件。面试发生在 **DSH 现有对话**里；本仓库只做入口、面试官提示词和评估面板。

## 文档

| 文件 | 内容 |
|---|---|
| `CLAUDE.md` / `Agent.md` | 每次开发必须遵守的规则 |
| `docs/architecture/ARCHITECTURE.md` | 架构（开发遵循） |
| `docs/product/REQUIREMENTS.md` | 产品需求 |
| `interviewer-role-prompt.md` | 面试官行为契约 |
| `doc/entrance.png` / `doc/layout.png` | UI 参考 |

## 目录结构

```
backend/    后端 TS
frontend/   入口 + 评估面板（不含聊天）
shared/     前后端共享类型
docs/product/
docs/architecture/
openspec/
```

## 快速开始

```bash
npm install
npm run build
npm test
```

插件注册见 DSH 官方文档与 `backend/src/infra/dsh/`。当前仓库仍是脚手架。
