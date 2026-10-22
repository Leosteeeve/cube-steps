# Beginner Roux LSE and Complete Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Roux method with exhaustive LSE policies, verified teaching traces and reproducible full-solve coverage.

**Architecture:** Enumerate the finite M/U state domain with center phase and corner offset intact. Choose explained LSE maneuvers from verified stage policies, combine them with the block/corner planners, and replay the result through the existing trace verifier. Keep generated policies versioned and lazily loadable.

**Tech Stack:** Existing TypeScript, cubing.js, Node >=24 and Vitest; browser workers and Fetch for later integration, with no new product dependency.

**Spec:** [Approved Beginner Roux design](../specs/2026-10-21-beginner-roux-design.md). Depends on [Tasks 1–5](2026-10-21-beginner-roux-blocks.md); continue with [Tasks 11–15](2026-10-21-beginner-roux-club.md).

## Global Constraints

- Fixed white-bottom, blue-left block frame; initial real `x2 y`, no later hidden physical rotations.
- Seven OCLL cases and T/Y; top edges need not be oriented before corners.
- EO recognition requires an explicit white/yellow U-center reference. A quarter-M intermediate display is not an invalid cube.
- LSE preserves corner orientation and cyclic order up to a common U offset. Restore absolute alignment and centers at the final endpoint.
- Initial per-solve ceilings: **1,000,000 expanded nodes, 15 seconds of worker work, 160 trace actions and 400 teaching-move tokens**.
- At least **1,000 fixed-seed legal scrambles**, separate fixed color-input fixtures and complete teaching-record replay are required.
- Return one complete verified result or an honest stage-specific failure. No CFOP fallback, partial-success label or globally optimal claim.
- Teaching status remains **Preview** until owner-confirmed physical acceptance.

## Review Focus

- Quarter-M center phases must not be mistaken for invalid EO: Tasks 6–7 test the reference distinction.
- Corners shifted by U may still be correctly ordered: Tasks 6 and 8 test all relative offsets.
- A corrupted, stale or truncated generated policy must not produce a plausible-looking route: Task 9 tests integrity and version rejection.
- A visually solved local goal can hide wrong centers or edge identities: Tasks 8–10 assert exact physical replay and final reference colors.
- A legal uncommon case may exceed limits or expose a missing rule: Tasks 9–10 retain reproducible failures, never omit them from coverage totals.

---

## File map and execution

Use the preserved **Native** method after plan approval. Do not create another worktree or run independent tasks concurrently against the same files. Each task has one local test/implementation/commit cycle.

| Files | Responsibility |
| --- | --- |
| `src/methods/roux/lse/{coordinates,model,catalog,policies}.ts` | Complete reachable state domain, actual move transitions, named maneuvers and decreasing stage ranks. |
| `lse/{orientation,placement}.ts` | EO, left/right target placement, last-four completion. |
| `src/methods/roux/{assets,stages,presentation,definition,solve}.ts` | Integrity-checked data, method runtime and complete trace orchestration. |
| `scripts/roux/build-lse-policies.mts`, `src/methods/roux/data/lse-policies.bin`, `manifest.json` | Reproducible policy artifacts and integrity metadata for both block and LSE assets. |
| `tests/roux-{lse-coverage,corpus,color-input,stage-boundaries}.test.ts` | Exhaustive LSE and full-route acceptance evidence. |

### Task 6: Complete LSE model and reference-aware transitions

**Files:** Create `src/methods/roux/lse/{coordinates,model,catalog,policies}.ts`, matching `.test.ts` files, `scripts/roux/build-lse-policies.mts`, `tests/roux-lse-coverage.test.ts`, `src/methods/roux/data/lse-policies.bin` and `manifest.json`.

**Interfaces:**

- `LseCoordinate` contains six physical edge identities/orientations in `UF,UR,UB,UL,DF,DB`, M-center phase and corner U offset. No string-color substitutions.
- `encodeLse(engine:CubeEngine,state:CubeState): LseCoordinate|null`; return null for incomplete blocks, twisted/misordered corners or a center phase outside the fixed frame. `decodeLse(engine,coordinate):CubeState` builds a validated representative without changing physical targets.
- `LseGoal = 'orientation'|'left-right'|'solved'`. `lseGoalReached(engine,state,goal):boolean` uses Task 1 predicates and the spec's relative checks.
- `LseManeuver` follows Task 2's observed-match/protection contract, with LSE-specific matching instead of `BlockGoal`. Export `ROUX_LSE_MANEUVERS` and fixed-sequence `ROUX_LSE_ALGORITHMS`.
- `LseTables` contains the validated reachable domain and next-maneuver/decreasing-rank data for each goal. `lookupLseStep(tables,coordinate,goal): {maneuverId:string; rankBefore:number; rankAfter:number}|null`.

- [ ] **Step 1 — Write coordinate/model tests.** For legal M/U sequences, assert round-trip identity and compare each coordinate transition with real engine replay. Include all six primitive generators `U U' U2 M M' M2`, four center phases, four corner offsets and invalid-domain cases:

  ```ts
  const state = engine.apply(rouxReferenceState(engine),['M','U2',"M'",'U']);
  const coordinate = encodeLse(engine,state);
  expect(coordinate).not.toBeNull();
  expect(engine.equals(decodeLse(engine,coordinate!),state)).toBe(true);
  expect(encodeLse(engine,rouxFixture(engine,'broken-left-block'))).toBeNull();
  ```

- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/lse/coordinates.test.ts src/methods/roux/lse/model.test.ts`.
- [ ] **Step 3 — Implement the full reachable model.** Enumerate from the reference solved state under the six M/U generators. Compare its state set with an independent legal-coordinate enumeration and document the derived cardinality. Keep center phase and corner offset in the keys. Reject impossible orbit combinations instead of projecting them into a valid neighbor.
- [ ] **Step 4 — Generate maneuver policies.** Catalog explicit U setups, reference-center corrections, M2, the prepared arrow variants and front/back transport from spec section 7. Encode full affected-piece sets and preconditions. Generate decreasing ranks by reverse reachability for each goal. Require complete admitted-domain coverage; if an intended maneuver family leaves a gap, implement and explain that missing case instead of silently using arbitrary primitive search. The solved goal also protects the left/right relation at maneuver endpoints.
- [ ] **Step 5 — Verify exhaustively.** `node scripts/roux/build-lse-policies.mts --verify` and `npx.cmd vitest run src/methods/roux/lse tests/roux-lse-coverage.test.ts --maxWorkers=1`. Assert every generated edge against engine replay, exact equality of independently derived/reached domains, positive recorded state totals, every stage's goal reachability and strict rank descent outside a goal. Record counts and hashes in the manifest. Empty tables or a missing partition fail.
- [ ] **Step 6 — Commit.** Stage these source/test/generator/data files; `git commit -m "feat: model and verify the complete Roux LSE domain"`.

### Task 7: Explained edge orientation

**Files:** Create `src/methods/roux/lse/orientation.ts`, `orientation.test.ts`; extend `tests/fixtures/roux-cases.ts`.

**Interfaces:** `observeLseEO(engine,state): {reference:'ready'; badIds:string[]} | {reference:'setup-required'; badIds:null}`; `planEdgeOrientation(engine,initial,tables:LseTables,budget:RouxBudget):RouxPlanResult`.

- [ ] **Step 1 — Write tests.** Cover 0/2/4/6 bad edges, all reference phases, both arrow directions, a transport setup and a case where the number of bad edges temporarily increases. Assert:

  ```ts
  expect(observeLseEO(engine,engine.apply(rouxReferenceState(engine),['M']))).toEqual({reference:'setup-required',badIds:null});
  expect(observeLseEO(engine,result.state)).toEqual({reference:'ready',badIds:[]});
  expect(result.actions.flatMap(a=>a.moves).every(m=>/^[MU](2|')?$/.test(m))).toBe(true);
  ```

  Each emitted arrow has its actual recognized shape/hold; its setup and expected resulting pattern must match observations.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/lse/orientation.test.ts`.
- [ ] **Step 3 — Implement policy traversal.** Begin with visible reference normalization when required. Resolve `lookupLseStep` to a matched catalog maneuver, append its explanation/protection/temporary note, spend the shared budget and verify progress. Do not classify EO in the middle of an odd M phase. Use this same observation interface in later player guidance.
- [ ] **Step 4 — Run green.** Repeat focused tests and exhaustive LSE coverage. Inspect one six-bad-edge trace and one front/back arrow pair for accurate affected targets and non-monotone intermediate reasoning.
- [ ] **Step 5 — Commit.** `git commit -m "feat: explain Roux last-six-edge orientation"` after staging the task's files.

### Task 8: Relative left/right edges and the last four

**Files:** Create `src/methods/roux/lse/placement.ts`, `placement.test.ts`; extend the LSE coverage and fixture files.

**Interfaces:** `leftRightEdgesPlaced(engine,state):boolean`; `planLeftRightEdges(engine,initial,tables,budget):RouxPlanResult`; `planLastFourEdges(engine,initial,tables,budget):RouxPlanResult`.

- [ ] **Step 1 — Write tests.** Cover yellow-blue/yellow-green targets on top or bottom, one/both already placed, all U offsets, white-red/white-orange placement and displaced centers. Pin the relative meaning:

  ```ts
  const shifted = engine.apply(rouxReferenceState(engine),['U']);
  expect(leftRightEdgesPlaced(engine,shifted)).toBe(true);
  expect(rouxSolved(engine,shifted)).toBe(false);
  expect(rouxSolved(engine,finish.state)).toBe(true);
  ```

  Swapped target identities with the same visible yellow stickers must fail. Last-four maneuvers restore the placed-edge/corner relation at their endpoints.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/lse/placement.test.ts`.
- [ ] **Step 3 — Implement the two policies.** Use only registered M/U maneuvers and real target identities. Keep U offset in recognition and metadata; explain U preparation of the corner ring separately from final alignment. Normalize centers only through emitted physical moves. A solved input yields zero actions.
- [ ] **Step 4 — Run green and exhaustive completion.** Run the focused tests and `tests/roux-lse-coverage.test.ts`. Starting at every admitted LSE state, execute EO → left/right → last four; require bounded termination, preserved blocks, corner cyclic order, truthful checkpoints and `rouxSolved`.
- [ ] **Step 5 — Commit.** Stage the listed files; `git commit -m "feat: finish Roux edges with relative alignment checks"`.

### Task 9: Assets, runtime and complete trace

**Files:** Create `src/methods/roux/{assets,stages,presentation,definition,solve}.ts`, corresponding `.test.ts` files. Modify `src/core/types.ts`, `src/app/routes.ts` (only the exhaustive slug record at this task), `src/methods/shared/verification.test.ts`; complete `src/methods/roux/data/manifest.json` and generator outputs.

**Interfaces:**

- `RouxAssets = { blockPolicies:RouxBlockPolicies; lse:LseTables }`; `loadRouxAssets(fetcher:typeof fetch, signal?:AbortSignal):Promise<RouxAssets>`; `validateRouxAssets(raw:unknown):RouxAssets` checks shape, versions, catalog identities and integrity after decoding.
- Add `roux-beginner` to core `MethodId`, the Task 1 `RouxStageId` union to `StageId`, and `roux?: RouxActionMetadata` to `TraceAction`, using type-only imports/re-exports. Existing methods do not acquire Roux metadata requirements. Add its `roux` slug to satisfy `Record<MethodId,string>`; route parsing/exposure waits for Task 11.
- Export `ROUX_STAGE_IDS`, `ROUX_PRESENTATION`, `ROUX_RUNTIME`; runtime implements the existing `MethodRuntime` contract with all eight spec checkpoints. Its catalog combines Task 2 fixed block algorithms, Task 5 corners and Task 6 LSE sequences.
- `solveRoux(engine:CubeEngine, initial:CubeState, assets:RouxAssets, limits?:Partial<RouxLimits>, now?:()=>number):SolveResult`.

- [ ] **Step 1 — Write tests.** Mutate target ids, reference phase, formula boundary, source state, stage order and final center colors in otherwise valid drafts; runtime replay must reject each. Test truncated bytes, wrong hash, unsupported version, abort and shared cache mutation. Also assert:

  ```ts
  expect(result.trace.stages.map(s=>s.id)).toEqual(ROUX_STAGE_IDS);
  expect(result.trace.stages[0].actions[0].moves).toEqual(['x2','y']);
  expect(()=>verifyTrace(engine,result.trace,ROUX_RUNTIME)).not.toThrow();
  expect(rouxSolved(engine,result.trace.final)).toBe(true);
  expect(result.trace.stages.flatMap(s=>s.actions).length).toBeLessThanOrEqual(160);
  ```

  Limit failures must return `ok:false`, the responsible Roux stage and an honest reason, without a partial trace presented as success.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/assets.test.ts src/methods/roux/definition.test.ts src/methods/roux/solve.test.ts src/methods/shared/verification.test.ts`.
- [ ] **Step 3 — Implement loading and composition.** Resolve artifact URLs with Vite's asset handling, validate hashes/version/catalog digest and keep lookup buffers private/immutable to consumers. Begin the solve budget after assets are loaded. Emit the real frame action, then call Tasks 3–5/7–8 in order. Admit each draft through the shared trace builder and the Roux runtime; count actions/moves once, nodes/time throughout, and revalidate the complete trace before return. Preserve per-stage skip explanations. Convert planning failures to existing `SolveFailure` codes.
- [ ] **Step 4 — Run green.** Repeat focused tests, all `src/methods/roux` tests and typecheck. Keep existing shared verifier behavior intact; do not weaken it to accept temporary intermediate states that only need different endpoint predicates.
- [ ] **Step 5 — Commit.** Stage only the listed changes; `git commit -m "feat: assemble verified bounded Roux solve traces"`.

### Task 10: Full-route corpus and maintained verification commands

**Files:** Create `tests/roux-corpus.test.ts`, `tests/roux-color-input.test.ts`, `tests/roux-stage-boundaries.test.ts`, `docs/validation/2026-10-21-beginner-roux.md`; modify `package.json` and `tests/helpers/roux.ts`. Worker end-to-end color entry joins these tests in Task 11.

**Interfaces:** Reuse `seededScramble(seed)` from `tests/fixtures/lbl-cases.ts`, `stateToFacelets`/`validateFacelets` and `verifyTrace`. Add `assertCompleteRouxTrace(engine,initial,trace):void` to `tests/helpers/roux.ts`. No new production interface.

- [ ] **Step 1 — Write acceptance tests.** Run seeds **1–1000** through `solveRoux`, and a separate fixed set of 100 legal facelet snapshots from seeds **2001–2100** through input validation and solving. Split the scramble corpus into ten named 100-seed tests with a 180-second test timeout each; give the color corpus a 180-second test timeout. These runner limits do not relax the per-solve ceilings. Include solved, partly finished, trapped pieces, all skip boundaries and long/repeated maneuvers. Failures print seed, moves/input and stage. Verify:

  ```ts
  expect(engine.equals(trace.initial,initial)).toBe(true);
  expect(trace.method).toBe('roux-beginner');
  expect(trace.stages).toHaveLength(8);
  verifyTrace(engine,trace,ROUX_RUNTIME);
  expect(rouxSolved(engine,trace.final)).toBe(true);
  ```

  Compare deterministic repeat results for a fixed 50-seed subset, and compare equivalent scramble/facelet physical traces after input normalization. Each action must match catalog recognition, not merely contain nonempty prose. Every corner-stage output must encode into the admitted LSE domain.
- [ ] **Step 2 — Run the new corpus before fixing failures.** `npx.cmd vitest run tests/roux-corpus.test.ts tests/roux-color-input.test.ts tests/roux-stage-boundaries.test.ts --maxWorkers=1`; record uncovered cases rather than skipping them. This integration test can initially pass when its already-tested dependencies are correct; do not manufacture a red failure.
- [ ] **Step 3 — Add maintained commands and resolve actual gaps.** `test:roux` runs the focused source and corner/stage tests; `test:roux:coverage` runs block/corner/LSE coverage; `test:roux:corpus` runs the two full-input corpora. `verify:roux` runs both generators with `--verify`. Keep existing test commands intact. Any discovered rule correction gets its own failing regression before a fix.
- [ ] **Step 4 — Run all four commands and typecheck.** Record counts, max emitted tokens/actions, node expansions, cold asset size/load and warm-solve timing, machine/browser details and unresolved physical checks. Do not inflate time limits merely to disguise a known slow case; any justified change from the spec ceilings must be documented and explained.
- [ ] **Step 5 — Commit.** Stage tests/scripts/docs and any isolated regression fix; `git commit -m "test: verify complete Roux teaching traces and coverage"`.

## Completion boundary

This plan delivers a verified headless solver and maintainable coverage checks. Task 11 makes it available through the existing browser input flow; Task 15 establishes browser, release and physical-acceptance evidence. A successful corpus is not permission to label untested physical teaching as accepted.
