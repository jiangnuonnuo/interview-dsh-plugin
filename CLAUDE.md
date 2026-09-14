# CLAUDE.md

每次开发必须遵守的规则。怎么拆目录、怎么接 DSH、代码放哪，以架构为准。

## 软引用

- 架构（开发遵循）：`docs/architecture/ARCHITECTURE.md`
- 产品需求：`docs/product/REQUIREMENTS.md`
- 红线副本：`Agent.md`

## 命令

```bash
npm install
npm run build
npm test
npm run lint
```

## 规则

- 写代码前读架构，按架构落地；不要另起一套目录或通信方式。
- 用户可见行为以产品需求为准；改行为先改需求，再 OpenSpec，再写代码。
- 实现必须同时满足需求和架构。二者冲突时先改文档，再改代码。
- 第一期只做需求主链路；需求写明「不做」的不要做。
- Conventional Commits。DSH API 不明先查文档，否则 `TODO`，禁止用自建聊天绕过。

## 红线

- 禁止自建聊天 UI。
- 禁止违反架构中的双会话隔离、适配层边界、`shared/` 契约。
- 禁止硬编码密钥；禁止前端做加密、解密、权限判断、评分判定。
- 禁止修改 DSH 核心；禁止未验证依赖；禁止吞错。

## 不确定时

- 怎么实现：`docs/architecture/ARCHITECTURE.md`
- 做什么：`docs/product/REQUIREMENTS.md`
