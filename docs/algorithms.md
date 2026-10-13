# Algorithm catalog and verification

CubeSteps keeps case identities separate from formula variants and named preparation maneuvers. Courses, generated solutions, library clips and practice consume these same definitions. The catalog is being implemented as part of Advanced CFOP; the method is not released yet.

## F2L references and identities

The 41 F2L defaults come from [CubeSkills F2L](https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf), developed by Feliks Zemdegs and Andy Klise. CubeSteps IDs `f2l-01` through `f2l-41` follow page, then column, then vertical position in that reference, excluding the solved pair. These are project IDs, not a claim that another source uses the same numbering. Each source reference records its page, column and PDF vertical coordinate for an unambiguous lookup. Move sequences are transcribed; recognition text and diagrams in CubeSteps are original.

`main/fr` is the source formula with canonical notation. The other three slots use spatial conjugation, which rotates the coordinate system without reflecting a move. Each exact sequence is registered under its own variant ID and verified before admission. Where useful, `no-regrip/<slot>` moves a source y rotation through the remaining turns by conjugation, omits the final whole-cube rotation, and converts a lower wide turn into its equivalent U turn and y rotation first. It has execution penalty 1 because the resulting front/back turns can be less comfortable; source defaults have penalty 0. These penalties are a documented selection heuristic, not measured human execution times. Runtime selection never rewrites a registered formula.

All 41 classes are independently covered by legal target-piece placements: a white corner in any upper position or its home slot, with each of its three orientations, and its matching edge in any upper position or its home slot, with both orientations. Remaining upper pieces balance corner twist, edge flip and permutation parity. The solved class is excluded. Each source formula must match exactly one such placement at the front-right slot; all four oriented variants must solve their target and restore the cross and every completed pair.

Complete extraction macros are admitted separately under `advanced-extract/<slot>/<direction>`. They are not counted as additional F2L cases. Preparation lifts a target from an unsolved slot, preserves completed pairs, deduplicates states, and respects explicit state/depth budgets.

## OLL references and coverage

The 57 OLL entries use the numbered cases and default full-case algorithms from [CubeSkills OLL](https://www.cubeskills.com/uploads/pdf/tutorials/oll-algorithms.pdf). The project keeps those OLL numbers, unlike its separate F2L reading-order IDs. Independent yellow-sticker directions were read from each source diagram; the site renders its own diagrams from verified cube states. Every formula is admitted against that independent pattern and preserves F2L at its completed boundary. A standard full-case formula can contain familiar triggers; the runtime recognizes one full OLL case and executes one registered formula, without dynamically chaining two-look rules.

Leading source y rotations are moved into the explicit setup contract. The recognition map covers 215 unsolved legal signatures; the 216th orientation is an explicit skip. It ignores last-layer permutation, prefers U alignment over regrips, and verifies all admitted wide/slice formulas. Physical setups have four U variations per case, and separate holding rotations.

## PLL references and coverage

The 21 named PLL cases use [CubeSkills PLL](https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf). Side stickers are transcribed independently from its diagrams, and each complete formula is admitted against that legal permutation. Matching uses relative corner and edge order with cyclic side-color alignment. The 71 unsolved relative signatures cover all 284 unsolved legal permutations; four further permutations need only final U alignment. Source bracketed AUF is omitted from the formula and shown as a separate final step. H and Z retain their slice moves; physical x rotations inside a formula remain visible.

## F2L selection policy

The `f2l-v1` selection policy scores the complete preparation plus insertion as face-turn equivalents + 2 times explicit rotations + the variant's execution penalty. It retains the best eight validated candidates per unfinished pair, then compares each with half the cheapest immediate cost of a next pair. This is one-pair lookahead, not a globally optimal F2L search. Ties use immediate cost, rotation count, immutable target identity, variant identity and setup sequence. A shared limit of 32,768 candidate simulations covers the entire selection, with at most 256 outputs per target and the separately enforced preparation limits. Budget exhaustion produces a clear failure.

## Reproducible data

- `node scripts/build-f2l-catalog.mts` re-admits the transcribed source formulas against independent legal placements and writes the F2L catalog plus base fixtures.
- `node scripts/build-oll-catalog.mts` re-admits all 57 formulas against independent sticker patterns and recreates the OLL recognition map.
- `node scripts/build-pll-catalog.mts` re-admits all 21 formulas against independent side-sticker patterns and recreates the PLL recognition map.
- `npm run generate:cases` uses cubing.js's generic solver **offline only** to find physical outer-face setup sequences for those independently declared states. It verifies every sequence and resumes already verified entries if interrupted. The runtime method never calls this generic solver.
- `npm run verify:cases` verifies the committed setups and recognition without regenerating randomized setups. Physical setup starts white up, green front; explicit holding rotations then reach the exact displayed initial state.
- `npm run generate:cross` deterministically generates all 190,080 four-edge coordinates. `npm run verify:cross` compares the bytes and manifest against a fresh generation. The runtime checks the version, byte length and SHA-256 before using the asset.

Expanded teaching notation uses `Rw/Lw/Uw/Dw/Fw/Bw`, `M/E/S`, outer-face moves and `x/y/z`. Lowercase wide aliases are normalized only when admitting source formulas. Free-scramble input remains limited to the six outer faces. Formula comparison counts a face or wide turn as one, a slice as two, and rotations separately; half turns have the same count. The cross optimum uses only outer-face turns.

## Complete-solve verification

Advanced solves return all five stages, including explicit skips. Each cross turn carries its before/after distance and the actual change to every affected white edge. `createAdvancedRuntime(verifiedCrossTable)` checks those claims against the recorded cube coordinates; the unbound runtime rejects cross actions because it has no distance asset. F2L and last-layer checks validate actual case, target and formula identities and their completed effects. Full traces must replay to a solved cube.

The worker validates a request before fetching Advanced assets. Missing or corrupt assets produce a failure instead of a different method. Cancelling terminates the worker, and a 30-second watchdog settles stalled requests. A successful response must match both the requested method and the input snapshot taken when the request was sent.
