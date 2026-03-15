# Project Mozart TODO（Pending Only）

> 本文件仅保留待办事项。已完成历史请查看 `PROGRESS.md`。

## Next Major Version Plan（v0.8 候选）
- **Version Theme: Library + Practice Intelligence**
  - 建立 motif 批量管理能力（多选、批量标签、批量删除、批量加入 phrase）。
  - 建立练习分析能力（近期开练次数、常用 motif、BPM 进展、转调覆盖率）。
  - 引入难度评估（音程跨度、密度、切分节奏）并回流到练习编排。
- **Milestone A（资产管理升级）**
  - Motif tags 编辑 UI（替代仅靠自由输入）。
  - Motif favorites/pinning。
  - Motif 独立导入导出 bundle。
- **Milestone B（练习闭环升级）**
  - Focused practice transforms（同轮廓全调、同节奏异音高映射）。
  - 区段化 phrase practice presets（按选中 phrase range 一键生成）。
- **Milestone C（可维护性）**
  - 继续扩展 generator preset 测试（overwrite / duplicate / pin ordering / notes persistence）。
  - motifs / morph trail / presets 面板的局部渲染优化，减少全量 re-render。

## Generator Improvements
- Expose logic cells more directly in the UI as reusable building blocks, not just hidden generator choices.
- Add user-editable melodic cell and rhythm cell libraries.
- Add stricter "surprise only at joins / only at ending / only in B section" constraints at block level.
- Add more phrase forms beyond current defaults, especially longer sentence shapes and asymmetrical phrase structures.
- Add phrase-aware continuation that respects previous block identity instead of only current pattern context.

## Library And Asset Management
- Complete motif bulk actions with batch tag editing (multi-select / batch delete / batch add-to-phrase / batch favorite already done).
- Add motif export/import as a standalone bundle, not only full project export.

## Practice And Analysis
- Add practice analytics: recent drills played, most-used motifs, tempo progression, and transposition coverage.
- Add phrase or motif difficulty estimation based on interval spread, density, and rhythmic syncopation.
- Add focused practice transforms such as "same contour in all keys" and "same rhythm, different note map."
- Add section-based phrase practice presets directly from selected phrase ranges.

## UX Polish
- Show a small "bridge recommendation preview" when hovering motif cards, before applying generator seeding.
- Add batch actions for selected phrase range: convert all to reference or frozen in one click.
- Review remaining mojibake/corrupted UI text and normalize all labels to consistent Chinese or bilingual wording.

## Technical Debt
- Add deterministic strategy for remaining stochastic generator tests to minimize CI flakiness.
- Expand generator preset tests to cover overwrite/duplicate, pin ordering, and note persistence in app-state transitions.
- Add tests for motif provenance/filter behavior and morph trail export-to-motif flow.
- Continue replacing remaining `window.prompt` flows (preset / instrument / morph trail edits) with in-app dialogs.
- Reduce expensive full re-render paths in panels with growing lists like motifs, history, morph trail, and presets.


## Next Iteration Focus（v0.8 Sprint-1）
- Motif 批量标签编辑（多选后统一增删 tag）
- Phrase 区间批量动作第一版（批量 reference/frozen 切换）
- Practice analytics 数据结构落地（最近练习与 BPM 进展）
