# Project Mozart TODO

## Done

- Pattern-based single-line sequencer with note duration, velocity, articulation, pitch offset, playback, and MIDI export.
- Motif Library with save/load, duplicate, edit, delete, provenance display, search, and filter controls.
- Phrase Builder with block transforms, diatonic/chromatic transpose, drag-sort, alt-drag duplicate, drop markers, block audition lanes, mini piano-roll previews, section loop, and phrase loop playback.
- Generator Forge with logic-cell based generation, visible block/form metadata, form lock, cell-family lock, surprise zoning, tension curves, and split modes for `new`, `variation`, `continuation`, `response`, `tail`, and `cadence`.
- Practice Mode with drill pack generation and per-drill BPM playback.
- Project import/export, undo/redo, instrument library CRUD, history panel, and card-level preview playback.
- Phrase A/B snapshots, diff overlay, morph generation, morph mode variants, morph trail, morph pinning, morph notes, morph-to-motif export, and visual morph diff overlays.
- Generator preset system with save/apply/delete, compare, overwrite, pinning, import/export, edit/notes, and duplicate.

## Next Priority

- Add generator preset tags so presets can be grouped by usage like `tail`, `sequence`, `practice`, `fusion`, `dorian`.
- Add preset filtering and search, similar to Motif Library, once tag support exists.
- Add phrase block relationship mode: explicit `reference motif` vs `frozen copy`.
- Add true drag-drop phrase block insert preview across larger phrases with better mobile behavior.
- Add motif-to-generator bridge controls so a motif can seed specific form/cell families without manual reconfiguration.

## Generator Improvements

- Expose logic cells more directly in the UI as reusable building blocks, not just hidden generator choices.
- Add user-editable melodic cell and rhythm cell libraries.
- Add stricter "surprise only at joins / only at ending / only in B section" constraints at block level.
- Add more phrase forms beyond current defaults, especially longer sentence shapes and asymmetrical phrase structures.
- Add cadence target options such as root, third, fifth, or color-tone endings.
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

- Add lightweight onboarding tips for generator modes, motif provenance, morph trail, and preset workflows.
- Improve empty states so each panel suggests a next action instead of only showing "empty."
- Add more explicit labels for currently selected phrase block, preset, and motif filters.
- Add optional compact layout for smaller laptops.
- Review remaining mojibake/corrupted UI text and normalize all labels to consistent Chinese or bilingual wording.

## Technical Debt

- Add tests around generator preset import/export, overwrite, duplicate, pin ordering, and notes persistence.
- Add tests for motif provenance/filter behavior and morph trail export-to-motif flow.
- Reduce dependence on `window.prompt` for editing flows and replace with in-app dialogs.
- Refactor repeated JSON export/import helpers into shared utility functions.
- Reduce expensive full re-render paths in panels with growing lists like motifs, history, morph trail, and presets.
