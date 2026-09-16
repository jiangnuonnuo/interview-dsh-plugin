# interview-dsh

DSH 八股专项模拟面试插件。面试发生在 **DSH 现有对话**里；本仓库只做入口、面试官提示词和评估面板。

## 文档

| 文件 | 内容 |
|---|---|
| `AGENTS.md` | 项目级代理约束 |
| `docs/architecture/ARCHITECTURE.md` | 架构设计与编码规范 |
| `docs/product/REQUIREMENTS.md` | 产品定位与使用者 |
| `openspec/changes/` | 当前能力的实现 change |
| `interviewer-role-prompt.md` | 面试官内容口径 |
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
