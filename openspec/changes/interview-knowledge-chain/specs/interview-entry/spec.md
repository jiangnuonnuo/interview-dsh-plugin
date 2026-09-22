## MODIFIED Requirements

### Requirement: User can choose difficulty without changing the question bank
系统 SHALL 让用户在初级、中级、高级三者中选择恰好一个难度。默认 MUST 为中级。难度 MUST 作为知识链裁剪的输入（允许的考察层、起手层、同一知识点题数上限）。系统 MUST NOT 因难度切换而改用另一套预写死题。入口面板 MUST NOT 因此增加新控件。

#### Scenario: Default difficulty
- **WHEN** 入口面板首次打开且用户尚未改难度
- **THEN** 当前难度为中级

#### Scenario: Change difficulty
- **WHEN** 用户点选「高级」
- **THEN** 开始前配置中的难度为高级，本场知识链按高级裁剪

#### Scenario: Difficulty does not swap in a fixed paper
- **WHEN** 用户把难度从初级改到高级后开始
- **THEN** 题目仍由模型按该主题动态生成，系统 MUST NOT 改读一份预置高级题库
