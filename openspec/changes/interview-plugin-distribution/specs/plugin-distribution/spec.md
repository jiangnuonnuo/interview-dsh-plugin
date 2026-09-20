## Purpose

把本仓库的 DSH 组合包做成别人无需 clone 开发树即可安装的分发制品，并保证安装后仍能打开教练入口，为提交 dsh.pub 做好仓库侧检查。

## ADDED Requirements

### Requirement: This change is not accepted without a non-link Desktop install
本 capability SHALL 在真实 DSH 桌面端完成验收后才算交付。验收用的安装规格 MUST 是 tarball 或钉死 commit 的 Git 规格，MUST NOT 是本仓库路径的 `dsh plugin add ./` 或 `link:`。`npm test`、`npm run build`、只改文档或只打开 dsh.pub 提交页 MUST NOT 单独构成本 capability 通过。未能在正在使用的 Desktop profile 上完成非 link 安装并见到「面试」入口时，本 capability MUST 视为未交付，MUST NOT 归档。

#### Scenario: Desktop install from packed or git spec is the gate
- **WHEN** 实现者用本刀产出的 tarball 或 `github:jiangnuonnuo/interview-dsh-plugin#<40位commit>` 执行 `dsh plugin --profile <Desktop正在使用的profile> add …`，重启该 Desktop，打开会话，点输入栏「面试」
- **THEN** 安装成功，`dsh --profile <该profile> --dump-config` 含本组合包层，当前对话不变且右侧出现入口面板

#### Scenario: Local link install does not pass the change
- **WHEN** 仅用 `dsh plugin add ./` 或其它指向本工作副本的 link 验证入口仍在
- **THEN** 本 requirement 仍为未满足

#### Scenario: Repository tests do not pass the change
- **WHEN** 仅仓库内单测与构建通过，或仅对照 dsh.pub 文档而尚未在 Desktop 用非 link 规格装过
- **THEN** 本 requirement 仍为未满足

### Requirement: Installable package does not require a source checkout
系统 SHALL 以根目录组合包为唯一安装单元。安装器拿到该包后 MUST 能解析 Host 入口、`./client` 与 `dsh.bundle.patch`，MUST NOT 要求用户再 `git clone`、`npm install` 工作区或 `npm run build`。Git 安装 MUST NOT 依赖用户批准 `prepare` 构建脚本才能加载。

#### Scenario: Packed archive contains runtime halves
- **WHEN** 对根包执行打包并检查归档内容
- **THEN** 归档含 Host 运行入口、Client 运行入口、`cordis.patch.yml`，且这些路径与根 `package.json` 的 `main` / `exports` / `dsh.bundle.patch` 一致

#### Scenario: User install command does not clone as a developer
- **WHEN** 对方按 README 主安装命令安装（`npx dshpub add …` 或钉死 commit 的 `dsh plugin add github:…`）
- **THEN** 不需要进入源码仓库执行 `npm install` 与 `npm run build` 即可把组合包装进其 DSH profile

### Requirement: Published dependency graph is registry-resolvable
根包在安装器视角下的 `dependencies` / `peerDependencies` MUST 只使用公开 registry 版本或为空（已打进运行产物）。MUST NOT 出现 `workspace:`、`"interview-dsh-shared": "*"` 或其它仅本仓库 workspaces 能解析的规格。Host 运行入口 MUST NOT 在安装后还去解析未随包提供的 `interview-dsh-shared`。开发期 workspaces 可以保留，但 MUST NOT 泄漏进安装器加载的运行图。

#### Scenario: No workspace protocol in the installable manifest
- **WHEN** 检查将交给安装器的根包清单（打包后的 `package.json`）
- **THEN** 其中没有 `workspace:` 范围，也没有对 `interview-dsh-shared` 的依赖项

#### Scenario: Host entry does not import unpublished workspace package
- **WHEN** 检查安装器将加载的 Host 运行入口
- **THEN** 该文件不把 `interview-dsh-shared` 当作外部模块解析

### Requirement: Admission files required by dsh.pub are present
仓库默认分发 commit SHALL 包含：根 `package.json`（声明 `dsh.bundle` 与 `dsh.client`）、`cordis.patch.yml`（`name` 等于根包名）、README、LICENSE 文件、以及 `main` 与 `exports["./client"]` 指向且实际存在的运行产物。根包 MUST 声明 `license`，MUST NOT 为 `private: true`。`exports` MUST 导出 `./client` 与 patch 文件。包名与仓库名 MUST NOT 暗示官方 DeepSeek 所有权。

#### Scenario: License file exists
- **WHEN** 检查仓库根目录
- **THEN** 存在 LICENSE 文件，且根 `package.json` 的 `license` 与之对应

#### Scenario: Bundle identity is self-owned
- **WHEN** 检查根包名与 `cordis.patch.yml` 的插入行
- **THEN** patch 的 `name` 等于根包名 `interview-dsh`，且不以 `@deepseek-ai/` 为前缀

#### Scenario: Runtime paths exist on the distribution commit
- **WHEN** 检查默认分支（或本刀交付的公开 commit）上 `main` 与 `exports["./client"]` 的路径
- **THEN** 这些文件存在于该 commit 中，不是仅存在于被忽略的本地构建目录

### Requirement: README documents one-command install and uninstall
README 的主路径 SHALL 给出对方可复制的安装命令（钉死到公开仓库 `jiangnuonnuo/interview-dsh-plugin` 的 commit，或目录收录后的 `npx dshpub add jiangnuonnuo/interview-dsh-plugin --ref <commit> --profile web`），MUST 给出卸载命令 `dsh plugin --profile web remove interview-dsh`，MUST 说明安装后需重启 Desktop。clone 源码与 `npm run build` MUST 降为贡献者附录，MUST NOT 当作普通用户安装步骤。README MUST 指向 dsh.pub 提交页作为作者上架步骤，MUST NOT 把「尚未 listed」写成已经上架。

#### Scenario: Primary install is a single command
- **WHEN** 读者只看 README 的快速开始
- **THEN** 看到一条安装命令和一条卸载命令，而不是 `git clone` + `npm install` + `npm run build` 作为主路径

#### Scenario: Listing status is not overclaimed
- **WHEN** 本刀完成但作者尚未在 dsh.pub 提交或目录尚未显示 listed
- **THEN** README 不声称插件已在官方/社区目录上架

### Requirement: Repository verifies the pack contract
仓库测试 SHALL 锁定分发契约：根清单可安装、归档含运行入口与 LICENSE、安装器依赖图不含 workspace 包。这些测试通过 MUST NOT 替代 Desktop 非 link 安装验收。

#### Scenario: Pack contract test fails when runtime is missing
- **WHEN** 根 `exports["./client"]` 或 Host `main` 指向的文件不存在，或打包清单仍依赖 `interview-dsh-shared`
- **THEN** 仓库测试失败

#### Scenario: Pack contract test passes on a releasable tree
- **WHEN** 已生成分发产物并满足清单约束
- **THEN** 该契约测试通过
