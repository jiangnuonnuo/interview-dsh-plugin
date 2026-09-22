## Purpose

按考察意图判断考生这轮答到了哪一档，再决定是在原卡上引导，还是开出真正的追问。语义判断留给对照模型，开不开卡由代码执行。

## ADDED Requirements

### Requirement: Coverage judgment is semantic and comes from the comparison
系统 SHALL 在考生作答后，由对照判断该作答相对本题考察意图属于且只属于下列五种之一：一点没答上、缺口大、追深、换大方面、下一正式问。判断 MUST 承认同义说法，MUST NOT 要求措辞与意图原文一致。代码 MUST NOT 用正则、字符串包含或未覆盖条数来代替这个判断。五种结果 MUST NOT 出现在考场气泡或面板上。

#### Scenario: A paraphrase still counts as hitting the intent
- **WHEN** 考生没有复述考察意图的原文，但说清了同一意思
- **THEN** 对照不得仅因措辞不同而把它判成一点没答上

#### Scenario: Gap size is not a missed-item count
- **WHEN** 对照需要区分缺口大和追深
- **THEN** 系统不得用未覆盖清单的条数阈值做这个区分

### Requirement: Code opens a card only for a real follow-up
代码 SHALL 只根据对照给出的那一种结果决定卡片：一点没答上或缺口大时留在原卡并引导；追深或换大方面时新开子卡 `Qn.m`；下一正式问时新开下一个 `Qn`。系统 MUST NOT 再凭下一题材料里自填的追问关系开卡。引导 MUST NOT 新开卡片。

#### Scenario: Total miss stays on the same card
- **WHEN** 对照结果是一点没答上
- **THEN** 甲板不新增卡片，面试官在原题上引导，后续补充仍记在这张卡上

#### Scenario: A wide gap stays on the same card
- **WHEN** 对照结果是缺口大
- **THEN** 甲板不新增卡片，引导只指向还没碰到的那一大块

#### Scenario: Deepening one touched point opens a child card
- **WHEN** 对照结果是追深
- **THEN** 甲板新增子卡，编号为当前知识点下的 `Qn.m`，原卡的题干与已写对照保持不动

#### Scenario: Re-asking a major aspect opens a child card
- **WHEN** 对照结果是换大方面
- **THEN** 甲板新增子卡，编号为下一个 `Qn.m`，而不是下一个知识点的 `Qn`

#### Scenario: A finished layer opens the next formal question
- **WHEN** 对照结果是下一正式问
- **THEN** 新卡编号为下一个 `Qn`，不是上一知识点的 `Qn.m`

### Requirement: Guidance is capped without defining difficulty
同一张正式问上的引导 MUST NOT 超过两轮。第二轮对照仍是一点没答上或缺口大时，系统 SHALL 把这张卡按当时对照定稿，并允许下一道正式问开新卡。这个上限 MUST NOT 被当作初级、中级、高级的难度定义。

#### Scenario: Second miss closes the card
- **WHEN** 同一张卡已经引导过一次，补充作答后的对照仍是一点没答上或缺口大
- **THEN** 这张卡不再继续引导，后续新的正式问使用新卡

### Requirement: Difficulty clips layers and how explicit a guide may be
难度 SHALL 由代码规定起手层、允许层和引导尺度，MUST NOT 再用同一知识点的题数上限决定换题。初级起手为定义，允许定义与场景，引导可以把步骤点到只剩最后一问。中级起手为原理或场景，允许定义、原理与场景，引导只点出缺口。高级起手为取舍或边界，四层都允许，引导只标出缺的那一刀；对照为下一正式问时，新问 MUST 换前提或换规模。模型给出的层不被该难度允许时，系统 MUST 改到该难度允许的最高层。

#### Scenario: Junior guide may name the steps
- **WHEN** 本场难度为初级，且对照结果是一点没答上或缺口大
- **THEN** 引导可以点出到达最后一问之前的步骤，并把最后一问留给考生

#### Scenario: Senior next question changes the premise
- **WHEN** 本场难度为高级，且对照结果是下一正式问
- **THEN** 新的正式问换了一个前提或规模

### Requirement: The interviewer speaks before the card decision is known
考生发送后，面试官 SHALL 按作答前已挂上的系统段开口。该段 MUST 写明五种结果各自对应引导、子问或换题，以及本难度的引导尺度。系统 MUST NOT 为了等对照完成而再向考场 `prompt`。卡片以对照结果为准：若面试官已经说出下一问，但对照是一点没答上或缺口大，系统 MUST 仍留在原卡。引导气泡 MUST 是口语，MUST NOT 成为新的「【本题】」。子卡与下一正式问 MUST 是一次一个待答问。气泡 MUST NOT 出现五种结果的名称、JSON 或知识链正文。

#### Scenario: A spoken new question does not open a card when coverage says guide
- **WHEN** 面试官已经说出另一问，而对照结果是一点没答上或缺口大
- **THEN** 甲板不因此新增卡片，补充作答仍叠在原卡

#### Scenario: A guide is not marked as a new question
- **WHEN** 对照结果是一点没答上或缺口大，面试官给出引导
- **THEN** 该气泡不是新的「【本题】」，其中看不到五种结果的名称

### Requirement: A missing chain is repaired before the interviewer is left unconstrained
当开卷要点已经解析、知识链字段不合法时，系统 SHALL 用同一道题再请求一次完整知识链。第二次仍不合法时，系统 SHALL 用题干摘要、第一条要点和该难度起手层补一份合法链，经现有层裁剪后挂上 `interview:chain`。这种补链 MUST NOT 摘掉系统段，MUST NOT 让面试官退回没有本题约束的人设。系统段接口本身挂载失败时，面板仍展示挂载失败，卡片要点仍保留。

#### Scenario: The retry returns a legal chain
- **WHEN** 第一次开卷只有题干摘要和要点，第二次返回合法的知识点、层、意图和三档
- **THEN** 系统挂上第二次的知识链，面板不出现「本题知识链没有挂上」

#### Scenario: Both attempts omit a legal chain
- **WHEN** 两次开卷都没有合法知识链，但要点已经解析
- **THEN** 系统挂上补出来的合法链，初级层为定义，追问不再退回无人设约束的自由发挥
