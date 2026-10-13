# CubeSteps V1.3 Advanced CFOP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explained Advanced CFOP method with a provably shortest white cross, efficient formula-based F2L, full OLL/PLL, and a shared algorithm library with selected-case practice.

**Architecture:** Keep the accepted LBL and Beginner CFOP runtimes intact. A verified case/variant registry supplies the Advanced solver, lessons, library and practice; an exact cross distance table and bounded F2L selection run in workers. Complete solves and partial algorithm demonstrations have separate validation contracts feeding one playback timeline.

**Tech Stack:** Existing React, TypeScript, Vite, cubing.js 0.65.1, Vitest, Testing Library, Playwright, Node.js 24+, npm and CSS. Retain the lockfile; no additional runtime dependency is planned.

**Spec:** [Approved Advanced CFOP design](../specs/2026-10-12-advanced-cfop-design.md), approved October 12, 2026.

**Status:** Approved by the owner on October 12, 2026. Native implementation is in progress, after publishing the accepted player readiness fix. Checkboxes below record verified task progress.

## Global Constraints

- Preserve the English, account-free, browser-only experience and the existing physical-cube follow-along workflow.
- Keep LBL and Beginner CFOP; add a separate **Advanced CFOP** method.
- Guarantee a shortest white cross in face turns. A 180-degree face turn counts as one; whole-cube rotations are recorded separately.
- Add method ID `cfop-advanced`, with five ordered stages: `advanced-cross`, `advanced-f2l`, `advanced-oll`, `advanced-pll`, `advanced-auf`.
- Use a finite, explicit case library covering the standard 41 F2L cases, with verified handling for trapped pieces, wrong slots, a solved corner with an unsolved edge, and already-completed pairs.
- Cover **57 OLL cases** and **21 PLL cases**, excluding the already-satisfied state.
- Keep free-scramble input limited to its existing six-face notation in this release.
- Physical practice setup sequences also use six-face notation from the documented white-up, green-front start.
- Save only the selected practice IDs/groups in versioned local storage, with ID validation, migration of known fields and graceful behavior when storage is unavailable.
- Do not collect solve times, scores, accounts or cloud history.
- First publish Advanced CFOP as a preview with its physical acceptance pending; the accepted LBL and Beginner methods retain their status.

## Review Focus

1. **A cached distance asset from another build:** reject incompatible bytes before using them; never label a non-optimal fallback shortest. Task 2 tests a correct-length corrupted asset and a mismatched manifest.
2. **F2L with a solved corner and an edge trapped in another unsolved slot:** preserve completed pairs and choose a legal extraction before insertion. Tasks 3–4 exercise protected-slot combinations and preparation budgets.
3. **A slice/wide formula whose centers move midway, or an OLL clip that does not solve the cube:** render exact intermediate colors and report only the promised endpoint. Tasks 1 and 8 check these boundaries and partial completion copy.
4. **Changing a practice pool during generation or leaving during answer reveal:** discard old results, stop playback and hide the old answer, including accessible labels. Tasks 11–12 test late replies and browser history.
5. **A selected case with only one enabled option or stale storage IDs:** produce a valid variation without repeating an identical consecutive exercise where alternatives exist, and recover an empty pool safely. Task 12 tests one-case pools, bag boundaries, corrupt storage and unavailable storage.

---

## Starting point and execution

The small accepted-CFOP polish commit is `d0ade39b9ed870a8418f3bc074a310cda291dedf` (PR #6). The design branch is `codex/advanced-cfop-design` in `D:\Projects\Cubing Calculator\cube-steps\.worktrees\cfop-v12`; its initial spec commit is `2fd75fa`. Check current refs before execution: the polish merge/Pages release proceeds independently of this planning document. Keep Advanced documentation and code out of that release.

After approval, use `using-git-worktrees` to verify/reuse this isolated checkout, then `executing-plans`. Implement sequentially with the preserved Native approach; shared contracts make parallel implementers unnecessary. Obtain one fresh independent whole-branch review before merging. Each task owns a red/green cycle and a focused commit; use `npm.cmd`/`npx.cmd` on Windows. Observe a behavior failure after missing-export scaffolding, then implement; a compilation error alone is not the red evidence. Before each implementation commit, run its focused checks and `npm.cmd run typecheck`. Preserve unrelated changes and existing regression snapshots.

These are dependent milestones of one requested version. The library and practice are consumers of the same admitted cases; do not ship a partial catalog as completed Advanced CFOP. If a measured gate fails, fix the data/rules and rerun that gate rather than weakening the promise or substituting Beginner CFOP.

## File responsibilities

| Files (new unless marked existing) | Responsibility |
| --- | --- |
| Existing `src/core/types.ts`, `teaching-moves.ts`; `src/core/move-metrics.ts`, `holding-frame.ts` | Canonical move grammar, counts, explicit frame normalization, method/stage types |
| `src/algorithms/types.ts`, `registry.ts`, `admission.ts`; `data/f2l.ts`, `data/oll.ts`, `data/pll.ts`, `data/fixtures.ts` under that directory | Stable case identities, variants, source metadata, independent legal patterns and physical setups |
| `src/methods/advanced/cross/{coordinates,table,generate,load,solve}.ts`; generated `distance-v1.bin`, `distance-manifest.json` | Dense cross coordinates, reproducible BFS asset, runtime integrity check and shortest trace |
| `src/methods/advanced/f2l/{recognize,prepare,candidates,select,solve}.ts` | Pair signatures, protected extraction, oriented variants, bounded pair choice |
| `src/methods/advanced/{stages,context,presentation,definition,recognize-oll,recognize-pll,last-layer,solve}.ts` | Stage goals, verification, full last-layer recognition and complete method |
| Existing `src/methods/{contracts,registry}.ts`, `shared/{trace,verification}.ts`; existing worker/client files | Explicit Advanced integration, cancellation and asset loading |
| `src/algorithms/{demonstration,fixtures}.ts`; `src/player/{playback-source,playback-timeline,PlaybackView,AlgorithmPlayer}.tsx/ts` | Validated partial clips and common player; retain existing `CubePlayer` API as a wrapper |
| Existing app/content files; `src/content/advanced-{course,examples}.ts` | Routes, method status, original lessons, method-independent stage counts |
| `src/app/algorithms/{AlgorithmLibraryPage,AlgorithmDetailPage,CaseDiagram}.tsx`, `algorithm-library.css` | Filters, shareable cases, locally generated recognition diagrams |
| `src/practice/{types,pool,storage,generate}.ts`, `src/workers/practice-{protocol,request}.ts`, `practice.worker.ts`, `src/app/practice/{practice-client,PracticePage}.ts/tsx` | Verified selected-case exercises, shuffled bags, persistence, request lifecycle |
| `scripts/generate-cross-table.mts`, `scripts/generate-case-setups.mts`; `tests/fixtures/advanced-*.ts`; new focused tests/corpora and e2e specs | Reproducible assets, independent admission, correctness/efficiency and browser evidence |
| `docs/validation/v1.3.md`, `docs/algorithms.md`; existing README, package scripts and workflows | Honest coverage, formulas/metrics provenance, all required CI gates and release record |

Paths in task blocks resolve the `.ts`/`.tsx` shorthand above. New scripts that directly import TypeScript use Node 24 type stripping, explicit `.ts` import suffixes and erasable syntax; add `scripts/**/*.mts` to typechecking. Keep browser modules free of Node imports.

## Task 1: Canonical teaching notation and shared catalog admission

**Files:** Modify `src/core/{types,teaching-moves}.ts`, `src/content/notation-lesson.ts`, `tsconfig.json`; create `src/core/{move-metrics,holding-frame}.ts`, `src/algorithms/{types,registry,admission}.ts`; tests beside each new/changed module.

**Interfaces:** Extend `MethodId`/`StageId` with the exact Advanced identities now so later rule modules typecheck, but defer runtime/UI registration to Tasks 7/9. `TeachingMove` accepts face turns, `Rw/Lw/Uw/Dw/Fw/Bw`, `M/E/S`, and `x/y/z`, each with empty/prime/2 suffix. `normalizeTeachingAlgorithm(text: string): TeachingMove[]` admits lowercase wide aliases only at catalog ingestion and throws with token position on unsupported syntax. `countTeachingMoves(moves: readonly TeachingMove[]): { faceTurnEquivalents: number; rotations: number }`; `canonicalHoldingMoves(engine: CubeEngine, state: CubeState): TeachingMove[]` chooses a deterministic shortest rotation-token path to white-down/green-front.

`AlgorithmFamily = 'f2l' | 'oll' | 'pll'`; `CaseId`/`VariantId` are strings with registry-validated membership. `AlgorithmCase` holds `id, family, label, group, canonicalSignature, recognition, defaultVariantId, variantIds, fixtureIds, sourceRefs`. `AlgorithmVariant` extends existing `TeachingAlgorithm` with `id, caseId, startSignature, targetSlot?: 'FR'|'FL'|'BR'|'BL', executionPenalty: 0 | 1 | 2, sourceRefs`; its machine-readable starting signature is independently verified alongside the human precondition. `AlgorithmRegistry` has read-only `cases`, `variants`, and `preparations: Readonly<Record<string, TeachingAlgorithm>>` records; preparations are separately admitted named extraction macros, not extra standard cases. Export `getAlgorithmCase(id: string): AlgorithmCase | undefined`, `getAlgorithmVariant(id: string): AlgorithmVariant | undefined`, and `admitRegistry(registry: AlgorithmRegistry): void`. Stable IDs: `f2l-01`…`f2l-41`, `oll-01`…`oll-57`, standard PLL names prefixed `pll-`; document source numbering explicitly. Use variant IDs such as `f2l-01/main/fr`; never confuse them with case IDs.

- [x] Write `normalizes_catalog_aliases_without_broadening_scrambles`, `counts_outer_block_equivalents`, `preserves_frame_and_inversion`, and `rejects_invalid_registry_references`. Assert `normalizeTeachingAlgorithm("r U M2")` equals `['Rw','U','M2']`; `countTeachingMoves(['R2','Rw',"M'",'y2'])` equals `{faceTurnEquivalents:4,rotations:1}`; existing `parseScramble('r U')` remains a failure. Reject duplicate case/variant IDs, mismatched case ownership, invalid segments, absent defaults and invalid tokens.
- [x] Run `npx.cmd vitest run src/core/teaching-moves.test.ts src/core/move-metrics.test.ts src/core/holding-frame.test.ts src/algorithms/admission.test.ts`; record the intended failures.
- [x] Implement the interfaces and admission checks. Enumerate all 24 rotation frames; derive frame goals from center observations, not hardcoded piece positions. Keep existing `isTeachingMove` strict for canonical tokens. Verify all admitted token families against cubing.js and their inverse, including intermediate center movements. Do not register an incomplete Advanced method in the UI.
- [x] Rerun the focused command and existing `src/core/notation.test.ts`, `cube.test.ts`, `facelets.test.ts`; all pass with free-input behavior preserved. Add exact wide/slice explanation strings to original course content.
- [x] Commit as `feat: define advanced teaching notation and algorithm contracts`.

## Task 2: Exact cross table, integrity and shortest explained moves

**Files:** Create `src/methods/advanced/cross/{coordinates,table,generate,load,solve}.ts`, generated `distance-v1.bin`, `distance-manifest.json`, `scripts/generate-cross-table.mts`, `tests/advanced-cross-table.test.ts`, focused `cross/*.test.ts`; modify `package.json` and optional cross metadata in `src/core/types.ts`.

**Interfaces:** `CrossCoordinate = { positions: [number,number,number,number]; orientations: [number,number,number,number] }`; `rankCross(c: CrossCoordinate): number`, `unrankCross(index: number): CrossCoordinate`, `extractCross(engine: CubeEngine,state: CubeState): CrossCoordinate`, `transitionCross(c: CrossCoordinate,move: FaceMove): CrossCoordinate`. Coordinates require the canonical frame; labeled white-edge order is its solved F/R/B/L side order. `CrossTable = { version: 1; distances: Uint8Array; goalIndex: number }`; `generateCrossTable(): CrossTable`, `loadCrossTable(fetcher: typeof fetch, signal?: AbortSignal): Promise<CrossTable>`. `planShortestCross(engine: CubeEngine,state: CubeState,table: CrossTable): { holdingMoves: TeachingMove[]; moves: FaceMove[]; distances: number[] }`; state remains unchanged. `TraceAction.cross? = { distanceBefore: number; distanceAfter: number }` is verified metadata for individual cross moves.

- [ ] Write `proves_every_cross_distance`, `matches_engine_transitions_in_all_frames`, `rejects_corrupt_or_stale_cross_asset`, and `explains_each_distance_decrease`. Assertions: `distances.length === 190080`; every rank round-trips; exactly the goal has distance 0; every edge satisfies `abs(d(s)-d(next)) <= 1`; every non-goal has a successor at distance `d-1`; no unreached byte 255. Include sampled independent coordinate BFS and legal cube realizations (not only tests of the generator against itself).
- [ ] Run `npx.cmd vitest run tests/advanced-cross-table.test.ts src/methods/advanced/cross`; record failures.
- [ ] Implement partial-permutation ranking times 16 orientation bits and BFS from the solved goal over all 18 turns. Commit the raw 190,080-byte table and manifest with schema, coordinate version, goal, byte length and SHA-256. `npm.cmd run generate:cross` deterministically reproduces both; `npm.cmd run verify:cross` regenerates/compares without rewriting. Import the binary via Vite `?url` so deployed filenames are content-hashed; only the Advanced worker loader fetches it and checks digest/version/length.
- [ ] Implement distance descent. Select equal-distance moves deterministically by next-face-change penalty then stable order `U,U',U2,R,R',R2,F,F',F2,D,D',D2,L,L',L2,B,B',B2`; optimum always precedes preference. An already-satisfied cross returns no face turns. Explain each moved white edge's actual before/after position and side alignment; never assert every move preserves prior cross edges. Whole-method integration appends explicit holding actions only when later work needs them.
- [ ] Rerun focused tests and `npm.cmd run verify:cross`. Cover all 24 starting frames, solved/partial goals, mutated bytes of correct length, missing assets and aborted fetch. Verify selected path length equals initial distance and every move decreases it exactly once.
- [ ] Commit as `feat: add proven shortest white cross planning`.

## Task 3: Admit 41 F2L cases and protected preparation

**Files:** Create `src/algorithms/data/f2l.ts`, `src/algorithms/data/fixtures.ts`, `src/algorithms/fixtures.ts`, `src/methods/advanced/f2l/{types,recognize,prepare}.ts`, `scripts/generate-case-setups.mts`, `tests/fixtures/advanced-f2l.ts`, `src/methods/advanced/f2l/{recognize,prepare}.test.ts`, `src/algorithms/f2l-admission.test.ts`, `docs/algorithms.md`; extend the Task 1 registry.

**Interfaces:** Reuse immutable pair IDs from existing `observeF2LPairs`. `F2LTarget = { cornerId: string; edgeId: string; slot: 'FR'|'FL'|'BR'|'BL' }`; `recognizeAdvancedF2L(engine: CubeEngine,state: CubeState,target: F2LTarget): { caseId: CaseId; slot: F2LTarget['slot'] } | null`. Define `F2LLimits = { maxPreparationStates: number; maxExtractionMacros: number; maxCandidatesPerTarget: number; maxSimulations: number }` in `f2l/types.ts`, with defaults 256/2/256/32768 respectively; allow smaller injected limits for failure tests. `F2LPreparation = { actions: ActionInput[]; state: CubeState }`; `enumerateF2LPreparations(engine: CubeEngine,state: CubeState,target: F2LTarget,limits?: F2LLimits): F2LPreparation[]` throws `RuleError` on budget or unsupported input. `CaseFixture = { id: string; caseId: CaseId; setup: readonly FaceMove[]; holdingMoves: readonly TeachingMove[]; initial: CubeState; target?: F2LTarget; protectedIds: readonly string[] }`; `getCaseFixture(id: string): CaseFixture | undefined` and `verifyCaseFixture(engine: CubeEngine,fixture: CaseFixture): void`.

- [ ] Write `admits_41_cases_in_four_slots`, `extracts_solved_corner_with_trapped_edge`, and `preserves_every_protected_slot_combination`. Assert 41 distinct canonical case IDs, exactly one default per case, original source-number mapping, all four slots, both edge orientations and all target corner orientations. Independently construct legal corner/edge placements with cross/selected protected pairs intact; do not construct expected recognition solely by inverse formulas.
- [ ] Run `npx.cmd vitest run src/algorithms/f2l-admission.test.ts src/methods/advanced/f2l/recognize.test.ts src/methods/advanced/f2l/prepare.test.ts`; observe expected failures.
- [ ] Transcribe practical formulas from the spec's cited references; supply original holding/recognition/trigger explanations and per-variant references. Default execution penalty is 0; alternatives may use 1 or 2 only with a documented awkward-grip reason. Generate oriented variants by validated spatial conjugation, with exact moves registered under separate variant IDs; do not change moves at execution time or silently mirror a formula.
- [ ] Implement coordinate-signature recognition and preparations: U/U'/U2 alignment and complete extraction macros from unsolved slots. Each macro restores cross/protected pairs; enumerate at most two extraction macros, at most 256 unique preparation states per target, deduplicated by state plus target. Cases already admissible need no extraction; missing coverage/budget is explicit failure, never cycling. Record extraction as named admitted preparation formulas, distinct from the 41 standard insertion cases.
- [ ] Generate physical setups offline from independently declared legal fixtures. Use the installed `experimentalSolve3x3x3IgnoringCenters` only in this development script to find an outer-face setup, invert and verify it, and commit the resulting setup data. It is not a runtime method fallback. Start physical setup white-up/green-front; list separate rotation-only `holdingMoves`; `apply(solved,[...setup,...holdingMoves])` must equal `initial`. `npm.cmd run verify:cases` verifies committed data without depending on randomized regeneration.
- [ ] Rerun the focused checks. Every admitted default/alternative and slot variant solves its target while preserving cross and specified pairs at its completed boundary. Check wrong-slot extraction, already-solved pair, solved corner with unsolved edge, and preparation exhaustion.
- [ ] Commit as `feat: admit advanced F2L formulas and protected setups`.

## Task 4: Bounded F2L pair selection and explained insertion

**Files:** Create `src/methods/advanced/f2l/{candidates,select,solve}.ts` and adjacent tests; create `src/methods/advanced/context.ts`; extend trace metadata in `src/core/types.ts`.

**Interfaces:** `AdvancedContext = { engine: CubeEngine; trace: TraceBuilder; crossTable: CrossTable }`. `F2LCandidate = { target: F2LTarget; caseId: CaseId; variantId: VariantId; actions: ActionInput[]; after: CubeState; immediateCost: number }`. `enumerateF2LCandidates(engine: CubeEngine,state: CubeState,target: F2LTarget,limits?: F2LLimits): F2LCandidate[]`; `chooseF2LCandidate(engine: CubeEngine,state: CubeState,limits?: F2LLimits): F2LCandidate & { nextCost: number; compared: number }`; `solveAdvancedF2L(context: AdvancedContext): StageResult`.

- [ ] Write `chooses_pair_from_actual_state`, `uses_next_pair_tie_break_and_is_deterministic`, `restores_cross_and_prior_pairs`, and `fails_bounded_preparation`. Assert each insertion increases completed-pair count, selected actions exactly reference registry moves, later pair identity survives regrips, and a crafted state chooses a different first pair from fixed-order Beginner CFOP.
- [ ] Run `npx.cmd vitest run src/methods/advanced/f2l`; observe failures in selection/solve tests.
- [ ] Implement policy `f2l-v1`: immediate cost = face-turn equivalents + `2 * rotations + executionPenalty`; retain the best eight validated candidates per target by this cost and stable variant/setup order. Compare all retained first candidates with their cheapest valid one-pair continuation; next cost is the minimum immediate cost over remaining pairs, with no recursive lookahead. Rank by `immediateCost + 0.5 * nextCost`, then immediate cost, rotation count, target ID, variant ID and setup string. If no pairs remain, next cost is 0; if unsolved pairs remain with no valid continuation, reject that candidate. No invalid candidate can win; no global F2L optimality claim.
- [ ] Bound work to 256 candidate outputs per target and 32,768 candidate simulations per selection, with Task 3 preparation bounds at every evaluation and one cumulative simulation counter across the entire first/next comparison. Throw budget failure rather than truncating silently. Preserve 512 actions/4,096 moves per whole trace. Record chosen case/variant, target slot, pair progress and policy inputs in optional `TraceAction.selection` metadata (`policyVersion, immediateCost, nextCost, compared`). Prepares and insertions are separate visible actions with verified checkpoints.
- [ ] Rerun focused tests plus existing `src/methods/cfop/f2l.test.ts`; all pass. Exercise explicit y regrip alternatives, insertion into back/left slots without forced front-right rotation, multiple solved pairs, deterministic ties and artificial low budgets.
- [ ] Commit as `feat: choose efficient F2L pairs with bounded lookahead`.

## Task 5: Full OLL catalog and independent recognition

**Files:** Create `src/algorithms/data/oll.ts`, `src/methods/advanced/recognize-oll.ts`, `src/methods/advanced/recognize-oll.test.ts`, `src/algorithms/oll-admission.test.ts`, `tests/fixtures/advanced-last-layer.ts`; extend fixtures/registry/source documentation.

**Interfaces:** `LastLayerMatch = { caseId: CaseId; variantId: VariantId; setup: TeachingMove[] }` in `src/algorithms/types.ts`; `recognizeAdvancedOLL(engine: CubeEngine,state: CubeState): LastLayerMatch | null`, where null means the orientation goal is already met; non-F2L states throw verification failure. Recognition keys use yellow sticker orientation, ignoring permutation, under allowed U alignment/y regrip.

- [ ] Write `recognizes_all_216_legal_oll_orientations` and `each_oll_formula_preserves_f2l`. Assert 57 unsolved case IDs, all `2^3 * 3^3 = 216` legal orientation patterns recognized as a case or the solved orientation, arbitrary legal last-layer permutations do not change case identity, and one admitted formula after setup orients all last-layer pieces.
- [ ] Run `npx.cmd vitest run src/methods/advanced/recognize-oll.test.ts src/algorithms/oll-admission.test.ts`; record failures.
- [ ] Admit one practical formula per OLL case, source references, original recognition text and contiguous trigger segments. Build a signature-to-case/setup map from independently declared canonical patterns; detect ambiguous entries at admission. Prefer fewer setup rotations then fewer U turns then stable variant ID. Keep all 57 cases distinct and reject a composed two-look substitute.
- [ ] Verify every formula/fixture/setup orientation and legal pattern through the cube engine, including wide/slice algorithms and nontrivial permutation parity. Run focused checks and `npm.cmd run verify:cases`; all pass.
- [ ] Commit as `feat: add complete one-look OLL teaching cases`.

## Task 6: Full PLL catalog, stage checks and final alignment

**Files:** Create `src/algorithms/data/pll.ts`, `src/methods/advanced/{recognize-pll,last-layer,stages,presentation,definition}.ts` and adjacent tests; extend registry/fixtures and Task 5 legal-pattern helper.

**Interfaces:** `recognizeAdvancedPLL(engine: CubeEngine,state: CubeState): LastLayerMatch | null` treats solved-up-to-AUF as null and requires F2L plus OLL. `ADVANCED_STAGE_IDS` has the five exact spec IDs. Export `checkAdvancedStage(engine,state,id): boolean`, `ADVANCED_PRESENTATION: MethodPresentation`, `ADVANCED_RUNTIME: MethodRuntime`, `solveAdvancedOLL(context: AdvancedContext): StageResult`, `solveAdvancedPLL(context: AdvancedContext): StageResult`, `solveAdvancedAUF(context: AdvancedContext): StageResult`. Advanced presentation algorithms are derived from admitted registry variants (including setup formulas), not duplicate move definitions.

- [ ] Write `recognizes_all_288_legal_pll_permutations`, `solves_one_formula_then_auf`, and `checks_partial_stages_in_all_frames`. Assert 21 named cases, every equal-parity last-layer edge/corner permutation (`24 * 24 / 2 = 288`), at most one formula per unsolved PLL, no formula for AUF-only states, and final U/U'/U2 alignment solves the cube.
- [ ] Run `npx.cmd vitest run src/methods/advanced/recognize-pll.test.ts src/methods/advanced/last-layer.test.ts src/methods/advanced/stages.test.ts`; observe failures.
- [ ] Implement canonical relative-permutation signatures, including cyclic side-color alignment, without trial-applying every formula. Admit all 21 formulas and their fixtures. Stage checks: matched white cross; cross plus four pairs; F2L plus full yellow orientation; F2L/OLL plus permutation solved up to U; fully solved. Checks are center-relative and frame-independent. Setup U turns and physical y regrips stay separate; OLL/PLL append one algorithm action with a verified stage effect.
- [ ] Rerun focused checks, OLL admission and `npm.cmd run verify:cases`; all pass. Verify H/Z slice formulas, all AUF offsets, skipped OLL/PLL and tampered recognition metadata.
- [ ] Commit as `feat: add full PLL and advanced stage verification`.

## Task 7: Complete Advanced traces and worker integration

**Files:** Create `src/methods/advanced/solve.ts`, `src/methods/advanced/solve.test.ts`, `src/methods/advanced/assets.ts`, `tests/advanced-cfop-corpus.test.ts`; modify existing `src/core/types.ts`, `src/methods/registry.ts`, `src/workers/{solve-protocol,solve-request,solve.worker}.ts`, `src/app/solve-client.ts` and tests, `src/methods/shared/verification.ts` where metadata validation requires it, `package.json`.

**Interfaces:** Register the Advanced identities introduced in Task 1. `AdvancedAssets = { crossTable: CrossTable }`; `loadAdvancedAssets(fetcher: typeof fetch, signal?: AbortSignal): Promise<AdvancedAssets>` delegates Task 2. `solveAdvancedCFOP(engine: CubeEngine,initial: CubeState,assets: AdvancedAssets,limits?: SolveLimits): SolveResult`. Preserve synchronous `handleSolveRequest(engine: CubeEngine,request: unknown,advanced?: AdvancedAssets): WorkerReply | null`; the async worker loads assets only for an explicitly valid Advanced request. Missing assets for Advanced return a solver error, never another method. Existing callers for LBL/Beginner need no assets.

- [ ] Write `returns_five_verified_stages`, `rejects_wrong_method_or_missing_assets`, `cancels_during_asset_load`, and `replays_1000_advanced_inputs_twice_and_as_colors`. Assert method/stage identity, exact input provenance, per-move recorded states, all checkpoints, final solved cube, deterministic repeated trace and unchanged input objects. Solved inputs in all 24 frames return five skips and zero moves.
- [ ] Run `npx.cmd vitest run src/methods/advanced/solve.test.ts src/workers/solve-request.test.ts src/app/solve-client.test.ts tests/advanced-cfop-corpus.test.ts`; record failures.
- [ ] Orchestrate shortest cross, F2L, OLL, PLL, AUF with `createMethodTrace` and `verifyTrace`. Append each shortest-cross face turn with its actual evidence/distance; normalize holding explicitly only for unsatisfied work. Extend runtime `checkAction` to independently verify recognition, variant references, cross distances and protected pieces. Preserve success-only complete traces and existing failure codes.
- [ ] Wire lazy asset loading inside the worker, terminate worker on cancellation, and add a 30-second client watchdog returning a retryable worker failure (clear it on every success/failure/cancel path). Validate method/request identity before returning. Keep old LBL/Beginner corpus expectations and snapshots unchanged.
- [ ] Rerun focused checks and `npm.cmd run test:corpus`, including the new Advanced corpus in that script. The fixed seeds are 1–1000 from existing `seededScramble`; each runs twice plus identical six-face state input. New corpus timeout is 600,000 ms to detect runaways without claiming device performance.
- [ ] Commit as `feat: integrate complete advanced CFOP solve traces`.

## Task 8: Shared playback for full solves and partial demonstrations

**Files:** Create `src/algorithms/demonstration.ts`, `src/player/{playback-source,playback-timeline}.ts`, `src/player/{PlaybackView,AlgorithmPlayer}.tsx`; modify existing `src/player/CubePlayer.tsx`, `src/player/{controller,cubing-adapter,initial-setup,timeline}.ts` and `src/player/PlayerFixture.tsx`; add `src/algorithms/demonstration.test.ts`, `src/player/algorithm-player.test.tsx`, `e2e/advanced-player.spec.ts`.

**Interfaces:** `AlgorithmDemonstration = { caseId: CaseId; variantId: VariantId; fixtureId: string; setup: readonly FaceMove[]; holdingMoves: readonly TeachingMove[]; initial: CubeState; actions: TraceAction[]; final: CubeState; checkpoint: Checkpoint }`. `createDemonstration(engine: CubeEngine,fixture: CaseFixture,variantId: VariantId): AlgorithmDemonstration`; `verifyDemonstration(engine: CubeEngine,demo: AlgorithmDemonstration): void`. `PlaybackSource = { kind:'solve'; session:SolveSession } | { kind:'algorithm'; demonstration:AlgorithmDemonstration }`. `PlaybackSectionId = StageId | 'algorithm-setup' | 'algorithm-formula'`; `PlaybackTimeline` contains `moves: TeachingMove[]`, `states: CubeState[]`, `actions: {action:TraceAction;sectionId:PlaybackSectionId;start:number;end:number}[]`, `sections: {id:PlaybackSectionId;label:string;start:number;end:number;skipReason?:string}[]`, and `completion: {title:string;description:string}`. `createPlaybackTimeline(engine: CubeEngine,source: PlaybackSource): PlaybackTimeline` adapts both sources without inventing method stages for a demonstration.

- [ ] Write `plays_oll_without_claiming_cube_solved`, `rejects_wrong_case_variant_or_setup`, `retains_exact_color_input_initialization`, and `tracks_wide_slice_centers_bidirectionally`. Assert a legal OLL clip can finish OLL while the whole cube remains unsolved; the completion label is `Algorithm complete.` and checkpoint text names OLL. Reject mismatched case, altered moves, incorrect fixture setup and tampered endpoints.
- [ ] Run `npx.cmd vitest run src/algorithms/demonstration.test.ts src/player`; observe new expected failures while preserving existing player checks.
- [ ] Build common controller/view around validated sources. Keep `CubePlayer`'s existing `session`/stage callback API via a solve wrapper and introduce `AlgorithmPlayer({engine,demonstration})`. Existing `createPlaybackController(engine,session)` can remain a compatibility wrapper around a source controller. Do not loosen `SolveTrace`'s final-solved invariant. Partial initialization uses the verified physical setup plus holding rotations; full color input retains its existing exact inverse-trace initialization. `createDemonstration` matches the requested variant's starting signature under at most four U alignments/four y frames, records needed setup/regrips, and rejects a variant that cannot apply; it never assumes alternatives share the same grip.
- [ ] Check every admitted token's actual TwistyPlayer boundary state against logical state, forward/backward stepping and formula replay. Generalize frame/highlight text for all wide/slice tokens; preserve segment/current-turn synchronization, reduced motion and text-only fallback. No-WebGL availability must not prevent reading/stepping.
- [ ] Extend the existing development-only `?fixture=player` harness with admitted Advanced solve/demo choices so this task can be tested before library routes exist. Run focused unit checks and `npx.cmd playwright test e2e/advanced-player.spec.ts e2e/cfop-player.spec.ts e2e/player.spec.ts` sequentially against a dedicated port; Chromium/WebKit pass at 1440px and 390px. Include intermediate M/E/S and wide-turn center movement, last-move completion, changed demo cleanup and an F2L clip with other pairs unsolved.
- [ ] Commit as `feat: share verified playback with algorithm demonstrations`.

## Task 9: Advanced courses, routes and method status

**Files:** Create `src/content/advanced-{course,examples}.ts`, tests, `e2e/advanced-learning.spec.ts`; modify `src/content/courses.ts`, `src/app/{App,LearnPage,SolvePage,LessonLayout,MethodSelector}.tsx`, `src/app/routes.ts`, `src/methods/contracts.ts` and their tests, existing presentations and `src/styles.css`.

**Interfaces:** `getCourse('cfop-advanced')` returns intro plus five lessons, each using registry variants. `MethodPresentation.teachingStatus: 'accepted'|'preview'`: LBL and Beginner accepted, Advanced preview. `methodRoute` and new `lessonRoute(method: MethodId,lessonId: string): string` generate exact spec URLs. `AppRoute` gains explicit `not-found` rather than treating unknown method paths as successful LBL; preserve existing valid old URLs.

- [ ] Write `opens_six_advanced_lessons`, `preserves_input_across_three_methods`, and `reports_unknown_method_routes`. Assert five solve navigation stages; intro plus five lessons; direct-bottom shortest cross teaching; full OLL/PLL one-look labels; method-specific submit button; drafts/selected face/undo/color validation survive switches while results clear. Check back/forward during solving and random-scramble generation.
- [ ] Run `npx.cmd vitest run src/content/advanced-course.test.ts src/app`; observe intended failures.
- [ ] Add original lessons and verified examples for shortest cross, protected F2L selection, full OLL, full PLL and AUF. Cross shows minimum turns with regrips separate; F2L explains selected pair/variant; case selectors point at real matched registry IDs. Generate stage counts from metadata, replace hardcoded beginner navigation copy, and show Preview only for Advanced. Add registry links from applicable formula cards.
- [ ] Verify examples by actual `solveAdvancedCFOP` matches and checkpoints, never by a displayed case label alone. Run focused tests plus `npx.cmd playwright test e2e/advanced-learning.spec.ts e2e/method-switching.spec.ts` on both browsers; no overflow, broken refresh routes, lost input or stale result.
- [ ] Commit as `feat: teach and navigate advanced CFOP alongside beginner methods`.

## Task 10: Algorithm library, diagrams and variant demonstrations

**Files:** Create `src/app/algorithms/{AlgorithmLibraryPage,AlgorithmDetailPage,CaseDiagram}.tsx`, `algorithm-library.css`, component tests, `e2e/algorithm-library.spec.ts`; extend routes/App navigation.

**Interfaces:** `AlgorithmLibraryPage({engine}: {engine: CubeEngine})`; `AlgorithmDetailPage({engine,caseId}: {engine: CubeEngine;caseId: string})`; `CaseDiagram({state,targets,hideIdentity}: {state: CubeState;targets: readonly string[];hideIdentity?: boolean})`. Routes `#/algorithms` and `#/algorithms/<case-id>` carry no solve-method identity. App handles them before accessing method-specific properties.

- [ ] Write `filters_all_119_cases`, `links_recognition_to_matching_variant`, `renders_diagram_from_fixture`, and `shows_unknown_case_fallback`. Assert family totals 41/57/21; group filters compose; changing variant updates formula, triggers and playback together; every tile/detail links its stable ID; unknown IDs do not show another case.
- [ ] Run `npx.cmd vitest run src/app/algorithms`; observe failures.
- [ ] Build the library from registry data with family/group filtering, searchable labels/IDs, holding instructions, original recognition guide, formula segments and source links. Lazy-load library/practice route modules and fixture data when needed; the normal lesson entry must not load the cross table or offline generator. Generate SVG sticker diagrams locally from engine-observed fixture state (last-layer top plus adjacent side stickers; F2L view includes its target slot). Retain non-color labels and text alternatives. Hide irrelevant pieces consistently with recognition instructions, not by copying a reference image. No custom formula editor.
- [ ] Use Task 8 demonstrations for default and selected alternative; switching clears/disposes old playback. Do not change solver preferences when browsing a variant. Task 12 adds the practice entry once its route and selection model exist.
- [ ] Run focused tests and `npx.cmd playwright test e2e/algorithm-library.spec.ts`; verify deep-link refresh, all group filters, keyboard controls, 390px layout, formula/source consistency, no errors or missing assets in Chromium/WebKit.
- [ ] Commit as `feat: add the shared CFOP algorithm library`.

## Task 11: Verified practice generation and cancellation protocol

**Files:** Create `src/practice/{types,generate}.ts`, `src/workers/practice-{protocol,request}.ts`, `src/workers/practice.worker.ts`, `src/app/practice/practice-client.ts` and adjacent tests.

**Interfaces:** `PracticeRequest = {requestId:number; caseId:CaseId; fixtureId:string; variantId:VariantId}`; `PracticeExercise = {caseId:CaseId; fixtureId:string; variantId:VariantId; demonstration:AlgorithmDemonstration}`. `PracticeReply = {requestId:number; caseId:CaseId; fixtureId:string; variantId:VariantId; result:{ok:true;exercise:PracticeExercise}|{ok:false;message:string}}`. `generatePracticeExercise(engine: CubeEngine,request: PracticeRequest): PracticeExercise` validates the registry/fixture and returns a checked clip. `createPracticeClient()` exposes `generate(caseId,fixtureId,variantId): Promise<PracticeReply['result']>` and `cancel(): void`, using one disposable worker per request.

- [ ] Write `generates_exact_selected_case`, `validates_physical_setup_and_prerequisites`, `rejects_cross_case_variants`, and `drops_replies_after_pool_change`. Assert every fixture's case matches independent recognition, setup plus explicit holding reaches exactly the displayed initial state, target/protected pairs are valid, and each revealed formula meets its family checkpoint. Reject mismatched IDs and late replies even if a request number matches but case/fixture/variant identity differs.
- [ ] Run `npx.cmd vitest run src/practice/generate.test.ts src/workers/practice-request.test.ts src/app/practice/practice-client.test.ts`; observe failures.
- [ ] Implement generation from admitted fixtures and Task 8 validation. Runtime generation does not run a generic full-cube solver. The client terminates/cancels on replacement, errors and a 30-second watchdog; include all identities in messages and freeze accepted results. Cancellation resolves callers with a non-success result and cannot reveal previous answers.
- [ ] Rerun checks, including all 119 cases and published alternatives, bad setup data, worker-start error, timeout, stale success and stale failure. No full-solved requirement is applied to an OLL/F2L practice endpoint.
- [ ] Commit as `feat: generate verified algorithm practice exercises`.

## Task 12: Practice selection, reveal flow and local persistence

**Files:** Create `src/practice/{pool,storage}.ts`, `src/app/practice/PracticePage.tsx`, tests, `e2e/algorithm-practice.spec.ts`; extend routes/App/styles.

**Interfaces:** `PracticeSelection = {version:1;caseIds:CaseId[];groupIds:string[]}`; storage key `cubesteps.practice-selection.v1`. `createPracticeStore(storage: () => Storage)` exposes `load(): {selection:PracticeSelection;available:boolean}` and `save(selection:PracticeSelection): boolean`. `createPracticePool(caseIds: readonly CaseId[],random: () => number)` exposes `next(): {caseId:CaseId;fixtureId:string}|null`; it operates on admitted fixtures and balances case IDs, not variants. `PracticePage({engine}: {engine:CubeEngine})` owns pool selection and reveal state.

- [ ] Write `balances_case_ids_across_bag_boundaries`, `varies_single_case_without_identical_repeat`, `recovers_invalid_selection_storage`, and `hides_answer_until_explicit_reveal`. Assert each selected ID appears once per bag, no adjacent case repeat for at least two IDs even at bag boundaries, and one-case pools vary verified setup orientation/state whenever multiple states exist. Invalid/removed IDs are discarded, version-1 known fields retained, unknown schema versions reset safely, blocked storage preserves session use. Empty selection generates no exercise.
- [ ] Run `npx.cmd vitest run src/practice/pool.test.ts src/practice/storage.test.ts src/app/practice/PracticePage.test.tsx`; observe failures.
- [ ] Implement per-family/group checkboxes, selected count, explicit Start/Next controls, physical setup with holding guide, neutral recognition diagram and **Show solution**. Before reveal, do not mount answer/player DOM or expose the active exercise's case identity/algorithm in labels, tooltips or live regions; selection controls may still name the selectable cases. On reveal, mount the exact checked demonstration. No timer, results, memorization status or tracking events.
- [ ] Shuffle case bags with injectable randomness; choose among verified fixture variations and suppress consecutive identical initial states. Reset bags, dispose playback, cancel worker and clear answers on pool/case/route changes; keep only selected IDs/groups across reload. Stored case IDs are authoritative; group IDs describe fully selected groups and cannot silently re-add individually deselected cases. Returning to practice starts unrevealed. Add normal Practice navigation and `Practice selected cases` in the library; library preselection updates this same selection model before navigating to `#/practice`.
- [ ] Run focused checks and `npx.cmd playwright test e2e/algorithm-practice.spec.ts`; test keyboard-only reveal/next, DOM and accessibility text before reveal, refresh, single-case pool, empty pool, storage-denied context, rapid pool changes, history navigation and 390px layout in Chromium/WebKit.
- [ ] Commit as `feat: add selected-case practice without timing or scores`.

## Task 13: Efficiency evidence, regression gates and release

**Files:** Create `tests/advanced-efficiency.test.ts`, `docs/validation/v1.3.md`, `e2e/advanced-production.spec.ts`; modify `package.json`, `playwright.config.ts`, `README.md`, `.github/workflows/{ci,pages}.yml`, and validation/source docs. Generated reports belong under ignored `test-results/`, with reviewed aggregate results copied into validation docs.

**Interfaces:** Add `npm.cmd run test:advanced` for Advanced correctness/case/table tests and `npm.cmd run test:efficiency` for the fixed comparison corpus. Existing `test:corpus` includes Advanced. Expand production test matching to `**/*production.spec.ts` and exclude those files from development e2e runs. Both GitHub workflows run asset verification and efficiency gates in addition to existing required checks.

- [ ] Write `meets_fixed_corpus_f2l_efficiency` and production assertions for solve/library/practice. For seeds 1–1000, obtain the Advanced matched-cross state; run both methods' F2L stages from that identical state and frame, retaining each implementation's own required regrips. Assert `advancedMeanTurns <= beginnerMeanTurns * 0.90`, `advancedMedianTurns <= beginnerMedianTurns`, `advancedMeanRotations <= beginnerMeanRotations`. Measure only the F2L stages for these gates. Report full-solve turns/rotations separately with mean, median and p95; use nearest-rank percentile. Cross face turns must equal verified minimum for every seed.
- [ ] Run `npx.cmd vitest run tests/advanced-efficiency.test.ts`; record actual results. If a target fails, revise admitted variants/scoring and rerun identical seeds; do not change the corpus or relax thresholds to pass. Fix real production-test failures before declaring the version ready.
- [ ] Run, in sequence, `npm.cmd run typecheck`, `npm.cmd run verify:cross`, `npm.cmd run verify:cases`, `npm.cmd test`, `npm.cmd run test:efficiency`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run test:production`. Use separate dev/preview ports and no parallel Playwright runs. Capture desktop/mobile views, exact rendered colors, keyboard/reduced-motion behavior, console errors and asset failures. Record test counts, runtimes, commit, environment and unchanged legacy corpus results.
- [ ] Benchmark cold initialization, warm solves and cancellation on the named development desktop; record browser/CPU and distributions. Use a real mobile device when available and label it separately; emulation proves layout only. Initial engineering targets are warm p95 <= 2 s and cold p95 <= 5 s on the named desktop, while the 30 s watchdog remains a failure safeguard. Investigate misses before release and report measured limitations; never invent a mobile performance result.
- [ ] Fill `docs/validation/v1.3.md` with all 41/57/21 coverage, cross proof, F2L measurements, reference attribution, per-method status and physical-cube checklist. Record Advanced physical acceptance as pending. Update README to explain selecting Beginner/Advanced and no-timer practice. Do not claim that existing Beginner acceptance covers new formulas.
- [ ] Commit as `test: validate advanced CFOP and algorithm practice release`; request one fresh whole-branch review against the actual merged main. Resolve findings and rerun affected checks. Create/attach a PR and require all checks on its final head before merge; follow the previously authorized GitHub merge and clean local-main fast-forward sync.
- [ ] Dispatch Pages from that exact merged main with `publish_preview=true` and `teaching_accepted=false`. After successful deployment, check the public `/cube-steps/` build, Advanced deep links, an actual scramble/color solve, library variant, practice reveal/next and older methods in Chromium/WebKit. Save screenshots plus deployed commit/run URL, then give the owner the live site and physical acceptance checklist. Never report delivery from local tests alone.

## Plan self-review and handoff

Spec coverage: intent/status/routes (Tasks 7, 9, 13); shortest cross (2); formula-based F2L (3–4); full OLL/PLL and notation (1, 5–6); shared library/practice (8, 10–12); provenance, workers and failures (7–8, 11); correctness, efficiency, browser and physical verification (all focused gates plus 13). Each Review Focus item has an owning test. No new dependency, unrelated refactor, extra method, timer or score system is included.

Contracts distinguish whole solves from partial clips, case IDs from variant IDs, physical setup from holding moves, and exact cross distance from heuristic F2L cost. Asset/scripts stay out of the main UI runtime; data are independently admitted before being shared. Checkboxes are selected only after verification.

Execute with the approved Native method; do not reopen the already approved product choices. If implementation uncovers a contradiction in the approved spec, record and resolve that specific conflict before dependent work.
