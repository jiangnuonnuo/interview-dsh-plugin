# 分发与发版

每次对外大版本都按本文：上面是规则，下面是命令。发新版时只改 **§2 当前对外版本** 里的版本号、SHA，以及 README 里同一条命令。不要重新想流程。

- 产品是什么：`docs/product/REQUIREMENTS.md`
- 能力与验收：OpenSpec
- `lib/` 怎么生成：`docs/architecture/ARCHITECTURE.md`

仓库：`jiangnuonnuo/interview-dsh-plugin`  
包名 / 卸载 id：`interview-dsh`  
Desktop profile：`web`  
目录页：https://dsh.pub/zh/plugins/interview-dsh/

## 1. 规则

- 不是每个 OpenSpec change 都发版。发版 = 这一批已在 Desktop 验收、可以给候选人装。
- 给人看的是 `package.json` 的 `version`；安装钉死的是 **40 位 commit**。没提交 `lib/` 的 commit 不能当这一版。
- 对外只给钉死 `--ref` 的 `npx dshpub add … --profile web`。装完必须重启 Desktop。
- 已装用户不会自动升级：先 `remove` 再 `add` 新 SHA，再重启。
- 目录页只钉首发 commit，同一仓库不要再提交。目录 SHA 可以落后于 README；推广时说清装的是哪一版。
- 禁止把 `git clone`、`npm run build`、`dsh plugin add ./` 写成候选人安装。不要 `npm publish`。
- `listed` 不是官方审核。README / 推广文案必须跟这一版 SHA 一致，不得再写「尚未收录」。推广海报是 `doc/sum.png`：海报里的安装命令、README 主安装命令、本文 §2 必须是同一条 SHA。换 SHA 后若海报未重出，不得继续把旧海报当本版安装说明。

## 2. 当前对外版本

发完新版先改这一节，再改 README。

| 项 | 值 |
|---|---|
| 版本 | `0.1.0` |
| SHA | `f54ce0dedcdd33ffc4da019e063ffa45280cae07` |
| 目录 | 已 listed，钉的也是这一 SHA |

候选人安装（复制这一条）：

```bash
npx dshpub add jiangnuonnuo/interview-dsh-plugin --ref f54ce0dedcdd33ffc4da019e063ffa45280cae07 --profile web
```

等价：

```bash
dsh plugin --profile web add github:jiangnuonnuo/interview-dsh-plugin#f54ce0dedcdd33ffc4da019e063ffa45280cae07
```

卸载：

```bash
dsh plugin --profile web remove interview-dsh
```

装完或卸完都要**完全退出并重启 DSH Desktop**。输入栏右侧「AI 优化」旁出现「面试」才算装上。

## 3. 候选人升级到新版

把 `<SHA>` 换成 §2 里的新 SHA：

```bash
dsh plugin --profile web remove interview-dsh
npx dshpub add jiangnuonnuo/interview-dsh-plugin --ref <SHA> --profile web
```

然后重启 Desktop。

## 4. 作者发下一版（每次同一套命令）

能力已验收之后，在仓库根目录执行。

```bash
# 1. 改根 package.json 的 version（这一版的世代号）

# 2. 生成安装器用的 lib/
npm run build
npm test

# 3. 提交源码 + lib/ + 根清单（此时 README 可先不改 SHA）
git add -A
git status
# 按 Conventional Commits 提交，例如：
# git commit -m "feat: 发布 0.2.0"

# 4. 取出这一版 SHA
git rev-parse HEAD

# 5. 用上一步的 40 位 SHA 替换：本文 §2、README 安装/等价命令；
#    若 `doc/sum.png` 内嵌了安装命令，同步重出海报后再提交
#    再提交一次文档，例如：
# git commit -m "docs: 钉死 0.2.0 安装命令"

# 6. 推到公开 main
git push origin main
```

之后把 §2 和 README 里的安装命令发给候选人。已装用户用 §3。

不要去 https://dsh.pub/zh/submit/ 再贴同一仓库。目录不会自动改 SHA；要装本版就用 README / 本文 §2，不要默认目录页还是最新。

核对 listed（不必每次发版都做）：

- 页面：https://dsh.pub/zh/plugins/interview-dsh/
- 徽章：https://dsh.pub/api/badges/jiangnuonnuo/interview-dsh-plugin.svg
