# Connected teaching moves

The physical-cube review identified turns that were immediately undone, including several adjacent maneuvers that could be joined. The solver reached a correct final state, but the composition of its otherwise valid teaching actions was inefficient.

## Reproduction

An independent replay of scramble seeds 1–40 found repeated full cube states within a stage in 9 Roux solutions, 6 Beginner CFOP solutions, and 18 Advanced CFOP solutions. Examples:

- Roux seed 1: second-block setup `R'` followed by `R U R'`.
- Roux seed 5: an edge-orientation reference setup `M` followed by an arrow starting with `M'`.
- Beginner CFOP seed 4: `R U R'` followed by `R U2 R'` for the same pair.
- Advanced CFOP seed 1: a preparation `U'` followed by a formula starting with `U`.
- Advanced CFOP seed 39: an internal formula rotation followed immediately by the inverse regrip.
- Beginner CFOP seed 8: cross extraction `F2` followed by a setup starting with `F'`.

These are solution-generation issues, not animation replay errors. The seeded scrambles are defined in `tests/fixtures/lbl-cases.ts`.

## Fix and limits

The shared composition step joins neighboring teaching actions when their boundary turns operate on the identical layer or rotation axis. Adjacent turns are combined modulo four, including cancellations that expose a further cancellation. For example, `R U R' R U2 R'` becomes `R U' R'`.

The connected action keeps the exact original actions as references. Verification checks every source action against its method rules and catalog, checks source continuity, independently replays the shorter sequence, and verifies the same final checkpoint. The player displays the shorter sequence and offers the original formulas under a clearly marked reference disclosure. References are not executed a second time. Intermediate reference checkpoints are explicitly not stops in connected playback.

The operation never crosses a method-stage boundary, commutes different layers, or changes the method. The shortest-cross distance annotations and Roux starting hold stay atomic. Useful physical regrips remain; only adjacent redundant rotations are removed. LBL and CFOP Lab routes are outside this change. This is not a globally optimal route search or a claim of universally optimal finger tricks.

Regression coverage includes exact solver reproductions, catalog preservation, rejection of tampered source rules/moves/states/metadata, stage boundaries, connected single-step/replay behavior, holding colors, and mobile layout. Broader release-check outcomes are recorded after verification.
