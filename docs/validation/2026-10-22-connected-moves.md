# Connected teaching moves

The physical-cube review identified turns that were immediately undone, including several adjacent maneuvers that could be joined. The solver reached a correct final state, but the composition of its otherwise valid teaching actions was inefficient.

## Reproduction

An independent replay of scramble seeds 1–40 found repeated full cube states within a stage in 9 Roux solutions, 6 Beginner CFOP solutions, and 18 Advanced CFOP solutions. Examples:

- Roux seed 1: second-block setup `R'` followed by `R U R'`.
- Roux seed 5: consecutive edge-orientation arrows ending with `M` and starting with `M'`.
- Beginner CFOP seed 4: `R U R'` followed by `R U2 R'` for the same pair.
- Advanced CFOP seed 1: a preparation `U'` followed by a formula starting with `U`.
- Advanced CFOP seed 39: a `y` regrip followed by a formula starting with `y'`.
- Beginner CFOP seed 8: cross extraction `F2` followed by a setup starting with `F'`.

These are solution-generation issues, not animation replay errors. The seeded scrambles are defined in `tests/fixtures/lbl-cases.ts`.

## Fix and limits

The shared composition step joins neighboring teaching actions when their boundary turns operate on the identical layer or rotation axis. Adjacent turns are combined modulo four, including cancellations that expose a further cancellation. For example, `R U R' R U2 R'` becomes `R U' R'`.

Every original trace is verified against its method rules, catalog, and stage goals before composition. A surviving connected action keeps the exact original actions as references. Post-composition verification checks those references, source continuity, the shorter sequence's replay, and the same final checkpoint. Fully cancelled, already-verified actions disappear; their stage goal still has to pass independent verification. The player displays the shorter sequence and offers the original formulas under a clearly marked reference disclosure. References are not executed a second time. Intermediate reference checkpoints are explicitly not stops in connected playback.

The Roux EO reference example now explains that its setup can join the following arrow. Its executable `M2 U M′` replaces `M` followed by `M U M′`; learners judge orientation at the connected endpoint. The original maneuvers remain accessible as references. The authored-example verifier checks reference provenance separately from the actual moves and checkpoints shown to learners.

The operation never crosses a method-stage boundary, commutes different layers, or changes the method. The shortest-cross distance annotations and Roux starting hold stay atomic. Useful physical regrips remain; only adjacent redundant rotations are removed. LBL and CFOP Lab routes are outside this change. This is not a globally optimal route search or a claim of universally optimal finger tricks.

Regression coverage includes exact solver reproductions, catalog preservation, rejection of tampered source rules/moves/states/metadata (including complete cancellation), stage boundaries, connected single-step/replay behavior, multiple F2L pair targets, holding colors, and mobile layout.

An independent audit replayed 1,000 seeded scrambles for each affected method (3,000 complete solves). All solved. There were zero repeated full cube states within a stage and zero reducible same-layer boundaries between actions. This is finite-sample evidence, not a proof that every possible route is free of detours. All 42 authored Roux examples passed legal-input, complete-solve, and teaching-claim verification.

The final source suite passed 876 tests across 186 files, together with type checking and the production build. Independent review found and then rechecked the cancelled-source validation and EO lesson fixes; no unresolved findings remained. Release CI and browser results are attached to the pull request and publication receipt. Physical teaching acceptance of these shorter sequences remains pending.
