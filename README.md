# interview-dsh

DSH 八股专项模拟面试插件。

## 业务背景

候选人已经在 DeepSeek Harness（DSH）里写代码、对话、选模型。为了准备技术面试，他们需要一种方式在**不离开编码环境**的情况下反复练习八股文。市面上传统的做法是开一个独立聊天产品、或把面试官与标准答案混在普通对话里——前者打断工作流，后者让用户面对一串互相干扰的气泡。

`interview-dsh` 的出发点是：**对话只发生在 DSH 现有对话里，右侧面板只做教练**。

| 位置 | 角色 | 用户感知 |
|---|---|---|
| DSH 现有对话 | 面试官 | 提问、追问、提示、换题、结束 |
| 右侧插件面板 | 教练 | 开始一场练习、看要点、看对照、看简报 |

当前产品方向只做**八股专项**。插件不提供独立聊天页，不是独立应用。这是开卷陪练，不是闭卷考场。

## 产品定位

- 目标用户：候选人。在自己的 DSH 工作区里自测、对照、留档。
- 不是：HR 系统、旁观教练、面试官后台、项目深挖或混合模式面试。

主场景：

1. 候选人打开 DSH。
2. 点击对话输入框右侧的「面试」按钮。
3. 在当前对话里作答（面试官视角）。
4. 右侧面板同步展示要点、标准答与评分简报。
5. 结束后回到普通助手，并在工作区留下本场材料。

## 架构总览

本仓库是 **DSH 插件**，不是独立应用。

```
DSH Web
  现有对话  = 面试官说话的唯一表面（宿主）
  右侧面板  = 本仓库前端（入口 + 评估）
       |
       v
  插件后端  = 提示词注入、双会话、评分、落盘
```

关键约束：

- 对话 UI、输入框、模型配置由 DSH 提供。
- 插件前端只做面板；`frontend/src/features/` 不得出现消息列表、输入框、气泡。
- 插件后端通过官方生命周期接入。
- Host SDK 只出现在 `backend/src/infra/dsh/`；Web Client SDK 只出现在 `frontend/src/infra/dsh/`。
- 跨端只通过 `shared/` 沟通，禁止 `fetch('/api/...')`。

## 目录结构

```
backend/     TypeScript：用例入口、领域服务、落盘、DSH Host 适配
frontend/    React 面板；DSH Web Client 适配在 src/infra/dsh/
shared/     前后端共享类型与错误码，无业务逻辑
cordis.patch.yml / 根 package.json 的 dsh.bundle  组合包清单
docs/
  product/REQUIREMENTS.md   产品定位与使用者
  architecture/ARCHITECTURE.md  架构设计与编码规范
openspec/    当前能力的实现 change
interviewer-role-prompt.md  面试官内容口径
doc/         UI 参考图
```

## 核心流程

1. **开考**：Client 展开面板 -> `sessions.create()` -> Host `attachInterviewer` -> `session.prompt` 只开口一次 -> `sessions.open` -> Host `briefCoach`。
2. **作答**：候选人继续在当前对话回答，插件只看守并刷新面板。
3. **结束**：面板「结束本场」清掉进行中快照并回到入口；面试官角色被摘掉，当前对话恢复普通助手。

会话隔离：

- 会话 A（新开的 DSH 对话）：面试官提问、追问、提示、换题、结束语。读场前历史；不得看见评分/标准答提示词。
- 会话 B（右侧面板）：教练展示要点、标准答、评分、简报。不得任何输出进入气泡；不得读场前历史。

## 插件安装与注册

本仓库以 **DSH 插件 bundle** 的形式分发。安装入口在 DSH 侧，本仓库只提供组合包清单。

### 1. 组合包声明

根 `package.json` 的 `dsh` 段声明 Host/Client 组合关系：

```jsonc
{
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"  // 向 DSH 注册插件条目
    },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-api-remotes",
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-ui-conversation"
      ]
    }
  },
  "main": "./backend/dist/index.js",
  "exports": {
    ".": "./backend/dist/index.js",
    "./client": "./frontend/dist/client.js",
    "./typert": "./backend/dist/typert.host.js"
  }
}
```

### 2. Bundle Patch

`cordis.patch.yml` 向 DSH 注入插件元数据：

```yaml
# interview-dsh bundle patch
- insert:
    - id: interview-dsh
      name: interview-dsh
```

### 3. 安装步骤

1. 在 DSH 的插件配置或插件市场里，将本仓库作为 bundle 引入。
2. DSH 读取根 `package.json` 的 `dsh.bundle.patch`，合并插件条目。
3. DSH 按 `exports` 加载：
   - `backend/dist/index.js` 作为 Host 插件入口（必须导出 `apply` 与 `name`）。
   - `frontend/dist/client.js` 作为 Web Client 面板入口。
   - `backend/dist/typert.host.js` 作为 Host Typert 适配。
4. DSH Web Client 按 `dsh.client.inject` 加载运行时依赖。
5. 插件生效后，对话输入框右侧会出现「面试」按钮；点击后展开右侧面板或 overlay。

> **注意**：本仓库是插件代码，不是 DSH 本身。用户侧通过 DSH 官方的插件管理界面完成安装与卸载。安装成功后，插件注册的 Slot 为：
>
> | Slot | id | 作用 |
> |---|---|---|
> | `conversation.input.right` | `interview-dsh` | 主触发按钮 |
> | `shell.overlay` | `interview-dsh/entry-overlay` | 回退面板 / 打开失败的可见错误层 |

### 4. 本地开发

```bash
# 安装依赖
npm install

# 构建前后端
npm run build

# 测试
npm test

# lint
npm run lint
```

构建产物位于：
- `backend/dist/` —— Host 入口
- `frontend/dist/client.js` —— Client 面板入口（样式内联进该文件，DSH 只加载此文件）

## 参考文档

| 文件 | 内容 |
|---|---|
| `AGENTS.md` | 项目级代理约束与开发准则 |
| `docs/architecture/ARCHITECTURE.md` | 架构设计与编码规范 |
| `docs/product/REQUIREMENTS.md` | 产品定位与使用者 |
| `openspec/changes/` | 当前能力的实现 change |
| `interviewer-role-prompt.md` | 面试官内容口径 |
| `doc/entrance.png` / `doc/layout.png` / `doc/entry-panel.png` | UI 参考 |
