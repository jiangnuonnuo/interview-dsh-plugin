## ADDED Requirements

### Requirement: Exam session joins the current workspace group
合法开始创建考场会话时，系统 SHALL 把该会话挂到用户当前所在的 DSH 工作区分组（用户正在看的项目，而不是「未分组」）。当 Client 能解析到该工作区的稳定 id 时，创建参数 MUST 只带这个工作区 id，MUST NOT 只带目录路径——只带路径时会话会进入「未分组」。系统 MUST NOT 以空参数创建考场。无法解析当前工作区时，面板 MUST 展示可见错误，MUST NOT 注入面试官，MUST NOT 假装已开始。新考场仍是单独的面试官会话，MUST NOT 把面试官注入用户正在写代码的那条对话。

#### Scenario: Start from a project page stays in that project
- **WHEN** 用户在已打开某项目工作区的 DSH 页面合法点「开始模拟面试」，且 Client 能解析到该工作区 id
- **THEN** 新考场会话出现在该项目的会话列表中，工作目录等于该工作区路径，系统 MUST NOT 把当前视图切到「未分组」里的其它会话

#### Scenario: Ungrouped leftover chats are not the landing place
- **WHEN** 侧栏「未分组」里已有标题为开始本场模拟面试的旧会话，用户从另一个已打开的项目页再次开始
- **THEN** 本场新考场仍挂在该项目分组下，MUST NOT 把用户重定向进那些未分组旧会话

#### Scenario: Missing workspace is visible
- **WHEN** 用户合法点开始，但 Client 无法得到当前工作区的 id 或目录
- **THEN** 面板展示可见失败，对话中不出现面试官，工作区不被错误写入 Desktop 进程目录
