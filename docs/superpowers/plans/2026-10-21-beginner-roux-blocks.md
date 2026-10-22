# Beginner Roux Blocks and Corners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build independently verified fixed-frame block and corner planners that explain their actual moves.

**Architecture:** Keep Roux observations, maneuver definitions and deterministic planners under `src/methods/roux/`. Planners return action drafts and states; the next plan integrates them into the shared trace. Generated policies select registered teaching maneuvers, never an opaque full-cube solve.

**Tech Stack:** Existing React, TypeScript, Vite, cubing.js, Vitest and Node >=24; no new product dependency.

**Spec:** [Approved Beginner Roux design](../specs/2026-10-21-beginner-roux-design.md).

## Global Constraints

- The fixed frame is white-bottom, blue-left, green-right, red-front, orange-back; the explicit input-to-frame regrip is `x2 y`.
- M/M' must be useful in both lessons and generated block solutions; M2 belongs in the foundation. Never add useless slice turns to meet a quota.
- Keep the side frame fixed after the starting regrip. Center phase is allowed to change; camera orbit is not a physical move.
- Seven OCLL cases plus T-perm/Y-perm; no yellow-cross prerequisite. Use the nine exact sequences in spec section 6.
- Use the same catalog and truthful recognition in lessons and solving. Preserve existing LBL/CFOP behavior.
- Initial per-solve ceilings: **1,000,000 expanded nodes, 15 seconds of worker work, 160 trace actions and 400 teaching-move tokens**.
- All UI and teaching copy is English. No new accounts, full CMLL, neutral-color Roux or shortest-solve claim.

## Review Focus

- A completed block with displaced middle centers must remain complete: Task 1 tests all four M phases.
- A target trapped in a previously completed slot must be extracted and restored honestly: Tasks 2–4 test the protection boundary and explanation.
- Two states with identical target positions but different locked pieces must not share an unsafe planner key: Task 2 tests this distinction.
- Rear targets and both pair orders must be usable without a hidden y rotation: Tasks 3–4 test the exact emitted moves.
- Solved corners or different top-edge orientations must not trigger an unnecessary formula: Task 5 tests all corner cases and skips independently of edges.

---

## Execution and file map

The owner has repeatedly selected **Native** execution: implement these tasks sequentially in the current chat, then obtain one independent whole-branch review. Do not start until these written plans are approved. This plan contains Tasks 1–5; continue with [LSE and complete solving, Tasks 6–10](2026-10-21-beginner-roux-solver.md), then [club delivery, Tasks 11–15](2026-10-21-beginner-roux-club.md).

At execution start, reuse the clean `codex/beginner-roux-design` worktree. Fetch remote state and incorporate the completed Guide-video release from `main` before editing product files. Do not change the primary checkout or start a second video publisher. Run `npm.cmd ci`, `npm.cmd run typecheck` and the existing unit baseline once; record an actual failure rather than carrying it forward as a pass.

| Files | Responsibility |
| --- | --- |
| `src/methods/roux/types.ts`, `frame.ts`, `predicates.ts` | Fixed physical targets, frame observations, local stage/action contracts. |
| `budget.ts`, `blocks/types.ts`, `blocks/catalog.ts`, `blocks/planner.ts`, `blocks/policies.ts` | Bounded work, explained maneuvers, deterministic subgoal policies. |
| `blocks/first-block.ts`, `blocks/second-block.ts` | Complete left and right blocks, using those policies. |
| `corners/catalog.ts`, `corners/recognize.ts`, `corners/plan.ts` | Corner-only case recognition and nine shared teaching sequences. |
| `tests/fixtures/roux-cases.ts`, `tests/helpers/roux.ts` | Independently replayable legal fixtures and test assertions. |
| `scripts/roux/build-block-policies.mts`, `tests/roux-block-coverage.test.ts` | Deterministic table generation and complete subproblem admission. |

All test files below are created beside their source unless specified otherwise. Exact source paths are relative to the repository root. Commands use `npm.cmd` on Windows; CI uses `npm`.

### Task 1: Physical frame and invariant observations

**Files:** Create `src/methods/roux/{types,frame,predicates}.ts`, their `.test.ts` files, `tests/fixtures/roux-cases.ts`, `tests/helpers/roux.ts`.

**Interfaces:**

- `types.ts`: `RouxStageId` is exactly the eight identifiers in spec section 8. `RouxActionMetadata` contains `goal: string`, `protectedIds: readonly string[]`, `protection: 'always' | 'endpoint'`, `centerPhaseBefore: 0 | 1 | 2 | 3 | null`, `centerPhaseAfter: 0 | 1 | 2 | 3`, and optional `cornerOffsetBefore/After: 0 | 1 | 2 | 3`; add `temporaryNote?: string` only for a declared restoration window. A null starting phase is permitted only before the initial frame action.
- `RouxActionDraft = ActionInput & { roux: RouxActionMetadata }`; consume `ActionInput` from `methods/shared/trace.ts` without modifying the core trace yet.
- `RouxPlanResult = { ok: true; state: CubeState; actions: RouxActionDraft[] } | { ok: false; code: SolveFailure['code']; stageId: RouxStageId; message: string }`.
- `rouxReferenceState(engine: CubeEngine): CubeState`; `observeRouxFrame(engine, state): { sideFrameValid: boolean; centerPhase: 0|1|2|3|null; eoReferenceValid: boolean }`. Before the side frame is established, return null phase and false EO reference. With blue left/green right, reject center arrangements outside the legal M cycle; do not fabricate a phase.
- `blockComplete(engine, state, side: 'left'|'right'): boolean`; `topCornersOriented(engine,state): boolean`; `cornerOffset(engine,state): 0|1|2|3|null`; `rouxSolved(engine,state): boolean`.
- Test helper `rouxFixture(engine, id): CubeState` returns only a recorded legal move replay or a mathematically legal orbit fixture with its construction checked. `assertRouxActions(engine, initial, result): void` replays drafts, compares states and checks declared protections.

- [ ] **Step 1 — Write frame/predicate tests.** Include these assertions, plus incorrect piece identity, wrong sticker direction and corrupt-center rejection:

  ```ts
  const held = engine.apply(engine.solved(), ['x2', 'y']);
  expect(engine.observe(held).centers).toMatchObject({U:'yellow', D:'white', L:'blue', R:'green', F:'red', B:'orange'});
  for (const move of ['M', "M'", 'M2'] as const) {
    expect(blockComplete(engine, engine.apply(held,[move]), 'left')).toBe(true);
    expect(blockComplete(engine, engine.apply(held,[move]), 'right')).toBe(true);
  }
  expect(observeRouxFrame(engine, engine.apply(held,['M'])).eoReferenceValid).toBe(false);
  expect(cornerOffset(engine, engine.apply(held,['U']))).not.toBeNull();
  expect(rouxSolved(engine, engine.apply(held,['M2']))).toBe(false);
  ```

- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/frame.test.ts src/methods/roux/predicates.test.ts`; expect missing implementations or failed assertions.
- [ ] **Step 3 — Implement the interfaces.** Derive piece identities from the reference observation, not from display strings or movable centers. Define center phase by repeated M from that reference. `rouxSolved` checks physical colors/locations and center colors; ignore decorative center-sticker rotation. Fixtures include all M phases and common U offsets.
- [ ] **Step 4 — Run green.** Repeat the focused command and `npm.cmd run typecheck`; all assertions pass, including M/M' inverse and the complete center cycles.
- [ ] **Step 5 — Commit.** Stage only the files listed above; `git commit -m "feat: define Roux frames and physical invariants"`.

### Task 2: Maneuver catalog, bounded planner and coverage admission

**Files:** Create `src/methods/roux/budget.ts`, `budget.test.ts`, `blocks/{types,catalog,planner,policies}.ts`, `blocks/{catalog,planner,policies}.test.ts`, `scripts/roux/build-block-policies.mts`, `tests/roux-block-coverage.test.ts`, `src/methods/roux/data/block-policies.json`. Extend the two test-support files from Task 1.

**Interfaces:**

- `RouxLimits = { maxNodes:number; maxMs:number; maxActions:number; maxMoves:number }`; export frozen `ROUX_LIMITS` with `1000000,15000,160,400` respectively.
- `createRouxBudget(limits?: Partial<RouxLimits>, now?:()=>number): RouxBudget`; budget exposes `node(stage:RouxStageId): void` and `action(stage, moves:readonly TeachingMove[]): void`, throwing a typed `RouxPlanningError(code,stageId,message)` on exhaustion. No module-global mutable counters.
- `BlockGoal = { side:'left'|'right'; phase:'base'|'pair'; targetIds:readonly string[]; lockedIds:readonly string[] }`.
- `BlockManeuver` has a stable id, `kind:'setup'|'algorithm'`, moves, optional algorithmId, protection policy, `match(engine,state,goal): {caseId:string; targets:string[]; recognition:string; explanation:string}|null`, and `check(engine,before,after,goal):boolean`.
- Export `ROUX_BLOCK_MANEUVERS: readonly BlockManeuver[]` and `ROUX_BLOCK_ALGORITHMS: Readonly<Record<string,TeachingAlgorithm>>`; the latter contains the exact fixed sequences referenced by algorithm maneuvers.
- `RouxBlockPolicies` stores versioned subgoal transition/rank tables and a catalog digest. `planBlockGoal(engine, initial, goal, policies, budget): RouxPlanResult` uses them. `blockStateKey(engine,state,goal):string` includes every target/locked-piece coordinate and relevant center phase.

- [ ] **Step 1 — Write tests.** Assert these bounds exactly, using an injected clock:

  ```ts
  expect(ROUX_LIMITS).toEqual({maxNodes:1000000,maxMs:15000,maxActions:160,maxMoves:400});
  const clock = {value:0};
  const b = createRouxBudget({maxNodes:1},()=>clock.value);
  b.node('roux-first-block');
  expect(()=>b.node('roux-first-block')).toThrow(/budget/i);
  ```

  Add named tests `different locked pieces produce different keys`, `unmatched maneuver emits no explanation`, `slice setup reports its actual target movement`, `temporary insertion restores locks at its endpoint`, `elapsed limit fails at 15000 ms`, and `catalog mismatch rejects a policy`. Test the exact time/action/move boundaries, including 160/161 actions and 400/401 tokens. Include an empty or disconnected coverage artifact as a rejected case.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/budget.test.ts src/methods/roux/blocks`; expect the new contracts to fail before implementation.
- [ ] **Step 3 — Implement catalog and policy generation.** Start with named base-edge placements; front/back extraction and insertion triggers; connected/separated-pair setups; and M/M'/M2 target transport. Generate explicit inverse/mirror variants with their own holds and predicates; do not mirror English text blindly. Algorithms are complete fixed sequences, with their formula boundaries retained. Individual setup moves still need a case predicate and an observed purpose.
- [ ] **Step 4 — Implement deterministic subgoal planning.** Use reverse reachability over projected legal subgoal states under admitted maneuvers, recording a decreasing policy rank. Enumerate the admissible projected domain independently, with locked pieces fixed at checkpoints; compare it with reachable coverage. Admit only matched, protection-preserving, rank-decreasing transitions. Compare their complete candidate continuations lexicographically by taught maneuver count, rear-target inspection cost, next-pair preparation cost, token count and stable catalog id. No random tie breaking, arbitrary full-cube search fallback or claim of optimum. If coverage has holes, add and explain the missing maneuver family and regenerate; do not mark the task complete by reducing the domain.
- [ ] **Step 5 — Verify coverage and green tests.** Run the focused tests, `node scripts/roux/build-block-policies.mts --verify`, `npx.cmd vitest run tests/roux-block-coverage.test.ts --maxWorkers=1`, and typecheck. Record independently enumerated versus covered counts, catalog digest and protection checks in the generated artifact. Verify every policy transition against cube-engine replay; sampled scrambles alone do not admit the table.
- [ ] **Step 6 — Commit.** Stage the listed source/tests/generator/data; `git commit -m "feat: add bounded Roux maneuver policies"`.

### Task 3: Explained first block

**Files:** Create `src/methods/roux/blocks/first-block.ts`, `first-block.test.ts`; extend `tests/fixtures/roux-cases.ts`.

**Interfaces:** Consume Task 2; produce `planFirstBlock(engine:CubeEngine, initial:CubeState, policies:RouxBlockPolicies, budget:RouxBudget):RouxPlanResult`. Input is already in the fixed Roux frame.

- [ ] **Step 1 — Write tests.** Fixtures cover base edge correct/flipped/displaced, joined/separated/trapped pairs, front-first/rear-first, useful M setup, and an already complete block. Pin actual target ids and a real slice-assisted fixture:

  ```ts
  const input = rouxFixture(engine,'first-block-slice-assist');
  const result = planFirstBlock(engine,input,policies,createRouxBudget());
  if (!result.ok) throw new Error(result.message);
  expect(blockComplete(engine,result.state,'left')).toBe(true);
  expect(result.actions.some(a=>a.moves.includes('M'))).toBe(true);
  expect(result.actions.flatMap(a=>a.moves).some(m=>/^[xyz]/.test(m))).toBe(false);
  assertRouxActions(engine,input,result);
  ```

  The fixture is selected because M performs a useful catalog action, not because an extra M/M' cancellation was inserted. A solved block returns zero actions and unchanged state.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/blocks/first-block.test.ts`.
- [ ] **Step 3 — Implement the planner.** Place the white-blue base edge, compare the two pair orders using Task 2's policy, and emit observed Look/Prepare/Do/Check drafts. Protect completed base/pairs at each declared checkpoint. Preserve slice-centered intermediate states. Reject an illegal start frame with a stage-specific error.
- [ ] **Step 4 — Run green.** Repeat the focused test, the block coverage test and typecheck. Inspect one front and one rear trace for truthful recognition and useful setup descriptions.
- [ ] **Step 5 — Commit.** `git commit -m "feat: build an explained Roux first block"` after staging the listed files.

### Task 4: Second block with the left block protected

**Files:** Create `src/methods/roux/blocks/second-block.ts`, `second-block.test.ts`; extend the shared Roux fixtures.

**Interfaces:** `planSecondBlock(engine:CubeEngine, initial:CubeState, policies:RouxBlockPolicies, budget:RouxBudget):RouxPlanResult`; reject input with an incomplete left block.

- [ ] **Step 1 — Write tests.** Cover both orders, rear targets, wrong-slot extraction, useful M', solved skip and each M-center phase. Assert the left block after every primitive move for normal R/U/M maneuvers, not merely at stage end:

  ```ts
  let state = input;
  for (const action of result.actions) for (const move of action.moves) {
    state = engine.apply(state,[move]);
    expect(blockComplete(engine,state,'left')).toBe(true);
  }
  expect(blockComplete(engine,result.state,'right')).toBe(true);
  expect(result.actions.some(a=>a.moves.includes("M'"))).toBe(true);
  ```

  Use the M' assertion only for the admitted slice-assist fixture. A wide variant, if admitted, has its exact protection and affected layers tested separately.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/blocks/second-block.test.ts`.
- [ ] **Step 3 — Implement through Task 2 policies.** Prefer R/U/M work, compare both pair orders, and teach extraction/setup/insertion. Never silently y-rotate, normalize movable centers or call CFOP F2L. A temporarily moved right-block piece must have an endpoint restoration note; the left block remains protected.
- [ ] **Step 4 — Run green.** Run all `src/methods/roux/blocks` tests, complete block coverage and typecheck. Reject any coverage fix that weakens the left-block invariant.
- [ ] **Step 5 — Commit.** Stage this task's files; `git commit -m "feat: preserve the left block during Roux second block"`.

### Task 5: Seven OCLL cases and T/Y corner permutation

**Files:** Create `src/methods/roux/corners/{catalog,recognize,plan}.ts`, matching `.test.ts` files and `tests/roux-corner-coverage.test.ts`; extend the Roux test helpers.

**Interfaces:** Export `ROUX_CORNER_ALGORITHMS: Readonly<Record<string,TeachingAlgorithm>>`, with ids `roux-ocll-21` through `roux-ocll-27`, `roux-t`, `roux-y`. `recognizeRouxCorners(engine,state,look:'orientation'|'permutation'): {caseId:string; setup:TeachingMove[]; algorithmId?:string; alignment:TeachingMove[]}`. `planCornerOrientation(engine,initial,budget)` and `planCornerPermutation(engine,initial,budget)` return `RouxPlanResult`.

- [ ] **Step 1 — Write tests.** Assert exact spec sequences, corner-only signatures, headlights-left T hold, no-headlights Y hold and zero-formula solved-up-to-U cases. Enumerate 24 permutations × 27 legal orientations, with matching edge parity, varied legal EO and all reachable center phases. For each case:

  ```ts
  expect(co.actions.filter(a=>a.kind==='algorithm').length).toBeLessThanOrEqual(1);
  expect(cp.actions.filter(a=>a.kind==='algorithm').length).toBeLessThanOrEqual(1);
  expect(cornerOffset(engine,cp.state)).toBe(0);
  expect(blockComplete(engine,cp.state,'left') && blockComplete(engine,cp.state,'right')).toBe(true);
  ```

  All seven cases, T, Y and skips must be exercised; changing only relevant-free edges must not change the recognition signature. Preserve legal parity when synthesizing fixtures.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/roux/corners tests/roux-corner-coverage.test.ts --maxWorkers=1`.
- [ ] **Step 3 — Implement explicit recognition.** Compare observed corner patterns in four U holds, selecting the matching catalog case deterministically. Keep setup, full formula and alignment as separate drafts. Use original Roux preconditions/effects, not CFOP's cross/F2L text. Validate restored blocks at formula endpoints; document their temporary disturbance inside the formula.
- [ ] **Step 4 — Run green.** Repeat the command and typecheck; record the base 648-state count and the expanded phase/EO coverage counts. Review exact hold diagrams later through Task 12, not as a claim that these engine tests prove their appearance.
- [ ] **Step 5 — Commit.** Stage the listed files; `git commit -m "feat: solve Roux corners with seven OCLL cases and T Y"`.

## Completion boundary

This plan delivers independently tested block and corner planners. It does not expose a selectable unfinished method. Continue to the LSE/trace plan only as part of the owner's approved complete implementation sequence.
