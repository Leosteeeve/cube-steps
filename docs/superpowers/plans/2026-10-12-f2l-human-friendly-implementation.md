# Human-Friendly F2L Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Advanced F2L easier to observe and execute with explicit, useful physical regrips and truthful holding instructions.

**Architecture:** Extend the admitted formula metadata and bounded F2L candidate search, keeping one deterministic default policy. The existing trace/runtime verifier and shared player remain authoritative for moves, cube states and checkpoints.

**Tech Stack:** Existing React, TypeScript, Vite, cubing.js 0.65.1, Vitest, Playwright, Node 24+, npm; no new dependency.

**Spec:** [Approved F2L design](../specs/2026-10-12-f2l-human-friendly-design.md).

**Status:** Approved by the owner on October 13, 2026. Execute sequentially using Native, with independent final review. The owner also authorized GitHub merge, Pages publication, local synchronization, and cleanup of redundant task worktrees.

## Global Constraints

- Keep white down throughout F2L.
- Do not add an execution-mode selector.
- Keep the exact shortest-white-cross guarantee, the admitted formula library, full OLL/PLL, and the accepted LBL and Beginner CFOP teaching routes.
- Camera orbit remains observation only.
- Do not rotate back to green-front after each pair.
- Every completed extraction/insertion maneuver restores the cross and all previously completed pairs.
- Physical setup stays separate from catalog formulas; do not change registered move sequences under an existing ID.

## Review Focus

1. A corner and its edge occupy different lower slots after a y turn: identify the correct extraction by piece identity, not the old slot (Task 2).
2. An easy rear insertion is already comfortable: keep its hold rather than forcing a gratuitous rotation (Tasks 1–2).
3. The best next pair has a different front center: preserve that continuation in pruning and deterministic ties (Task 2).
4. A forged regrip has plausible prose but incorrect targets or orientation: reject it before playback (Task 2).
5. A source formula rotates the cube internally and playback steps backward midway: derive holding labels from the actual boundary state (Task 3).

## Execution order and baseline

After plan approval, use `using-git-worktrees` to select/create an isolated checkout from the current approved integration base. Do not reuse the closed Advanced CFOP feature checkout without inspecting it. Carry these planning documents into that checkout. Before changing code, run `npm.cmd run test:efficiency` once and preserve `test-results/advanced-efficiency.json` with its commit/environment in the validation evidence; this is the old-policy comparison, not a new pass claim.

Implement this plan before [club foundation](2026-10-12-webb-club-foundation-implementation.md), followed by [club timer](2026-10-12-webb-club-timer-implementation.md). Finishing code allows the next local implementation slice; public teaching acceptance and publication remain explicit release steps.

## File map and fixed contracts

| Files | Responsibility |
| --- | --- |
| `src/algorithms/types.ts`, `admission.ts`; `scripts/data/f2l-execution-profiles.json`; `scripts/build-f2l-catalog.mts` | Explicit, reviewed execution metadata and admission |
| `src/methods/advanced/f2l/execution.ts` (new) | Visibility evidence and pure cost comparison |
| `src/methods/advanced/f2l/holding.ts`, `budget.ts` (new) | Physical y choices and shared bounded simulation |
| Existing `prepare.ts`, `candidates.ts`, `select.ts`, `solve.ts`, `types.ts` | Preparation, candidate generation, lookahead and trace output |
| `src/core/types.ts`, `src/methods/advanced/definition.ts` | Versioned trace contract and independent action validation |
| `src/player/RegripGuide.tsx` (new), `PlaybackView.tsx`; `src/content/advanced-course.ts` | Holding guidance and teaching copy |
| `tests/fixtures/f2l-ergonomics.ts` (new); existing F2L/corpus tests | Reproducible physical-use cases and regressions |
| `docs/validation/f2l-human-friendly.md` (new), `docs/algorithms.md` | Actual results, tradeoffs and physical acceptance |

Add `F2LExecutionProfile = { gripPenalty: 0 | 1 | 2; recognition: 'sticker-directions' | 'connected-pair'; easyRearInsertion: boolean; rationale: string }` in algorithm types. Store it as `f2lExecution` on F2L variants and on preparation entries (extend their type from `TeachingAlgorithm` without requiring it for other methods).

Define `ExecutionMetrics = { quality: number; faceTurns: number; rotations: number; effort: number; reasons: string[] }` in `src/core/types.ts` so trace types do not import solver code. For each complete maneuver, quality adds `gripPenalty` and a visibility penalty of 2 when the critical recognition stickers cannot be observed from its chosen front-left/front-right presentation. Determine critical sticker faces from the actual white corner and the target edge's center-relative sticker; for a correctly oriented bottom corner, use its observable side-color matches rather than demanding a view of the hidden white sticker. For connected-pair profiles verify actual connected matching stickers. `easyRearInsertion` records that an admitted rear insertion can qualify as comfortable when recognition is visible and grip penalty is zero; it cannot waive hidden evidence. There is no additional penalty based solely on being a rear slot. Effort is face-turn equivalents plus physical rotation count; a y2 counts as one rotation.

Immediate ordering is `(quality, effort, rotations)`. One-pair lookahead ordering is `(2 * current.quality + next.quality, 2 * current.effort + next.effort, current.quality, current.effort, current.rotations, cornerId, edgeId, variantId, moveText)`. No next pair uses zero metrics. Compare strings by deterministic code-point ordering, not host locale. These numbers describe a heuristic, not seconds or measured human performance.

Finite limits: 2 extraction maneuvers; 1,024 distinct preparation states and 1,024 emitted candidates per target; 262,144 simulated `engine.apply` calls per selection, including physical/virtual holding, preparation, insertion and lookahead. Wrap the engine during selection so nested recognition cannot bypass this counter. Cache preparation/candidate results by full state data plus immutable target IDs within one selection. Keep the best 2 candidates per resulting front-center color per target (maximum 8 per target, 32 first candidates). This retains all four possible continuation holds. A limit failure is explicit; do not silently increase it to pass tests.

---

### Task 1: Admit execution profiles and define the new comparison policy

**Files:** Create `src/methods/advanced/f2l/execution.ts`, `execution.test.ts`, `scripts/data/f2l-execution-profiles.json`. Modify `src/core/types.ts`, `src/algorithms/types.ts`, `admission.ts`, `admission.test.ts`, `scripts/build-f2l-catalog.mts`, `src/algorithms/data/f2l-catalog.json`, `docs/algorithms.md`.

**Interfaces:** Produce `measureF2LExecution(engine: CubeEngine, before: CubeState, target: F2LTarget, actions: readonly ActionInput[]): ExecutionMetrics`, `compareExecution(a: ExecutionMetrics, b: ExecutionMetrics): number`, and `rankWithNext(current: ExecutionMetrics, next: ExecutionMetrics): readonly number[]`. Consumers use the fixed formulas above.

- [ ] Write `execution.test.ts`: `expect(compareExecution({quality:0,effort:9,rotations:1}, {quality:2,effort:7,rotations:0})).toBeLessThan(0)` with the remaining metric fields filled; equal-quality/equal-effort favors fewer rotations. Assert `rankWithNext` for current `(quality=1,effort=8)` and next `(2,5)` begins `[4,21]`. Add admission cases that reject missing F2L profiles, unknown enum values, empty rationale and an easy-rear flag paired with nonzero grip penalty.
- [ ] Run `npx.cmd vitest run src/methods/advanced/f2l/execution.test.ts src/algorithms/admission.test.ts`; confirm the new behavior is red before implementation.
- [ ] Implement the declared functions and explicit profile source. Review actual sequences/preconditions, including internal rotations, rather than assigning comfort from ID text. Pin `f2l-02/no-regrip/br` (`R' U' R`) as the reviewed easy-rear example and `f2l-20/main/br` as the repeated-back-turn comparison. Supply profile metadata for every F2L variant and extraction, with documented rationale. Update the generator to fail on missing or orphaned profile IDs; retain the old numeric `executionPenalty` until Task 2 replaces its selection use.
- [ ] Run `node scripts/build-f2l-catalog.mts`, the targeted tests, `npx.cmd vitest run src/algorithms`, and `npm.cmd run typecheck`. Confirm catalog moves, case IDs, fixture states and source references did not change while metadata was added. Investigate any generated non-metadata change.
- [ ] Commit the explicit files with `git commit -m "feat: define reviewed F2L execution profiles"`.

### Task 2: Select verified holding-aware preparation and insertion paths

**Files:** Create `src/methods/advanced/f2l/holding.ts`, `holding.test.ts`, `budget.ts`, `budget.test.ts`, `tests/fixtures/f2l-ergonomics.ts`. Modify the existing F2L `types.ts`, `prepare.ts`, `prepare.test.ts`, `candidates.ts`, `candidates.test.ts`, `select.ts`, `select.test.ts`, `solve.ts`, `solve.test.ts`, plus `src/core/types.ts`, `src/methods/advanced/definition.ts`, `src/methods/advanced/solve.test.ts`.

**Interfaces:** Produce `enumerateF2LHolds(engine, state, target): { state: CubeState; target: F2LTarget; actions: ActionInput[] }[]`, `createF2LBudget(engine: CubeEngine, limit: number): { engine: CubeEngine; used(): number }`, and `selectF2LShortlist(candidates: readonly F2LCandidate[]): F2LCandidate[]`. Extend existing `F2LCandidate` with `metrics: ExecutionMetrics` and the actual post-maneuver front color. Preserve `chooseF2LCandidate(engine, state, limits?)`; return selected metrics, next metrics and `compared`.

Trace `selection` becomes a discriminated union preserving validation of old `f2l-v1` traces and adding `policyVersion: 'f2l-human-v2'`, `current: ExecutionMetrics`, `next: ExecutionMetrics`, `compared: number`. A physical holding action uses rule `advanced-f2l-regrip`, kind `regrip`, case `f2l-working-hold`, the immutable target pair, and exactly one nonempty y/y'/y2 move. Its explanation is generated from before/after centers and working slot. All new solves use v2.

- [ ] Add failing cases using `getCaseFixture('f2l-20/br/u0')` and `getCaseFixture('f2l-02/br/u0')`: the former selects a useful physical regrip over repeated B work; the latter keeps its comfortable admitted insertion when observation permits. Add independent `pairPlacement` fixtures for a wrong-slot corner/edge, each y holding frame, and a second pair whose selected starting hold is the preceding candidate's actual final hold. Assert protected pairs, exact piece identities, final slot and deterministic trace. Test that all four front-color groups survive shortlist pruning and `maxSimulations: 1` yields a budget error. Tamper a valid regrip's move, target, pair slot and center description separately; each must fail runtime validation.
- [ ] Run `npx.cmd vitest run src/methods/advanced/f2l src/methods/advanced/solve.test.ts`; observe the new rotation/validation cases fail for their intended reason.
- [ ] Implement holding expansion inside preparation at complete maneuver boundaries. Re-observe the target after every rotation; deduplicate by full state/identity while retaining the preferred path. Y moves do not consume extraction depth. Apply the shared wrapped engine to all simulations. Preserve formula moves and checkpoints. Replace the selector's old scalar ranking with the declared tuple, per-front shortlist and bounded next-pair comparison; skip an unsupported orientation locally and fail only when the target has no valid path. Keep budget failures fatal. Emit v2 trace metadata and extend independent validation for the new rule/metadata without re-running the solver in the player. Remove obsolete selection adapters after all callers use v2.
- [ ] Run the targeted tests, `npm.cmd run typecheck`, and `npx.cmd vitest run src/algorithms src/methods/advanced/last-layer.test.ts src/methods/shared`. Confirm no hidden camera change, no forced return after every pair, and no changes to shortest-cross decisions.
- [ ] Commit with `git commit -m "feat: choose human-friendly F2L holding frames"`.

### Task 3: Explain regrips consistently in lessons, solves and demonstrations

**Files:** Create `src/player/RegripGuide.tsx`, `RegripGuide.test.tsx`; modify `src/player/PlaybackView.tsx`, `src/player/cfop-player.test.tsx`, `src/algorithms/demonstration.ts`, `src/algorithms/demonstration.test.ts`, `src/content/advanced-course.ts`, `src/content/advanced-course.test.ts`, `src/styles.css`; create `e2e/f2l-holding.spec.ts`.

**Interfaces:** `RegripGuide({engine, boundaryState, action, moving}: {engine: CubeEngine; boundaryState: CubeState; action?: TraceAction; moving: boolean})`. Consume `SourcePlaybackSnapshot.boundaryState` from the existing controller. Current holding and expected post-regrip holding have separate labels; a moving animation must not present its destination as already reached.

- [ ] Write tests that step before/after y, then backward and through an admitted formula with an internal y: displayed current front equals `engine.observe(snapshot.boundaryState).centers.F`; destination equals the action's after-state only when labeled as the destination. Orbit/reset-view must leave move index and boundary state unchanged. Replay and lesson jumps retain matching highlights/formula position. Demonstrations and free solves must use the same variant moves.
- [ ] Run `npx.cmd vitest run src/player/RegripGuide.test.tsx src/algorithms/demonstration.test.ts src/content/advanced-course.test.ts` and confirm the missing new cues are red.
- [ ] Implement the guide using the existing holding observation, and show the physical regrip's purpose and target slot. Update Advanced teaching copy and demonstration regrip explanations to continue from the resulting hold. Retain existing player controls and accepted Beginner behavior. Use the shared catalog's preconditions and formulas; no duplicated tutorial formula list.
- [ ] Run the targeted tests and `npx.cmd playwright test e2e/f2l-holding.spec.ts e2e/advanced-player.spec.ts e2e/color-entry.spec.ts e2e/algorithm-practice.spec.ts`; inspect desktop/phone screenshots, active notation and browser errors. Include a face-color solve and a source formula with internal rotation.
- [ ] Commit with `git commit -m "feat: explain physical F2L regrips in playback"`.

### Task 4: Verify ergonomics, correctness and release readiness

**Files:** Modify `tests/advanced-efficiency.test.ts`, `tests/advanced-cfop-corpus.test.ts`, `src/algorithms/f2l-admission.test.ts`, `e2e/advanced-production.spec.ts`, `docs/algorithms.md`; create `docs/validation/f2l-human-friendly.md`. Use existing `scripts/benchmark-advanced.mjs`.

**Interfaces:** Preserve existing corpus helpers and command names. Extend the efficiency JSON report with the policy version, selected quality categories, useful/avoided regrip fixtures, and baseline commit/environment.

- [ ] Add regression coverage for the five Review Focus inputs, all 41 F2L cases across four slots and four horizontal holding frames, and complete trace replay for seeds 1–1,000 twice plus their legal facelet inputs. Keep `replayMatchesRecordedStates`, formula identity and every checkpoint assertion. Keep exact-cross assertions. The approved comfort-first policy supersedes the previous F2L pass thresholds of <= 90% of Beginner mean turns, no greater median turns and no greater mean rotations: retain those exact comparisons as reported diagnostics, while the new pass criteria are the explicit visibility/comfortable-execution fixtures, deterministic protected solving and bounded work. Report any turn-count regression plainly; do not continue describing the old numerical thresholds as passed or advertise a stronger efficiency claim than the evidence supports.
- [ ] Run the new focused regressions; deliberately alter a test-local move or regrip expectation to establish that these assertions detect mismatches, then restore it. Do not rerun a known-passing corpus merely to produce another green log.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run verify:cross`, `npm.cmd run verify:cases`, `npm.cmd run test:unit`, `npm.cmd run test:corpus`, `npx.cmd vitest run tests/advanced-cross-table.test.ts`, `npm.cmd run test:efficiency`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run test:production`. Run `node scripts/benchmark-advanced.mjs` once after the final build; assess cold p95 <= 5,000 ms and warm p95 <= 2,000 ms on the documented desktop and verify cancellation. Record host-blocked checks as blocked, not passed. Optimize/cache if limits fail; do not mask the failure with a larger budget/watchdog.
- [ ] Record actual results, old/new move and regrip distributions, visibility classifications, screenshots and remaining physical acceptance in the new validation file. Obtain one fresh independent whole-branch review using the preserved Native workflow; resolve actionable findings and rerun affected checks. Present representative physical follow-along cases to the owner before marking the revised method accepted.
- [ ] Commit with `git commit -m "test: validate human-friendly F2L and document tradeoffs"`. Use the finishing workflow for integration; attach any created PR. Do not merge/deploy merely because documentation or automated checks exist. Club work may proceed locally while physical feedback is pending, but retain truthful Preview status.

## Plan self-review and handoff

Coverage: spec sections 1–4 map to Tasks 1–2; sections 5–6 to Tasks 2–3; sections 7–8 to Task 4. All five Review Focus inputs have explicit owning tests. Interfaces, profile names, ranking weights, shortlist and budget limits are fixed above. This plan contains no claim that its tests have been run or the improvement is implemented. Owner review is required before Native execution.
