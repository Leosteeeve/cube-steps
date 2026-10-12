# CubeSteps V1.2 Beginner CFOP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete explained Beginner CFOP solver and matching course to CubeSteps, usable from scrambles or six-face color input.

**Architecture:** Independent CFOP rules share the existing cube engine, validated inputs, trace recording, and player with LBL. Explicit method definitions supply stage order, algorithm references, and verification contracts; solver code stays in the worker. The UI preserves input when switching methods and only plays a verified result from the selected method.

**Tech Stack:** Existing React, TypeScript, Vite, cubing.js 0.65.1, Vitest, Testing Library, Playwright, Node.js 24+, npm, and CSS. Use locked dependencies; no new runtime dependency.

**Spec:** [Approved Beginner CFOP design](../specs/2026-10-12-beginner-cfop-design.md), approved October 12, 2026.

**Status:** Plan prepared for owner review. Implementation has not started. Preserve the previously selected Native execution approach after plan approval.

## Global Constraints

- Keep the interface and documentation in English, computation in the browser, and access free of accounts.
- The owner selected **building the white cross directly on the bottom** for CFOP. LBL retains its yellow-center daisy route.
- Deliver intuitive F2L, two-look OLL, and two-look PLL with courses and generated solutions together. Full PLL, full OLL, advanced F2L memorization, Roux, ZZ, scanning, and optimal cross search are outside this version.
- Keep the current input convention: start a scramble with white up and green front; color entry uses the existing fixed center scheme.
- Explicit method identifiers are `lbl` and `cfop-beginner`. Reject missing or unknown worker method identifiers.
- Every successful solve must return a complete, replay-verified CFOP teaching trace from the exact supplied state. No generic or LBL fallback may masquerade as CFOP.
- A solved input produces no moves and seven skipped stages. Evaluate stage goals relative to centers independently of whole-cube orientation.
- OLL has ten non-solved case entries; PLL has six. Each of their four internal substages uses at most one recognized case formula after preparation.
- H and Z use M-slice forms. Teach and animate M/M'/M2; published and pasted scrambles keep six-face notation.
- Keep the existing defaults of 512 actions and 4,096 teaching moves per solve. Bound F2L normalization to at most 32 complete preparation/pairing maneuvers per target pair.
- Method changes preserve input, cancel pending work, and clear the previous method's result. Do not solve automatically on a method change.
- Retain `#/learn/white-cross` and other LBL routes; CFOP uses `#/learn/cfop/<lesson>` and `#/solve/cfop`. Keep `/cube-steps/` as the Pages base path.
- Validate at least 1,000 fixed-seed CFOP scrambles and the same 1,000 states through color input, alongside the existing LBL corpora.
- Until the owner confirms representative physical-cube CFOP lessons, label the new method as a preview and record physical acceptance as pending.

## Review Focus

1. **Already-solved or partly solved cubes in an unexpected holding frame:** skip satisfied goals, make needed regrips explicit, and finish without unnecessary turns. Tasks 2, 3, and 6.
2. **An F2L corner already solved while its edge is trapped elsewhere:** protect other pairs, demonstrate extraction/pairing, and finish both pieces together. Task 4.
3. **M turns moving centers during a formula:** match logical and rendered states at every move, restore the required frame at the formula boundary, and initialize colored input exactly. Tasks 1, 5, and 7.
4. **Switching method through browser history while solving or generating a scramble:** preserve the draft and reject late results without relabeling the old trace. Tasks 6 and 8.
5. **A course example reaching a different case, or a zero-move trace showing an LBL completion label:** verify examples against actual matched case IDs and test method-aware stage selection at completion. Tasks 7 and 9.

## Starting Point and Execution

The clean application base is `1518aeed5a6ed98b434f5ec75a2ea65c1f18c86b`. The design branch is `codex/cfop-v12` at `D:\Projects\Cubing Calculator\cube-steps\.worktrees\cfop-v12`; its first documentation commit is `f68ccd1`. This plan is an additional documentation change. The public application has not changed.

After approval, use `using-git-worktrees` to verify/reuse this isolated checkout, then `executing-plans`. The outer project directory is not a Git repository, so run repository commands in the checkout. Inspect current status and remote refs before execution; preserve unrelated changes. Use the existing lockfile, install with `npm.cmd ci` in this checkout, and run the baseline typecheck/unit/corpus checks before changing product code.

Follow the previously chosen **Native** approach: implement sequentially in this session, then obtain one fresh independent final review. The tasks share trace and method contracts, so do not run parallel implementers. Each task has a red/green test cycle and a focused commit; stop for a real spec conflict, not routine implementation choices. Confirm behavior failures after scaffolding missing exports. Every implementation commit requires its focused tests and `npm.cmd run typecheck` to pass.

## File Responsibilities

| Files | Responsibility |
| --- | --- |
| `src/core/types.ts`; new `src/core/teaching-moves.ts` | Method/stage identities, F2L trace metadata, teaching-token validation and inversion |
| New `src/methods/contracts.ts`, `registry.ts`, `shared/trace.ts`, `shared/verification.ts`, `shared/pieces.ts` | Method presentation/runtime contracts, static UI registry, generic trace and replay, common piece observations |
| Existing `src/methods/lbl/*` | Preserve LBL behavior while adapting to shared trace contracts |
| New `src/methods/cfop/stages.ts`, `catalog.ts`, `cases.ts`, `context.ts` | CFOP goals, canonical formulas, case recognition and verification, protected-piece helpers |
| New `src/methods/cfop/cross.ts`, `cross-cases.ts` | Deterministic direct-bottom-cross rules |
| New `src/methods/cfop/f2l.ts`, `f2l-cases.ts` | Pair selection, extraction, beginner normalization, paired insertion |
| New `src/methods/cfop/last-layer.ts`, `solve.ts` | Four two-look substages, AUF, complete CFOP orchestration |
| Existing worker protocol/handler/client | Method dispatch, verified request/result identity, cancellation |
| New `src/content/course-types.ts`, `cfop-course.ts`, `cfop-examples.ts`, `courses.ts` | Typed course data and tested examples shared with the actual solver |
| Existing app/player files; new `src/app/routes.ts`, `MethodSelector.tsx`, `CaseSelector.tsx` | Routing, preserved solve inputs, method-aware teaching and playback |
| Adjacent tests; new `tests/fixtures/cfop-cases.ts`, `tests/cfop-corpus.test.ts`; CFOP E2E files | Case, corpus, lifecycle, browser, and production evidence |
| `package.json`, CI/Pages workflows, `README.md`, new `docs/validation/v1.2.md` | Mandatory corpus execution and honest delivery/acceptance records |

Do not migrate unrelated UI or add a general plugin framework. Keep pure observations/recognition separate from rule execution and React.

## Shared Contracts

Task 1 owns the common contracts; later tasks consume them. Exact literal stage sets come from the spec's table and the existing LBL stage list.

```ts
type MethodId = 'lbl' | 'cfop-beginner';
type StageId = LBLStageId | CFOPStageId;
type TeachingMove = FaceMove | `${'x' | 'y' | 'z' | 'M'}${'' | "'" | '2'}`;
type StageResult = { ok: true; state: CubeState } | SolveFailure;
interface PairTrace {
  cornerId: string; edgeId: string; slot: string;
  phase: 'prepare' | 'pair' | 'insert';
  ordinal: number; solvedBefore: number; solvedAfter: number;
}
// SolveTrace.method: MethodId; TraceAction.pair?: PairTrace.
interface StageDefinition { id: StageId; label: string; group: string }
interface TeachingAlgorithm {
  name: string; moves: TeachingMove[]; precondition: string; effect: string;
  segments?: { label: string; start: number; end: number }[];
}
interface MethodPresentation {
  id: MethodId; label: string; stages: readonly StageDefinition[];
  algorithms: Readonly<Record<string, TeachingAlgorithm>>;
}
interface MethodRuntime {
  presentation: MethodPresentation;
  checkStage(engine: CubeEngine, state: CubeState, id: StageId): boolean;
  checkAction(engine: CubeEngine, action: TraceAction, stage: StageId): boolean;
}
```

`src/methods/contracts.ts` owns the interfaces above except core identities and `PairTrace`; it also exports `StageResult`. Runtime contracts live beside each method's rules. `registry.ts` exports `getMethod(id: MethodId): MethodPresentation` and imports only metadata/catalogs, never `solve.ts`, `cases.ts`, or worker runtime definitions. Runtime verification checks both preconditions and after-state effects; descriptive strings alone are not executable checks.

`src/methods/shared/trace.ts` exports `RuleError`, `ActionInput`, `TraceBuilder`, `createMethodTrace(engine: CubeEngine, initial: CubeState, runtime: MethodRuntime, limits?: SolveLimits): TraceBuilder`, and the existing flattening interfaces/function. `TraceBuilder` preserves the current beginStage/append/endStage/finish API; it additionally exposes its runtime method identity. `src/methods/shared/verification.ts` exports `verifyTrace(engine: CubeEngine, trace: SolveTrace, runtime: MethodRuntime): void`, throwing `RuleError` on failure. Complete ordered-stage validation belongs to this final verifier; unit tests may still record an isolated stage with the builder. Keep `createTraceBuilder(engine, initial, limits?)` in the LBL module as a thin bound wrapper to minimize rule churn.

`src/methods/shared/pieces.ts` exports the current pure `pieceSolved(piece, observation)` and `piecePositioned(piece, observation)`, plus `whiteCrossSolved(engine, state): boolean` and `firstTwoLayersSolved(engine, state): boolean`. These helpers compare colors to centers; they never assume white is at U or D.

## Task 1: Share Verified Traces Without Changing LBL Behavior

**Files:** Create the shared/core files above and `src/methods/lbl/definition.ts`. Modify `src/core/types.ts`, `src/methods/lbl/{catalog,trace,stages,solve}.ts`, and imports in player/timeline/test helpers. Test in `src/methods/shared/{trace,verification}.test.ts`, `src/core/teaching-moves.test.ts`, and existing LBL tests.

**Interfaces:** Produces the Shared Contracts, `invertTeachingMoves(moves: readonly TeachingMove[]): TeachingMove[]`, and `isTeachingMove(value: unknown): value is TeachingMove`. LBL `solveLBL` and stage-rule signatures stay unchanged. Add runtime verification for LBL action eligibility and existing preservation conditions without altering its selected moves.

- [ ] **Write failing tests.** Preserve a literal trace fixture from the current guided example; assert its moves, case IDs, stage order, and daisy checkpoints remain identical after extraction. Add tampered-stage, mismatched-method/catalog, false-precondition, corrupted before/after/final, and forged `checkpoint.passed` cases, all rejected by `verifyTrace`. Assert `invertTeachingMoves(['M', 'U2', "M'"])` equals `['M', 'U2', "M'"]` and that applying a sequence followed by its inverse restores the state.

  ```ts
  it('rejects a forged passed checkpoint whose effect is false', () => {
    expect(() => verifyTrace(engine, forgedTrace, LBL_RUNTIME)).toThrow(RuleError);
  });
  ```

  `forgedTrace` is the valid guided-example fixture with one actual preservation effect broken while keeping `passed: true`; define it in this test. Export `LBL_RUNTIME: MethodRuntime` from `lbl/definition.ts`.
- [ ] **Run red checks:** `npx.cmd vitest run src/methods/shared src/core/teaching-moves.test.ts`. Confirm the failures exercise the proposed behavior after exports exist.
- [ ] **Implement the contracts and adapters.** Validate exact stage count/order, reject unknown stages instead of the current `indexOf(-1)` slice trap, and resolve every algorithm through the selected method. Replay state transitions and evaluate runtime predicates independently of the serialized passed flag. Keep 512/4096 budget behavior. Add M to teaching tokens without widening `FaceMove` or `parseScramble`.
- [ ] **Run green checks:** the red-check command, `npm.cmd run test:unit`, `npm.cmd run test:corpus`, and typecheck. Test M/M'/M2 center observations and four M turns; keep parser rejection of M.
- [ ] **Commit:** `refactor: share method trace verification while preserving LBL`.

## Task 2: Define CFOP Goals and Last-Layer Cases

**Files:** Create `src/methods/cfop/{stages,catalog,cases,context,definition}.ts` and adjacent tests; `tests/fixtures/cfop-cases.ts`. Extend the metadata registry from Task 1.

**Interfaces:** Export `CFOP_STAGE_IDS: readonly CFOPStageId[]`, `CFOP_ALGORITHMS`, `CFOP_RUNTIME: MethodRuntime`, `checkCFOPStage(engine: CubeEngine, state: CubeState, stage: StageId): boolean`, and `CFOPContext = { engine: CubeEngine; trace: TraceBuilder }`. `cases.ts` exports `recognizeLastLayer(engine: CubeEngine, state: CubeState, stage: CFOPStageId): LastLayerMatch | null`, where `LastLayerMatch = { caseId: string; algorithmId: string; setup: TeachingMove[]; recognition: string }`. This recognizes cases; it does not search for a solution by trying formulas. Stage skip detection precedes recognition.

- [ ] **Write failing tests.** Pin all seven goals and their cumulative prerequisites in every whole-cube orientation. A solved canonical input satisfies all seven; a cube solved except for a yellow-layer quarter turn satisfies the permutation goals but fails `cfop-auf`. Reject a correct-looking yellow face over broken F2L. Count exactly 10 OLL and 6 PLL case formulas, with IDs `oll-edge-dot`, `oll-edge-l`, `oll-edge-line`, `oll-corner-{21,22,23,24,25,26,27}`, and `pll-{t,y,ua,ub,h,z}`.

  ```ts
  it('keeps final alignment distinct from relative permutation', () => {
    const state = engine.apply(engine.solved(), ['D']);
    expect(checkCFOPStage(engine, state, 'cfop-pll-edges')).toBe(true);
    expect(checkCFOPStage(engine, state, 'cfop-auf')).toBe(false);
  });
  ```
- [ ] **Run red checks:** `npx.cmd vitest run src/methods/cfop/stages.test.ts src/methods/cfop/catalog.test.ts src/methods/cfop/cases.test.ts`.
- [ ] **Implement frame-independent goals and fixed formulas.** Store one literal canonical sequence per case, choosing the outer-turn variants and M-based H/Z required by the spec. The dot formula is one fixed composition with named half-open move ranges in `segments`; do not flatten its internal teaching boundaries away. Use the approved primary references to choose variants and verify their transformations with the cube engine before admitting them. Do not copy external tutorial prose or illustrations.
- [ ] **Implement recognition predicates.** OLL compares yellow-sticker orientation signatures, ignoring irrelevant permutation. PLL compares relative permutation signatures around the yellow layer, ignoring a shared final layer alignment. Canonicalize only explicit U/y setup candidates in stable order `none`, quarter, half, inverse; emitted setup must exactly match the observed canonical case. Evaluate first-two-layer and required orientation prerequisites before matching. Record color/slot evidence in `recognition`.
- [ ] **Run green checks and typecheck.** Cover positive and independently constructed negative signatures, all supported U/y setups, formula effects, restored centers, and protected F2L. Confirm H/Z contain M and other last-layer formulas only face turns. Commit `feat: define verified beginner CFOP cases and stage goals`.

## Task 3: Solve the White Cross Directly on the Bottom

**Files:** Create `src/methods/cfop/{cross,cross-cases}.ts` and `cross.test.ts`; extend `context.ts` and the CFOP runtime action predicates.

**Interfaces:** `solveCFOPCross(c: CFOPContext): StageResult`, with `StageResult` shared from Task 1. `ensureWhiteDown(c): void` records a needed regrip only when a rule actually needs work. `cross-cases.ts` exports a finite location/orientation rule catalog consumed by this stage and its tests.

- [ ] **Write failing tests.** Cover a white edge in every slot and both orientations, with valid previously solved edges protected. Assert each completed edge maneuver increases or preserves the protected set and that completion has four matched edges. A solved cross emits no moves; an unsolved cross records white-down regripping before the first edge maneuver. Assert no daisy case or LBL `daisy-to-cross` reference occurs.

  Pin `it('skips a solved cross without changing grip')` with `expect(solveCFOPCross(c).ok).toBe(true)` and `expect(c.trace.current).toEqual(initial)`. For the recorded stage assert `expect(stage.actions).toHaveLength(0)`; the fixture has a solved cross but unsolved later pieces.
- [ ] **Run red check:** `npx.cmd vitest run src/methods/cfop/cross.test.ts`.
- [ ] **Implement stable edge selection and finite cases.** Select white edges by the existing immutable piece ordering. Normalize the selected edge's home to front using explicit y regrips. Branch by layer, sticker direction, and whether extraction is required; express extraction, alignment, and insertion separately. Each case declares its protected-edge restoration checkpoint. Match actual observations, not trial sequences chosen solely because they solve the target.
- [ ] **Run green check and typecheck.** Include wrong bottom position, flipped bottom edge, zero to three initially correct edges, and 24 starting orientations. Replay every recorded action and independently check protected edge colors at each complete-maneuver boundary.
- [ ] **Commit:** `feat: teach a direct bottom cross for CFOP`.

## Task 4: Teach and Solve Intuitive F2L Pairs

**Files:** Create `src/methods/cfop/{f2l,f2l-cases}.ts`, `f2l.test.ts`, and `f2l-cases.test.ts`; extend the catalog/context/runtime predicates and CFOP fixtures.

**Interfaces:** `solveCFOPF2L(c: CFOPContext): StageResult`; `observeF2LPairs(engine: CubeEngine, state: CubeState): F2LPair[]`, where `F2LPair = { cornerId: string; edgeId: string; slot: string; solved: boolean }`; `recognizeF2L(engine: CubeEngine, state: CubeState, pair: F2LPair): F2LMatch | null`, where `F2LMatch = { caseId: string; phase: PairTrace['phase']; setup: TeachingMove[]; algorithmId: string; recognition: string }`. Each catalog entry supplies executable before/after conditions for its maneuver.

- [ ] **Write failing tests.** Cover the five spec families, both insertion hands, all four slots, and zero through three protected pairs. Include a solved corner with its edge in another slot, two pieces trapped in different slots, an incorrectly connected pair, and a white-up corner. Assert every insertion is preceded by a correctly connected target pair, both target IDs are highlighted, and pair progress is computed from the state.

  Pin `it('pairs a solved corner with its trapped edge without losing protected pairs')`: `expect(solveCFOPF2L(c).ok).toBe(true)`, `expect(observeF2LPairs(engine, c.trace.current).filter(p => p.solved)).toHaveLength(4)`, and independently assert both target IDs and each protected pair's stickers at every complete-maneuver checkpoint. Do not replace the checkpoint assertion with the final solved-pair count.
- [ ] **Run red checks:** `npx.cmd vitest run src/methods/cfop/f2l.test.ts src/methods/cfop/f2l-cases.test.ts`.
- [ ] **Implement explicit extraction and normalization cases.** Protect every pair already solved, choose an unsolved pair in immutable corner order, and normalize its target to a front working slot. A trapped piece may only be extracted through a slot not protected as solved. Use registered open-slot/upper-turn/close-slot maneuvers; state-dependent U and y preparations remain separate. Restore cross and protected pairs after each complete maneuver.
- [ ] **Implement pairing and insertion cases.** In `f2l-cases.ts`, make the finite table distinguish connected pieces, matching versus opposite upper stickers, white-up corners, and wrong connections. Fill every normalized reachable case with a named beginner maneuver and executable effect; no runtime generic search, long unlabelled formula, or corner-then-edge LBL fallback. A pairing action ends with the advertised arrangement; an insertion consumes a correctly paired block. Reject a revisited pair/phase/protected-set/state key and stop after 32 preparation/pairing maneuvers for one target. Preserve the global budgets.
- [ ] **Run green checks and typecheck.** Enumerate all 96 combinations with both target pieces in the U layer (four corner positions × three orientations × four edge positions × two orientations), construct legal companion pieces, and verify completion with the three other slots protected. Add trapped-piece fixtures, mirrored slots, and normalizations that disturb pieces temporarily but restore them at the declared boundary. Inject a repeating rule and exhausted budget to assert a structured failure instead of a partial success.
- [ ] **Commit:** `feat: solve CFOP through explained corner-edge pairs`.

## Task 5: Complete Two-Look OLL, PLL, and AUF

**Files:** Create `src/methods/cfop/last-layer.ts` and `last-layer.test.ts`; extend `tests/fixtures/cfop-cases.ts` and `src/methods/cfop/{cases,definition}.ts` with substage action checks.

**Interfaces:** Export `solveOLLEdges`, `solveOLLCorners`, `solvePLLCorners`, `solvePLLEdges`, and `solveAUF`, each `(c: CFOPContext): StageResult`. Consume Task 2's recognition and formulas; do not duplicate their moves or predicates.

- [ ] **Write failing tests.** For every recognized non-solved substage, assert `actions.filter(a => a.kind === 'algorithm').length === 1`; for an already-satisfied one assert zero. Test dot composition segment boundaries, all seven corner-OLL cases, adjacent/diagonal permutation, both U directions, H/Z, and final AUF alone. Snapshot actual M move states, including centers, against direct engine application.

  Pin `it('uses one recognized formula for each unsolved look')` with `expect(stage.actions.filter(a => a.kind === 'algorithm')).toHaveLength(1)` and `expect(CFOP_RUNTIME.checkStage(engine, stage.after, stage.id)).toBe(true)` for each non-solved case fixture.
- [ ] **Run red check:** `npx.cmd vitest run src/methods/cfop/last-layer.test.ts`.
- [ ] **Implement one-case dispatch and final alignment.** Skip satisfied goals; otherwise establish white down, recognize the case, record its setup and formula, and verify the substage effect. PLL relative ordering uses the yellow-layer frame. `solveAUF` chooses from `[]`, `U`, `U2`, `U'` after holding normalization and records a setup action explaining center alignment. No repeated formula probing or extra permutation loop is allowed.
- [ ] **Run green check and typecheck.** Enumerate 216 legal last-layer orientation patterns and 288 parity-compatible oriented permutation patterns with independent fixture construction. Verify each fixture through the existing codec in its canonical white-up, green-front frame before applying explicit whole-cube rotations for stage tests; the color-input validator intentionally rejects rotated centers. Cover every case under U/y setup and verify preserved F2L/orientation at full-formula boundaries; verify intentional intermediate disruption is not treated as a boundary failure.
- [ ] **Commit:** `feat: add two-look last-layer teaching and final alignment`.

## Task 6: Verify Complete CFOP Sessions and Dispatch by Method

**Files:** Create `src/methods/cfop/{solve,solve.test}.ts`, `tests/cfop-corpus.test.ts`; modify worker protocol/handler/tests, `src/app/solve-client.ts` and tests, `tests/color-input-corpus.test.ts`, and `package.json`.

**Interfaces:** `solveCFOP(engine: CubeEngine, initial: CubeState, limits?: SolveLimits): SolveResult`. Add `method: MethodId` to `SolveRequest`. Change client methods to `solveScramble(text: string, method: MethodId): Promise<SessionResult>` and `solveFacelets(facelets: Facelets, method: MethodId): Promise<SessionResult>`; update every existing LBL caller/test atomically to pass `'lbl'`. Retain requestId/input/session shape and defensive freezing. Extend solver errors with optional `stageId` for phase-specific UI messages.

- [ ] **Write failing tests.** Assert complete stage order and replay, exact input provenance, solved input with no moves, partial-stage skips, invalid/missing method rejection, and returned-method mismatch rejection. Race two different method requests and simulate a late old reply. A current request with the wrong method must fail as an invalid worker result rather than display it or hang.

  ```ts
  it('returns an empty complete CFOP trace for a solved input', () => {
    const result = solveCFOP(engine, engine.solved());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.trace.method).toBe('cfop-beginner');
    expect(result.trace.stages.map(s => s.id)).toEqual(CFOP_STAGE_IDS);
    expect(result.trace.stages.every(s => s.status === 'skipped')).toBe(true);
    expect(flattenTrace(result.trace).moves).toEqual([]);
  });
  ```
- [ ] **Run red checks:** `npx.cmd vitest run src/methods/cfop/solve.test.ts src/workers/solve-request.test.ts src/app/solve-client.test.ts`.
- [ ] **Implement orchestration and method dispatch.** Run all seven CFOP rules using `CFOP_RUNTIME`; call `verifyTrace` before returning success. Validate raw worker inputs as before and select the explicit runtime/solver inside the worker. Capture requested method with request identity in the client. Preserve cancellation, error recovery, and immutable input snapshots. Do not expose a partial trace on failure.
- [ ] **Add and run the full corpus:** `npx.cmd vitest run tests/cfop-corpus.test.ts`. For seeds 1–1,000, solve twice and compare traces, independently replay all states and runtime predicates, then submit equivalent canonical facelets through the real worker handler with `cfop-beginner`. Assert exact initial state, case/formula equality, pair protections, and solved endpoint. Use deterministic seeds from `tests/fixtures/lbl-cases.ts`; failures print the seed and reproducing scramble. Add representative traces under all 24 orientations. Extend `test:corpus` to include this file, then run all corpora, client/worker tests, and typecheck.
- [ ] **Commit:** `feat: dispatch and verify complete beginner CFOP solves`.

## Task 7: Make Playback Method-Aware and Verify M Rendering

**Files:** Modify `src/player/{CubePlayer,controller,timeline,initial-setup,cubing-adapter,PlayerFixture}` and corresponding existing tests; add `e2e/cfop-player.spec.ts`. Update test fixtures that construct traces or assume the final LBL stage.

**Interfaces:** Preserve the public player/session props; resolve stage labels and algorithms from `session.trace.method` through `getMethod`. Consume `TraceAction.pair` and algorithm `segments`; do not parse rule-name strings for CFOP phases. The controller's completed/empty fallback comes from the trace's ordered stages, never a hard-coded LBL stage.

- [ ] **Write failing tests.** Assert a CFOP result shows the CFOP label, pair targets/progress, correct formula and segment, and CFOP completion stage. Reject a mismatched algorithm reference. Verify solved zero-move input, stage skips sharing the same timeline offset, backward stepping into M, and formula replay endpoints. Compare color-input renderer setup to the exact initial state for a trace containing H/Z.

  Pin `it('keeps an empty CFOP player on its own final stage')` with `expect(controller.snapshot().stageId).toBe('cfop-auf')` and `expect(controller.snapshot().total).toBe(0)`. The fixture uses Task 6's solved CFOP session; selecting a skipped stage must then yield that explicitly selected stage instead.
- [ ] **Run red checks:** `npx.cmd vitest run src/player` and the new browser spec against the fixture after its method selector is added.
- [ ] **Implement metadata-driven playback.** Retain LBL daisy phases and existing controls. Show `prepare`, `pair`, and `insert` from structured CFOP metadata, keeping full algorithm and current turn visible. Render M as a slice move with its textual definition, not as a regrip. Use shared flattening/inversion and continue to exclude private renderer setup from the teaching timeline.
- [ ] **Run green checks and typecheck.** In Chromium and WebKit, compare the rendered puzzle model with independent engine states at every boundary of representative H/Z traces, including reverse stepping, replay, and colored starting state. Verify `replayAction` stops at the formula end and camera orbit does not change state. Also cover renderer failure with usable textual steps.
- [ ] **Commit:** `feat: play CFOP pairs and slice algorithms with synchronized explanations`.

## Task 8: Add Method Selection Without Losing Input

**Files:** Create `src/app/routes.ts`, `src/app/routes.test.ts`, and `src/app/MethodSelector.tsx`; modify `App.tsx`, `SolvePage.tsx`, `LessonLayout.tsx`, `src/app/color-entry/ColorEntry.tsx`, their tests, and `src/styles.css`; create `e2e/method-switching.spec.ts`.

**Interfaces:** `parseRoute(hash: string): AppRoute`, with `AppRoute = { kind: 'solve'; method: MethodId } | { kind: 'learn'; method: MethodId; lessonId: string }`; `methodRoute(method: MethodId, kind: 'learn' | 'solve'): string`. `MethodSelector` accepts `{ method: MethodId; kind: 'learn' | 'solve' }` and uses normal hash links. `SolvePage` accepts `method`; `ColorEntry` receives the method-aware solve-button label. Free-solve method changes must not key/remount `SolvePage`.

This task activates method selection for free solving. Keep learning navigation on its existing LBL links until Task 9 connects the CFOP course; do not advertise a CFOP lesson link that still renders LBL content.

- [ ] **Write failing tests.** Cover old routes, CFOP paths, unknown lesson fallback, and backward/forward navigation. Enter a scramble and a partially painted color draft, validate a complete draft, switch methods, and assert all specified input state remains. Assert the old result is removed, no automatic solve begins, and the new button is correctly named. Simulate a switch during worker work and random generation; late completions cannot alter draft/result/busy state.

  Pin `it('preserves input and clears the result on a history-driven method change')` with `expect(textarea).toHaveValue(originalScramble)`, `expect(screen.queryByText(oldFormulaName)).not.toBeInTheDocument()`, and `expect(solveMock).toHaveBeenCalledTimes(callsBeforeSwitch)` after dispatching the real hashchange event. Assert the next explicit request passes `'cfop-beginner'` and the preserved input.
- [ ] **Run red checks:** `npx.cmd vitest run src/app/routes.test.ts src/app/SolvePage.test.tsx src/app/color-entry/ColorEntry.test.tsx`.
- [ ] **Implement method routing and cancellation.** Parse the route once in `App`; make banner/navigation reflect the actual selected method. Keep input state owned by the stable solve page and invalidate its epoch on method changes before accepting any result. Retain validation when the color draft is unchanged. Update stage navigation from method metadata. For unknown solve suffixes, fall back to the LBL solve route; do not guess an unsupported method. Preserve existing within-method stale-input notices.
- [ ] **Run green checks, typecheck, and browser switching checks.** Use actual hash/back/forward transitions and fake delayed worker/random responses at the component layer. Verify focus, accessible selector names, a 390px viewport, and no horizontal page overflow.
- [ ] **Commit:** `feat: switch teaching methods while preserving cube input`.

## Task 9: Deliver the CFOP Course and Validated Case Examples

**Files:** Create `src/content/{course-types,cfop-course,cfop-examples,courses}.ts` and `cfop-course.test.ts`, `src/app/CaseSelector.tsx`; adapt `src/content/lbl-course.ts`, `App.tsx`, `LearnPage.tsx`, `LessonLayout.tsx`, and relevant CSS; add `e2e/cfop-learning.spec.ts`.

**Interfaces:** Move the common `Lesson` type to `course-types.ts` with `id: string`, method-scoped stage/algorithm references, and optional `examples: readonly CaseExample[]`. `CaseExample = { id: string; title: string; scramble: string; expectedCaseId: string; stageId: StageId }`. `getCourse(method: MethodId): readonly Lesson[]` returns metadata only. `CFOP_COURSE` contains `intro` plus the seven exact stage IDs from the spec. The route introduction is `#/learn/cfop/intro`.

- [ ] **Write failing tests.** Assert every lesson's stage/formula exists in its method, all five F2L families and 16 last-layer cases have selectable examples, and every scramble parses as six-face notation. Solve each example and assert the target stage actually emits `expectedCaseId`, then verify its replay. Require the full guided example to contain work in Cross, F2L, both OLL substages, and both PLL substages. Assert final AUF and skipped cases also have lesson explanations.

  Pin `it.each(examples)('reaches the documented case for $id')` with `expect(parseScramble(example.scramble).ok).toBe(true)` and `expect(targetStage.actions.map(a => a.caseId)).toContain(example.expectedCaseId)` after the actual CFOP solve. Obtain `targetStage` by the example's stage ID and fail if it is absent.
- [ ] **Run red check:** `npx.cmd vitest run src/content`.
- [ ] **Write original lessons and fix literal example scrambles.** Explain pair/slot matching, both insertion hands, two-look recognition, M direction, AUF, checkpoints, and following a physical cube. Choose deterministic examples using the actual verified solver; store their final literal six-face scrambles in `cfop-examples.ts`, not a runtime example search or generic solver dependency. For each, independently verify the scrambled colors and expected case. Keep existing LBL content and URLs intact.
- [ ] **Connect the course and case selector.** Activate the learning method selector and method-aware header links in `App`; pass the parsed method and lesson ID to `LearnPage`. Solve examples through the method-aware client, cancel on lesson/case changes, and play the chosen stage. Selecting a case updates its scramble, notes, targets, and trace together. Warn that stage jumps change the screen instantly and do not turn the physical cube. Show a useful loading/error state without an old example masquerading as the new one.
- [ ] **Run green content tests, typecheck, and the CFOP learning browser spec.** Cover intro, a full guided solve, each case selector, rapid case switching, M notation, and a 390px keyboard-accessible lesson. Commit `feat: teach beginner CFOP with verified course examples`.

## Task 10: Verify, Review, and Publish the V1.2 Preview

**Files:** Extend `e2e/production.spec.ts`, relevant CFOP specs, `README.md`, and create `docs/validation/v1.2.md`. Inspect `.github/workflows/{ci,pages}.yml`; both must execute the expanded `test:corpus` script. Update them only if the existing commands no longer cover the required checks.

**Interfaces:** Uses the completed public routes, published input contracts, actual worker, and production build. No product feature is added by this task; failures return to their owning task with a reproducer.

- [ ] **Add production assertions.** On `/cube-steps/`, test direct navigation/refresh for LBL and CFOP, one CFOP scramble solve, one asymmetric entered-color solve, and method switching. Compare actual renderer starting and final states, not just success text. Fail on uncaught errors or missing assets. Keep browser test processes sequential because they share `test-results`.
- [ ] **Run the release checks once the branch is complete:**

  ```powershell
  npm.cmd run typecheck
  npm.cmd run test:unit
  npm.cmd run test:corpus
  npm.cmd run build
  $env:CUBESTEPS_TEST_PORT = '5183'
  npm.cmd run test:e2e
  $env:CUBESTEPS_TEST_PORT = '5184'
  npm.cmd run test:production
  Remove-Item Env:CUBESTEPS_TEST_PORT
  git diff --check
  ```

  Each command must exit zero. Execute them with exit-code checks or as separate calls so a failed command cannot be hidden by a later success. Record counts and commands actually observed; do not reuse old pass counts. Do not start a second test invocation while the first still owns its output directory. Re-run only the affected checks after a correction, plus the required final CI gate.

- [ ] **Inspect the UI and document evidence.** Check desktop and 390px layouts, forward/backward steps, replay, stage jumps, M movement, no-WebGL text fallback, and console/network errors in Chromium and WebKit. Save representative screenshots and reproducible scrambles. Update README capabilities/roadmap; record measured results and physical CFOP acceptance as pending in `docs/validation/v1.2.md`. Preserve older acceptance evidence. Commit `docs: record beginner CFOP validation and preview status` after the checks.
- [ ] **Obtain a fresh independent final review.** Use `requesting-code-review` with the approved spec, this plan, the complete base-to-head diff, and actual test results. Request correctness and teaching-method fidelity, especially F2L pairing, two-look counts, frame/center handling, worker races, and input provenance. Resolve material findings with tests. Do not expand to parallel implementation or claim review is complete while it is still running.
- [ ] **Integrate using the existing authorization.** Push the feature branch, create and attach a PR with the final scope and evidence, wait for its required checks, and merge after they pass and review findings are resolved. Refresh and fast-forward the clean local main checkout, preserving unrelated local work. Follow the finishing-branch skill; do not delete a checkout that still contains needed evidence.
- [ ] **Publish and verify the preview.** Dispatch the existing Pages workflow with `publish_preview=true` and `teaching_accepted=false` on merged main. Confirm deployment for that exact commit. Open the public CFOP introduction and solve routes; repeat representative scramble and color-input verification in Chromium/WebKit, compare starting/solved states, and check refresh/assets/errors. Provide the website, PR, and screenshot links. Record any real failure rather than calling the version published solely because the dispatch succeeded.

## Plan Self-Review and Handoff

Coverage: spec sections 1–3 map to Tasks 1–6; courses and UI in section 4 map to Tasks 7–9; architecture and bounded failures in sections 5–6 map to Tasks 1–8; all section 7 acceptance/deployment work maps to Tasks 2–10. Later-version exclusions and licensing apply globally and are retained in Task 10 documentation. Each Review Focus item has explicit owning tests.

All tasks use the shared names above. Runtime recognition and verification remain separate from presentation metadata. Unknown stages, zero-action traces, partial goals, center changes, inverse replay, and late method replies have dedicated checks. The new corpus is part of the existing CI/Pages test command. No requested feature is left behind a future unspecified task.

This is a reviewable implementation plan, not evidence of working CFOP code. After owner approval, preserve the previously selected Native execution approach and implement the tasks in order. Physical teaching acceptance remains a separate owner check after a usable preview is delivered.
