# Project Mozart TODO（Pending Only）

> 本文件仅保留待办事项。已完成历史请查看 `PROGRESS.md`。

## Generator Improvements
- Expose logic cells more directly in the UI as reusable building blocks, not just hidden generator choices.
- Add user-editable melodic cell and rhythm cell libraries.
- Add stricter "surprise only at joins / only at ending / only in B section" constraints at block level.
- Add more phrase forms beyond current defaults, especially longer sentence shapes and asymmetrical phrase structures.
- Add phrase-aware continuation that respects previous block identity instead of only current pattern context.

## Library And Asset Management
- Add motif tags editing UI beyond free-text save flow.
- Add bulk actions for motifs: multi-select, batch tag, batch delete, batch add to phrase.
- Add motif favorites/pinning similar to morph trail and generator presets.
- Add motif export/import as a standalone bundle, not only full project export.

## Practice And Analysis
- Add practice analytics: recent drills played, most-used motifs, tempo progression, and transposition coverage.
- Add phrase or motif difficulty estimation based on interval spread, density, and rhythmic syncopation.
- Add focused practice transforms such as "same contour in all keys" and "same rhythm, different note map."
- Add section-based phrase practice presets directly from selected phrase ranges.

## UX Polish
- Show a small "bridge recommendation preview" when hovering motif cards, before applying generator seeding.
- Add batch actions for selected phrase range: convert all to reference or frozen in one click.
- Add lightweight onboarding tips for generator modes, motif provenance, morph trail, and preset workflows.
- Add optional compact layout for smaller laptops.
- Review remaining mojibake/corrupted UI text and normalize all labels to consistent Chinese or bilingual wording.

## Technical Debt
- Add tests around generator preset import/export, overwrite, duplicate, pin ordering, and notes persistence.
- Add tests for motif provenance/filter behavior and morph trail export-to-motif flow.
- Reduce dependence on `window.prompt` for editing flows and replace with in-app dialogs.
- Refactor repeated JSON export/import helpers into shared utility functions.
- Reduce expensive full re-render paths in panels with growing lists like motifs, history, morph trail, and presets.
