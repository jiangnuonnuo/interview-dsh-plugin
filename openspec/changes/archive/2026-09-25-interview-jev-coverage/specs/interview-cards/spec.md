## ADDED Requirements

### Requirement: Settled coverage can route cards before comparison prose
当一张卡因新的人类作答需要定档时，系统 SHALL 在覆盖结果已合法落在五档之一后，立即按现有规则决定留在原卡、开 `Qn.m` 或开下一个 `Qn`。该覆盖结果 MAY 来自已开启的 Jev，MAY 来自对照补全。对照评语与五维 MUST 仍在作答后由会话 B 生成，MUST NOT 等到整场结束。未开启 Jev 时，系统 MUST 仍等同一次对照补全同时给出 `coverage`、评语与五维，再开卡。前端 MUST NOT 判断五档或计算分数。

#### Scenario: Jev coverage opens a child card before the comment lands
- **WHEN** 已开启 Jev，定档为追深或换大方面且未触达 reask 上限，对照评语尚未返回
- **THEN** 甲板按该档准备 `Qn.m`；原卡题干与已有内容不被覆盖；评语稍后仍写回原卡

#### Scenario: Jev miss does not show the next-card slot
- **WHEN** 已开启 Jev，定档为一点没答上或缺口大且未触达 reask 上限，对照评语尚未返回
- **THEN** 甲板不新增卡片，面板 MUST NOT 出现「正在准备下一题…」

#### Scenario: Fallback still waits for the comparison JSON
- **WHEN** 未开启 Jev，考生已提交作答
- **THEN** 开卡与对照、五维仍在同一次对照补全成功之后一起生效，行为与引入 Jev 之前一致

### Requirement: Reask cap opens the next topic
同一知识点上已落档为 `reask` 的次数达到 3 之后，系统 SHALL 把本张卡当作换知识点处理：MUST 开下一个 `Qn`，MUST NOT 开 `Qn.m`，MUST NOT 再按引导留在原卡。

#### Scenario: After three reasks the next card is Qn
- **WHEN** 当前知识点已有 `Q1`、`Q1.1`、`Q1.2` 三次 `reask` 定档，考生在下一张追问卡上再次作答
- **THEN** 新卡编号为 `Q2`（或下一个未占用的 `Qn`），不是 `Q1.3`
