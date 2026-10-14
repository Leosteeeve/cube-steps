# Club Segmented Tours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give club members optional, accessible page tours with a few real actions and no accidental changes to their saved work.

**Architecture:** A typed local catalog, persisted preferences, and a pure run controller feed a club-only provider and overlay. Shared pages expose a small neutral guidance bridge; they never import club content. Timer activation is coordinated at both global-keyboard and surface-input boundaries.

**Tech Stack:** Existing React 19.3, TypeScript 7, Vite 8, Vitest 5, Testing Library and Playwright 1.64; Node 24+. Native DOM geometry and observers; no new website dependency.

**Spec:** [Approved club tutorial design](../specs/2026-10-13-club-tutorial-design.md), sections 1–6 and 9–11.

**Status and order:** Awaiting plan review. Preserve the owner's Native execution preference. This plan owns Tasks 1–5; follow with [Guide Tasks 6–7](2026-10-13-club-tutorial-guide.md), then [media Tasks 8–10](2026-10-13-club-tutorial-video.md). Full-film Task 10 waits for narrated-sample acceptance.

## Global Constraints

- Use the existing Webb Cubing Club blue-and-white identity and English product language.
- The global site receives no new tutorial invitations, navigation items, storage, or branding.
- Store only tutorial preferences and progress in a separate, versioned club local-storage key.
- A completed walkthrough is not evidence of cube mastery.
- Skip step always permits continuing. Never automatically advance a completed action step.
- Guide and not-found pages never open the welcome dialog automatically.
- Never overwrite color-entry drafts, change formula practice scope, or check “Mark as practiced.”
- Do not change solving rules, algorithms, timing calculations, or data-storage formats to implement onboarding.
- Use stable target/action IDs; do not select targets by displayed English labels.
- Execute in an isolated worktree based on the approved planning branch so all three plans and the spec are present. Reuse a suitable existing attachment before creating one.

## Review Focus

1. A delayed renderer, removed target, or route change must not complete an obsolete step or leave an overlay behind (Tasks 1–3).
2. Storage denied, corrupt, or written by a newer version must not cause repeated modal interruptions or erase another feature's data (Tasks 1–2).
3. Keyboard focus, phone rotation, 200% zoom, and reduced motion must leave both the current target and Exit reachable (Tasks 2–3).
4. Space held while closing help, touch cancellation, or a save pending in Timer must not arm, record, penalize, or lose a solve (Task 5).
5. Existing drafts, completed lessons, replay position, method changes, and empty practice/history states must remain meaningful through a tour (Tasks 3–5).

## File map and contracts

| Files | Responsibility |
| --- | --- |
| New `src/club/tutorial/types.ts`, `catalog.ts`, `storage.ts`, `controller.ts` and corresponding tests | Definitions, page variants, safe persistence, run transitions |
| New `src/ui/guidance.tsx` and `guidance.test.tsx` | Neutral optional targets, semantic actions, transient-state leases |
| New `src/club/tutorial/TutorialProvider.tsx`, `TourOverlay.tsx`, `TourEntry.tsx`, `position.ts`, `focus.ts`, `tutorial.css` and corresponding tests | Club orchestration, invitations, bubble placement and accessible interaction |
| Existing `src/club/ClubApp.tsx`, `HomePage.tsx`, `learning/RouteQuiz.tsx`, `main.tsx` | Club boundary and initial tours |
| Existing move, shared learning/player, solve, algorithm and practice pages | Stable target registration; no business-logic redesign |
| New `src/club/timer/tutorial-input.ts` and tests; existing `use-timer.ts`, `TimerPage.tsx`, `TimerSurface.tsx` | Idle eligibility and shared keyboard/pointer input lock |
| New `e2e/club-tutorial.spec.ts`, `tutorial-interactions.spec.ts`, `timer-tutorial.spec.ts`, `e2e/helpers/tutorial.ts` | Real-page flow, preservation and timer regression evidence |

### Task 1: Definitions, preferences, and deterministic tour state

**Files:** Create `src/club/tutorial/{types,catalog,storage,controller}.ts` and matching `.test.ts` files.

**Interfaces:**

- `TourId = 'home'|'quiz'|'moves'|'lesson-intro'|'lesson-player'|'solve'|'algorithms'|'algorithm'|'practice'|'timer'`.
- `GuidanceAction = {name:string; value?:string}` is initially declared in `types.ts` and moved without alteration to the neutral bridge in Task 2; club types import it thereafter.
- `TourStep = {id:string; targetId:string; title:string; body:string; guideSection:string; action?:GuidanceAction}`; `TourDefinition = {id:TourId; contentVersion:number; steps:readonly TourStep[]}`. Export `TOURS:Readonly<Record<TourId,TourDefinition>>` and `tourForRoute(route:ClubRoute, playableLesson:boolean):TourId|null`.
- `TutorialPreferences = {version:1; welcome:'new'|'later'|'started'|'never'; dismissed:Partial<Record<TourId,number>>; tours:Partial<Record<TourId,{contentVersion:number; nextStepId?:string; completed:boolean}>>}`.
- `createTutorialStore(getStorage:()=>Storage)` returns `load():{value:TutorialPreferences; available:boolean; writable:boolean}`, `save(value:TutorialPreferences):boolean`, and `reset():boolean`. Key: `cubesteps.club.tutorial.v1`. Invalid/unknown data is preserved until explicit tutorial-only reset; writes fail closed and state continues in memory.
- `TourRun = {tourId:TourId; stepId:string; token:number; status:'waiting'|'ready'|'done'|'unavailable'}`; `TourSnapshot = {run:TourRun|null; preferences:TutorialPreferences}`. `createTourController(catalog:typeof TOURS, initial:TutorialPreferences)` returns `snapshot():TourSnapshot`, `start(id:TourId, mode:'start'|'resume'|'restart'):void`, `target(token:number, status:'waiting'|'ready'|'unavailable'):void`, `action(token:number, value:GuidanceAction):void`, `setWelcome(value:TutorialPreferences['welcome']):void`, `dismiss(id:TourId):void`, `resetPreferences(value:TutorialPreferences):void`, `next/back/skip/exit():void`, `subscribe(listener:(snapshot:TourSnapshot)=>void):()=>void`, and `dispose():void`. Each start/step transition invalidates the previous token. Ignore action events while the target is not ready; Next cannot bypass an unfinished action, but Skip can. The provider persists controller preferences and never keeps a competing copy.

- [ ] Write tests named `preserves future and corrupt saved values`, `resumes only an existing step in the current content version`, `completed replay stays completed`, and `rejects stale and mismatched actions`. Assert reset touches only the tutorial key; missing/old steps restart safely without showing an automatic modal again; matching action changes status to done but keeps the same step. Pin exact behavior:
  ```ts
  controller.start('moves', 'start');
  const original = controller.snapshot().run!;
  controller.skip();
  const current = controller.snapshot().run!;
  controller.action(original.token, { name: 'notation-select', value: "U'" });
  expect(controller.snapshot().run).toEqual(current);
  expect(current.token).not.toBe(original.token);
  ```
- [ ] Run `npx.cmd vitest run src/club/tutorial`; establish red for missing definitions/behavior.
- [ ] Implement the listed contracts, 3–6 steps per tour, and original English text. Home covers starting/resuming, Moves, lessons, Timer and help. Split intro/player lesson variants. Read-only tours cover live controls only; unavailable nested modes point to the Guide rather than switching input mode. Use `notation-base` with `U`, `notation-select` with canonical `U'`, `notation-play` with canonical `U'`, and `player-next` as the only required hands-on action events. The Moves tour has separate face and amount steps, so a member who arrives on R2 can reach U prime through the highlighted controls. Completing or dismissing an invitation records its content version separately from run completion.
- [ ] Re-run the focused tests and `npm.cmd run typecheck`; require all cases passing with no unrelated storage writes.
- [ ] Commit the task's files as `feat: define club tutorial state and content`.

### Task 2: Accessible overlay, neutral bridge, and welcome/page entries

**Files:** Create all neutral bridge and presentation files in the map; create `TutorialProvider.test.tsx`, `TourOverlay.test.tsx`, `position.test.ts`, `focus.test.ts`. Modify `src/club/main.tsx`, `ClubApp.tsx`, `HomePage.tsx`, `learning/RouteQuiz.tsx`. Create `e2e/club-tutorial.spec.ts` and `e2e/helpers/tutorial.ts`.

**Interfaces:**

- In `src/ui/guidance.tsx`, export the moved `GuidanceAction`, `GuidanceLease = {restore():void; dispose():void}`, and `GuidanceBridge = {registerTarget(id:string, node:HTMLElement, ready:boolean):()=>void; emit(action:GuidanceAction):void; registerScope(id:string, begin:()=>GuidanceLease):()=>void}`. Export `GuidanceProvider({bridge,children})`, `useGuidanceTarget(id:string, ready?:boolean):RefCallback<HTMLElement>`, `useGuidanceAction():(action:GuidanceAction)=>void`, and `useGuidanceScope(id:string, begin:()=>GuidanceLease):void`. Without a provider these are stable no-ops and perform no storage access. Duplicate active target IDs are unavailable rather than arbitrarily choosing one.
- `TutorialProvider({children})` owns the bridge/controller. `useClubTutorial()` returns `{run:TourRun|null; preferences:TutorialPreferences; storage:{available:boolean;writable:boolean}; overlayOpen:boolean; requestStart(id:TourId,mode?:'start'|'resume'|'restart'):boolean; dismissInvitation(id:TourId):void; resetPreferences():void; exit():void; registerGuard(check:()=>boolean):()=>void; registerInputLock(lock:(locked:boolean)=>void):()=>void}`. Opening either the welcome dialog or a tour checks all registered guards synchronously and acquires locks before focus/overlay changes. Transitioning from welcome to tour keeps the lock continuously held. Inline invitations acquire no lock. On exit, restore/dispose live leases once and release locks. Unregistered/replaced scopes are disposed without restoring into replacement state.
- `TourEntry({tourId:TourId,ready?:boolean})` renders a permanent Page tour control and, when eligible, an inline invitation. Default ready is true; loading pages explicitly pass false or mount the entry only when ready. Automatic welcome eligibility requires a ready mounted entry and all guards passing. `TutorialRouteBoundary({routeKey:string,tourId:TourId|null,children})` inside ClubApp exits on navigation and registers current-page eligibility; unknown/Guide routes map to null.
- `positionTour(target:DOMRectReadOnly,bubble:{width:number;height:number},viewport:{left:number;top:number;width:number;height:number}):{left:number;top:number;placement:'top'|'bottom'|'left'|'right'|'dock'}` clamps to the visual viewport with 12 px inset and chooses docked layout if no floating position fits. `collectTourFocusables(bubble:HTMLElement,target:HTMLElement|null,interactive:boolean):HTMLElement[]` includes only enabled, visible descendants plus a focusable target itself.
- `dismissTutorialForTest(page:Page):Promise<void>` exercises the real Don't ask again choice; it does not inject production feature flags.

- [ ] Write tests for each welcome choice, first eligible deep link, quiet reminder after Not now, no delayed focus theft after user interaction, dismissed page invitations, no nested modal, and manual replay despite Don't ask again. Assert missing targets become unavailable after a bounded 5-second readiness wait, with Skip/Exit; later ready targets may recover only for the current token. Test resize, target removal, route back/forward, duplicate IDs, focus restoration, and provider cleanup.
  ```ts
  // In the missing-target overlay test after starting a valid tour:
  await vi.advanceTimersByTimeAsync(5000);
  expect(screen.getByRole('button', { name: 'Skip step' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Exit tour' })).toBeEnabled();
  ```
- [ ] Run `npx.cmd vitest run src/club/tutorial src/ui/guidance.test.tsx`; establish expected failures.
- [ ] Implement the contracts. Subscribe to resize/scroll/visualViewport changes through one scheduled frame, and remove observers/listeners on exit. Use a labeled non-modal dialog and an explicit focus scope spanning bubble plus allowed target; do not mark an outside interactive target inert or falsely claim `aria-modal`. Shield unrelated pointer actions. Read steps expose no live action; action steps expose only their intended safe target. Use a restrained outline, no flashing/pulsing, and no smooth scrolling under reduced motion. Distinguish dialog welcome from quiet page offers; persist no global-site choices. Add real Home/quiz anchors without submitting quiz answers. Until Task 6 adds Guide, expose no dead Guide link in runnable UI.
- [ ] Run the focused unit tests and `npx.cmd playwright test e2e/club-tutorial.spec.ts`; test 1280, 390 and 360 px widths, keyboard-only interaction, reduced motion and browser zoom. Assert no horizontal overflow, target/bubble controls reachable and no page errors. Existing browser tests that are unrelated to onboarding may explicitly dismiss the new offer through the helper; never disable onboarding globally in test builds.
- [ ] Commit as `feat: add accessible opt-in club tours`.

### Task 3: Real Moves and lesson actions with transient-state restoration

**Files:** Modify `src/club/moves/MoveExplorerPage.tsx`, `NotationPlayer.tsx`, `controller.ts`, `src/app/LearnPage.tsx`, `LessonLayout.tsx`, `src/player/PlaybackView.tsx`, `controller.ts`, `src/club/learning/ClubLearnPage.tsx`; extend their existing tests. Create `e2e/tutorial-interactions.spec.ts`.

**Interfaces:** Consume Task 2 hooks. Add `restorePaused(position:{moveIndex:number; progress:number; sectionId:PlaybackSectionId; speed:number}):void` to `SourcePlaybackController`; restore using current boundaries, retain only a valid section, and always pause. Add `restorePaused(position:{progress:number; speed:0.5|1}):void` to the notation controller; require a ready matching demo, clamp progress, and obey reduced-motion endpoints. Each lease closes over its live source/controller identity and restores only while that identity remains registered. No entire mutable controller snapshot is persisted.

- [ ] Test `selection before the action does not complete it`, `wrong move does not complete U prime playback`, `next at end cannot claim a move`, `restore pauses fractional playback`, and `route/source replacement discards old restoration`. Assert live action events fire after successful intent/state change, not because matching values were already present. Verify an already complete move offers Replay as the appropriate current action. Pin restoration:
  ```ts
  player.restorePaused({ moveIndex: 2, progress: 0.5, sectionId: section, speed: 0.5 });
  expect(player.snapshot()).toMatchObject({ moveIndex: 2, progress: 0.5, playing: false, speed: 0.5 });
  ```
- [ ] Run `npx.cmd vitest run src/club/moves src/player src/app/LearnPage.test.tsx src/club/learning/ClubLearnPage.test.tsx`; establish red on the new behavior.
- [ ] Add stable targets for face/amount selection, holding, current token, Play/Replay, direction, advanced disclosure, lesson navigation/notes/current turn and Next move. Emit the four Task 1 action events from actual handlers; an explicit re-selection can count, but already-selected values without a new action cannot. Register leases for notation selection/camera/speed/playhead and shared player position; pause on tour entry and restore paused on exit. Hook registrations remain stable across ordinary renders and change identity when their real controller/source changes. Follow current reduced-motion/static behavior rather than introducing an alternate player. A lesson without a player uses `lesson-intro`; missing or completed playback provides explanation/Skip rather than resetting the solve. Existing lesson visits may update last visited; tour completion never calls setPracticed. Keep the neutral bridge inactive globally.
- [ ] Run the focused tests and `npx.cmd playwright test e2e/tutorial-interactions.spec.ts e2e/notation-explorer.spec.ts e2e/player.spec.ts e2e/club-learning.spec.ts`. Cover all three methods, keyboard/touch, render failure, navigation during loading and reduced motion. Include a Next move crossing a stage boundary, then Exit: controlled stage callbacks must not overwrite the restored move/fractional position. Await an actual rendered frame before screenshot/reload/navigation; reuse `renderNotationFrame` for notation. Check stored practiced flags and global-page behavior before/after.
- [ ] Commit as `feat: connect club tours to real cube controls`.

### Task 4: Read-only help for solve, algorithms and practice

**Files:** Modify `src/app/SolvePage.tsx`, `color-entry/ColorEntry.tsx`, `algorithms/AlgorithmLibraryPage.tsx`, `algorithms/AlgorithmDetailPage.tsx`, `practice/PracticePage.tsx`; extend `src/club/tutorial/catalog.ts` and existing component tests; extend `e2e/tutorial-interactions.spec.ts`.

**Interfaces:** Use only the neutral target hook on shared pages; no club provider import. Use `solve.input`, `solve.validation`, `solve.explanation`, `algorithms.filters`, `algorithms.case`, `algorithm.holding`, `algorithm.formula`, `practice.scope`, `practice.reveal`, and `practice.next` as stable IDs. Tour runtime reads target readiness; this task adds no programmatic click or selection API.

- [ ] Test starting/exiting a tour with a partially colored cube, an invalid validation result, an active solver request, filtered cases, a selected practice scope, and an unrevealed case. Assert exact saved draft and practice selection remain unchanged, no solve is auto-submitted, and no answer is revealed. Assert read-only highlighting cannot activate reset/delete/export controls. Handle missing result panels with useful Skip/Guide fallback.
- [ ] Run `npx.cmd vitest run src/app/SolvePage.test.tsx src/app/color-entry src/app/algorithms src/app/practice`; establish the new failures.
- [ ] Register targets around currently rendered controls and write concise mode-aware copy. Do not switch scramble/color modes or seed examples into live state to make a target exist. Explain advanced method choices as optional next steps. Keep complex procedures in the Guide content implemented by Task 6; register only real controls here.
- [ ] Run the focused unit tests and `npx.cmd playwright test e2e/tutorial-interactions.spec.ts e2e/color-entry.spec.ts e2e/algorithm-library.spec.ts e2e/algorithm-practice.spec.ts`; require preserved storage snapshots and no global tutorial UI.
- [ ] Commit as `feat: explain solving and formula tools without changing user data`.

### Task 5: Timer eligibility, input lock and record preservation

**Files:** Create `src/club/timer/tutorial-input.ts`, `tutorial-input.test.ts`, `use-timer.test.tsx`, `TimerSurface.test.tsx`, `e2e/timer-tutorial.spec.ts`. Modify `use-timer.ts`, `TimerPage.tsx`, `TimerSurface.tsx`; extend relevant timer and tour tests.

**Interfaces:** `timerTutorialAllowed(state:TimerState, history:RepositorySnapshot):boolean` returns true only for idle with no pendingIds and no unresolved storage error. `createTutorialInputGate()` returns `setLocked(value:boolean):void`, `allow(input:TimerInput):boolean`, `observeKey(event:{type:'keydown'|'keyup';code:string;repeat:boolean}):void`, `observePointer(event:{type:'pointerdown'|'pointerup'|'pointercancel';pointerId:number}):void`, `releaseHeld():void`, and `dispose():void`. Keep the gate stable for the mounted Timer and make setLocked synchronous through Task 2's registered lock. Add optional `inputGate` to useTimer and TimerSurface props; preserve old behavior when absent. All direct surface dispatches and global activation handlers pass through the same gate.

- [ ] Write fake-input tests for Space held across Exit or welcome dismissal, Escape, repeated keydown, pointer cancel/lost capture, blur, locked down/unlocked up, and simultaneous keyboard/touch. Include a welcome-to-tour transition with no momentary unlock. Pin the held-key behavior:
  ```ts
  gate.setLocked(true);
  gate.observeKey({ type: 'keydown', code: 'Space', repeat: false });
  gate.setLocked(false);
  expect(gate.allow({ type: 'down', token: 'keyboard', repeat: true })).toBe(false);
  gate.observeKey({ type: 'keyup', code: 'Space', repeat: false });
  expect(gate.allow({ type: 'up', token: 'keyboard' })).toBe(false);
  gate.observeKey({ type: 'keydown', code: 'Space', repeat: false });
  expect(gate.allow({ type: 'down', token: 'keyboard' })).toBe(true);
  ```
  Test all seven machine phases plus idle with pending saves/error. Test a guard/start race by changing phase before requestStart checks; no overlay/lock may interrupt the attempt. Verify the same prepared scramble ID, record count, raw results, penalties and settings after the full read-only tour.
- [ ] Run `npx.cmd vitest run src/club/timer`; establish red on gate and integration tests.
- [ ] Implement observation without remounting the timer controller or regenerating its scramble. Keep browser lifecycle handling intact for genuine running attempts; only tutorial-caused input is suppressed. Observe held inputs in capture phase so bubble event handling cannot hide a held key. When unlocked, require a fresh press after release; blur clears stale held tracking without synthesizing a timer action. Disable surface activation during help and shield history/settings actions. Register idle guard and lock before exposing Page tour; re-check synchronously on start. Add read-only timer targets; empty-history examples are static labeled content, not repository inserts.
- [ ] Run timer unit tests and `npx.cmd playwright test e2e/timer-tutorial.spec.ts e2e/timer-controls.spec.ts e2e/timer-history.spec.ts e2e/timer-storage.spec.ts`. Exercise keyboard and touch on Chromium/WebKit. Assert opening/closing help produces zero new attempts and no penalties; after release, a normal timed solve still works.
- [ ] Commit as `feat: protect timer input and history during club tours`. Continue to Tasks 6–7 before website release.

## Combined-plan coverage self-review

Spec purpose/approach and boundaries are carried by all three plan headers and constraints. Entry/persistence maps to Tasks 1–2; bubbles, accessibility and real actions to Tasks 2–3; complete page coverage to Tasks 3–5; Timer/data protection to Tasks 4–5; Guide/screenshots to Tasks 6–7; video sample and full-film brief to Tasks 8–10. Architecture contracts live with their producing tasks. Website verification/release is Task 7; sample and final-video acceptance are separate checkpoints in Tasks 9–10. No production dependency installation, code, capture or media rendering belongs to the plan-writing stage.
