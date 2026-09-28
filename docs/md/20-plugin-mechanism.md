# 插件化机制

这条链路回答：一份代码要怎样写成 DeepSeek Harness 认的插件，桌面端从哪里把它拉起来，Host 和 Client 各自必须交出什么，然后用户第一次点「面试」时走到哪里。

商场是桌面端这一个进程。店铺是本插件。柜台是 Client，后厨是 Host。水电仓库是桌面端事先入驻的服务。下面按入住手续的顺序写，不从档案目录倒着讲。

编码约束以 [架构文档](../architecture/ARCHITECTURE.md) 为准。一场面试怎么流转见 [分层](22-architecture-layers.md)、[流转](21-architecture-flow.md)、[交互](23-interaction-flow.md)。

## 1. 插件必须长成什么样

桌面端不运行 `backend/` 或 `frontend/` 源码。它只认仓库根上的一张入住表，加上已经构建好的 `lib/`。

根 `package.json` 要同时声明两半：

| 字段 | 本仓库的值 | 桌面端用它做什么 |
|---|---|---|
| `name` | `interview-dsh` | 插件名字，和补丁里的 `id` 相同 |
| `main` / `exports["."]` | `./lib/index.js` | 加载 Host |
| `exports["./client"]` | `./lib/client.js` | 加载 Client |
| `exports["./typert"]` | `./lib/typert.host.js` | Host 与 Client 共用的方法清单 |
| `dsh.bundle.patch` | `./cordis.patch.yml` | 往插件表插一行，声明「有这家后厨」 |
| `dsh.client.platform` | `web` | Client 跑在桌面端的网页里 |
| `dsh.client.inject` | 四个 `@deepseek-ai/dsh-client-*` 包 | 柜台进场前，先备好运行时、远程调用、布局、输入栏 |
| `files` | `lib`、`cordis.patch.yml`、`README.md`、`LICENSE` | 安装时带走的表面 |

`cordis.patch.yml` 只有这一行插入：

```yaml
- insert:
    - id: interview-dsh
      name: interview-dsh
```

`name` 必须等于根包名。桌面端看到这行，才去 `main` 指向的文件里找启动函数。

## 2. 边界：什么才能被装配进去

DeepSeek Harness 是一套智能体对话系统。会话、智能体、模型、工具、系统提示和网页界面由它自己运转。外部插件是加进这套系统的，用同一张 Cordis 名字表，不是另一套运行时。

能被加载，必须是桌面端进程可以 `import` 的 JavaScript 模块。TypeScript 只是源码写法，`npm run build` 之后桌面端读的是 `lib/*.js`。它不会编译 `.ts`，也不会加载 `.jar`、`.class` 或别的语言包。

| 交出去的东西 | 能不能装配 |
|---|---|
| 带命名导出 `name`、`inject`、`apply` 的 `.js` | 可以。Host 与 Client 都要这种形状 |
| TypeScript 源码，但已经编成上面的 JS | 可以。本仓库就是这样 |
| 用别的工具生成的、同样导出这三个名字的 JS | 可以 |
| Java jar、Python 包、二进制 | 不可以直接装配。`inject` 里不会出现它们 |
| 只把源码目录放在 profile 里、没有 `lib/*.js` | 不可以。桌面端不跑 `backend/`、`frontend/` |

`inject` 里的每一项也必须已经是 JavaScript 注册出来的服务名，例如 `agents`、`llm`。桌面端没有步骤会启动 JVM，把 jar 里的类变成 `ctx` 上的对象。

Java 若要参与，只能在 Host 的 `apply` 已经跑在 Node 里之后，由这段 JS 自己去拉起 JVM，或请求一个已经在别处运行的 Java 服务。这和 Jev 用 `fetch` 打楼外接口是同一类：插件自己向外调用，不是 Cordis 把 jar 注入进来。

过了这条边界，插件只能使用已经交到 `ctx` 上的能力：改系统提示、读会话、另开一次模型生成、写工作区文件、往现成页面上挂号。用户消息怎么进智能体、智能体怎么答完一轮，仍由桌面端自己的会话完成。

## 3. 加载代码写在哪里

源码里的启动函数写在适配层，构建之后才变成桌面端真正加载的 `lib/`。

| 你要改的启动行为 | 写在这里 | 构建后桌面端读 |
|---|---|---|
| Host 的 `apply`、`name`、`inject` | `backend/src/infra/dsh/adapter.ts`，由 `backend/src/infra/dsh/index.ts` 命名导出 | `lib/index.js` |
| Client 的 `apply`、按钮和面板 | `frontend/src/infra/dsh/index.ts` | `lib/client.js` |
| 传菜口的方法名和参数形状 | `backend/src/typert.host.ts` 与 `frontend/src/infra/dsh/remote.ts` 写成同一套 id | `lib/typert.host.js` 与 Client 里的那份描述 |
| 告诉桌面端「请加载上面两半」 | 根 `package.json` 和 `cordis.patch.yml` | 原样带走 |

`npm run build` 先编译工作区，再把 Host 和 Typert 打进 `lib/`，并把 Client 复制为 `lib/client.js`。没有这一步，桌面端找不到启动文件。

## 4. Host 必须满足的要求

Host 是后厨的营业执照。桌面端用命名导出调用它，不认 `export default`。

`lib/index.js` 必须导出：

```ts
export const name = 'interview-dsh';
export const inject = ['agents', 'llm', 'agentDefaultModel', 'fs'];
export function apply(ctx) { /* ... */ }
```

`name` 与补丁、根包名一致。`inject` 是向商场已有部门要钥匙的名单，不是再安装四个插件。这四个名字由桌面端基础清单事先注册：`agents`、`llm`、`agentDefaultModel`、`fs`。Cordis 调用 `apply` 之前把它们放进 `ctx`。

`apply` 里要做的，是把本店服务放回同一张名字表：

```ts
ctx.provide('interviewEntry', service);
```

服务上挂 `typertRemote`，`serviceKey` 和 `namespace` 都是 `interviewEntry`。这样柜台稍后才能按方法名叫到后厨。

Host 的边界：

- 只在 `backend/src/infra/dsh/` 碰这些桌面端对象。
- 不在 Host 里注册按钮、右栏或浮层。那是柜台的事。
- 不自己 `listen` 端口，不用 `node:fs` 写项目文件。
- 不调用 `session.prompt`。往考场里放用户能看见的那两句话，是 Client 的事。

## 5. Client 必须满足的要求

Client 是柜台。它也导出 `name` 和 `apply`，顶层 `inject` 只有柜台真正用得着、而且沙箱里一定有的两项：

```ts
export const name = 'interview-dsh';
export const inject = ['slots', 'remote'];
export async function apply(ctx) { /* ... */ }
```

构建时，这个文件被包成网页模块，外面套上商场的装载器：

```js
window.__ModuleLoader__.load({ id: "interview-dsh", factory: (require) => { /* ... */ } });
```

React、Cordis、槽位这些不打进插件，运行时向商场 `require`。`dsh.client.inject` 里的四个官方前端包会先加载，否则柜台没有输入栏槽和浮层宿主。样式打进 `lib/client.js` 这一个文件，不另交一份 css。

`apply` 里做三件事：

1. `ctx.remote.$mount(...)` 挂上和 Host 同一份方法描述，之后用 `remote.interviewEntry.*` 下单。
2. `ctx.slots.inject('conversation.input.right')` 在输入栏右侧挂「面试」按钮。
3. `ctx.slots.inject('shell.overlay')` 挂教练面板。商场若有官方右栏，再登记一个 tab。

`sessions` 和 `workspaces` 不写进顶层 `inject`。点「开始」时再用 `ctx.get` 或嵌套 `inject` 问一次。商场当时没有，就在面板上显示失败，而不是让整个 `apply` 在启动时崩溃。

Client 的边界：面板里不自己画消息列表和输入框。说话仍发生在商场原来的对话里。

## 6. 重启时桌面端怎样把两半拉起来

`dsh plugin add` 把上述根包放进正在使用的 profile，一般是 `web`。然后要完全退出并再次打开桌面端。

重启后 Cordis 按顺序做：

1. 先套上桌面端自带的基础清单，`agents`、`llm`、`agentDefaultModel`、`fs` 已经在名字表上。
2. 读到 `cordis.patch.yml` 的 `interview-dsh`，加载 `lib/index.js`，按 `inject` 把四把钥匙放进 `ctx`，调用 Host 的 `apply`。后厨挂出 `interviewEntry`。
3. 按 `dsh.client` 加载 `lib/client.js`，先备好那四个前端包，再调用 Client 的 `apply`。按钮和面板出现在已有网页上，传菜口两边的菜单对上。

本机若用目录链接安装，profile 里会是 `interview-dsh@link:…`，改的是当前工作副本。别人按钉死的 commit 安装，列表里是那次提交的版本号，例如 `interview-dsh@2.0.0`。两种装法走的都是上面这三步。

## 7. 真正用起来时走到哪里

用户打开项目，看到输入栏「面试」，从这里才进入业务。

1. 点按钮只打开面板，不新建聊天。按钮是第 5 节挂上的槽。
2. 选定主题后，柜台经传菜口叫 `interviewEntry.acceptEntryConfig`。后厨只做校验。
3. 柜台自己用 `sessions.create` 在当前项目下新开考场对话，再 `session.prompt` 放入开场句，并 `sessions.open` 切过去。
4. 后厨用 `ctx.agents.get(sessionId).ctx.systemPrompt.section(...)` 把人设交给这场对话的智能体。智能体仍由桌面端自己的会话去生成，它不来调用插件。
5. 用户在原输入框作答后，面板再叫 `watchCoachTurn`。后厨读智能体日志，用 `ctx.llm` 和 `ctx.agentDefaultModel` 写出对照，从传菜口回到面板。
6. 需要留下档案时，后厨用 `ctx.fs`：先拿这场对话的项目目录，`resolve` 成货位，再 `writeText` 到 `.dsh-interview/<考场会话>/`。柜台不写磁盘。
7. Jev 仍不在 `inject` 里。后厨在密钥连通成功后，才把 `config/jev.json` 写入同一个仓库。

到第 1 步能看见按钮，说明两半都加载成功。到第 4 步智能体按人设开口，说明 Host 拿到的 `agents` 已经用在这场会话上。
