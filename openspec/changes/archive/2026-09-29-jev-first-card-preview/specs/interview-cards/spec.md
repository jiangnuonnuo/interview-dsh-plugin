## ADDED Requirements

### Requirement: Jev 定档后立即出现可预览的新卡
系统 SHALL 在 Jev 或对照完成覆盖路由并决定开追问或下一正式问后，先创建并发布一张可预览卡片。预览卡片 MUST 包含稳定卡片编号、面试官已经产出的完整题干、可读的本地题干摘要和待生成状态；卡片 MUST NOT 等待简报模型、参考要点、知识链安装或额外评分调用完成后才出现。

#### Scenario: Next formal question becomes visible before brief
- **WHEN** Jev 将当前作答判为 `next`，面试官已经产出下一道题，但简报模型尚未返回
- **THEN** 面板在短暂快照窗口内显示新的 `Qn` 卡片、题干和“参考要点生成中”，当前卡片与历史卡仍可切换

#### Scenario: Follow-up question becomes visible before brief
- **WHEN** Jev 将当前作答判为 `deepen` 或 `reask`，面试官已经产出追问题干，但参考内容尚未返回
- **THEN** 面板先显示新的 `Qn.m` 预览卡片，原卡的作答、对照和五维保持不变

### Requirement: 预览卡片在后台异步补齐参考内容
预览卡片发布后，系统 SHALL 在后台补齐题干简报、参考要点、考察层、意图和知识链。补齐结果 MUST 按卡片编号及当前评估版本写回，MUST NOT 因后台任务完成而重置题干、卡片编号、已有作答或路由。补齐期间面板 SHALL 保持卡片可打开、可切换和可查看。

#### Scenario: Brief enrichment updates the same card
- **WHEN** 预览卡片已经显示，后台随后成功生成简报、要点和合法知识链
- **THEN** 原卡编号与题干不变，参考区域由生成中状态更新为完整内容，阶段变为 `brief_ready`

#### Scenario: Stale enrichment cannot overwrite a newer version
- **WHEN** 同一会话已有新的作答版本或卡片已结束，旧预览卡的后台补齐任务随后返回
- **THEN** 系统丢弃旧任务的写回，不覆盖最新甲板和已结束轮次

### Requirement: 参考内容失败不阻塞预览卡片
当简报、要点或知识链后台补齐失败时，系统 SHALL 保留预览卡片、题干、编号和已有路由。面板 MUST 显示可定位到该阶段的失败状态，MUST NOT 把预览卡片隐藏、删除或伪装为完整参考内容；历史卡和后续考场交互仍可用。

#### Scenario: Brief model failure preserves the card
- **WHEN** 预览卡片发布后简报模型超时或返回非法结构
- **THEN** 面板仍可查看该卡题干和编号，参考区域显示“参考要点生成失败”及已有错误信息

#### Scenario: Chain installation failure preserves the card
- **WHEN** 参考要点已经生成但知识链安装失败
- **THEN** 卡片保留题干和参考要点，面板显示知识链未挂载的可见状态，系统不得回滚或删除卡片

### Requirement: 卡片生成关键路径遵循产品速度目标
系统 SHALL 将面试官定档完成到预览卡片可见作为独立阶段，并优先返回该阶段快照。预览阶段 MUST 只依赖已获得的题干、卡片关系和编号信息；任何可延后的模型调用、宿主 idle 等待和文件补充 MUST 在预览快照之后执行。重复看守或手动刷新 MUST 复用同一预览及补齐任务，不得再次创建卡片或重复调用同一题干的简报。

#### Scenario: Repeated watch reuses preview task
- **WHEN** 后台看守和用户刷新同时请求同一张待补齐的预览卡
- **THEN** 两次请求返回同一张卡片和阶段，系统只运行一组简报/知识链补齐任务

#### Scenario: Preview persistence precedes enrichment persistence
- **WHEN** 新卡预览已经创建而后台参考内容仍在生成
- **THEN** 会话快照和卡片文件先记录预览阶段，后续补齐只增量更新同一文件，用户可以在后台任务完成前恢复和查看该卡

## MODIFIED Requirements

### Requirement: Generating the next card keeps the existing deck visible
当下一张正式问的题干尚未产出时，进行中面板 MUST 继续展示已有卡片，并展示下一张卡正在生成的卡片形槽；题干一旦由面试官产出，系统 MUST 先把该题以 `preview_ready` 真卡发布，即使开卷要点尚未就绪也 MUST 显示卡片编号、题干和参考内容生成状态。系统 MUST NOT 变成空白进行中，MUST NOT 把当前卡整页冻成唯一表面，MUST NOT 用整卡转圈替换已经产出的题干，MUST NOT 删除或覆写已有卡的对照与五维。一点没答上或缺口大的引导 MUST NOT 展示「正在准备下一题…」，MUST NOT 因此追加新卡。生成中视觉 MUST 对齐 `docs/product-design/interview-panel-flat-live-update.png` 的流态邻卡槽：白底大圆角卡、橙色转圈、文案为「正在准备下一题…」。刷新本题时，被刷新的那张待答卡 MAY 使用同一视觉，文案为「正在生成本题…」，且 MUST 只出现在该待答卡上。

详情态展示任意已 brief 卡时，MUST 同时可见该卡编号、短标题、本题题干、标准答要点，以及作答 / 对照 / 评分折叠。引导后的作答 MUST 在作答折叠中按轮可见。下一张预生成 MUST NOT 插入该卡题干与折叠之间，MUST NOT 替换或隐藏该卡的标准答要点。流态 MUST 仍突出当前真卡；仅当当前突出卡已是甲板最新真卡、且下一张正式问题干尚未产出时，生成中槽占据下一张卡的位置。题干产出后，`preview_ready` 卡片占据该位置，生成中槽只保留在尚未得到题干的阶段。预生成 MUST NOT 禁用上一题、历史邻卡 peek、分页点或当前卡「查看完整内容」。参考内容就绪后 MUST 更新同一张预览卡为完整卡，且默认把当前卡定位到该新卡；若当时处于详情态，MUST 进入该新卡的详情，MUST NOT 无故退回入口。

#### Scenario: Generating placeholder appears before the new brief
- **WHEN** 对照结果是追深、换大方面或下一正式问，面试官已经产出题干但新卡开卷要点尚未生成
- **THEN** 已有卡仍可见，新的 `preview_ready` 卡片先显示编号、题干和参考内容生成状态；若题干尚未产出，流态才显示下一张卡形生成中槽；面板 MUST NOT 清空

#### Scenario: A guide does not show the next-card slot
- **WHEN** 对照结果是一点没答上或缺口大
- **THEN** 面板不出现「正在准备下一题…」，当前卡仍是这一题

#### Scenario: Generating looks like the next card not a frozen current card
- **WHEN** 面板处于下一张正式问的预生成且当前突出最新真卡（流态）
- **THEN** 在题干尚未产出时可见独立的生成中卡片槽（转圈 + 「正在准备下一题」）；题干产出后该槽立即变为 `preview_ready` 卡片并显示题干；当前卡编号与题干仍可读、仍可切回历史卡；MUST NOT 把整页锁成不可点

#### Scenario: Flow stays interactive while next is generating
- **WHEN** 最新卡已评、下一张正式问的开卷要点尚未就绪，用户在流态点历史邻卡 peek、或点「上一题」、或点当前卡「查看完整内容」
- **THEN** 切到对应历史卡，或进入当前卡详情；MUST NOT 被生成中槽拦截；进入的详情 MUST 无「正在准备下一题」

#### Scenario: Detail generating sits between stem and answer folds
- **WHEN** 用户在详情态且下一张正式问正在生成
- **THEN** 本题题干与标准答要点仍可见；作答 / 对照 / 评分折叠仍属于当前卡；MUST NOT 在题干与作答之间插入「正在准备下一题」；MUST NOT 隐藏标准答要点

#### Scenario: Existing card detail stays complete while next is generating
- **WHEN** 用户在任意已 brief 卡的详情态，且下一张正式问的开卷要点尚未就绪
- **THEN** 该卡题干与标准答要点仍可见；作答 / 对照 / 评分折叠仍属于该卡；MUST NOT 出现「正在准备下一题」；MUST NOT 隐藏标准答要点

#### Scenario: History browsing ignores next-card generating
- **WHEN** 甲板最新卡已评、下一张正式问尚未就绪，用户切到一张更早的历史卡（流态或详情态）
- **THEN** 该历史卡按已生成内容完整展示；MUST NOT 出现「正在准备下一题」

#### Scenario: Refresh generating stays on the refreshed card
- **WHEN** 用户正在刷新当前待答卡
- **THEN** 仅该待答卡可见「正在生成本题」；切到其它已生成卡后 MUST NOT 仍显示「正在生成本题」或「正在准备下一题」

#### Scenario: New card becomes current after brief
- **WHEN** 追深、换大方面或下一正式问的参考内容已生成
- **THEN** 甲板中的同一张预览卡更新为完整卡，生成中状态消失，面板默认突出该新卡（流态为当前卡，详情态则展示该新卡详情）


### Requirement: Cards persist to the current workspace
系统 SHALL 把**当前这一轮**甲板写入当前工作区目录 `.dsh-interview/<考场会话 id>/<轮次目录>/`：`session.json` 为机器可读真源，`cards/<编号>.md` 为人读副本。工作区根 MUST 是该对话强制打开的目录（会话 `cwd`）。考场会话 id MUST 是面试官会话 A 的 id，MUST NOT 使用教练会话 B 的 id，MUST NOT 使用点「开始」之前那条源对话的 id（复用考场再开一轮时除外：此时会话 id 仍是该考场 A）。题干或 `preview_ready` 卡片一出现 MUST 建立该卡文件，并先记录编号、题干和预览阶段；作答评分及后台参考内容补齐后 MUST 增量更新同一文件。同一考场会话上的新一轮 MUST 使用不同的轮次目录，MUST NOT 覆盖上一轮文件。关上面板再打开「面试」时，若当前轮仍进行中，系统 MUST 从该轮目录恢复全部卡片与当前卡；若当前轮已结束，系统 MUST NOT 把已结束轮恢复成进行中甲板。MUST NOT 依赖仅存活于进程内的路径表。开始前 MUST NOT 弹出文件夹选择。查不到工作区目录、会话 id 非法（空、含 `/` `\` 或 `..`）或 `fs` 写入失败时，面板 MUST 展示可见错误，MUST NOT 丢掉已有卡片，MUST NOT 空 catch。系统 MUST NOT 再向 `study/interview-dsh/` 写入新场；MUST NOT 读取、迁移或删除既有 `study/` 档案。

#### Scenario: Files appear with the first question
- **WHEN** `Q1` 题干已出现且工作区目录与合法考场会话 id 已知
- **THEN** 工作区先存在 `.dsh-interview/<该 sessionId>/<轮次目录>/session.json` 与 `.dsh-interview/<该 sessionId>/<轮次目录>/cards/Q1.md`，其中含编号、题干和 `preview_ready` 阶段；开卷要点完成后，同一文件再增量包含完整参考内容

#### Scenario: Scoring updates the same markdown file
- **WHEN** `Q1` 完成对照与五维
- **THEN** 同一轮次路径下的 `cards/Q1.md` 含作答、对照与分数，系统 MUST NOT 另起一份把 `Q1` 覆盖成下一题

#### Scenario: Overlay remount restores the deck
- **WHEN** 当前轮仍进行中、已有至少两张卡并已落盘，用户关闭面板后再点「面试」
- **THEN** 甲板、编号、分数与关闭前一致，无需重新开考

#### Scenario: Overlay remount after end does not revive the round
- **WHEN** 用户已点「结束本场」且本轮已结束，关闭面板后再点「面试」
- **THEN** 面板为入口而非进行中甲板，MUST NOT 把已结束轮当成当前待答场

#### Scenario: Persist failure is visible
- **WHEN** 无法解析工作区目录、会话 id 非法或写入失败
- **THEN** 面板展示错误，已生成的卡片仍可查看，系统 MUST NOT 把失败标成落盘成功

#### Scenario: Legacy study archives stay untouched
- **WHEN** 工作区里已有 `study/interview-dsh/` 旧场目录，用户开始一场新的模拟面试
- **THEN** 新轮只写入 `.dsh-interview/<sessionId>/<轮次目录>/`，MUST NOT 改写或删除该 `study/` 目录

#### Scenario: A second round uses a new directory
- **WHEN** 同一考场会话上第一轮已结束并已落盘，第二轮 `Q1` 开卷要点已生成
- **THEN** 第二轮文件在新的轮次目录下，第一轮 `session.json`、`cards/` 与 `qa.md` / `summary.md`（若有）仍在原目录


### Requirement: Settled coverage can route cards before comparison prose
当一张卡因新的人类作答需要定档时，系统 SHALL 在覆盖结果已合法落在五档之一后，立即按现有规则决定留在原卡、开 `Qn.m` 或开下一个 `Qn`；若路由需要新卡且面试官已经产出题干，系统 MUST 先发布对应的 `preview_ready` 卡片，再等待参考内容和比较 prose。该覆盖结果 MAY 来自已开启的 Jev，MAY 来自对照补全。对照评语与五维 MUST 仍在作答后由会话 B 生成，MUST NOT 等到整场结束。未开启 Jev 时，系统 MUST 仍等同一次对照补全同时给出 `coverage`、评语与五维，再开卡。前端 MUST NOT 判断五档或计算分数。

#### Scenario: Jev coverage opens a child card before the comment lands
- **WHEN** 已开启 Jev，定档为追深或换大方面且未触达 reask 上限，对照评语尚未返回
- **THEN** 甲板先出现对应的 `Qn.m` `preview_ready` 卡片；原卡题干与已有内容不被覆盖；参考内容和评语稍后分别补齐并写回对应卡片

#### Scenario: Jev miss does not show the next-card slot
- **WHEN** 已开启 Jev，定档为一点没答上或缺口大且未触达 reask 上限，对照评语尚未返回
- **THEN** 甲板不新增卡片，面板 MUST NOT 出现「正在准备下一题…」

#### Scenario: Fallback still waits for the comparison JSON
- **WHEN** 未开启 Jev，考生已提交作答
- **THEN** 开卡与对照、五维仍在同一次对照补全成功之后一起生效，行为与引入 Jev 之前一致

