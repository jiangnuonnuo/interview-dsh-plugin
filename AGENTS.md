# AGENTS.md

## 架构实施

- 代码设计与落地必须遵守 [架构文档](docs/architecture/ARCHITECTURE.md)。
- 修改前先确认功能所属分层、模块职责和依赖方向。
- 实现与架构文档冲突时，先改架构并说明原因，不得自行绕过。
- 产品方向见 [产品文档](docs/product/REQUIREMENTS.md)；当前能力与验收以 OpenSpec change 为准。
- 已否决的做法与错误边界见 [禁区清单](docs/FORBIDDEN.md)，不要重试；本机版本事实也在那里。
- 本文件是全局规范，不是思考记录：单个 change 的方案取舍、调试结论、一次性说明不写在这里，进对应 change 制品或 [OpenSpec 配置](openspec/config.yaml) 的 `context`。

## OpenSpec 分工

- change 制品（`proposal` / `specs` / `design` / `tasks`）写在 `openspec/changes/`，归档后进 `openspec/changes/archive/`。
- 写 change 制品时的项目上下文、制品格式约束、apply 与 archive 阶段的行为约定，一律写进 [OpenSpec 配置](openspec/config.yaml) 的 `context` / `rules` / `operations.*.guidance`，不在本文件重复。
- 本文件只放编码阶段长期生效的硬约束。与 `openspec/config.yaml` 同类的约束，此处只给指向，不复制条目，避免两份漂移。
- 两边出现同一约束的不同表述时，按作用阶段判断归属：编码阶段归本文件，写 change 制品阶段归 `openspec/config.yaml`，只改归属那一处。
- `openspec init` / `openspec update` 只生成技能与斜杠命令文件，不改写本文件；本文件中的 OpenSpec 片段保持原样，不手工编辑。

## DSH 插件边界

- 本仓库是 DSH 插件，不是独立应用。对话表面归宿主；`frontend/src/features/` 不得出现消息列表、输入框、气泡。
- 主入口挂在 `conversation.input.right`，不得挂 `conversation.session.header.utilities`。
- `shell.overlay` 回退面板必须 `position: fixed` 且 z-index 足够，`absolute` 会被壁纸盖住。
- 查不到官方 API 时标 `TODO` 并在面板给出可见失败，禁止猜测 API 或自建聊天绕过。
- 打开面板、开始面试、落盘失败必须在面板可见，禁止空 catch。
- 禁止修改 DSH 核心或运行时（官方 Hook 除外）。

## 增量开发

- 功能必须拆成可独立验证的小步；先最小可演示，再补后续能力。
- 当前功能完成并验证后，再推进下一项。
- 不把后续能力回填进已归档 change，也不一次性实现尚未验证的步骤。

## 子代理协作

- 多模块或可并行的工作时可以开子代理；由复杂度、并行价值和冲突风险决定，不设文件数门槛。
- 子代理要有明确范围，避免同时改同一文件。
- 主代理负责合并结果并核对架构边界。

## Git 提交与评审

- 提交信息使用 Conventional Commits。
- 不得把本机 Desktop 安装目录写进仓库。
- 可以查看工作区状态、检查差异、运行验证并汇报待提交内容。
- 未获明确要求时，不得执行 `git add`、`git commit`、`git push`、合并或发布。
- 完成后保留工作区变更，说明验证结果和待评审范围。
