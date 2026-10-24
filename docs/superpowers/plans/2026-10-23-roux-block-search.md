# Roux Frames and Block Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce explainable eight-frame block routes, a correctly scoped shortest-first-block reference and a transparent execution score.

**Architecture:** Add `src/methods/roux-advanced/` beside the unchanged beginner engine. Use an admissible five-piece distance table for reference search, bounded connection-aware candidates for combined blocks, and original-state replay for all evidence.

**Tech Stack:** Existing TypeScript/cubing engine, Node table generators and Vitest; no product dependency.

**Spec:** [Approved design](../specs/2026-10-23-advanced-roux-and-ui-design.md), Sections 5–9; [overview](2026-10-23-roux-ui-upgrade-plan.md). Tasks 5–10 of 26, after Task 4.

## Global Constraints

- Eight frames only: white/yellow bottom × four adjacent left colors. Derive physical front/right/back and piece identities from the handed cube scheme.
- STM: outer, slice and two-layer wide quarter/half turns cost one; all 45 primitive variants are admitted to reference search. No free whole-cube rotations.
- First-block endpoint includes all five cubies and side centers; remaining middle-center phase may vary. A cubie-only distance is a lower bound, not proof of the full goal.
- Normal 8,000ms / 500,000 operations / 16 FB candidates / SB frontier 16. Lab 30,000ms / 2,000,000 / 64 / 32. Shared entries 25,000; static assets 32 MiB; retained worker data 128 MiB.
- Yield by 8ms or 256 operations, whichever comes first. All roots, simulation, cache hits and scoring share the request budget.
- Only eligible rated routes receive comfort recommendations. Keep verified baselines even outside proven d+2.

## Review Focus

- Color remapping is a reflection or changes physical move meaning — Task 5.
- Cubies are solved but side centers are wrong — Task 6.
- Proof pruning silently removes a shorter solution — Task 6's independent shallow oracle.
- A good existing pair is destroyed by an unconditional base-edge-first policy — Tasks 7–8.
- A missing execution profile or repeated cached operation gets a free score/budget — Tasks 5 and 9.

---

## File and contract map

New files below live in `src/methods/roux-advanced/` unless written in full. All accompanying `.test.ts` files are created alongside the module. `types.ts` is the single contract owner; coordinate/score/catalog modules export their specialized types there by type-only re-export if needed. Test context comes from new `tests/helpers/advanced-roux.ts` and legal fixtures from `tests/fixtures/advanced-roux.ts`.

### Task 5: Frames, shared contracts and metered work

**Files:** Create `types.ts`, `frames.ts`, `predicates.ts`, `input.ts`, `budget.ts` and their tests; create the two test-support files above. Modify `src/core/types.ts`, `src/methods/info.ts`, `src/app/routes.ts` only to accommodate the new typed method/stages; availability is enabled in Task 16.

**Interfaces:**

- `RouxFrameId='white-blue'|'white-green'|'white-red'|'white-orange'|'yellow-blue'|'yellow-green'|'yellow-red'|'yellow-orange'`; `RouxFrame={id:RouxFrameId;bottom:Color;left:Color;centers:Record<Face,Color>;positioningMoves:readonly TeachingMove[]}`. Export `ROUX_FRAMES` with exactly eight entries. Reuse `Quarter` from `src/methods/roux/types.ts`, `RouxAssets` from its assets module and `ActionInput` from `src/methods/shared/trace.ts`.
- `createRouxFrameMap(engine:CubeEngine,frameId:RouxFrameId):RouxFrameMap`; map exposes `frame`, `toCanonical(state):CubeState`, `fromCanonical(state):CubeState`, `toCanonicalMoves(moves):TeachingMove[]`, `toPhysicalMoves(moves):TeachingMove[]`, `toPhysicalId(id:string):string`. Inputs/outputs of state mapping are already physically held, not scramble-input coordinates. Derive the automorphism from reference transforms, not hand-swapped color strings.
- `RouxInput={source:SolveInput;initial:CubeState;fingerprint:string;setupMoves:readonly TeachingMove[]}`; `prepareRouxInput(engine,input:SolveInput):RouxInput` uses current legality/input resolution and a legal setup witness. Reuse pure preparation from `src/lab/input.ts` without importing CFOP search.
- `AdvancedRouxStageId='ar-position'|'ar-first-block'|'ar-second-block'|'ar-cmll'|'ar-eolr'|'ar-last-four'`. Extend `MethodId` with `roux-advanced` and `StageId` with this union. `AdvancedRouxActionMetadata={frameId:RouxFrameId;goal:string;protectedIds:readonly string[];protection:'always'|'endpoint';centerPhaseBefore:Quarter|null;centerPhaseAfter:Quarter;cornerOffsetBefore?:Quarter;cornerOffsetAfter?:Quarter;construction?:string}`; `AdvancedRouxActionDraft=ActionInput & {rouxAdvanced:AdvancedRouxActionMetadata}`. Add the optional matching field to `TraceAction`.
- `blockCompleteInFrame(engine,state,frame,side):boolean`, `observeAdvancedFrame(engine,state,frame):{sideFrameValid:boolean;centerPhase:Quarter|null;cornerOffset:Quarter|null}`, `advancedRouxSolved(engine,state,frame):boolean`. Illegal center permutations fail; do not replace them with zero phase.
- `RouxSearchMode='normal'|'lab'`; `RouxStopReason='complete'|'time-limit'|'work-limit'|'frontier-limit'|'memory-limit'|'cancelled'|'error'`. `createRouxSearchBudget(mode:RouxSearchMode,options?:{now?:()=>number;startedAt?:number;cancelled?:()=>boolean;maxOperations?:number;deadlineMs?:number}):RouxSearchBudget` exposes `charge(kind:'expand'|'simulate'|'score',n?:number):void`, `checkpoint():void`, `remaining():{operations:number;milliseconds:number}`, `retain(key:string,bytes:number):void`, `release(key:string):void`, `snapshot():{operations:number;elapsedMs:number;entries:number;retainedBytes:number;reason?:RouxStopReason}`. Budget exhaustion throws typed `RouxBudgetStop` carrying its reason/snapshot. Overrides may tighten, never expand ceilings. `meterRouxEngine(engine:CubeEngine,budget:RouxSearchBudget):CubeEngine` charges cache hits too.
- Test helper `advancedRouxFixture(engine,id):CubeState` constructs only legal states; `assertAdvancedDrafts(engine,initial,actions,frame):CubeState` independently replays/protects targets. Fixtures include known paired/square/late-base cases with recorded legal setup moves.

- [ ] **Write tests:** all 8 mappings round-trip state and commute with all 45 moves; identity targets map bijectively. Assert `expect(ROUX_FRAMES).toHaveLength(8)`, `expect(normal.snapshot().operations).toBe(500000)` at the boundary and the next charge throws. Test 8,000/30,000ms deadlines, 25,000 retained entries, 128MiB accounted bytes, cancellation, negative/nonfinite values and corrupt centers.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/frames.test.ts src/methods/roux-advanced/budget.test.ts`.
- [ ] **Implement contracts and metering.** Use frame transforms throughout predictions/checks; preserve beginner's fixed predicates. Count table/cache work explicitly and avoid double-wrapping the same engine. The test fixtures are not product fallback data.
- [ ] **Verify:** the new directory's tests and typecheck. Replay M phases and U offsets in all frames, including yellow down. Wrong side centers must not satisfy a completed block.
- [ ] **Commit:** `git commit -m "feat: define advanced Roux frames and bounded search contracts"`.

### Task 6: Admissible first-block table and proof search

**Files:** Create `blocks/coordinates.ts`, `blocks/distance.ts`, `blocks/reference.ts`, their tests, `data/block-distance.bin`, `data/manifest.json`; create `scripts/roux-advanced/build-block-distance.mts` and `tests/advanced-roux-proof.test.ts`.

**Interfaces:** `BlockSearchAssets={coordinateVersion:1;moveSetVersion:'roux-stm-v1';distances:Uint8Array;digest:string}`. Encode the three target edges and two corners by permutation rank and orientation: `readFirstBlockCoordinate(engine,state,frame):number`, `stepFirstBlockCoordinate(index,move):number`. The cubie projection has `12P3*2^3*8P2*3^2 = 5,322,240` states. `firstBlockLowerBound(state,frame,assets):number` is the max of the table distance and any separately verified side-center lower bound, never their sum.

`FirstBlockEvidence` is a discriminated union: `{status:'not-explored'}`; `{status:'best-found';lowerBound:number;upperBound:number;witness:readonly TeachingMove[];completedDepth:number}`; or `{status:'proven-minimum';minimum:number;witness:readonly TeachingMove[];proof:{coordinateVersion:1;moveSetVersion:'roux-stm-v1';completedDepth:number;assetDigest:string}}`. All include the frame/input identity in their enclosing snapshot. `searchFirstBlockReference(engine,input:RouxInput,frame,assets,budget):Generator<{kind:'work'}|{kind:'evidence';evidence:FirstBlockEvidence},FirstBlockEvidence>`.

- [ ] **Write tests:** independent shallow BFS fixtures under the full alphabet, a solved-projection/wrong-center fixture, table hash/length/version rejection, and interrupted IDA* depth. Assert `expect(interrupted.status).not.toBe('proven-minimum')`; exact shallow distances and witness physical endpoints must match the independent oracle.
- [ ] **Run red:** `npx.cmd vitest run tests/advanced-roux-proof.test.ts src/methods/roux-advanced/blocks/distance.test.ts`.
- [ ] **Implement offline BFS table** over the five-piece projection using engine-derived move effects. One-byte distances fit the static cap; report reachable count and maximum distance. Add manifest bytes/hash and deterministic `--verify` regeneration. This is a lower bound because centers are omitted.
- [ ] **Implement complete reference IDA*** with actual side-center goal checking. Initially prune only proven redundant consecutive turns and path cycles; no beam cut is allowed to establish proof. A transposition key includes all goal-relevant coordinates, centers and any previous-move context used by pruning. Publish proof only after all smaller bounds are exhausted; cancellation retains the prior completed bound/witness.
- [ ] **Verify:** generator `--verify`, focused tests and typecheck; inspect decoded asset total against 32MiB. Never set a hard-coded distance/proof from a known example.
- [ ] **Commit:** `git commit -m "feat: add scoped shortest first-block evidence"`.

### Task 7: Flexible first-block constructions

**Files:** Create `blocks/connections.ts`, `blocks/candidates.ts`, their tests; extend `tests/fixtures/advanced-roux.ts`.

**Interfaces:** `BlockCandidate={id:string;frameId:RouxFrameId;moves:readonly TeachingMove[];state:CubeState;turns:number;construction:'square-pair'|'line-line'|'pairs-base'|'free';milestones:readonly {index:number;kind:string;pieceIds:readonly string[]}[]}`. `observeConnections(engine,state,frame):readonly {kind:'pair'|'square'|'line';pieceIds:readonly string[]}[]`. `generateFirstBlocks(engine,input,frame,assets,budget,maxLength:number):Generator<{kind:'work'}|{kind:'block';candidate:BlockCandidate},void>`.

- [ ] **Write fixtures/tests** for a premade pair, square+pair, line+line, a valid two-pairs/late-base route, an already complete block and identical first-block projections with different second-block pieces. Assert both states remain distinct practical candidates; assert the late-base fixture reaches a pair milestone before the base edge is solved.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/blocks/connections.test.ts src/methods/roux-advanced/blocks/candidates.test.ts`.
- [ ] **Implement bounded search** using the reference lower bound, full-state candidate identity, diversity buckets by length/construction/next-piece readiness, and exact 16/64 retention caps. Consider all primitive turns; observed construction labels follow replay. Keep verified `free` candidates rather than fabricating a named algorithm.
- [ ] **Verify:** focused tests and independent replay of every retained candidate; no unconditional base-edge-first prerequisite and no injected M/M′ cancellation. Record actual milestones/protections.
- [ ] **Commit:** `git commit -m "feat: explore multiple Roux first-block constructions"`.

### Task 8: Second block and combined continuation

**Files:** Create `blocks/second-block.ts`, `blocks/continuation.ts`, their tests; reference existing `src/methods/roux/blocks/catalog.ts` without changing beginner ordering.

**Interfaces:** `TwoBlockCandidate={first:BlockCandidate;secondMoves:readonly TeachingMove[];state:CubeState;secondTurns:number;actions:readonly AdvancedRouxActionDraft[]}`. `continueSecondBlock(engine,first,frame,assets,budget):Generator<{kind:'work'}|{kind:'blocks';candidate:TwoBlockCandidate},void>`. `blocks/continuation.ts` exports `twoBlockKey(candidate):string` and verifies first-block restoration at admitted maneuver endpoints.

- [ ] **Write tests** `pair-first beats forced DR-first on the fixture`, `M-assisted insert preserves left block`, `rear square remains inspectable`, and `temporary changes restore at endpoint`. Compare a recorded d+1 first block with better combined turns against the d reference; assert both completions remain available.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/blocks/second-block.test.ts`.
- [ ] **Implement** DR-first/pair-first, front/back square and next-pair alternatives, using bounded 16/32 frontiers and shared budget. Admit named block maneuvers only after precondition/effect verification; search-derived segments carry observed piece changes. Preserve all five first-block cubies at each declared second-block endpoint.
- [ ] **Verify:** full physical replay, protection assertions and exact frontier limits; a failed continuation never turns a first-block-only witness into a complete candidate.
- [ ] **Commit:** `git commit -m "feat: compare Roux second-block continuations"`.

### Task 9: Human execution profiles and rating

**Files:** Create `execution/types.ts`, `execution/catalog.ts`, `execution/score.ts`, their tests; create `docs/research/roux-execution-v1.md`. Reuse math helpers from CFOP only when semantics match; do not change CFOP weights.

**Interfaces:** `RouxExecutionScore={rated:false;reason:string}|{rated:true;modelVersion:'roux-execution-v1';T:number;R:number;G:number;V:number;A:number;cost:number;events:readonly RouxExecutionEvent[]}`. Event has `boundary:number`, `kind:'turn'|'rotation'|'regrip'|'visibility'|'awkward'`, `profileId`, `fromGrip`, `toGrip`, `instruction` strings. `RouxExecutionSegment={moves:readonly TeachingMove[];phase:'position'|'blocks'|'corners-edges';targets:readonly string[];before:CubeState;algorithmId?:string}`. `scoreRouxExecution(engine,segments,frame,catalog,budget):RouxExecutionScore`. Catalog defines finite grip poses and feasible token/segment transitions, with source/rationale and neutral grip.

`RouxGrip={id:string;description:string}`; `RouxExecutionProfile={id:string;moves:readonly TeachingMove[];entryGrip:string;exitGrip:string;events:readonly RouxExecutionEvent[];sourceRefs:readonly string[];rationale:string}`; `RouxExecutionCatalog={version:'roux-execution-v1';neutralGrip:string;grips:readonly RouxGrip[];profiles:readonly RouxExecutionProfile[]}`. Validate grip references, event boundaries and profile physical effects before rating. The score function consumes this catalog and Plan 2's frame/budget, with readonly `RouxExecutionSegment[]`; missing transitions remain unrated. Positioning events are recorded separately from block-solving T.

- [ ] **Write tests:** `expect(score.cost).toBe(score.T+2*score.R+2*score.G+2*score.V+2*score.A)`; M, M′, M2 and wide half turns each cost one T. Missing/impossible profiles yield unrated. A helpful rotation can lower total cost; its handling is not charged twice. Two individually cheap segments with an awkward boundary must score differently from a compatible pair.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/execution`.
- [ ] **Implement finite-state dynamic programming** across entry/exit grips, including FB→SB continuation, and deterministic tie breaks. Document common right-hand two-handed assumptions; no invented seconds, fitted probabilities or automatic personalization. Preserve a physically equivalent explicit-rotation execution variant when it improves the model; verify full state/hold and recount it.
- [ ] **Verify:** focused tests, bounded operation charging and profile completeness for intended default maneuvers. Keep unrated shortest references visible, never recommended for comfort.
- [ ] **Commit:** `git commit -m "feat: rate Roux execution with explicit grip transitions"`.

### Task 10: Baseline bridge and truthful action extraction

**Files:** Create `blocks/baseline.ts`, `blocks/explain.ts`, their tests; extend `src/methods/shared/compact-trace.ts` only if a generic runtime hook is needed, with regression tests. Modify no beginner catalog constants.

**Interfaces:** `planBaselineBlocks(engine,input,frame,beginnerAssets:RouxAssets,budget):Generator<{kind:'work'},TwoBlockCandidate>`. It uses frame canonicalization and verified existing block policies. `explainBlockRoute(engine,input,frame,firstMoves,secondMoves):AdvancedRouxActionDraft[]`. Each explanation reports actual piece connections, preparation and declared endpoint; checkpoint validators use original-state observations.

- [ ] **Write tests:** a baseline in every allowed frame, interrupted seed generation, rejection of an empty allowed set, correct mapped piece IDs, and no references to “yellow top” when white is the chosen top. Assert each source/compacted action's endpoint matches replay; repetitive physical states are rejected while genuine formula repetition remains allowed.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/blocks/baseline.test.ts src/methods/roux-advanced/blocks/explain.test.ts`.
- [ ] **Implement the bridge** with the same outer budget. Refactor a narrowly scoped beginner traversal into a cooperative generator only if necessary to yield; keep its existing synchronous wrapper/output unchanged and prove that with beginner regression tests. Do not call the old 15-second/1,000,000-node solver inside each advanced orientation with a fresh budget.
- [ ] **Verify:** focused tests plus `npm.cmd run test:roux` and existing redundant-move tests. Baselines must be usable for completion by Task 13 even when their first block exceeds a later proof's d+2 threshold.
- [ ] **Commit:** `git commit -m "feat: retain explained Roux baseline routes under shared limits"`. Continue to Plan 3.
