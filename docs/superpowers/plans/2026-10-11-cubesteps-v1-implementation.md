# CubeSteps V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Recommended execution: native implementation with a final independent review, after the owner reviews this plan.

**Goal:** Deliver a locally runnable English learning website that generates and explains correct beginner LBL solutions, using the same algorithms as its lessons.

**Architecture:** Keep a pure, deterministic teaching solver separate from React and animation. A serializable solution trace drives both lessons and free solves; a cubing.js adapter controls puzzle state and rendering. Run solving in a worker and publish the static site only after release acceptance.

**Tech Stack:** Node.js 24, npm, React, TypeScript, Vite, cubing.js 0.65.1, Vitest, Testing Library, and Playwright. Use ordinary CSS and native HTML controls; no backend, database, account system, or AI service.

**Spec:** [Approved CubeSteps design](../specs/2026-10-11-cubesteps-design.md)

## Global Constraints

- "Use English throughout the interface and project documentation."
- "V1 exposes only the implemented LBL method to users."
- "Guided lessons and freely generated solutions must use the same fixed teaching algorithms."
- "Preserve algorithm boundaries and repetition counts so a learner can recognize the same patterns taught in the lessons."
- "Camera movement must not change the logical cube state or the meaning of notation."
- "All solving runs in the browser."
- "The app requires no account."
- "Replay at least 1,000 reproducible, seeded random scrambles through the solver."
- "An installable offline app and desktop packages are outside V1."
- Keep manual face-color entry, camera input, CFOP, Roux, ZZ, scoring, and user-turn assessment outside this implementation.
- Keep the MIT license and retain third-party notices. Write original teaching text; do not copy tutorial media.
- Do not use an optimal/general solver as an LBL fallback. An unsupported internal case is a visible failure, not a mislabeled solution.
- Do not equate completed automated checks with physical-cube teaching acceptance.

## Verified Starting Point and Execution Setup

As checked on October 11, 2026, the public repository is `https://github.com/Leosteeeve/cube-steps`, and `main` is at `d38159ea962e546dcdc4f2ce5bf96b2ac9c16980`. It contains documentation, MIT licensing, and Node ignore rules. The current parent workspace contains documentation copies and no `.git` directory.

At execution time, refresh the remote before making changes. Use the `using-git-worktrees` skill to establish an isolated checkout from the existing history. If no local checkout exists, clone the existing repository into `D:\Projects\Cubing Calculator\cube-steps`, preserve the parent documentation copies, and create the development branch `codex/lbl-v1` before product edits. Copy this reviewed plan into the checkout. Never initialize an unrelated replacement history or overwrite an existing checkout without inspecting it.

The commands below run from the resulting development checkout. On Windows, use `npm.cmd` and `npx.cmd`. Pin installed dependency versions in the lockfile. The verified cubing.js release is `0.65.1`, requiring Node >=22.3; the existing Node 24 runtime satisfies that floor. Isolate experimental cubing.js APIs behind one adapter and cover them with browser integration tests.

## Review Focus

1. Partial or solved input: preserve completed work and represent skipped stages without manufacturing moves. Owned by Tasks 3–4.
2. Last-stage temporary disruption: distinguish an intermediate disturbance from a failed solution; complete whole triggers and restore alignment. Owned by Task 4.
3. Regrips and camera orbit: notation and highlighted pieces must remain meaningful after rotations. Owned by Tasks 1 and 5.
4. Rapid solve/replay/jump actions: stale worker responses and stale animation frames must not replace the current session. Owned by Tasks 5–6.
5. Unsupported WebGL, small screens, and reduced motion: preserve readable instructions, accessible controls, and an explicit rendering failure state. Owned by Tasks 5–7.

## File Responsibilities

| Area | Files and responsibility |
| --- | --- |
| Project setup | `package.json`, `package-lock.json`, `index.html`, TypeScript/Vite configuration, and test configuration. |
| Cube domain | `src/core/{types,cube,notation,observations}.ts`: immutable serializable state, parsing, state transitions, and piece observations. |
| Teaching rules | `src/methods/lbl/{catalog,stages,trace,cross,first-layer,middle-layer,last-layer,solve}.ts`: the fixed rule set and its evidence. |
| Playback | `src/player/{timeline,controller,cubing-adapter}.ts` and `CubePlayer.tsx`: trace navigation and rendering. |
| Courses | `src/content/{lbl-course,notation-lesson}.ts` and `src/content/fixtures/`: original text and checked example scrambles. |
| Application | `src/app/{App,LearnPage,SolvePage,LessonLayout}.tsx`, `src/app/solve-client.ts`, `src/workers/solve.worker.ts`, and `src/styles.css`. |
| Verification | Adjacent `*.test.ts(x)` files, `tests/solver-corpus.test.ts`, `tests/fixtures/`, and `e2e/`. |
| Release | GitHub Actions workflows, README usage instructions, `THIRD_PARTY_NOTICES.md`, and a release-validation record. |

Each module keeps one responsibility. React components must not contain cube-solving rules. Course files reference algorithm IDs rather than storing copies of move strings.

## Shared Contracts and Defaults

Define these contracts in `src/core/types.ts` and the indicated adapters; later tasks consume them unchanged.

- `FaceMove`: one of the six uppercase face names, optionally followed by `'` or `2`. `TeachingMove` also permits `x`, `y`, `z` rotations with the same modifiers.
- `CubeState`: an immutable, serializable wrapper around cubing.js `KPatternData`; construction and transition functions defensively copy input arrays.
- `createCubeEngine(): Promise<CubeEngine>` with `solved(): CubeState`, `apply(state: CubeState, moves: readonly TeachingMove[]): CubeState`, `observe(state: CubeState): CubeObservation`, `isSolved(state: CubeState): boolean`, and `equals(a: CubeState, b: CubeState): boolean`. State is owned by this engine, never reconstructed from the rendered canvas.
- `CubeObservation`: named edge/corner slots, piece identities, sticker-facing directions, and center colors. These are derived observations, not a second independently mutated cube model.
- `parseScramble(text: string): ParseResult`: either `{ok:true, moves: FaceMove[]}` or `{ok:false, offset: number, message: string}`. Accept whitespace or compact notation and normalize typographic prime marks. Empty input denotes a solved cube. Reject unsupported move families and syntax at their original character offset.
- `StageId`: `white-cross`, `first-layer`, `middle-layer`, `top-cross`, `top-edges`, `top-corners`, `corner-orientation`, in this order.
- `TraceAction`: rule/case identifiers, target piece IDs, recognition and effect text, kind (`setup`, `algorithm`, or `regrip`), moves, optional algorithm ID, and before/after states. Include checkpoint evidence (check ID, explanation, pass result) and a repetition group/index when a trigger repeats; derive the group's total from its actions.
- `TraceStage`: `id: StageId`, status (`completed` or `skipped`), its actions, before/after states, completion checkpoint, and a reason when skipped.
- `SolveTrace`: method `lbl`, initial state, ordered stages, and final state. `flattenTrace(trace: SolveTrace): FlatTrace` derives `moves: TeachingMove[]` and action/stage ranges with inclusive start and exclusive end move indices; it must not simplify across teaching boundaries.
- `SolveFailure`: `{ok:false, code: 'budget' | 'loop' | 'unsupported-case' | 'verification', stageId: StageId, message: string}`. `SolveResult` is `{ok:true, trace: SolveTrace} | SolveFailure`.
- `solveLBL(engine: CubeEngine, initial: CubeState, options?: SolveLimits): SolveResult`. `SolveLimits` exposes `maxActions` and `maxMoves`; defaults are 512 and 4,096. Detect repeated rule/state combinations within a stage's working-piece context, and stop before publishing a success trace.
- `SolveSession`: `{scrambleMoves: FaceMove[], trace: SolveTrace}`. Keep the reproducible scramble beside the trace so TwistyPlayer can initialize its setup algorithm. Verify `engine.apply(engine.solved(), scrambleMoves)` equals the trace's initial state before playback; the solver itself still accepts state independently.

Use white-up, green-front as the initial display frame. Regrips are explicit teaching moves, including the change to white-down after the cross and the last-stage turnover. Derive colors from current centers after a regrip. Solved-state checks ignore whole-puzzle pose and center-sticker spin, while exact playback comparisons retain pose.

## Fixed Algorithm Catalog

Store each sequence once with an English name, precondition, expected effect, and checkpoint policy. The selected seven-stage route follows the [J Perm reference](https://www.jperm.net/3x3); the course will explain this project's exact fixed sequences.

| ID | Sequence |
| --- | --- |
| `right-trigger` | `R U R' U'` |
| `left-trigger` | `L' U' L U` |
| `cross-flip` | `F U' R U` |
| `middle-right` | `U R U' R' U' F' U F` |
| `middle-left` | `U' L' U L U F U' F'` |
| `top-cross` | `F R U R' U' F'` |
| `top-edge-cycle` | `R U R' U R U2 R'` |
| `top-corner-cycle` | `U R U' L' U R' U' L` |

Setup moves and regrips stay separate from these sequences. Repeated triggers remain separate trace actions. Test recognition and geometric effects before using a catalog entry in a solver stage.

---

## Task 1: A Tested Cube Domain and Trace Contract

**Files:** Project setup; `src/core/{types,cube,notation,observations}.ts`; `src/core/{cube,notation}.test.ts`.

**Interfaces:** Produces `createCubeEngine`, `parseScramble`, and the shared types above. Imports `Alg`, `KPuzzle`, and `KPattern` only through the cube adapter. Rendering is not part of this task.

- [ ] **Step 1 — Add the test harness and failing domain tests.** Configure TypeScript strict mode, Vite, Vitest, and scripts `dev`, `typecheck`, `test:unit`, `test:corpus`, `test:e2e`, `build`, and `preview`. Write tests with these assertions:
  ```ts
  expect(parseScramble("R U’ F2")).toEqual({ ok: true, moves: ["R", "U'", "F2"] });
  expect(parseScramble("RUR'U'").ok).toBe(true);
  expect(parseScramble("R M")).toMatchObject({ ok: false, offset: 2 });
  expect(parseScramble("")).toEqual({ ok: true, moves: [] });
  expect(engine.equals(engine.apply(solved, ["R", "R", "R", "R"]), solved)).toBe(true);
  ```
  Also test each face and rotation against its inverse, immutability, pose-sensitive equality versus pose-independent solved checks, and labeled sticker observations before/after `y` and `z2`.
- [ ] **Step 2 — Confirm failure.** Run `npx.cmd vitest run src/core`. Expected: domain tests fail because the adapter/parser is absent, not because the harness cannot start.
- [ ] **Step 3 — Implement the domain.** Load the `3x3x3` puzzle definition through `cubing/puzzles`, apply moves through `KPattern`, and centralize orbit/slot/sticker mapping in `observations.ts`. Preserve original input offsets during prime normalization. Reject slice, wide, grouping, comment, and rotation syntax in user scrambles; allow rotations only in internal teaching traces.
- [ ] **Step 4 — Verify.** Run `npx.cmd vitest run src/core` and `npm.cmd run typecheck`. Expected: all domain tests and type checking pass.
- [ ] **Step 5 — Commit.** Stage only this task's files and commit `feat: add the tested cube domain and notation parser`.

## Task 2: Shared Teaching Algorithms, Stage Checks, and Trace Building

**Files:** `src/methods/lbl/{catalog,stages,trace}.ts` and corresponding tests; `tests/fixtures/lbl-cases.ts`; `tests/helpers/trace.ts`.

**Interfaces:** Consumes `CubeEngine` and shared types. Produces `LBL_ALGORITHMS`, `LBL_STAGE_IDS`, `checkStage(engine: CubeEngine, state: CubeState, id: StageId): boolean`, `createTraceBuilder(engine: CubeEngine, initial: CubeState, limits: SolveLimits): TraceBuilder`, and `flattenTrace`. `TraceBuilder` owns the current immutable state and exposes `beginStage(id: StageId): void`, `append(action: ActionInput): CubeState`, `endStage(reasonIfSkipped?: string): void`, and `finish(): SolveTrace`. `ActionInput` carries rule/recognition/move/checkpoint metadata; the builder computes state snapshots and budget usage. The test helper `replayMatchesRecordedStates(engine: CubeEngine, trace: SolveTrace): boolean` independently replays all actions and compares their boundaries.

- [ ] **Step 1 — Write failing tests.** Cover every catalog entry in its intended frame, all stage checkpoints, and trace replay. Use hand-described legal piece states and independently checked expected effects, not only an algorithm followed by its own inverse. Assert:
  ```ts
  expect(LBL_STAGE_IDS).toHaveLength(7);
  expect(checkStage(engine, engine.solved(), "middle-layer")).toBe(true);
  expect(flattenTrace(trace).moves).toEqual(trace.stages.flatMap(s => s.actions.flatMap(a => a.moves)));
  expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
  ```
  Test that adjacent inverse moves across two teaching actions remain visible and that every algorithm action names a catalog entry with matching moves.
- [ ] **Step 2 — Confirm failure.** Run `npx.cmd vitest run src/methods/lbl/catalog.test.ts src/methods/lbl/stages.test.ts src/methods/lbl/trace.test.ts`. Expected: assertions fail on missing implementations.
- [ ] **Step 3 — Implement the shared rules and builder.** Stage checks include the relevant earlier solved structure. In the corner-orientation stage, do not apply earlier-layer invariants after each trigger; validate the documented intermediate target and final restoration separately. The builder records actual recognition data, immutable states, and budget usage.
- [ ] **Step 4 — Verify.** Repeat the targeted tests and `npm.cmd run typecheck`. Expected: all pass, including preservation/allowed-disturbance checks for catalog algorithms.
- [ ] **Step 5 — Commit.** Commit `feat: define the shared LBL teaching rules and trace format`.

## Task 3: White Cross and the First Two Layers

**Files:** `src/methods/lbl/{cross,first-layer,middle-layer}.ts`, corresponding tests, and additional legal fixtures.

**Interfaces:** Each module exports `solveWhiteCross(context: LBLContext): StageResult`, `solveFirstLayer(context: LBLContext): StageResult`, or `solveMiddleLayer(context: LBLContext): StageResult`. Define `LBLContext = {engine: CubeEngine, trace: TraceBuilder}` in `trace.ts`, with the current state exposed as a readonly builder property. `StageResult = {ok:true, state: CubeState} | SolveFailure`; functions never mutate a `CubeState`. The orchestrator opens/closes stages, while these functions append actions to the active stage.

- [ ] **Step 1 — Write failing tests.** Cover every target-edge location/orientation for the cross, all three first-layer corner orientations, trapped/misplaced corners, left/right middle insertions, and middle-edge extraction. Assert that each stage completes, prior required structure is restored at its checkpoints, and all recorded actions replay exactly. Include already-completed and partially completed stages.
- [ ] **Step 2 — Confirm failure.** Run `npx.cmd vitest run src/methods/lbl/cross.test.ts src/methods/lbl/first-layer.test.ts src/methods/lbl/middle-layer.test.ts`. Expected: missing-stage failures.
- [ ] **Step 3 — Implement deterministic case rules.** Use stable target ordering, explicit observations, and these bounded recipes:
  - Cross: place one white edge at a time. Bring it into the working layer, align its other color, insert it, and apply `cross-flip` when needed. For extraction through a face containing a solved cross edge, move the target away on the working layer and restore that face before insertion. Enumerate the finite extraction/alignment cases; do not search for an opaque whole-cube solution.
  - First layer: explicitly turn white down when this unfinished stage needs it. Put the target above its matching slot, regrip that slot to front-right, and repeat whole `right-trigger` actions until inserted. Extract incorrectly trapped corners first. A full trigger cycle without progress is a rule failure.
  - Middle layer: select a non-yellow upper edge, align its side sticker to its center, then use the matching fixed left/right insert. If the remaining target is trapped, explicitly eject it with a catalog insert and resume recognition.
  Every successful piece operation records a specific target, observed condition, setup explanation, and result check.
- [ ] **Step 4 — Verify.** Repeat targeted tests, then `npm.cmd run test:unit` and `npm.cmd run typecheck`. Expected: no invariant violations, loops, or unexplained non-catalog sequences.
- [ ] **Step 5 — Commit.** Commit `feat: generate explained cross and first-two-layer solutions`.

## Task 4: Last Layer and End-to-End Solver Correctness

**Files:** `src/methods/lbl/{last-layer,solve}.ts`, corresponding tests, `tests/solver-corpus.test.ts`, and corpus fixtures.

**Interfaces:** Consumes Tasks 1–3. Produces `solveLBL` and a complete `SolveTrace`. The corpus test uses a deterministic test-only scramble generator with seeds 1 through 1,000; generation does not depend on the solver.

- [ ] **Step 1 — Write failing tests.** Cover dot/L/line/cross orientation cases, adjacent/opposite aligned top edges, zero/one/all correctly positioned top corners, and two/three/four misoriented final corners. Test a solved input, forced small budgets, and a repeated-state failure. Assert:
  ```ts
  const solvedResult = solveLBL(engine, engine.solved());
  if (!solvedResult.ok) throw new Error(solvedResult.message);
  expect(flattenTrace(solvedResult.trace).moves).toHaveLength(0);
  const result = solveLBL(engine, initial);
  if (!result.ok) throw new Error(result.message);
  expect(result.trace.stages.map(s => s.id)).toEqual(LBL_STAGE_IDS);
  expect(engine.isSolved(engine.apply(initial, flattenTrace(result.trace).moves))).toBe(true);
  ```
  For each corpus case, also assert correct action states, valid recognition data, catalog membership, checkpoint results, and deterministic output on repeat.
- [ ] **Step 2 — Confirm failure.** Run `npx.cmd vitest run src/methods/lbl/last-layer.test.ts src/methods/lbl/solve.test.ts` and `npm.cmd run test:corpus`. Expected: missing last-layer/solver failures.
- [ ] **Step 3 — Implement the remaining rules and orchestrator.** Recognize and orient top-edge patterns with `top-cross`; align and cycle edges with `top-edge-cycle`; cycle corners with `top-corner-cycle`. Then explicitly turn yellow down, orient each front-right working corner with complete `right-trigger` repetitions, and advance only `D` between corners. Preserve the reference frame during this final operation and restore final alignment. Each unfinished stage establishes its required frame with recorded regrips, even if preceding stages were skipped. All seven stages are represented; a fully solved input returns no moves. Replay and validate the completed trace before returning success.
- [ ] **Step 4 — Verify.** Run `npm.cmd run test:unit`, `npm.cmd run test:corpus`, and `npm.cmd run typecheck`. Expected: all pass; the corpus reports exactly 1,000 successful cases with no failures. Save any failing seed as a regression fixture before fixing its rule. Do not weaken the corpus to hide uncovered cases.
- [ ] **Step 5 — Commit.** Commit `feat: complete and validate the LBL teaching solver`.

## Task 5: Synchronized 3D Playback

**Files:** `src/player/{timeline,controller,cubing-adapter}.ts`, `CubePlayer.tsx`, adjacent unit tests, and `e2e/player.spec.ts`.

**Interfaces:** Consumes `SolveSession`, `CubeEngine`, and `flattenTrace`. Produces `createPlaybackController(engine: CubeEngine, session: SolveSession): PlaybackController` with `play()`, `pause()`, `seekMove(index: number)`, `step(direction: -1 | 1)`, `replayAction(actionIndex: number)`, `seekStage(id: StageId)`, `setSpeed(speed: number)`, `subscribe(listener)`, and `dispose()`. `PlaybackSnapshot` contains completed-move index, current move/progress, active action/stage, exact boundary state, speed, and playing status. `CubePlayer` accepts a session and reports snapshots to the lesson layout. The adapter supplies renderer move timestamps; the controller remains responsible for the selected logical position.

- [ ] **Step 1 — Write failing controller tests and a real-renderer fixture.** Assert a mismatched scramble/trace is rejected, step-forward/step-back restores the original state, a stage jump reaches its recorded boundary, replay preserves the action's full sequence, seeking cancels old playback, and dispose prevents further updates. Add real browser tests for half turns, prime turns, regrips, and orbiting without logical-state changes. Include solved and all-skipped traces with an explicit completion display instead of a nonexistent current move.
- [ ] **Step 2 — Confirm failure.** Run `npx.cmd vitest run src/player` and the targeted Playwright player test. Expected: missing controller/adapter failures, with browser infrastructure working.
- [ ] **Step 3 — Implement playback.** Initialize TwistyPlayer's setup algorithm from `session.scrambleMoves` and its playback algorithm from the flat trace, disabling duplicate built-in controls. Isolate its indexer/timestamp integration in `cubing-adapter.ts`; derive move boundaries from the library indexer rather than assuming uniform durations. The controller owns playback time and uses generation tokens to reject obsolete frames. Provide speeds 0.25×, 0.5×, 1×, and 2×, default 1×, initially paused. Display setup/regrip/algorithm labels distinctly, with algorithm name, full sequence, repetition count, and current move together. Use cube stickering and piece labels for targets; camera orbit is display-only. Reduced motion uses discrete state changes with a readable playback cadence. A rendering error leaves the textual steps available with an explicit message.
- [ ] **Step 4 — Verify.** Run player unit tests and Chromium/WebKit player integration tests. Expected: the actual renderer matches engine checkpoints, not just mocked adapter state. Capture representative states and inspect orientation and highlighting visually.
- [ ] **Step 5 — Commit.** Commit `feat: add synchronized teaching playback controls`.

## Task 6: Courses and Free Solving in a Responsive App

**Files:** Course/content files, application files, worker/client, styles, component tests, `e2e/learning.spec.ts`, and `e2e/free-solve.spec.ts`.

**Interfaces:** `Lesson` contains ID, title, goal, original explanation, linked stage/algorithm IDs, and a checked example scramble. `LBL_COURSE` contains notation plus seven stage lessons. `createSolveClient()` exposes `solveScramble(text: string): Promise<SessionResult>` and `cancel(): void`. `SessionResult` is `{ok:true, session: SolveSession}` or `{ok:false, error}` with a discriminated parse, solver, worker, or cancellation error; parse errors retain original character offsets. Parse in the client, then send validated moves and a request ID to the worker. The worker creates the engine, derives the initial state, and calls `solveLBL`; stale results cannot replace the current session. Cancellation settles the old promise explicitly and terminates its worker so synchronous solving actually stops.

- [ ] **Step 1 — Write failing interaction tests.** Test selecting every lesson, a complete guided solve, valid/invalid/empty input, a generated scramble, error messaging, cancellation, and two overlapping solves returning out of order. Assert that the algorithm text comes from `LBL_ALGORITHMS`, that explanatory labels match the active trace action, and that the latest requested solve remains visible.
- [ ] **Step 2 — Confirm failure.** Run `npx.cmd vitest run src/app src/content` and the learning/free-solve browser tests. Expected: missing courses/application behavior.
- [ ] **Step 3 — Implement the application.** Use hash routes `#/learn/notation`, `#/learn/<stage-id>`, and `#/solve` for refresh-safe static hosting. Provide one complete curated example solve plus a verified example for each stage. Store scrambles and original text, generate traces through the same solver, and validate examples in tests. Use cubing.js scramble generation for the random-input button. Show the generated scramble so members can reproduce it on a physical cube. Keep all solving in a dedicated worker; changing input/session cancels previous work. Build the light three-area desktop layout and stacked mobile layout with semantic controls, visible focus, useful touch targets, and text-based piece cues. Do not add a method picker for unavailable methods.
- [ ] **Step 4 — Verify.** Run unit, corpus, and end-to-end tests. At 390px and 1440px widths, verify no horizontal overflow, reachable controls, readable explanations, keyboard operation, empty input handling, and that errors do not erase the last verified result silently. Test route refresh under `/cube-steps/`.
- [ ] **Step 5 — Commit.** Commit `feat: add LBL lessons and browser-based free solving`.

## Task 7: Reproducible Delivery and Release Acceptance

**Files:** CI and manual Pages workflows, Vite base configuration, `README.md`, `THIRD_PARTY_NOTICES.md`, and `docs/validation/v1.md`.

**Interfaces:** Provides a documented local development/build process and a production static artifact. No new product APIs.

- [ ] **Step 1 — Add release checks.** Test the production build at `/cube-steps/`, including worker loading, nested hash routes, lazy-loaded assets, and a complete solve. Run dependency-license inspection and list actual notices for bundled dependencies.
- [ ] **Step 2 — Establish baseline failures.** Run the production-path smoke test before configuring the repository base. Expected: it exposes any missing asset/worker/base-path configuration; do not invent a failing result if the scaffold already handles it correctly.
- [ ] **Step 3 — Complete packaging.** Configure Vite base `/cube-steps/`. Add CI for type checking, unit tests, the 1,000-case corpus, production build, and browser tests. Add a manually triggered Pages workflow; do not enable automatic publication before the first release is accepted. Update README with verified commands and distinguish a working local preview from a published release.
- [ ] **Step 4 — Run acceptance.** From a clean dependency install, run `npm.cmd ci`, `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run test:corpus`, `npm.cmd run build`, and `npm.cmd run test:e2e`. Inspect browser console errors and capture desktop/mobile screenshots. Record exact results, versions, corpus seeds, and any unverified environments. A club member must follow representative lessons with a physical cube before V1 is declared ready for publication; leave that check pending until actually performed.
- [ ] **Step 5 — Review and commit.** Review the complete diff against the spec and Review Focus list; correct material findings and rerun affected checks. Commit `chore: prepare CubeSteps V1 validation and static delivery`. Hand off the verified local preview and release evidence. Publish only within the owner's authorized release scope; do not claim a live site from a successful local build.

## Plan Review and Handoff

This plan covers the approved V1 product requirements, with later methods and input modes remaining roadmap items. The solver and trace tasks precede presentation work because correctness and teaching fidelity are the project's central requirements.

Recommended execution is native: one implementer carries the tightly coupled cube, trace, and player interfaces across tasks, followed by an independent final review. Subagent-driven execution remains an option if the owner prefers independent review after each task.

Before product implementation, the owner reviews this written plan and selects or confirms the execution method. The planning round does not install product dependencies, create a local Git checkout, or publish application code.

## Technical References

- [cubing.js KPattern API](https://js.cubing.net/cubing/api/classes/kpuzzle.KPattern.html)
- [cubing.js TwistyPlayer API](https://js.cubing.net/cubing/api/classes/twisty.TwistyPlayer.html)
- [cubing.js AlgIndexer API](https://js.cubing.net/cubing/api/interfaces/twisty.AlgIndexer.html)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html#github-pages)

The online API pages can describe development versions. Treat the installed `cubing@0.65.1` types and integration tests as the execution-time authority, and keep any compatibility adjustment within the adapter boundary.
