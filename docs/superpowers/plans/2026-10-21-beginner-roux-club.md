# Beginner Roux Club Teaching and Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the verified Roux solver through an understandable eight-chapter club course, existing input/player controls and a reviewed preview release.

**Architecture:** Add explicit edition availability, lazily register the Roux runtime at the club entry and load solver assets only for Roux requests. Extend shared lesson/player components narrowly for the fixed block frame and temporary-state guidance. Preserve local progress and the existing Guide/video release.

**Tech Stack:** Existing React, TypeScript, Vite, cubing.js, Vitest, Testing Library and Playwright on Chromium/WebKit; Node >=24 and GitHub Pages.

**Spec:** [Approved Beginner Roux design](../specs/2026-10-21-beginner-roux-design.md). Depends on [Tasks 1–5](2026-10-21-beginner-roux-blocks.md) and [Tasks 6–10](2026-10-21-beginner-roux-solver.md).

## Global Constraints

- Club-only product entry, still public and account-free; all teaching and interface copy is English.
- Full lessons and explained solving ship together, supporting random scrambles, pasted outer-face scrambles and six-face color input.
- Preserve LBL/CFOP, CFOP Lab, Moves, Timer, Guide, existing URLs and local records. The quiz continues to recommend LBL to first-time solvers; Roux is manually selectable.
- Teach the fixed white-bottom/blue-left frame and M/M'/M2; separate physical regrips, wide/slice moves and camera orbit.
- The solver ceilings remain **1,000,000 expanded nodes, 15 seconds of worker work, 160 trace actions and 400 teaching-move tokens**. Existing client startup timeout is separate from worker-work time.
- Label the new method **Preview** until physical acceptance. No full CMLL, new timed drills or automatic revision of the Guide film.
- Preserve **Native** execution and an independent final review. Required CI and Pages checks must not be bypassed to shorten publication.

## Review Focus

- A global direct link or a forged method request must not open a supported global Roux flow: Task 11 tests both, without claiming access security.
- Cancelling one input and immediately solving another must never show the old result: Task 11 tests worker termination and stale responses.
- Generic non-LBL lesson/player branches currently assume CFOP: Tasks 12–13 test that Roux uses its own content and runtime.
- Seeking into a formula or an odd M phase must explain temporary disturbance rather than report a failed solve: Task 13 tests exact boundaries.
- Existing progress or an unknown future record must not be reset while adding Roux: Task 14 tests compatible loading and non-overwriting recovery.

---

## File map

| Files | Responsibility |
| --- | --- |
| `src/methods/availability.ts`, existing info/registry/routes | Explicit global/club availability and lazy method registration. |
| `src/club/roux/RouxFeaturePage.tsx`, worker/client integration | Roux route boundary and validated, cancellable solve dispatch. |
| `src/content/roux-course.ts`, `src/content/roux/*`, `src/club/roux/*` | Lessons, original examples/diagrams and foundation/reference panels. |
| `src/player/roux-guidance.ts`, `RouxHoldingGuide.tsx`, existing timeline/view | Accurate fixed-frame and temporary-state presentation. |
| Existing club progress/Guide files, new Guide PNGs | Manual route choice, persistent learning, illustrated help. |
| `e2e/roux-*.spec.ts`, workflow/package scripts, validation record | Browser/production evidence, required CI and delivery. |

### Task 11: Edition-aware routes, lazy loading and solve requests

**Files:** Create `src/methods/availability.ts`, `src/methods/availability.test.ts`, `src/club/roux/RouxFeaturePage.tsx`, `src/club/roux/entry.test.tsx`, `src/app/MethodSelector.test.tsx`. Modify `src/methods/{info,registry}.ts`, `src/app/{routes,solve-client}.ts`, `src/app/{SolvePage,LearnPage}.tsx`, their existing `.test.ts`/`.test.tsx` files, `src/app/MethodSelector.tsx`, `src/club/routes.ts`, `src/club/routes.test.ts`, `src/club/ClubApp.tsx`, `src/workers/{solve-protocol,solve-request}.ts` and `src/workers/solve-request.test.ts`. Extend `tests/roux-color-input.test.ts`.

**Interfaces:**

- `availableMethods(edition:'global'|'club'): readonly MethodId[]`; `methodAvailable(method,edition):boolean`. Global returns the original three; club adds `roux-beginner`.
- Add lightweight `ROUX_INFO` with the eight stages and Preview label. `registerMethodRuntime(runtime:MethodRuntime):void` and `getRegisteredRuntime(id:MethodId):MethodRuntime|undefined` in `methods/registry.ts`; duplicate registration with the same runtime is safe, conflicting registration fails. `getMethod` returns its registered presentation for Roux and retains existing method behavior.
- `parseRoute(hash:string, edition:'global'|'club'='global'):AppRoute`; `parseClubRoute` delegates with `'club'`. `#/learn/roux` and `#/learn/roux/intro` resolve to the first chapter; the other seven lesson ids match the relevant stage ids. `#/solve/roux` selects the complete solver. Invalid tails remain not-found.
- `SolveRequest.edition?: 'global'|'club'` defaults to global for compatibility. `createSolveClient(factory?, edition:'global'|'club'='global')` preserves its methods; Learn/Solve pages pass `useEdition()`.
- `handleSolveMessage` retains its existing advanced-loader third parameter and gains a fourth injectable `loadRoux:()=>Promise<{solve:typeof solveRoux; assets:RouxAssets}>`. Default dynamically imports the solver/assets only after validated Roux input. Do not import a React module into worker code.

- [ ] **Step 1 — Write route, loading and worker tests.** Assert:

  ```ts
  expect(parseRoute('#/solve/roux')).toEqual({kind:'not-found'});
  expect(parseClubRoute('#/solve/roux')).toEqual({kind:'solve',method:'roux-beginner'});
  expect(methodAvailable('roux-beginner','global')).toBe(false);
  expect(getMethodInfo('roux-beginner').teachingStatus).toBe('preview');
  ```

  Reject missing/global edition Roux requests and illegal facelets before loading assets. Confirm legacy requests still work without an edition field. Test that LBL/CFOP requests never call the Roux loader, loader failures preserve the input, and a cancelled request cannot settle the replacement request. Run fixed color snapshots through the actual asynchronous worker handler and compare their complete traces.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/methods/availability.test.ts src/app/routes.test.ts src/club/routes.test.ts src/workers/solve-request.test.ts src/app/solve-client.test.ts src/club/roux/entry.test.tsx`.
- [ ] **Step 3 — Implement availability and lazy registration.** MethodSelector uses lightweight info plus `useEdition()`. A lazy `RouxFeaturePage` registers `ROUX_RUNTIME` before rendering the existing club lesson/shared solve page; a missing registration fails explicitly, never falls through to Advanced CFOP. Route metadata remains lightweight. Keep the Roux solver, maneuver catalog and policy bytes out of global home/CFOP/Timer initialization.
- [ ] **Step 4 — Implement dispatch/client integration.** Separate the prepared-input and result-envelope logic as needed inside `solve-request.ts` to avoid validating/solving twice. Preserve existing synchronous handler behavior for legacy tests; the Roux path uses `handleSolveMessage` and its injected loader. Validate edition as product routing, not authentication. Keep the existing 30-second client timeout for startup/load plus solve, and terminate workers on cancel/unmount/new input.
- [ ] **Step 5 — Run green.** Repeat focused tests, `tests/roux-color-input.test.ts` and typecheck. Verify exact method/input identity on replies. Full lesson rendering is admitted in Task 12; do not publish an intermediate route with missing course content.
- [ ] **Step 6 — Commit.** Stage listed files; `git commit -m "feat: expose Roux through club-only routes and workers"`.

### Task 12: Eight detailed lessons and original worked examples

**Files:** Create `src/content/roux-course.ts`, `src/content/roux-course.test.ts`, `src/content/roux/{examples,diagrams,reference}.ts`, their `.test.ts` files, `src/content/roux/example-fixtures.json`, `src/club/roux/{RouxFoundation,RouxLessonDetails,RouxCaseDiagram,RouxReference}.tsx`, `src/club/roux/RouxLessonDetails.test.tsx`, `src/club/roux/roux.css`, and `scripts/roux/build-course-examples.mts`. Modify `src/content/{course-types,courses}.ts`, `src/app/LearnPage.tsx`, `src/app/LearnPage.test.tsx`, `src/club/moves/demonstration.ts`, `src/club/moves/demonstration.test.ts`, `src/club/moves/NotationPlayer.tsx` and `src/club/moves/NotationPlayer.test.tsx`.

**Interfaces:**

- Export `ROUX_COURSE: readonly Lesson[]`: `intro` has `stageId:'roux-frame'`; the remaining seven chapter ids/stage ids follow spec section 8. All eight are real chapters, with the initial regrip and separate M demos in the first.
- `RouxLessonDetail` contains `lessonId`, `overview`, ordered original `workedExamples`, `mistakes:{symptom,explanation,recovery}[]`, `physicalChecks:string[]` and reference ids. Export `ROUX_LESSON_DETAILS: Readonly<Record<string,RouxLessonDetail>>`, keyed by the existing lesson id; keep complex Roux content outside the shared scalar lesson type.
- `RouxWorkedExample = { id:string; lessonId:string; input:SolveInput; expectedRuleIds:readonly string[]; expectedStage:RouxStageId; caption:string }`. Export `ROUX_WORKED_EXAMPLES` from `examples.ts`, combining authored captions/claims with generated inputs in `example-fixtures.json`. Add optional `input?:SolveInput` to `CaseExample` and dispatch it through the appropriate existing client method; legacy `scramble` examples still work. Inputs must start in the canonical input hold with valid fixed centers; do not submit an intermediate odd-M state as a six-face input or pass M/wide/rotation strings to the outer-face scramble parser.
- `RouxDiagramModel = { facelets:FaceletSnapshot; visible:readonly FaceletRef[]; targets:readonly string[]; caption:string }`; `buildRouxDiagram(engine,state,targets,mode:'block'|'corners'|'lse'):RouxDiagramModel`.
- Extend `buildNotationDemo(engine,selection, initial?:CubeState)` and `NotationPlayer` with optional `initialState` and `holdingLabel`; the existing Moves page keeps its default white-up input hold. Foundation demos receive `rouxReferenceState(engine)`.

- [ ] **Step 1 — Write content and replay tests.** Pin all eight chapters, nine exact corner formulas, seven original corner diagrams with irrelevant edges masked, front/back block examples, and M/M'/M2 foundation demos. Replay every worked example through the complete solver; require its claimed case/rule to actually occur in the chosen stage. Assert:

  ```ts
  expect(ROUX_COURSE).toHaveLength(8);
  expect(ROUX_COURSE[0]).toMatchObject({id:'intro',stageId:'roux-frame'});
  expect(buildNotationDemo(engine,{base:'M',amount:"'"},rouxReferenceState(engine)).initial)
    .toEqual(rouxReferenceState(engine));
  ```

  Keep `NotationSelection.amount` as `'' | "'" | '2'`. Test switching the same move between starting frames so stale animation state cannot survive.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/content/roux-course.test.ts src/content/roux src/club/roux/RouxLessonDetails.test.tsx src/club/moves/demonstration.test.ts src/club/moves/NotationPlayer.test.tsx`.
- [ ] **Step 3 — Implement original teaching content.** Cover every required example/check in spec section 4. Display Look/Prepare/Do/Check, target diagrams, protected pieces, temporary disturbance and mistake recovery. Explain blocks/pairs, orientation versus permutation, headlights, CMLL's corner task and LSE before introducing their formulas. Create case visuals from verified states, not copied source images. Add the nine-formula and recurring-maneuver reference using the same catalog definitions as solving.
- [ ] **Step 4 — Integrate lessons and notation demos.** Add an explicit Roux branch in LearnPage instead of entering its CFOP-specific intro/algorithm assumptions. Reuse the shared lesson/player shell and CaseSelector where suitable; support the typed worked-example input without loosening scramble grammar. Roux chapter labels count 1–8; legacy numbering remains unchanged. The foundation explicitly demonstrates M, M', M2 and their inverses from the fixed hold; paused replay and direction labels remain accessible.
- [ ] **Step 5 — Verify content.** Run the focused tests, all lesson tests and typecheck. `node scripts/roux/build-course-examples.mts --verify` must reproduce fixture identities/case matches. Read every English chapter for a true novice, removing unexplained jargon and cross-first CFOP assumptions.
- [ ] **Step 6 — Commit.** Stage the listed source/content/tests/generator; `git commit -m "feat: teach Roux with detailed shared-rule lessons"`.

### Task 13: Faithful Roux player checkpoints and holding guidance

**Files:** Create `src/player/roux-guidance.ts`, `src/player/roux-guidance.test.ts`, `src/player/RouxHoldingGuide.tsx`, `src/player/RouxHoldingGuide.test.tsx`, `src/player/roux-player.test.tsx`. Modify `src/player/playback-timeline.ts`, `src/player/PlaybackView.tsx`, `src/player/RegripGuide.tsx`, `src/player/RegripGuide.test.tsx`, `src/player/cfop-player.test.tsx`, `src/player/algorithm-player.test.tsx`, and `src/club/roux/roux.css`.

**Interfaces:** `describeRouxPlayback(engine:CubeEngine, boundaryState:CubeState, action:TraceAction|undefined, completedMoves:number): { frameLabel:string; centerLabel:string; reference:'ready'|'setup-required'; note?:string; protectedIds:readonly string[] }`; `completedMoves` is the count of completed tokens within the active action. `RouxHoldingGuide` consumes that model and `moving:boolean`.

- [ ] **Step 1 — Write timeline and component tests.** Assert that Roux playback verifies with its registered runtime, rather than the existing Advanced fallback. At a quarter-M boundary display the fixed blue-left/green-right frame plus the actual centers and **"Middle-slice setup in progress"**. Inside a corner formula show its temporary-restoration note, not a failed stage. Test exact start/end, reverse step, replay, stage jump and reduced-motion boundaries:

  ```ts
  expect(describeRouxPlayback(engine,oddMState,action,1).reference).toBe('setup-required');
  expect(screen.getByText(/blue left.*green right/i)).toBeVisible();
  expect(screen.queryByText(/invalid cube/i)).not.toBeInTheDocument();
  ```

- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/player/roux-guidance.test.ts src/player/RouxHoldingGuide.test.tsx src/player/roux-player.test.tsx`.
- [ ] **Step 3 — Implement runtime selection and guidance.** Add an explicit Roux runtime branch to `playback-timeline.ts`, retaining Advanced asset validation. Use actual completed-move state, metadata and declared boundaries for center/protection explanations. Camera orbit never changes these facts. Distinguish actual x/y/z regrips from wide or M turns; do not tell users a wide move is a whole-cube rotation. The post-input `x2 y` action remains visible and replayable.
- [ ] **Step 4 — Verify green and regression.** Run the focused command plus existing `src/player` tests. Confirm highlights, formula token, explanation and checkpoints refer to the same action/index. Test desktop and phone styling later in Task 15; do not claim visual acceptance from DOM assertions.
- [ ] **Step 5 — Commit.** Stage only listed player/style files; `git commit -m "feat: explain Roux slice states during playback"`.

### Task 14: Manual route choice, preserved progress and illustrated Guide

**Files:** Modify `src/club/learning/types.ts`, `src/club/learning/progress-store.ts`, `src/club/learning/progress-store.test.ts`, `src/club/learning/RouteQuiz.tsx`, `src/club/learning/RouteQuiz.test.tsx`, `src/club/learning/recommend.test.ts`, `src/club/guide/types.ts`, `src/club/guide/chapters.ts`, `src/club/guide/chapters.test.ts`, `src/club/guide/screenshots.json`, `src/club/guide/GuidePage.test.tsx`, `src/club/ClubApp.tsx`, `scripts/tutorial/capture-guide.mts`; create `public/club-guide/roux-learning.png`, `public/club-guide/roux-slice-checkpoint.png`, `public/club-guide/roux-learning-phone.png`. Update `README.md` with method scope, preview status and teaching references.

**Interfaces:** Add Roux to the existing `CLUB_METHODS`, preserving progress key `cubesteps.club.progress.v1` and record version 1. Extend `GuideSectionId` with `roux`; the section lives at `#/guide/roux`. Keep `recommend(answers)` behavior unchanged.

- [ ] **Step 1 — Write migration/route/help tests.** Load a populated pre-Roux record, visit/practice Roux, save/reload, and assert previous method entries remain identical. A missing Roux list reads as empty; unknown-version/malformed data stays non-writable until the existing explicit reset. Assert all valid quiz answers yield the same existing recommendation as before, while manual choice includes Beginner Roux. Verify Guide links resolve to the correct club course and solver.
- [ ] **Step 2 — Run red.** `npx.cmd vitest run src/club/learning/progress-store.test.ts src/club/learning/RouteQuiz.test.tsx src/club/learning/recommend.test.ts src/club/guide/chapters.test.ts src/club/guide/GuidePage.test.tsx src/club/routes.test.ts`.
- [ ] **Step 3 — Implement compatibility and Guide copy.** Add the option without resetting records or expanding quiz promises. Explain fixed side centers, current middle centers, M direction, corner-only recognition, when to pause/replay and how to select inputs. Name the existing algorithm/practice pages explicitly as CFOP resources where links appear in a Roux context; do not imply a new Roux drill system exists. Keep the Guide video release and credit text intact.
- [ ] **Step 4 — Capture and inspect real screenshots.** Add deterministic Roux scenarios to the existing Guide capture script, with specific selectors for the new ids so existing screenshots are not regenerated unnecessarily. Run that capture, inspect all three PNGs at their actual sizes, and populate captions/alt text/dimensions/source revision through the existing manifest contract. Use sample-data captions where applicable. Do not export mocked cubes as product evidence.
- [ ] **Step 5 — Run green.** Run the focused tests, `npm.cmd run verify:guide`, `npx.cmd vitest run tests/tutorial/capture-contract.test.ts`, and typecheck. Confirm the main Guide video still points to the accepted no-narration release after incorporating the completed video PR.
- [ ] **Step 6 — Commit.** Stage only modified sources and new Guide assets; `git commit -m "feat: add Roux progress and club Guide help"`.

### Task 15: Browser acceptance, independent review and publication

**Files:** Create `e2e/roux-learning.spec.ts`, `roux-player.spec.ts`, `roux-input.spec.ts`, `roux-production.spec.ts`. Update `package.json`, `.github/workflows/{ci,pages}.yml`, and `docs/validation/2026-10-21-beginner-roux.md`.

**Interfaces:** Reuse existing browser helpers, ports and production configuration. Add no new public API. Both required workflows run `verify:roux`, `test:roux:coverage`, `test:roux:corpus` and course-example verification; existing checks stay required. The new source tests already run under `test:unit`; production tests are discovered through the existing suffix convention.

- [ ] **Step 1 — Write browser tests.** Cover club method switching, all three inputs, invalid input, working/cancel/retry states, rapid request replacement, intro M demos, an example per chapter, temporary center states, keyboard controls and screenshot layout at 390px and desktop widths. Assert no Roux catalog/asset request on the global home, global CFOP or club Timer. Assert global Roux deep links fail gracefully. Include live generated color-input solving, not only fixture playback.
- [ ] **Step 2 — Run the focused browser checks.** Use the isolated worktree server on an unused explicit `CUBESTEPS_TEST_PORT`, confirming its source checkout first. Run `npx.cmd playwright test e2e/roux-learning.spec.ts e2e/roux-player.spec.ts e2e/roux-input.spec.ts` on both configured browsers. Fix actual failures with targeted regressions; no fabricated red test is needed where prior tasks already meet the behavior.
- [ ] **Step 3 — Run release validation once changes settle.** Run `typecheck`, `verify:cross`, `verify:cases`, `verify:roux`, course-example verification, `test:unit`, all existing corpus/efficiency checks, the new Roux coverage/corpus commands, `verify:guide`, `build`, `test:e2e` and `test:production`. Include the existing advanced-cross-table and lab-physical-fixtures checks used by CI. Save the command results, counts, timing and browser-error checks. Inspect desktop/mobile images; label unperformed real-phone and physical-cube checks as pending.
- [ ] **Step 4 — Prepare the physical acceptance sheet.** In the validation document list the spec's real-cube scenarios: hold/regrip, M/M' front/rear block examples, seven OCLL cases, T/Y/skips without a yellow cross, reference setup, 0/2/4/6 EO cases, left/right targets, final center/U alignment and one filled-color full solve. Preserve **Preview** while awaiting the owner's response. Do not manufacture acceptance or change existing methods' labels.
- [ ] **Step 5 — Commit and obtain independent review.** Commit the verified implementation and validation record. Use `superpowers:requesting-code-review` for one fresh whole-branch review, preserving the selected Native workflow. Supply spec, all plans, base/head and test evidence. Fix actionable findings and rerun affected checks. If a review requires a material spec change, explain it rather than silently broadening scope.
- [ ] **Step 6 — Submit and merge using the standing authorized workflow.** Verify the current remote base and reviewed head, push the feature branch, create a PR with the final behavior and evidence, and attach its URL to this chat. Wait for required CI; merge only the reviewed head. Keep the new method's physical acceptance status truthful. Existing standing merge/deploy authorization avoids a redundant permission request.
- [ ] **Step 7 — Deploy and verify the public preview.** Dispatch the existing Pages workflow with preview allowed and physical acceptance false unless the owner has actually accepted it. Wait for successful validation/deployment. Check `build-info.json` against the deployed commit and run the Roux production tests against the live URL. Verify Guide, the accepted no-narration video, club Roux routes, global exclusion, desktop/mobile screenshots and clean browser console. Report the actual lesson/solver links, PR and remaining physical checks.
- [ ] **Step 8 — Synchronize and clean safely.** Fast-forward the primary local `main` only if clean, and verify `HEAD == origin/main`. Remove only this merged, clean worktree and its merged feature branch after preserving useful validation artifacts; resolve the target path inside the project before deletion. Do not delete unrelated branches, the unmerged work of another task or the video publisher's files. Record the final clean state.

## Self-review map and handoff

| Approved requirement | Owning task |
| --- | --- |
| Fixed frame, explicit input regrip, M/M'/M2 effects | 1, 9, 12–13 |
| Complete explained blocks with real slice use | 2–4 |
| Seven OCLL + T/Y and no yellow cross | 5, 12 |
| EO reference, relative corners, all last six edges | 6–8, 13 |
| Limits, failure, complete trace and legal input | 2, 9–11 |
| Exhaustive subproblem checks and 1,000 scrambles | 2, 5–6, 8, 10 |
| Detailed lessons, diagrams, reference and mistakes | 12 |
| Club-only availability, quiz preservation, progress | 11, 14 |
| Guide, mobile/keyboard/production, physical gate | 13–15 |
| Independent review, GitHub/Pages/local sync | 15 |

After saving and self-reviewing these three plans, ask the owner to confirm that they capture the intended implementation. Preserve the already selected **Native** execution method. Approval of the written design alone does not start product implementation.
