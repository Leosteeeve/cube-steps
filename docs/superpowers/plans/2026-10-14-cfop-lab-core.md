# CFOP Lab Search Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce physically verified, reproducible six-color Cross + F2L recommendations with bounded progressive search and an explicit execution model.

**Architecture:** Add an isolated `src/lab/` domain around the existing cube engine, exact cross table and admitted algorithm catalog. A reversible physical/canonical frame adapter feeds a cooperative search. The Lab owns its contracts and validators; stable teaching solvers retain their behavior.

**Tech Stack:** Existing TypeScript, cubing.js, Vitest and Node 24+. Browser worker integration follows in package 2. No new runtime dependency or external solver service.

**Spec:** [Approved CFOP Lab design](../specs/2026-10-14-cfop-lab-design.md), especially sections 3–6 and 10.

**Status:** Design and all three implementation plans approved October 14, 2026. Native implementation is underway on the isolated `codex/cfop-lab` branch. The complete feature remains unreleased pending the remaining implementation and validation gates.

## Global Constraints

- This is package 1, Tasks 1–6. Continue with [workspace Tasks 7–10](2026-10-14-cfop-lab-workspace.md), then [experiments Tasks 11–15](2026-10-14-cfop-lab-experiments.md). Release the complete experiment only after Task 15.
- Do not add a `MethodId`, weaken `createAdvancedRuntime`, or emit a Lab route as `SolveTrace`. Normal LBL, Beginner CFOP and Advanced CFOP remain unchanged.
- Accept only inputs supported by current legality checks. Six-color solving means choosing a different bottom on that same physical cube; it does not add unsupported center schemes or mirrored cubes.
- Exactness applies to the cross reference. Recommendations apply only to searched candidates. Grip/visibility costs are model estimates, never seconds or observed human movements.
- Current model: `lab-execution-v1`, `cost = T + 2R + 2G + 3V + 2A`. Outer/wide turns cost one, slices two, half turns retain their category's weight; actual rotation tokens count once. Exclude pre-trial positioning and last-layer continuation from the objective.
- Shared ceilings: 30 seconds including initialization; 2,000,000 accounted operations; 96 completed cross paths per bottom color across all holds/lengths; beam 32 per crossed root/depth; 12 retained insertion/preparation candidates per target expansion; 25,000 total cache/frontier entries; 512 route teaching tokens and 128 actions. Batches yield at 8 ms or 256 operations, whichever comes first. Tune downward within these limits; do not expand them silently.
- All tests use fixed inputs/seeds. Preserve formula boundaries, repetitions, physical identities and checkpoint semantics. Never substitute mockup numbers for search evidence.
- At implementation start, use the worktree skill to establish an isolated checkout, respecting the actual repository root `D:/Projects/Cubing Calculator/cube-steps`. Run commands there, not in its non-Git parent. Preserve current media and evidence before any later cleanup.

## Review Focus

1. A non-white bottom can appear solved under an incorrect color permutation: test physical replay and inverse/conjugation for all 24 proper holds (Tasks 1, 5–6).
2. Equal cross coordinates can hide different F2L states or terminal grips: retain and test these alternatives (Tasks 2–4).
3. Existing synchronous F2L enumeration can monopolize a worker or reset limits per pair: use resumable expansion and one shared budget (Tasks 2, 4–6).
4. Individually cheap formulas can have incompatible boundary grips: test whole-route dynamic programming, incomplete profiles and double charges (Task 3).
5. Valid moves can accompany forged checkpoints, metrics or misleading setup holds: independently validate finalized routes and reconstructed setups (Tasks 5–6).

---

## File map and dependency order

| Task | New files                                                                                                                                       | Existing boundaries reused                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1    | `src/lab/types.ts`, `input.ts`, `frames.ts`, `input.test.ts`, `frames.test.ts`; `tests/fixtures/lab-cases.ts`                                   | `core/cube.ts`, `facelets.ts`, `facelet-layout.ts`, `observations.ts`, `solve-input.ts` |
| 2    | `src/lab/budget.ts`, `cross.ts`, `budget.test.ts`, `cross.test.ts`                                                                              | `methods/advanced/cross/{coordinates,table,load}.ts`                                    |
| 3    | `src/lab/execution/{types,profiles,score}.ts`, `profiles.test.ts`, `score.test.ts`; `docs/lab/execution-model-v1.md`                            | `algorithms/registry.ts`, `core/move-metrics.ts`                                        |
| 4    | `src/lab/f2l/{candidates,planner}.ts`, `candidates.test.ts`, `planner.test.ts`                                                                  | Advanced recognition/preparation rules and admitted formulas                            |
| 5    | `src/lab/{finalize,validate,search}.ts`, matching `.test.ts` files                                                                              | OLL/PLL recognizers, AUF, physical cube engine                                          |
| 6    | `tests/lab-{catalog,corpus,efficiency}.test.ts`, `tests/helpers/lab-replay.ts`, `scripts/benchmark-lab.mts`, `docs/validation/cfop-lab-core.md` | Existing seeded corpus and benchmark conventions; modify `package.json`                 |

Future tasks consume the interfaces below. Add private helpers inside the responsible module; do not create competing public representations of a route or grip state.

### Task 1: Validated physical inputs and reversible six-color frames

**Files:** Task 1 row above. No stable solver edits.

**Interfaces:** Define these shared domain types in `src/lab/types.ts`:

- `LabHold = { bottom: Color; front: Color }`; only adjacent colors are valid. `LabSettings = { allowedColors: readonly Color[]; modelVersion: 'lab-execution-v1' }`.
- `LabInput = { input: SolveInput; initial: CubeState; inputHold: LabHold; fingerprint: string }`. Fingerprint the full normalized physical cubie data and centers in a deterministic field order, not user text or a lossy cross coordinate.
- `LabSectionId = 'lab-position'|'lab-cross'|'lab-f2l'|'lab-oll'|'lab-pll'|'lab-auf'`.
- `LabAction` stores `id`, `section`, `kind: 'setup'|'algorithm'|'rotation'`, `ruleId`, `caseId`, optional `algorithmId`/`repetition`/`pair` (existing `PairTrace`), physical `targets`, `recognition`, `explanation`, `moves: readonly TeachingMove[]`, physical `before`/`after`, and a checkpoint with semantic predicate ID and arguments. A `passed` flag alone is never evidence.
- `LabCoverage` stores elapsed time, counted operations, explored holds/lengths by color, completed cross/F2L counts, cache/frontier high-water mark and termination reason. Distinguish unvisited from attempted-without-result.
- `LabRoute` has `kind:'cfop-lab'`, schema version 1, stable content-derived ID, input fingerprint, input/initial state, start/end holds, positioning moves, neutral grip ID, exact cross minimum, actual cross length, ordered actions, cross/F2L boundary indexes, full final state, setup moves, score/events from Task 3, and search/model/catalog version strings. Store the referenced formula definitions, including moves, segments, explanations and provenance. Include an explicit rated/unrated distinction.

The route timeline begins at the original input. Initial positioning is the first `lab-position` section and appears exactly once in action moves; `positioningMoves` is matching metadata, not an additional sequence to apply. Boundary indexes refer to this full timeline. Setup playback reconstructs the original input, while a physical trial starts after initial positioning and ends at the recorded F2L boundary.

`prepareLabInput(engine: CubeEngine, input: SolveInput): LabInput` validates/copies/freezes input. `createLabFrame(engine, input: LabInput, hold: LabHold): LabFrame` exposes `positioningMoves`, `toCanonical(state)`, `toPhysical(state)`, `toPhysicalMoves(moves)`, `physicalPieceId(canonicalId)` and inverse ID mapping. Both state functions use `CubeState`; move mapping accepts/returns readonly `TeachingMove[]`. State normalization starts after the declared physical positioning; it must commute with mapped moves.

- [ ] Write `input.test.ts` for illegal text tokens, missing/illegal facelets, parity, cloned immutable input, equal physical fingerprints from equivalent scramble/facelet input and different fingerprints for different centers/pieces. Add fixtures for solved, cross complete, partial F2L, wrong-slot extraction and non-white holds in `lab-cases.ts`, using `createCubeEngine()` and existing `seededScramble` rather than invented cubie arrays.
- [ ] Write `frames.test.ts` covering six bottoms × four adjacent fronts; reject identical/opposite colors. Assert inverse state/identity mapping and physical/canonical move conjugation for every supported face, wide, slice and rotation token, including primes/halves. Include a scrambled cube, not only solved states.
  ```ts
  expect(engine.equals(frame.toPhysical(frame.toCanonical(positioned)), positioned)).toBe(true);
  expect(
    engine.equals(
      frame.toPhysical(engine.apply(frame.toCanonical(positioned), moves)),
      engine.apply(positioned, frame.toPhysicalMoves(moves)),
    ),
  ).toBe(true);
  ```
  Here `positioned` is `engine.apply(input.initial, frame.positioningMoves)` and each test supplies concrete supported tokens as `moves`.
- [ ] Run `npx.cmd vitest run src/lab/input.test.ts src/lab/frames.test.ts`; expect missing-module/interface failures before implementation.
- [ ] Implement the adapter using the physical sticker geometry and piece lookup tables. Derive the proper color bijection from bottom/front and encode piece permutations/orientations consistently. Keep the input hold, positioning rotations and canonical relabeling separate. Do not call the fixed-center user-input validator on a virtual relabeled state or replace color words in old prose. Generate future explanations from semantic case data and physical observations.
- [ ] Run the two tests plus `npx.cmd vitest run src/core` and `npm.cmd run typecheck`. Require full-state equality, preserved physical IDs and unchanged core input behavior.
- [ ] Stage `src/lab/types.ts`, `src/lab/input.ts`, `src/lab/frames.ts`, their tests and `tests/fixtures/lab-cases.ts`; commit `feat: add physical frames for six-color CFOP experiments`.

### Task 2: Budgeted shortest and near-shortest cross exploration

**Files:** Task 2 row; extend Task 1 fixtures/types where needed.

**Interfaces:** `LabBudget` exposes `charge(kind: 'expand'|'simulate'|'score', count?:number)`, `checkpoint()`, `remaining()`, `snapshot()`, `retain(key):boolean`, `release(key):void`. `createLabBudget({ now, startedAt, deadlineMs, maxOperations, maxEntries, cancelled }): LabBudget` throws a typed stop reason at limits; production values cannot exceed Global Constraints. A simulation cache hit still charges its logical operation; cache/frontier accounting is shared.

Define `LabWork = {kind:'work'}` in `budget.ts`. `crossMinimum(engine, input, frame, table: CrossTable): number`. `exploreCross(engine, input, frame, table, budget): Generator<LabWork | {kind:'cross';candidate:CrossCandidate}>` yields work markers during unsuccessful expansions too. `CrossCandidate` contains frame/hold, outer-face path, full after-state, minimum, length and solved pair IDs. Track completed paths per **bottom**, not 96 for each of its four holds. The coordinator in Task 5 supplies the shared per-color quota. Nested generators propagate work markers to the outer scheduler rather than draining them synchronously.

- [ ] Add tests for known minimum distances, half turns counting one, all four fronts sharing the same minimum, completed-cross length zero, and a near-shortest fixture with a non-descending distance step. Reject length `d+3`; retain same-coordinate candidates whose non-cross pieces or move history differ. Assert cache hits, all roots and all six colors consume one operation total.
- [ ] Run `npx.cmd vitest run src/lab/cross.test.ts src/lab/budget.test.ts`; expect missing explorer/budget failures.
- [ ] Implement depth-bounded DFS at `d`, `d+1`, `d+2` using the exact table as a lower bound. Prune only identities proven to preserve relevant state/execution information; do not add a distance-decreasing-only rule. Use a resumable explicit stack so callers can yield mid-depth. Enumerate deterministic move order and return physical full-state candidates. Preserve at least one shortest candidate per allowed color before spending its remaining quota on alternatives. Validate table integrity through the existing loader.
- [ ] Implement absolute deadline checks and counted work at primitive expansion/simulation/scoring boundaries. Bound insertion into the shared frontier/cache; evict recomputable cache entries deterministically, and stop/prune optional search work with a recorded reason if a frontier cannot fit. Avoid hidden unbounded arrays in generators.
- [ ] Run both tests plus `npm.cmd run verify:cross` and `npx.cmd vitest run tests/advanced-cross-table.test.ts`. Assert limits never reset on a new depth/color and the 190,080-state reference is unchanged.
- [ ] Stage Task 2 files and changed Lab fixtures/types explicitly; commit `feat: explore bounded cross alternatives with shared search limits`.

### Task 3: Versioned execution profiles and continuous grip scoring

**Files:** Task 3 row; `src/lab/types.ts` consumes exported score types.

**Interfaces:** In `execution/types.ts`, define named finite `GripPose` records with left/right wrist/thumb/support descriptions, `GripId`, and one declared neutral initial pose. `ExecutionProfile` binds an exact move sequence or primitive token to feasible entry/exit grip transitions, finger instructions, recognition visibility conditions and provenance. `LabExecutionEvent` stores boundary index, kind (`turn`, `rotation`, `hand-regrip`, `visibility`, `awkward`), profile ID, source/destination grip, count and rationale. No hand-regrip event changes cube state.

`LabScore = { rated:true; modelVersion:string; T:number; R:number; G:number; V:number; A:number; cost:number; events:readonly LabExecutionEvent[] } | { rated:false; reason:string }`. The current scorer emits only `lab-execution-v1`; a string version permits historical estimates in schema-1 archives without treating them as current ratings.

`scoreExecution(segments: readonly ExecutionSegment[], profiles: ExecutionCatalog, budget: LabBudget): Generator<LabWork | {kind:'paths';paths:readonly ExecutionPath[]}>` yields the cheapest feasible path **for each terminal grip**, not only the cheapest overall, with resumable scoring work. `ExecutionCatalog` contains versioned pose/profile maps and the neutral grip ID. `ExecutionSegment` defines physical moves, observation/recognition checkpoint and referenced formula/preparation ID. `ExecutionPath` carries terminal grip, score and events. `rankLabRoutes(a: LabRoute,b: LabRoute): number` compares current rated cost, then T, R, G and stable route key; unrated or archived routes never become the comfort recommendation.

- [ ] Add tests for turn weights (`R2` = 1, `Rw2` = 1, `M2` = 2, `y2` = one rotation), positioning/OLL exclusion, incompatible segment boundaries, preservation of a more expensive interim grip that wins later, missing profiles and deterministic ties. Add a useful-rotation fixture and an unnecessary-rotation fixture. Assert one physical event cannot be billed again as both rotation handling and hand regrip, or as awkwardness already explained by G/V.
- [ ] Run `npx.cmd vitest run src/lab/execution`; expect missing profile/scoring failures.
- [ ] Author the smallest explicit grip graph that covers the admitted right-hand-leading seed routes, primitive cross turns, preparation/extraction and F2L variants. Bind formula transitions to their actual token boundaries and physical holds. Adapt existing catalog rationale; do not infer detailed fingertricks solely from its scalar `gripPenalty`. Uncovered candidates remain physically verifiable but unrated. Document IDs, move/finger assumptions, visibility envelope, cost weights and admission rules in `docs/lab/execution-model-v1.md`.
- [ ] Implement dynamic programming over feasible transitions with cost accounting at each boundary. Visibility is charged at actual recognition checkpoints using sticker directions/declared front view. The selected path supplies human-readable handling instructions; do not claim measured finger movements. Profile admission rejects impossible IDs, mismatched tokens, invalid counts, unused transition fields and missing rationale/provenance.
- [ ] Run the execution tests and `npx.cmd vitest run src/algorithms src/core/move-metrics.test.ts`. Verify current catalog behavior is unchanged; review each named fingertrick fixture manually on paper and mark physical validation pending.
- [ ] Stage Task 3 code/tests, changed Lab types and model document; commit `feat: model continuous grips and execution costs for CFOP Lab`.

### Task 4: Cooperative formula-based search through complete F2L

**Files:** Task 4 row; extend Lab fixtures. Reuse the catalog and pure recognition helpers; keep existing `chooseF2LCandidate` behavior unchanged.

**Interfaces:** `enumerateLabInsertions(engine, node: F2LNode, target: F2LTarget, frame: LabFrame, profiles: ExecutionCatalog, budget: LabBudget): Generator<LabWork | {kind:'insertion';candidate:LabInsertion}>`; `planLabF2L(engine, cross: CrossCandidate, profiles, budget): Generator<F2LProgress>`.

`F2LNode` holds canonical full cube state, frame, completed physical pair IDs, actions, execution segments and per-terminal-grip paths. `LabInsertion` is one verified preparation + insertion with a strictly larger completed-pair set. `F2LProgress` discriminates incremental work from complete four-pair endpoints. All generators retain their cursors between scheduler batches; none creates its own budget.

- [ ] Add tests for all four starting solved-pair counts, trapped/wrong-slot pieces, rear insertions, physical y rotations, useful pair-order changes and a route where a locally worse first insertion improves the complete continuation. Verify temporary disruption is allowed inside a formula, but cross and prior pairs are restored at its checkpoint. Reject an insertion that makes no progress. Test budget exhaustion inside preparation, candidate scoring and a cache hit.
- [ ] Run `npx.cmd vitest run src/lab/f2l`; expect missing planner/candidate failures.
- [ ] Adapt existing bounded preparation/extraction and signature matching into resumable Lab iterators. Share immutable registry data and pure helpers, not the synchronous `enumerateWithEngine` call as one uninterruptible operation. Keep extraction bounded by the existing two-macro limit and preparation by at most 1,024 states per target, all within the global budget. Retain at most 12 diverse insertions per target, distinguishing pair/hold/variant/terminal grip before deterministic pruning.
- [ ] Implement up to four progress depths with beam width 32 per crossed root/depth. Carry complete states, hold and all relevant terminal grips across pair boundaries. Evaluate every remaining pair before selecting the next beam; cache keys include those values and execution-model version. Yield complete candidates as soon as available, including X-cross/already-completed-pair cases. Explain chosen formulas from the matched physical case, not generated generic text.
- [ ] Run Lab F2L tests plus `npx.cmd vitest run src/methods/advanced/f2l src/algorithms/f2l-admission.test.ts`. Confirm the existing human-friendly solver's expected choices remain intact.
- [ ] Stage Task 4 files and changed Lab fixtures; commit `feat: search complete F2L continuations with grip-aware beams`.

### Task 5: Finalized routes, independent validation and progressive scheduling

**Files:** Task 5 row; complete types from Task 1.

**Interfaces:** `LabContext = { engine:CubeEngine; table:CrossTable; profiles:ExecutionCatalog }`. `CompletedF2L` is the complete-endpoint member of `F2LProgress`; its other member is `LabWork`. `finalizeLabRoute(context, input:LabInput, endpoint:CompletedF2L): LabRoute` appends recognized OLL, PLL and AUF with explicit skips. `validateLabRoute(context, input:LabInput, raw:unknown, mode:'current'|'archive'): VerifiedLabRoute` returns a frozen branded wrapper `{route:LabRoute;validationMode:'current'|'archive'}` or throws a structured validation error; archive mode never grants current recommendation status. Persist the route data, not the runtime wrapper.

`searchLab(context, input, settings, budget): Generator<LabSearchEvent>` emits internal `LabWork`, `{kind:'progress';coverage}`, `{kind:'candidate';route}`, and `{kind:'done';reason;coverage}`. Reasons include complete, time/work/frontier limits, cancelled and no-route. Batching/yield-to-event-loop belongs to the worker, Task 7. Candidate admission and physical verification consume the same accounted search budget; reserve work for validating a candidate before optional exploration. Export `finalizeLabRouteSteps(context,input,endpoint,budget):Generator<LabWork,LabRoute>` and `validateLabRouteSteps(context,input,raw,mode,budget):Generator<LabWork,VerifiedLabRoute>` for worker/client scheduling. Synchronous helpers above drain these bounded iterators for fixtures; production never drains an unbounded nested iterator without yielding. Replay chunks and scoring propagate work markers too.

- [ ] Add tests rejecting forged input fingerprints, altered centers/targets, `d+3`, broken formula boundaries, incorrect before/after states, false solved checkpoints and score/events not reproducible by the current model. Verify setup replay from solved equals original physical input including centers; include color inputs and non-white starting holds. Test a fully solved input, skipped stages and zero-length action/section boundaries.
- [ ] Add scheduler tests for first candidate in an allowed color, minimum seed attempts for every allowed color, short deadline/no result, fair exploration across holds/lengths, stable deterministic work-budget output, monotonic best score and fewer alternatives when diversity is unavailable. Preserve best endpoints already validated when a later candidate fails or budget expires.
- [ ] Run `npx.cmd vitest run src/lab/finalize.test.ts src/lab/validate.test.ts src/lab/search.test.ts`; establish red.
- [ ] Finalize through the existing OLL/PLL case recognizers using the canonical frame; map every result back to physical states and IDs. Recompute checkpoints using Lab predicates and raw replay, not recorded booleans. Validate active catalog definitions and execution-profile transitions. Reconstruct color-input setup from the inverse complete solve plus matching solved orientation; explicitly verify it before saving. Keep reconstruction/setup cost outside the Cross + F2L ranking but inside operational bounds.
- [ ] Implement deterministic scheduling: find one shortest-cross complete seed in the first allowed color, then seed the other allowed colors, then round-robin additional hold/length roots. Use identical all-six default ordering on every run. Preserve distinct completed routes by bottom color, cross endpoint/path, pair order, formula/hold choices; recommend one, then prefer non-dominated alternatives illustrating fewer turns, fewer rotations or a distinct allowed color/hold, with at most three alternatives. Never publish unfinished or unverified candidates. Record actual coverage instead of an invented percentage or optimality claim.
- [ ] Run all `src/lab` tests, `npm.cmd run typecheck` and existing Advanced verification tests. Ensure published complete routes include OLL/PLL while score slices stop exactly at F2L. Add explicit validator tests proving current Advanced still rejects non-descending cross traces.
- [ ] Stage Task 5 files, updated Lab types/tests; commit `feat: validate and progressively rank complete CFOP Lab routes`.

### Task 6: Corpus, baseline comparison and the core performance gate

**Files:** Task 6 row. Modify `package.json` only for named Lab scripts.

**Interfaces:** `tests/helpers/lab-replay.ts` independently applies published physical tokens to a fresh `createCubeEngine()` result; it does not use `LabFrame.toPhysical` to compute expected states. Add `test:lab` (domain/worker unit tests as available), `test:lab:corpus` (catalog + 1,000-seed corpus, one worker), `test:lab:efficiency` (fixed baseline comparison), and `benchmark:lab` (`node scripts/benchmark-lab.mts`).

Script values: `test:lab` starts as `vitest run src/lab`; Task 7 extends it with `src/workers/lab-request.test.ts`. `test:lab:corpus` is `vitest run tests/lab-catalog.test.ts tests/lab-corpus.test.ts --maxWorkers=1`; `test:lab:efficiency` is `vitest run tests/lab-efficiency.test.ts`.

The benchmark accepts `--base-url`, `--output`, `--runs`, and `--phase core|integrated`. Core phase uses a temporary local worker harness importing the actual search dependencies, with the same deadline/batching rules; it does not depend on Task 7 files and is not shipped as a public route. Its preliminary measurements exclude the not-yet-built UI/client verification. Integrated phase uses the built Lab UI after Task 15 and measures the complete path. Report exact configuration, revision, device/browser, cold/warm conditions, first verified candidate, elapsed/operations/coverage and memory where measurable; unsupported memory APIs are recorded as unavailable.

- [ ] Add catalog replay for 41 F2L cases × 4 slots × 4 horizontal holds × 6 bottoms, all admitted execution variants, and 57 OLL/21 PLL cases with skip/AUF paths. Add the 1,000 fixed-seed corpus with a deterministic **work** budget: every allowed color must yield its valid minimum seed, every finalist solves with complete records, facelet-equivalent inputs replay identically and originals remain immutable. Do not run 30-second searches for each corpus seed. Failures report seed, input, settings and versions.
- [ ] Add independent tests for table references, fingerprint/setup replay and real checkpoint semantics. Add baseline comparison against current Advanced with White-only and All-six recorded separately: count turns/rotations, estimated cost, rated coverage and runtime distributions. Do not assert every Lab route beats Advanced or turn scores into a speed claim.
- [ ] Run the three new tests before wiring scripts; expect missing harness/coverage failures. Implement fixture runners and browser benchmark orchestration with `windowsHide: true`; keep benchmarks and reports out of the production module graph.
- [ ] Run `npm.cmd run test:lab`, `npm.cmd run test:lab:corpus`, `npm.cmd run test:lab:efficiency` and `npm.cmd run verify:cross`. Run the core benchmark for at least 40 fixed inputs in cold and warm conditions. Record real desktop evidence and obtain a representative-phone run where accessible; emulation is labeled emulation and does not satisfy a physical-phone claim.
- [ ] Write the actual report in `docs/validation/cfop-lab-core.md`. Target first-result p95 ≤5 seconds desktop and ≤8 seconds phone, bounded memory/frontier and cooperative batch latency. Tune within the approved limits if necessary. Correctness failures stop progression to UI integration. If representative-device evidence is unavailable or targets fail after tuning, document the precise gap and necessary tradeoff before claiming the core performance gate passed; do not quietly broaden limits or reduce color coverage.
- [ ] Stage Task 6 files and `package.json`; commit `test: validate six-color Lab search and record core performance`.

## Plan self-review and handoff

Coverage: spec sections 3–4 → Task 1; 5.1/limits → Task 2; 5.3/model → Task 3; 5.2 → Task 4; 5.4–6 → Task 5; correctness/performance → Task 6. Worker cancellation and pinned playback are assigned to Tasks 7–9; archive persistence/transfer to Tasks 11–14; full acceptance to Task 15. Each Review Focus item has an owning test step. No implementation or measured performance is claimed by this plan.
