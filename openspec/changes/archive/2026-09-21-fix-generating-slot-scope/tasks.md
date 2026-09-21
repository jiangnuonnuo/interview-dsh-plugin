## 1. 失败测试先锁作用域

- [x] 1.1 把 `card-view.ts` 的甲板级 `shouldShowGenerating` 拆成 `shouldShowNextGenerating` / `shouldShowRefreshGenerating` 的单测合同：仅看最新已评卡时下一张生成为真；看历史卡或 pending 为假；刷新只在正在看被刷新卡时为真。改 `card-view.test.ts` 后跑该文件，实现前失败
- [x] 1.2 改 `InProgressPanel.test.tsx`：已评-only 甲板在流态仍有 `generating-next`；点「查看完整内容」进入详情后可见「标准答要点」、无「正在准备下一题」。两张已评卡在预生成时流态可点历史 peek / 「上一题」再进详情，详情无生成中；切回最新真卡后邻卡槽仍在。刷新 pending 时仅该卡可见「正在生成本题」，切到已评历史卡后消失，且「查看完整内容」仍可点。跑该文件，实现前失败
- [x] 1.3 改 `EntryPanel.watch.test.tsx`：watch 返回 scored-only 甲板且已在详情时，仍显示本题题干与要点，详情内无 `generating-next`；若在流态，点「查看完整内容」仍能进详情。跑该文件，实现前失败

## 2. 面板按谓词渲染

- [x] 2.1 实现 1.1 的两个谓词，删除甲板级 `shouldShowGenerating`。`card-view.test.ts` 通过
- [x] 2.2 `InProgressPanel`：流态仅在最新真卡且无真实下一张时画邻卡 `generating-next`，该槽不接收点击且不得挡住历史 peek / 当前卡「查看完整内容」；`refreshing` 只禁用刷新按钮。详情永远先画当前卡标准答要点，仅刷新该待答卡时才用「正在生成本题」替换要点；去掉因下一张预生成给详情加的 `detailGenerating`。1.2 单测通过
- [x] 2.3 对齐 `EntryPanel.watch` 场景与分页幽灵点（仅下一张预生成且正在看最新真卡时出现）。1.3 与相关 frontend 测试通过

## 3. 回归与桌面核对

- [x] 3.1 `rg` 确认 `frontend/src/features/` 无消息列表/气泡/聊天输入；`shouldShowGenerating` 不再被面板使用。`npm test --workspace=interview-dsh-frontend` 通过
- [x] 3.2 `npm test`、`npm run lint`、`npm run build` 通过；重建 `frontend/dist/client`
- [x] 3.3 在本机已使用的 DSH Desktop 中：答完一题后流态可见下一张邻卡生成中槽，仍可点上一题 / 历史 peek / 「查看完整内容」；最新已评卡详情标准答要点仍在、无「正在准备下一题」；历史卡可完整阅览。未打开 Desktop 不得勾选
