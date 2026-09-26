## MODIFIED Requirements

### Requirement: Packaged bundle declares Host and Client halves
系统 SHALL 以 DSH 组合包交付：根 `package.json` 声明 `dsh.bundle` 与 `dsh.client`（`./client` 导出浏览器半侧），并提供 `cordis.patch.yml`。此声明是桌面端安装的前置，不替代入口打开的实机验收。组合包 MUST 能用 tarball 或钉死 Git commit 装进 Desktop 正在使用的 profile；仅本机 `dsh plugin add ./` 成功 MUST NOT 单独构成该 requirement。

#### Scenario: Manifest is installable
- **WHEN** 检查根包 `package.json` 与 `cordis.patch.yml`
- **THEN** 存在 `dsh.bundle`、`dsh.client` 与 `./client` 导出，可供 `dsh plugin add` 使用

#### Scenario: Foreign install spec is required
- **WHEN** 用本仓库 tarball 或 `github:jiangnuonnuo/interview-dsh-plugin#<commit>` 把组合包装进 Desktop 正在使用的 profile（禁止 `add ./`）
- **THEN** profile 的 `dsh.profile.bundles` 含本包，且之后在桌面端点「面试」仍打开入口面板
