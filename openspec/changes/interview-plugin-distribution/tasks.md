## 0. 本刀完成门槛（先读）

本 change 没有「只写代码就算完」。**实现者必须**用 tarball 或 `github:jiangnuonnuo/interview-dsh-plugin#<commit>` 把组合包装进 **正在使用的 DSH Desktop profile**（禁止 `dsh plugin add ./` / `link:`），重启该 Desktop，点输入栏「面试」见到入口面板。否则整份 tasks 视为未完成，6.3 不得勾选，不得归档。

**禁止划进本刀：** `npm publish`；把三个 workspace 合成单包源码；改卡片/双会话/落盘/人设；用 `prepare` 当用户安装路径；把本机 Desktop 安装目录写进仓库；把「dsh.pub 已 listed」当作代码完成条件。

## 1. 上架文件与失败的契约测试

- [x] 1.1 根目录增加 MIT `LICENSE`；`.gitignore` 忽略 `.dsh-interview/` 且不忽略 `lib/`。确认 LICENSE 存在，`git check-ignore lib/index.js` 无输出
- [x] 1.2 增加分发契约测试（可放根脚本并由 `npm test` 调用）：断言根包非 `private`、有 `license`、`exports` 含 `./client` 与 patch、`lib/index.js` 与 `lib/client.js` 存在、`npm pack --dry-run` 含这些文件与 LICENSE、打包清单无 `interview-dsh-shared` / `workspace:`、Host 入口不把 `interview-dsh-shared` 当外部模块、Client 含 `window.__ModuleLoader__.load`。在尚未生成 `lib/`、根包仍 `private` 时该测试失败

## 2. 生成 `lib/` 分发产物

- [x] 2.1 根包增加打包脚本：esbuild（或等价）把 `backend/src/infra/dsh/index.ts` 与 `backend/src/typert.host.ts` 打到 `lib/index.js`、`lib/typert.host.js`，内联 `interview-dsh-shared` 与 `zod`，只留 Node 内置为 external。`node -e` 动态 import `lib/index.js` 能读到 named `apply`、`name`、`inject`，无 default export
- [x] 2.2 打包脚本把 `frontend/dist/client.js` 复制为 `lib/client.js`。`npm run build` 之后跑该脚本，`lib/client.js` 含 `__ModuleLoader__.load` 且 id 为 `interview-dsh`
- [x] 2.3 根 `build` 在 workspaces 构建之后生成 `lib/`。`npm run build` 后 `lib/index.js`、`lib/typert.host.js`、`lib/client.js` 均存在

## 3. 根清单切到分发入口

- [x] 3.1 根 `package.json`：去掉 `private`；`license` 为 MIT；`main`/`exports` 指向 `lib/`（含 `./client`、`./typert`、`./cordis.patch.yml`）；`files` 含 `lib/`、`cordis.patch.yml`、`README.md`、`LICENSE`；安装器 `dependencies` 不再含 `interview-dsh-shared` 或 `*`。保留 workspaces。`cordis.patch.yml` 的 `name` 仍为 `interview-dsh`
- [x] 3.2 契约测试通过。`npm pack --dry-run --json` 列出 `lib/index.js`、`lib/client.js`、`cordis.patch.yml`、`LICENSE`，且无 `workspace:` 依赖

## 4. 文档

- [x] 4.1 更新 `docs/architecture/ARCHITECTURE.md`：根清单同时是分发边界；安装器加载 `lib/`；workspaces 与 `dist/` 仅开发。与实现一致，不改 `REQUIREMENTS.md` 产品主链路
- [x] 4.2 重写 README 快速开始：主路径为钉死 commit 的 `npx dshpub add jiangnuonnuo/interview-dsh-plugin --ref <sha> --profile web`（或等价 `dsh plugin add github:…#sha`）、卸载 `dsh plugin --profile web remove interview-dsh`、安装后重启 Desktop；clone/`npm run build` 降为贡献者附录；写明 dsh.pub 提交页；在未 listed 前不声称已上架。公开仓库 URL 与 `origin` 一致

## 5. 仓库验证

- [x] 5.1 `npm test`、`npm run lint`、`npm run build` 通过。`rg` 确认根安装器依赖无 `interview-dsh-shared`，无 `prepare` 作为用户安装路径，`features/` 仍无聊天表面

## 6. 桌面验收（非 link）

- [x] 6.1 在仓库根 `npm pack` 得到 tarball。若 Desktop 的 `add` 不接受 tarball，改为先推送含 `lib/` 的公开 commit，再用 `github:jiangnuonnuo/interview-dsh-plugin#<sha>`。验证：得到的规格不是本仓库绝对路径
- [x] 6.2 从正在使用的 profile `dsh plugin --profile <该profile> remove interview-dsh`（若已装），再 `add` 6.1 的规格。`dsh --profile <该profile> --dump-config` 含 `interview-dsh` 层。勾选前注明 profile 名与 Desktop 版本

```
Desktop 版本：dsh CLI 指向 com.yeagoo.dsh-desktop 的 harness profile（本机既有 Desktop 安装）
Profile：web
安装规格：file:/Users/jiang/Item/plugin/interview-dsh/interview-dsh-0.1.0.tgz（已从 profile 去掉 link: 本仓库；node_modules/interview-dsh 为解压后的包，仅含 lib/ 等 7 个分发文件，不是源码树 symlink）
dump-config：含 `# == interview-dsh` / id: interview-dsh / name: interview-dsh
```

- [x] 6.3 **【验收门槛】** 重启该 Desktop（禁止新建 profile、禁止 Vite），点输入栏「面试」：当前对话不变，右侧出现入口面板。勾选前填写：

```
Desktop 版本：0.2.17（/Applications/DSH Desktop.app，com.yeagoo.dsh-desktop）
Profile：web
安装规格（tarball 或 github:…#sha，禁止 ./）：file:/Users/jiang/Item/plugin/interview-dsh/interview-dsh-0.1.0.tgz
dump-config 是否含 interview-dsh：是（# == interview-dsh）
点「面试」是否打开入口：是。重启 Desktop 后打开当前「新会话」，输入栏「面试」在「AI 优化」旁；点击后面板出现「模拟面试」、xerina 署名、主题搜索、预设、难度与「开始模拟面试」。当前会话仍为「新会话」，对话未跳转。
```

未填写或仍写 `add ./` 不得勾选，不得归档。
