# Club Move Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach all 54 supported single-move variants through an accessible club-only workbench with trustworthy direction, playback and static fallbacks.

**Architecture:** A typed catalog and engine-derived demonstration feed a small independent playback controller. A cubing.js adapter renders that one move; camera state remains separate. A lazy club route composes the workbench without manufacturing solve traces or algorithm cases.

**Tech Stack:** Existing React/TypeScript/Vite, cubing.js 0.65.1, Vitest/Testing Library and Playwright; Node 24+, no new dependency.

**Spec:** [Approved design](../specs/2026-10-13-notation-and-ui-refresh-design.md), sections 4 and 6–9.

**Status and order:** Approved and implemented under Native execution; local validation and independent review are complete. See the notation/UI validation record for release and physical-acceptance status. Follow [Tasks 1–2](2026-10-13-club-hero-motion.md); this plan owns Tasks 3–6, followed by [Tasks 7–9](2026-10-13-global-ui-refresh.md).

## Global Constraints

- All product text remains English. The standalone explorer is club-only at `#/moves`; `#/learn/notation` remains the introduction.
- 18 basic demonstrations: U/D/L/R/F/B times plain/prime/2. Advanced: x/y/z, Uw/Dw/Lw/Rw/Fw/Bw and M/E/S times the same three variants, for 36 more.
- Initial selection U, no autoplay; every example starts solved, white up and green front. Internal prime is ASCII; display `′` with spoken labels.
- Retain genuine sticker colors. Wide moves include the adjacent slice; x/y/z act like R/U/F; M/E/S act like L/D/F and move centers.
- Teaching playback is independent of the decorative Off preference. System reduced motion uses Before/After endpoints without intermediate animation.
- No persistence, scoring, arbitrary sequence editor, solver invocation, lesson-completion writes or timer-history writes. Preserve the scramble parser's outer-face contract.
- Lazy-load the page and heavy dependencies; retain navigation and honest local failure/reload recovery.

## Review Focus

1. D/B prime is interpreted from the front instead of from outside its own face: fixtures and direction views must expose the correct reversal (Tasks 3 and 5).
2. Selection changes while a renderer loads or plays: old callbacks cannot restore an old move, highlight or explanation (Tasks 4–6).
3. Slice/wide/whole-cube moves change centers: endpoints and holding captions remain truthful, and the slice remains visible (Tasks 3 and 5).
4. Reduced motion, blur or tab hiding interrupts playback: stop safely, never resume automatically, and preserve the specified endpoint/position (Tasks 4 and 6).
5. A phone user, keyboard user or device without WebGL opens the route: controls remain usable, errors do not strand navigation, and static diagrams retain the full move meaning (Tasks 5–6).

## File map

All paths are repository-relative. New files below stay within `src/club/moves/` unless another directory is given.

| Files | Responsibility |
| --- | --- |
| `catalog.ts`, `demonstration.ts` and matching `.test.ts`; `fixtures/reference-facelets.ts` | Typed selection, original teaching copy and independent test expectations |
| `controller.ts`, `controller.test.ts` | Deterministic playback state and stale-event cancellation |
| `camera.ts`, `camera.test.ts`, `cubing-adapter.ts`, `cubing-adapter.test.ts` | Camera presets, reference sides and renderer lifecycle |
| `NotationPlayer.tsx`, `NotationPlayer.test.tsx`, `NotationNet.tsx`, `DirectionGuide.tsx` | Renderer/controller binding, genuine static endpoints and labeled direction diagrams |
| `MoveExplorerPage.tsx`, `MoveExplorerPage.test.tsx`, `MoveExplorerRoute.tsx`, `moves.css` | Responsive page and local lazy-load failure boundary |
| Existing `src/club/routes.ts`, `routes.test.ts`, `ClubApp.tsx`, `components/ClubHeader.tsx`, `HomePage.tsx`, `club.css`; `src/app/LearnPage.tsx` | Real club entries and introduction link |
| New `e2e/notation-renderer.spec.ts`, `notation-explorer.spec.ts`; existing `e2e/helpers/color-entry.ts` | Real sticker comparisons, controls and accessibility |

### Task 3: Canonical catalog and verified demonstration model

**Files:** Create catalog, demonstration, fixture and their test files from the map. Fixtures are test-only and must not enter the production dependency graph.

**Interfaces:** Define the selection types below. `NotationEntry = {base:NotationBase; family:'face'|'wide'|'rotation'|'slice'; name:string; referenceFace:Face; axis:'x'|'y'|'z'; layers:readonly (-1|0|1)[]; layerText:string}` uses positive axes R/U/F. Export `NOTATION_ENTRIES:readonly NotationEntry[]`, `notationToken(selection:NotationSelection):TeachingMove` and `describeNotation(selection:NotationSelection):{display:string; spoken:string; instruction:string}`. `buildNotationDemo(engine:CubeEngine, selection:NotationSelection):NotationDemo` returns `{selection:NotationSelection; entry:NotationEntry; move:TeachingMove; initial:CubeState; final:CubeState}`.

```ts
type NotationBase = Face | `${Face}w` | 'x' | 'y' | 'z' | 'M' | 'E' | 'S';
type NotationAmount = '' | "'" | '2';
type NotationSelection = { base: NotationBase; amount: NotationAmount };
```

- [ ] Write tests asserting exactly 18 bases/54 unique canonical tokens, 18 basic/36 advanced, Unicode display without internal Unicode, correct layer counts 1/2/3 and reference sides. Establish hand-checked full facelet snapshots for U, D, B, R, F, M, E, S, Rw, Uw, Fw, x, y, z and representative primes; annotate outside-view indexing and provenance. Assert `stateToFacelets(demo.final)` equals these independent fixtures, including center colors. Supplement with all-54 start/apply endpoints, inverse/four-quarter-turn identities and half-turn equivalence; assert the input solved state is not mutated. Do not generate fixture expectations using `CubeEngine.apply`.

  Pin `keeps canonical notation separate from display notation`:
  ```ts
  expect(NOTATION_ENTRIES).toHaveLength(18);
  expect(NOTATION_ENTRIES.filter(entry => entry.family === 'face')).toHaveLength(6);
  expect(notationToken({ base: 'D', amount: "'" })).toBe("D'");
  expect(describeNotation({ base: 'D', amount: "'" }).display).toBe('D′');
  ```

- [ ] Run `npx.cmd vitest run src/club/moves/catalog.test.ts src/club/moves/demonstration.test.ts`; establish red for missing exports/behavior.
- [ ] Implement the exact contracts. Build one canonical move from a validated catalog selection and the existing engine; use existing `stateToFacelets(state)` for snapshots. Write original short instructions distinguishing face directions, reference side, wide layers, slices and physical regrips; explain lowercase wide aliases without duplicate controls. Do not modify `parseScramble`, existing course meanings or solver policies.
- [ ] Run those tests plus `npx.cmd vitest run src/core/notation.test.ts src/core/facelets.test.ts` and typecheck; require 54 cases and all independent fixtures to pass.
- [ ] Stage this task's files; commit `feat: define verified single-move teaching demonstrations`.

### Task 4: Playback state, timing and cancellation

**Files:** Create `controller.ts` and `controller.test.ts`.

**Interfaces:** Consume `NotationDemo`. Define `NotationPhase = 'loading'|'ready'|'playing'|'paused'|'complete'|'error'`; `NotationSnapshot = {version:number; demo:NotationDemo; phase:NotationPhase; progress:number; speed:0.5|1; reducedMotion:boolean; error:string|null}` (progress 0–1). `AnimationClock = {now():number; request(callback:(time:number)=>void):number; cancel(id:number):void}`. Export `createNotationController(initial:NotationDemo, clock?:AnimationClock)` returning `snapshot():NotationSnapshot`, `select(demo:NotationDemo):number`, `ready(version:number,durationMs:number):void`, `fail(version:number,message:string):void`, `play/pause/replay/reset/dispose():void`, `setSpeed(speed:0.5|1):void`, `setReducedMotion(enabled:boolean):void`, `showEndpoint(endpoint:'before'|'after'):void`, and `subscribe(listener:(value:NotationSnapshot)=>void):()=>void`. Initial version is 1; select increments it; subscribe immediately emits current state.

- [ ] Write fake-clock tests: Play is ignored until matching readiness, defaults to Normal speed, runs once and holds at progress 1; pause and speed changes preserve progress. Select resets to loading/progress 0 and rejects stale ready/fail/frame callbacks. Replay resets then plays only when ready; repeated Replay cancels prior scheduled work; Reset retains token/speed. Assert reduced motion during a partial turn yields progress 0 and no queued frame, completed After can remain, and disabling reduction does not start. `showEndpoint` never implies successful playback after error. Dispose prevents future emissions; invalid/nonfinite duration produces a recoverable error instead of an endless animation.

  In `ignores readiness for the previous selection`, create the controller for U, then:
  ```ts
  const version = controller.select(buildNotationDemo(engine, { base: 'B', amount: "'" }));
  controller.ready(version - 1, 1000);
  controller.play();
  expect(controller.snapshot()).toMatchObject({ version, phase: 'loading', progress: 0 });
  expect(controller.snapshot().demo.move).toBe("B'");
  ```

- [ ] Run `npx.cmd vitest run src/club/moves/controller.test.ts`; confirm red for the new controller contract.
- [ ] Implement the state machine with injected/default RAF clock and a generation guard. Keep selection/demo/token atomic. Use the renderer's measured duration; no timeout that guesses renderer readiness. Expose static endpoints even after rendering failure, retaining the error; Reset cannot restore renderer readiness after failure, and Play stays disabled until a successful retry with a new selection version. Add this assertion to the failure test. The view owns DOM visibility/blur subscriptions and calls pause; the controller remains DOM-independent.
- [ ] Run the controller test and typecheck. Require zero pending frames after pause/reset/select/error/dispose, including an old callback invoked deliberately after cancellation.
- [ ] Stage both files; commit `feat: control notation playback with explicit readiness and cancellation`.

### Task 5: Real teaching renderer, camera and static fallback

**Files:** Create camera/adapter/player/net/guide files and tests from the map, plus `e2e/notation-renderer.spec.ts`. Add a DEV-only notation fixture branch to existing `src/player/PlayerFixture.tsx` only if needed for isolated browser tests; never ship a production testing route.

**Interfaces:** `NotationCameraMode = 'holding'|'direction'`; `NotationCameraPreset = {latitude:number; longitude:number; referenceFace:Face}` (camera degrees). `notationCamera(entry:NotationEntry, mode:NotationCameraMode):NotationCameraPreset`. `createNotationAdapter(host:HTMLElement, demo:NotationDemo, options:{signal:AbortSignal; camera:NotationCameraPreset; onError(message:string):void}):Promise<NotationRenderer>` returns `{durationMs:number; setProgress(progress:number):void; setCamera(preset:NotationCameraPreset):void; dispose():void}`. `NotationPlayer({engine,selection}: {engine:CubeEngine; selection:NotationSelection})` owns Task 4's controller and preserves speed/camera mode across selection. `NotationNet({facelets,label}: {facelets:FaceletSnapshot; label:string})` renders six labeled outside views without fixed-color holding claims. `DirectionGuide({selection}: {selection:NotationSelection})` is a fixed reference-side diagram, not a screen-relative arrow glued to the orbiting cube.

- [ ] Write adapter/lifecycle tests for rejected/late loads, abort before/after readiness, runtime rendering failure, idempotent dispose and no replaced newer host. A runtime error for the current version pauses into fallback; an old version's error cannot affect the replacement. Test D/B exterior presets, visible oblique slice/wide presets, and camera changes leaving progress/puzzle data untouched. With the real renderer, compare all 54 stickers for all 54 moves to independently expected engine endpoints using `renderedColors(page)` from `e2e/helpers/color-entry.ts`; additionally compare representative moves to Task 3 fixtures. Verify centers, selected move and moving-piece masks. Cover x/M/E after captions and explicit starting-grip wording. Test WebGL failure and reduced motion retain labeled Before/After diagrams and the current selection.

  In `camera observation does not change the demonstration`, pause at a nonzero progress, save the current renderer pattern, change the camera, and assert equal pattern/progress before and after. At every completed real-renderer example use `expect(await renderedColors(page)).toEqual(stateToFacelets(demo.final))`; use a 180,000 ms timeout for a 54-case browser test instead of fixed sleeps or skipping slow cases.

- [ ] Run `npx.cmd vitest run src/club/moves/camera.test.ts src/club/moves/cubing-adapter.test.ts src/club/moves/NotationPlayer.test.tsx`; establish red before binding the renderer.
- [ ] Implement a small notation-specific adapter using the installed TwistyPlayer, simple indexer, solved setup and exactly one native token. Follow existing `src/player/cubing-adapter.ts` readiness/disposal patterns without altering its solve/algorithm API. Highlight moving pieces, including centers, from catalog layer coordinates. Set timestamps from native duration; abort removes only that adapter's element. Use Holding three-quarter view; outer Direction views face the actual side (permit ±90° latitude for U/D); slice/wide/rotation Direction views stay oblique with a labeled reference diagram. Pause before camera mode changes or drag inspection; change camera without simultaneous turn animation. Preserve camera mode on new selection and provide reset-camera. Connect the system-only hook, blur/visibility pause and atomic selection. Derive endpoint captions from `engine.observe`; label intermediate captions as the last completed endpoint. Rendering errors retain text/static diagrams and an explicit retry.
- [ ] Run targeted tests and `npx.cmd playwright test e2e/notation-renderer.spec.ts` in both configured browsers. Inspect captured intermediate frames for U/U′, D/D′, B/B′, M/M′, E, S, Rw and x: signed motion agrees with the fixed diagram, stationary layers remain still, and slices remain visible. Endpoints alone do not establish direction. Require actual renderer comparisons, zero uncaught errors and cleanup after fixture exit; rerun the same route-based checks after Task 6 integration.
- [ ] Stage this task's files; commit `feat: render notation moves with clear viewpoints and static endpoints`.

### Task 6: Club route, responsive workbench and recovery

**Files:** Create page/route/CSS/test files and `e2e/notation-explorer.spec.ts`; modify all routing/entry files in the map and extend `src/app/LearnPage.test.tsx`. If Task 5 used a temporary development fixture, retain it only as an isolated test harness or replace its browser tests with the real club route.

**Interfaces:** Extend `ClubRoute` with `{kind:'moves'}` and `ClubHeader` active union with `'moves'`; `parseClubRoute('#/moves')` returns that branch, while global `parseRoute` stays unchanged. `MoveExplorerRoute({engine}:{engine:CubeEngine})` owns a small error boundary and lazy page import. `MoveExplorerPage({engine}:{engine:CubeEngine})` owns `{base:'U',amount:''}` initially and passes selection to Task 5's player. A base change preserves amount; selecting a variant changes only amount.

- [ ] Write tests for Home/Moves/Learn/Timer navigation, active semantics, homepage card, club-only lesson-intro link and `#/moves` direct refresh. Assert default U/ready/no autoplay, 6 visible basic bases, advanced disclosure containing 12 more, preserved amount/camera, and no cumulative moves. Test rapid selection while loading/playing, keyboard/Touch Play/Replay/Reset/speed and no global Space/letter interception. Seed lesson, timer and draft storage; compare before/after Move Explorer visits and interactions for no new writes. Test rejected lazy import keeps the shell/navigation and offers recovery; WebGL failure retains usable endpoints.

  Pin `keeps the explorer in the club entry`:
  ```ts
  expect(parseClubRoute('#/moves')).toEqual({ kind: 'moves' });
  expect(parseRoute('#/moves')).toEqual({ kind: 'not-found' });
  expect(parseClubRoute('#/learn/notation')).toEqual({ kind: 'learn', method: 'lbl', lessonId: 'notation' });
  ```

- [ ] Run the new page test and `npx.cmd vitest run src/club/routes.test.ts src/app/routes.test.ts src/app/LearnPage.test.tsx`; establish the new-route/link failures.
- [ ] Implement the lazy route/boundary and scoped responsive workbench. Add the working Moves home card, primary nav link and learning-tool link; add the introduction link only for the club presentation. Place face/token/variant controls beside the player on phones, group advanced families, provide selected states/spoken prime labels and polite selection/loading/completion announcements, never frame announcements. Show Play/Pause, Replay, Reset, Slow/Normal and camera controls; reduced mode uses Before/After. Provide reload instructions if a rejected module cannot be retried locally. No page-level import of solver/algorithm registry or timer. Preserve existing resume/quiz/course behavior.
- [ ] Run targeted tests, typecheck/build and `npx.cmd playwright test e2e/notation-renderer.spec.ts e2e/notation-explorer.spec.ts e2e/club-learning.spec.ts e2e/club-entry.spec.ts`. Inspect all five widths, 44 px primary controls, readable contrast/focus, no horizontal overflow, nearby suffix/Play controls, advanced disclosure, reduced-motion changes during playback and route exit. Confirm decoration Off still permits deliberate teaching animation when system reduction is off. Save screenshots and test evidence for Task 9.
- [ ] Stage this task's files; commit `feat: add the club move explorer and navigation`.

## Handoff

Proceed to the global UI plan without changing teaching methods or Timer features. All-54 renderer results and representative intermediate-frame inspection are mandatory evidence; any physically untested teaching behavior remains pending owner acceptance rather than being declared accepted.
