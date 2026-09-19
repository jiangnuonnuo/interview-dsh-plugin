## MODIFIED Requirements

### Requirement: Sessions MUST NOT read pre-start history
从**新建考场会话**的第一次「开始」起，会话 A 与会话 B SHALL 使用新建的面试上下文。系统 MUST NOT 把点开始之前那条编码对话里的消息当作本场面试材料。当同一条考场会话上开始**新的一轮**时，上一轮问答可以留在该会话记录中，但开口 MUST 把上一轮视为已结束，MUST NOT 把上一轮待答问或收尾句当作本轮第一问的素材。

#### Scenario: Pre-start messages are ignored
- **WHEN** 当前对话在开始前已有用户或助手消息，用户随后合法开始模拟面试并因此新建考场会话
- **THEN** 第一问与本题要点不引用那些场前编码消息作为本场素材

#### Scenario: A later round does not continue the previous pending question
- **WHEN** 同一考场会话上上一轮已结束（含收尾句），用户再次开始新一轮
- **THEN** 本轮第一问针对新的主题与难度，MUST NOT 把上一轮最后一问或收尾句当作本题

### Requirement: Start binds the exam room to the current workspace directory
合法开始**新建**考场会话时，系统 SHALL 把当前工作区目录传给会话创建（`workspaceId` 或 `cwd` 恰好一个）。系统 MUST NOT 以空参数创建考场并指望 Desktop 进程目录就是工作区。无法解析当前工作区目录时，面板 MUST 展示可见错误，MUST NOT 注入面试官，MUST NOT 假装已开始。当当前宿主会话已是本插件考场且本轮已结束、系统复用该会话时，MUST NOT 再 `create` 空参数会话；落盘仍使用该考场已绑定的工作区目录。

#### Scenario: Exam session receives workspace cwd
- **WHEN** 用户在已打开某工作区的 DSH 对话中合法点「开始模拟面试」且因此新建考场
- **THEN** 新考场会话的工作目录等于该工作区路径，后续卡片落盘使用该目录

#### Scenario: Missing workspace directory is visible
- **WHEN** 用户合法点开始，但 Client 无法得到当前工作区的 `cwd` 或 `workspaceId`，且需要新建考场
- **THEN** 面板展示可见失败，对话中不出现面试官，工作区不被错误写入 Desktop 进程目录

#### Scenario: Reused exam session keeps its workspace
- **WHEN** 当前会话已是已结束的考场会话，用户再次合法开始
- **THEN** 系统不新建会话，本轮档案仍写入该考场原工作区，MUST NOT 写到 Desktop 进程目录
