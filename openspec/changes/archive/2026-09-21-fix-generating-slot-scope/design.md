## Context

动机见 `proposal.md`。现行实现把生成中收成甲板级开关：`shouldShowGenerating(latest.status, refreshing)` 在最新卡已评或整面板 `refreshing` 时为真。流态把转圈画在右侧邻卡槽，但该槽更大、且面板没有把「预生成」当成卡槽任务，切卡 / peek / 「查看完整内容」没有单独的「不锁整页」合同。详情态则用同一开关替换**当前浏览卡**的标准答要点，并给整页加 `detailGenerating` 灰显。看守预生成时序（已评先返回、下一拍 brief）保持不变，本刀只修正前端作用域与命中区域。

```
now (panel-wide generating)
+----------------------------------+
| latest scored OR refreshing      |
|   flow: next peek spinner        |
|   detail: overwrite THIS card    |
|   risk: hits / 查看完整内容 blocked|
+----------------------------------+

target (per-card async slot)
+------------------+     +------------------+
| ready cards      |     | next slot task   |
| peek / 上一题     |     | preparing next   |
| 查看完整内容      |     | no hit steal     |
+------------------+     +------------------+
```

## Goals / Non-Goals

**Goals:**

- 把「下一张预生成」和「刷新本题」拆成两个可见性谓词，都绑定到具体卡，而不是整页。
- 详情态永远先画当前卡自己的内容；下一张预生成不得进详情正文。
- 流态在预生成期间保持可点：历史 peek、上一题、分页、当前卡「查看完整内容」。
- 单测锁住历史回看、最新已评详情仍有要点、流态预生成时能进详情。

**Non-Goals:**

- 不改 `watchCoachTurn` 字段、不增加 `briefing` / 第三种 `CardStatus`。
- 不把生成中做成可滑入的虚拟卡，不改切题边界（最新真卡上「下一题」仍停在最新真卡）。
- 不改产品图文件；`interview-panel-flat-live-update.png` 只对照流态邻卡槽。
- 不回填已归档 `interview-panel-flat-cards`。

## Decisions

### 1. 两个谓词，不再用甲板级 `showGenerating`

在 `card-view.ts` 拆：

- `shouldShowNextGenerating({ viewingLatest, latestStatus })`：仅 `viewingLatest && latestStatus === 'scored'`。用于流态右侧 peek 与分页幽灵点。
- `shouldShowRefreshGenerating({ viewingTarget, refreshing })`：仅 `refreshing && viewingTarget`。`viewingTarget` 为当前浏览卡就是被刷新的那张待答卡（甲板 `currentCardId` / 最新 pending）。

详情态渲染标准答要点，除非 `shouldShowRefreshGenerating`；MUST NOT 因 `shouldShowNextGenerating` 卸掉要点。废弃详情里「下一张预生成」的 `GeneratingSlot` 和 `detailGenerating` 灰显。

`refreshing` 只禁用「刷新本题」按钮，MUST NOT 禁用切卡、邻卡 peek、分页或「查看完整内容」。

备选：保留一个布尔、只在 `viewingLatest` 时插入详情槽。否决：最新已评卡详情仍会被生成中顶掉要点，与截图问题同类。

备选：生成中做成可滑入的第 N+1 张虚卡。否决：会改「下一题」可点边界和分页，超出本刀。

### 2. 流态邻卡槽是异步任务，不是整页模式

`next` 真卡存在时永远 peek 真卡。`next` 为空且 `shouldShowNextGenerating` 时画 `generating-next`（「正在准备下一题…」）。刷新中且正在看被刷新的待答卡、又没有真下一张时，同一 peek 位置改文案为「正在生成本题…」。用户切到历史卡后两个槽都不出现。

生成中槽 MUST `pointer-events: none`（或等价不接收点击），且层叠 / 尺寸 MUST NOT 盖住历史 peek、当前卡主体和「查看完整内容」。历史 peek 与当前卡详情入口在预生成期间保持可点：peek 切到该历史卡，再点「查看完整内容」进该卡详情。

### 3. 测试先改成失败再改实现

改掉现行断言「详情里题干与作答之间必有 generating-next / 无标准答要点」。补：已评-only 甲板进入详情可见要点、无「正在准备下一题」；流态预生成时点上一题 / 历史 peek / 「查看完整内容」仍成功；切回历史卡无生成中；返回流态且停在最新真卡时邻卡槽仍在。`EntryPanel.watch` 在 scored-only 更新后断言详情仍是旧题要点，而不是详情内的生成中槽。

## Risks / Trade-offs

- [Risk] 详情里看不到下一张正在生成，用户以为卡住 → 流态邻卡槽、分页幽灵点、返回卡片流仍能看到；新卡到达仍自动切过去。
- [Risk] 旧单测把「详情插入生成中」当成合同，改完会红 → 本刀先改测试再改实现，避免把错误合同留着。
- [Risk] 刷新中切到历史卡后，用户不知道刷新还在跑 → 按钮文案「刷新中」仍在顶栏；失败仍走现有错误条。不在历史卡正文里画生成中，也不锁切卡。
- [Risk] 过大的生成中 peek 挡住「查看完整内容」 → 单测点击该按钮；必要时缩小 `generatingPeek` 或保证当前卡层叠在上且按钮可点。

## Migration Plan

无需数据迁移。前端改完即可；回滚即还原 `shouldShowGenerating` 与详情三元渲染。
