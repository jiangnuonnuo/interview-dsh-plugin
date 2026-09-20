## Why

MVP 行为已经能在本机用 `dsh plugin add ./` 跑通，但仓库仍是开发态：无 LICENSE、`dist/` 被忽略、根包 `private`、Host 依赖 workspace 包名 `interview-dsh-shared`。别人不能用一条安装命令装上，dsh.pub 上架检查也会拒。现在要把组合包做成可分发制品，让后续提交目录后即可安装使用。

## 验收门槛（本刀完成条件）

本 change **未用「无本地 checkout 的安装规格」装进正在使用的 DSH Desktop profile、并在桌面端见到「面试」入口之前，不得标为完成、不得归档**。下列任何一项单独成立都不够：

- `npm test` / `npm run lint` / `npm run build` 通过
- 继续用 `dsh plugin add ./` 或 `link:` 本仓库目录
- 只改 README / 只发 GitHub、未在 Desktop 重载验证
- 只打开 [dsh.pub/zh/submit](https://dsh.pub/zh/submit/) 而安装规格仍依赖本机源码树

必须同时满足：

1. 默认分支（或本刀交付的公开 commit）含 LICENSE、README、`package.json` / `cordis.patch.yml`、以及 `main` 与 `exports["./client"]` 指向的运行产物。
2. 根包可 `npm pack`；tarball 内无 `workspace:` / `"interview-dsh-shared": "*"` 这类安装器无法解析的依赖，且含 Host、Client、patch。
3. 用 **tarball 或 `github:jiangnuonnuo/interview-dsh-plugin#<commit>`**（禁止 `add ./`）装进 Desktop 正在使用的 profile；`dsh --profile <该profile> --dump-config` 出现本组合包层。
4. 重启该 Desktop 后，点输入栏「面试」仍打开入口面板（产品行为不回退）。
5. README 给出一条对方可复制的安装命令（`npx dshpub add …` 或等价的钉死 commit 的 `dsh plugin add github:…`），以及卸载命令。在 dsh.pub 网页点提交可以留到本刀完成后由作者执行，但仓库侧检查清单 MUST 已对齐 [dsh.pub 上架合同](https://dsh.pub/develop-plugin.md)。

## What Changes

- 把根组合包做成可独立安装的 DSH bundle：运行时不再依赖 npm workspaces 或未发布的 `interview-dsh-shared`。
- 提交（或等价地打进 tarball）Host / Client 运行产物，使 Git 安装不必让用户跑 `prepare` / `npm run build`。
- 补齐 LICENSE、`license` 字段、去掉根包 `private`，`exports` 包含 patch；`files` 覆盖安装所需文件。
- README 从「clone 源码开发」改成「一条命令安装」；开发步骤降为贡献者附录。
- 增加打包与安装契约的仓库测试（pack 内容、依赖形态、入口文件存在）。
- 用非本地 link 的规格做一次真实 profile 安装 + Desktop 入口冒烟。
- 文档写明 dsh.pub 提交步骤；本刀不把「目录网页已显示 listed」当作代码完成条件。
- 不改面试官口径、卡片流、双会话、落盘路径。不发 npm（可列为后续，不阻塞 Git / dsh.pub）。

## Capabilities

### New Capabilities

- `plugin-distribution`: 可独立安装的组合包契约、打包产物、一条命令安装/卸载说明、无本地 checkout 的安装验证，以及对齐 dsh.pub 的上架检查清单。

### Modified Capabilities

- `interview-entry`: 「组合包可 `dsh plugin add`」从「本机清单字段存在」提升为「对方可用 Git/tarball 安装规格装进 profile」，本地 `add ./` 不再单独构成该 requirement。

## Impact

- 根 `package.json`、`cordis.patch.yml`、`.gitignore`、`LICENSE`、`README.md`。
- Host 构建：`backend/` 运行入口须自包含 `shared`（及安装后解析不到的 workspace 依赖）；`zod` 等对外依赖改由根包声明或打进产物。
- Client 仍由 `frontend/dist/client.js` 交付；构建不得把 Host workspace 包名留给安装器。
- `docs/architecture/ARCHITECTURE.md`：根清单同时是分发边界。
- 仓库测试：pack / 清单契约。Desktop：非 link 安装后的入口冒烟。
- 不修改 DSH 核心；不把本机 Desktop 安装目录写进仓库。
- 公开仓库沿用 `jiangnuonnuo/interview-dsh-plugin`。
