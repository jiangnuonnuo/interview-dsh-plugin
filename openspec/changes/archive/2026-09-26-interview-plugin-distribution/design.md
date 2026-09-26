## Context

动机与验收门槛见 `proposal.md`。行为见 `specs/plugin-distribution/spec.md` 与对 `interview-entry` 的 delta。

现状：根包声明了 `dsh.bundle` / `dsh.client`，本机 `dsh plugin add ./` 可用。根 `package.json` 为 `"private": true`，`dependencies` 只有 `"interview-dsh-shared": "*"`，`files` 只列 `backend/dist`、`frontend/dist/client.js`、`cordis.patch.yml`。`.gitignore` 忽略全部 `dist/`，无 LICENSE。Host 的 `tsc` 产物仍 `import … from 'interview-dsh-shared'`；Client 的 Vite 库构建已把 shared 打进 `frontend/dist/client.js`（`interview-dsh-shared` 不在 external 表）。Host 运行时还经过 `zod`（`typert.host.ts`），该依赖写在 `backend/package.json`，不在根包。公开远程是 `jiangnuonnuo/interview-dsh-plugin`。

约束不变：Host SDK 只在 `backend/src/infra/dsh/`，Client SDK 只在 `frontend/src/infra/dsh/`，禁止自建聊天，禁止把本机 Desktop 安装目录写进仓库。本刀不改面试产品行为。

## Goals / Non-Goals

**Goals:**

- 安装器加载的图自包含：不解析 workspace 包名，不要求用户跑构建。
- 开发期保留 `backend/` / `frontend/` / `shared/` workspaces 与现有单测。
- 分发产物与开发 `dist/` 缓存分开，避免「为了上架把整个 tsc 输出树当合同」。
- 用 `npm pack` 的 tarball 在正在使用的 Desktop profile 上完成非 link 安装；公开 commit 与之同一套产物。
- README / LICENSE / 根清单对齐 dsh.pub 检查项。

**Non-Goals:**

- 不在本刀 `npm publish`。
- 不把三个 workspace 合并成单包源码树。
- 不改卡片、双会话、落盘、人设。
- 不把「dsh.pub 页面已 listed」写进代码完成条件（网页提交含人机验证，由作者在本刀完成后执行）。
- 不引入 `prepare` 作为用户安装路径。

## Decisions

### 1. 分发目录用提交的 `lib/`，开发构建仍用被忽略的 `dist/`

`npm run build`（workspaces：tsc + Vite）继续写 `backend/dist`、`frontend/dist`、`shared/dist`。另增打包步骤，把安装器要用的文件写到仓库根 `lib/`：

- `lib/index.js`：Host 入口（自包含 bundle）
- `lib/typert.host.js`：现有 `exports["./typert"]`
- `lib/client.js`：从 `frontend/dist/client.js` 复制（已是 `__ModuleLoader__` factory）
- 根 `main` / `exports` 改指 `lib/`；`files` 含 `lib/`、`cordis.patch.yml`、`README.md`、`LICENSE`

`.gitignore` 继续忽略 workspace `dist/` 与 sourcemap；`lib/` 必须能进 git。本地 `dsh plugin add ./` 在开发时也可以用，但本刀验收禁止用它充当通过证据。

备选：取消忽略 `backend/dist` 与 `frontend/dist` — 否决，tsc 输出含大量 `.d.ts` / `.map`，且 Host 仍外部依赖 `interview-dsh-shared`。备选：只靠 `prepare` 在 Git 安装时构建 — 否决，pnpm ≥10 要用户 `allowBuilds`，dsh.pub 明确不推荐。

### 2. Host 打成单文件，内联 `shared` 与 `zod`

对 `backend/src/infra/dsh/index.ts`（`apply` / `name` / `inject`）和 `backend/src/typert.host.ts` 做 bundler 打包（实现选用根 devDependency 的 esbuild 或等价物，不引入新运行时）。打进 `interview-dsh-shared` 与 `zod`。外部只留 Node 内置。根包安装器依赖改为空（或仅保留确实没打进包的 registry 依赖）。

Client 不改 Vite 合同：继续 external DSH / React，内联 shared 与 CSS。

备选：把 `shared` 以 `file:./shared` 随包 — 否决，`files` 与 Node 从 `backend/dist` 解析包名都容易漏。备选：发布 `interview-dsh-shared` 到 npm — 否决，本刀不 npm publish，且会多一个版本面。

### 3. 根包可公开安装，workspaces 仅开发

去掉根 `"private": true`，加 `"license": "MIT"` 与根 `LICENSE`。保留 `workspaces`，供 `npm test` / `npm run build`。打包测试读的是 `npm pack` 产出的清单，不是开发中的 workspace 解析结果。

`cordis.patch.yml` 的 `name` 保持 `interview-dsh`，与根包名一致。

### 4. 验收安装用 tarball，公开 Git 与之同一产物

本机门闩：`npm run build` → 生成 `lib/` → `npm pack` → `dsh plugin --profile <正在用的profile> add ./interview-dsh-0.1.0.tgz`（版本以当时 `package.json` 为准）。禁止验收时 `add ./`。`dump-config` 见到层后重启 Desktop，点「面试」。

将含 `lib/` 的 commit 推到 `jiangnuonnuo/interview-dsh-plugin` 后，Git 规格 `github:jiangnuonnuo/interview-dsh-plugin#<sha>` 与 tarball 等价。README 主命令写 Git / `npx dshpub add`（钉 `--ref`）。作者之后在 [dsh.pub/zh/submit](https://dsh.pub/zh/submit/) 贴该仓库 URL。

备选：验收必须先 push 再 `github:` 安装 — 可作为加分，但 tarball 已证明「无源码树也能装」，且不把本机路径写进 profile 文档。若 Desktop 的 `dsh plugin add` 对 tarball 行为异常，再改用一次性远程 commit，仍禁止 `add ./`。

### 5. 仓库契约测试锁清单，不锁 Desktop

在仓库内加契约测试或 `npm run test` 会跑到的脚本：根包非 private、有 license、`exports` 含 `./client` 与 patch、`lib/index.js` / `lib/client.js` 存在、`npm pack --dry-run` 含这些文件与 LICENSE、打包清单无 `interview-dsh-shared` / `workspace:`、Host bundle 文本不含把 `interview-dsh-shared` 当外部包名解析、Client 含 `window.__ModuleLoader__.load`。失败即不可发。Desktop 非 link 安装仍是归档门闩。

公开仓库卫生：`.gitignore` 忽略 `.dsh-interview/`（本机考场档案），MUST NOT 打进分发包。

## Risks / Trade-offs

- [Risk] Host bundle 漏打动态 import 或 typert 入口 → Mitigation：两个明确 entry；契约测试检查 `lib/index.js` 与 `lib/typert.host.js`；Desktop 点「开始」冒烟若失败则补入口。
- [Risk] 提交 `lib/` 与源码漂移 → Mitigation：`build` 流水线生成 `lib/`；契约测试在 `build` 之后跑；文档写明发版前必须重建 `lib/`。
- [Risk] tarball 安装进正在用的 profile 会换掉当前 `link:` 本仓库，开发回环变慢 → Mitigation：验收后可用 `add ./` 链回开发树；README 把 link 留给贡献者。
- [Risk] esbuild 改变 ESM 表面导致 Cordis 读不到 `apply`/`name`/`inject` → Mitigation：保持 named export，禁止 default export；bundle 后用 node 断言这三个导出存在。
- [Risk] dsh.pub 检查比本刀清单更严（例如拒绝某种 `files` 遗漏）→ Mitigation：对照 [develop-plugin.md](https://dsh.pub/develop-plugin.md) 列检查项；提交失败则按回报补，不改产品行为。

## Migration Plan

1. 先加 LICENSE、清单字段、`.gitignore` 与契约测试（红）。
2. 实现 `lib/` 打包并把根 `exports` 切过去；本地 `npm pack` 变绿。
3. 从正在用的 profile **卸掉** 旧的 `link:` 本仓库，改加 tarball；`dump-config`；重启 Desktop 点「面试」。
4. 提交含 `lib/` 的公开 commit；README 写安装/卸载/dsh.pub 提交。
5. 作者在目录页提交仓库 URL。需要改回本地开发时再 `dsh plugin add ./`。

无云端数据可回滚。若 tarball 装坏 profile，用 Desktop 已有的 `dsh plugin remove interview-dsh` 再装回上一份可用规格。

## Open Questions

无。npm 是否发布、是否等待 listed 徽章，已排除出本刀完成条件。
