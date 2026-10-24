# Shared UI and Cube Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved bright-home/focused-player direction to existing global and club features without changing their solving behavior.

**Architecture:** Keep semantic layout and preferences separate from physical playback. Extend the existing cubing adapter and shared PlaybackView, preserving its authoritative timeline and providing a synchronized 2D fallback.

**Tech Stack:** Existing React/TypeScript, CSS, cubing.js, Vitest and Playwright; no new UI dependency.

**Spec:** [Approved design](../specs/2026-10-23-advanced-roux-and-ui-design.md), Sections 3–4; [execution overview](2026-10-23-roux-ui-upgrade-plan.md). Tasks 1–4 of 26.

## Global Constraints

- A's bright homepage/reading hierarchy + B's focused player/Lab. Global green/white, club blue/white, separate brand marks.
- Preserve all current links/data; club-only navigation never appears globally.
- Comfortable 16px body text, primary targets at least 44px, 200% zoom, 320–430px phones, no page-level horizontal overflow.
- Decorative motion defaults off for reduced motion and pauses off-screen/hidden. Physical turns remain user-controlled.
- Camera orbit is not a physical rotation; no cube state or move counts change during this plan.

## Review Focus

- Menu focus is lost after Escape or browser Back — Task 1.
- A drag or light-background preference changes physical move state — Task 2.
- WebGL context loss leaves a blank player or stale net — Task 3.
- Touch/keyboard stepping interferes with text entry or an active timer — Tasks 2 and 4.
- A sticky toolbar obscures focused controls at phone width/200% zoom — Task 4.

---

## File map

`src/styles.css`, `src/club/club.css`, `src/ui/workspace.css`: shared geometry and edition variables. `src/ui/SectionMenu.tsx`: accessible grouped navigation. `src/player/view-preferences.ts`, `CubeStage.tsx`, `CubeNet.tsx`: rendering preferences and stage presentation. Existing `PlaybackView.tsx`/`cubing-adapter.ts`: physical timeline integration. Existing hero and motion hooks: decorative animation lifecycle. Do not copy the prototype renderer into product code.

### Task 1: Navigation and bright page hierarchy

**Files:** Create `src/ui/SectionMenu.tsx`, `SectionMenu.test.tsx`, `workspace.css`; modify `src/styles.css`, `src/app/App.tsx`, `LessonLayout.tsx`, `SolvePage.tsx`, `src/club/club.css`, `HomePage.tsx`, `ClubApp.tsx`, `components/ClubHeader.tsx`; extend `e2e/ui-refresh.spec.ts`, `club-entry.spec.ts`.

**Interfaces:** `SectionMenu({label,items,currentHref}:{label:string;items:readonly {label:string;href:string}[];currentHref:string}):ReactElement`. Existing route functions remain the source of URLs. CSS accepts `data-edition='global'|'club'` from the existing edition shell; no new routing system.

- [ ] **Write behavior tests** `menu restores trigger focus on Escape`, `global never exposes club links`, and `old method and Timer links still resolve`. Assert `expect(screen.queryByRole('link',{name:/Roux Lab/i})).toBeNull()` in the global shell. Browser checks cover menu navigation and Back.
- [ ] **Run red:** `npx.cmd vitest run src/ui/SectionMenu.test.tsx`; confirm the missing menu contract fails.
- [ ] **Implement layout/menu.** Club groups are Home, Learn, Practice, Labs, Guide. Initially Labs exposes existing CFOP Lab; Task 18 adds Roux Lab. Retain direct current deep links. Collapse solve input after a successful result with an explicit edit affordance; never discard its draft. Apply A's spacing/type, not fake social proof. Pure styling is checked visually, not with CSS-value unit tests.
- [ ] **Verify:** focused test + `npx.cmd playwright test e2e/ui-refresh.spec.ts e2e/club-entry.spec.ts --project=chromium`; inspect global/club desktop and phone screenshots. Expected working links, no clipping and no hidden school branding globally.
- [ ] **Commit:** listed files, `git commit -m "feat: refresh shared navigation and learning layouts"`.

### Task 2: Focused cube stage and stable view controls

**Files:** Create `src/player/view-preferences.ts`, `view-preferences.test.ts`, `CubeStage.tsx`, `CubeStage.test.tsx`; modify `src/player/PlaybackView.tsx`, `cubing-adapter.ts`, `CubePlayer.tsx`, `src/ui/workspace.css`; extend `e2e/player.spec.ts`, `roux-player.spec.ts`, `f2l-holding.spec.ts`.

**Interfaces:** `CubeViewPreferences={version:1;background:'dark'|'light';showNet:boolean;showBackFaces:boolean}`; `createCubeViewStore(storage:()=>Storage)` exposes `load():CubeViewPreferences` and `save(value):boolean` with key `cubesteps.cube-view.v1`. Extend adapter return with `resetView():void`, `setViewOptions(options:CubeViewPreferences):void` and `setTargets(ids:readonly string[],state:CubeState):void`; keep `boundaries`, `setTimestamp`, `dispose` compatible.

`CubeStage({hostRef,preferences,onPreferencesChange,onResetView,holding,children}:{hostRef:Ref<HTMLDivElement>;preferences:CubeViewPreferences;onPreferencesChange:(value:CubeViewPreferences)=>void;onResetView:()=>void;holding:ReactNode;children:ReactNode}):ReactElement` renders the persistent adapter host and view controls. `PlaybackView` retains the sole controller/adapter owner; the stage does not create a second timeline. React ref/node types use the existing React imports.

- [ ] **Write tests** for corrupt/unavailable preference storage, view updates without remount, reverse stepping through x/y, and drag preserving timeline identity. Pin `expect(controller.snapshot().moveIndex).toBe(beforeIndex)` after view actions using the existing controller test harness. Preference test: `expect(createCubeViewStore(brokenStorage).load().background).toBe('dark')`.
- [ ] **Run red:** `npx.cmd vitest run src/player/view-preferences.test.ts src/player/CubeStage.test.tsx`.
- [ ] **Implement** the large stage, current/adjacent move strip, adjacent explanation and transport. Dark navy/forest default with persistent light option. Keep physical holding cues separate from camera orientation. Camera persists across stepping; reset intentionally for new input. Route existing controls/shortcuts through the existing controller, excluding editable targets and active timers.
- [ ] **Verify:** focused tests, typecheck, and listed browser specs. Inspect move controls, rotation reversal and current instruction at 390px; expected identical physical trace before/after the redesign.
- [ ] **Commit:** `git commit -m "feat: focus cube playback without changing physical state"`.

### Task 3: Accurate target emphasis and 2D fallback

**Files:** Create `src/player/CubeNet.tsx`, `CubeNet.test.tsx`, `target-view.ts`, `target-view.test.ts`; modify `src/player/cubing-adapter.ts`, `CubeStage.tsx`, `PlaybackView.tsx`, `playback-timeline.ts`; extend `e2e/player-readiness.spec.ts` and create `e2e/cube-visibility.spec.ts`.

**Interfaces:** `targetFacelets(engine:CubeEngine,state:CubeState,ids:readonly string[]):readonly FaceletRef[]`; `CubeNet({facelets,targets,holdingLabel}:{facelets:FaceletSnapshot;targets:readonly FaceletRef[];holdingLabel:string}):ReactElement`. Reuse `stateToFacelets`/facelet layout. Adapter reports `onRenderFailure(error:Error)` through an optional creation argument; failure does not destroy the timeline.

- [ ] **Write tests** `targets follow piece identity through M and y`, `unavailable WebGL still steps 2D`, `context loss preserves current move`, `back-face aid is a view only`. For a target after replay, assert the net references correspond exactly to `engine.observe(after)` and differ from the previous slot when the piece moved.
- [ ] **Run red:** `npx.cmd vitest run src/player/target-view.test.ts src/player/CubeNet.test.tsx`.
- [ ] **Implement** color-independent target cue and gentle context treatment through supported/pinned adapter surfaces. If 3D outlining needs unavailable API, use an equivalent visible target cue plus exact highlighted net; never relabel a CSS outline around the whole canvas as a piece outline. A current-state net remains available without WebGL. Back-face aid is optional and labeled.
- [ ] **Verify:** focused tests + `npx.cmd playwright test e2e/player-readiness.spec.ts e2e/cube-visibility.spec.ts --project=chromium`; repeat renderer cases on WebKit. Capture actual rendered canvas after its completion callback, not a blank or mid-transition screenshot.
- [ ] **Commit:** `git commit -m "feat: clarify cube targets and preserve playback without WebGL"`.

### Task 4: Motion, phone ergonomics and UI regression

**Files:** Modify `src/ui/motion.tsx`, `motion.css`, `src/club/hero/HeroCube.tsx`, `hero.css`, `src/ui/workspace.css`; extend existing motion/hero tests, `e2e/ui-refresh.spec.ts`, `tutorial-responsive.spec.ts`, `timer-controls.spec.ts`; create `e2e/ui-upgrade-production.spec.ts`.

**Interfaces:** Keep `use-system-reduced-motion.ts` and hero pause semantics; add only an internal visibility signal shared by decorative effects. No new global animation scheduler or dependency.

- [ ] **Write meaningful lifecycle tests:** hidden/off-screen hero has no active loop; reduced motion begins paused; enabling motion is explicit; text fields/Timer do not trigger playback. Browser assertions: `expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)` at 320, 390 and 430px; focused controls remain unobscured at 200% zoom.
- [ ] **Run red** on the changed lifecycle behavior: `npx.cmd vitest run src/ui/motion.test.tsx src/club/hero/HeroCube.test.tsx`.
- [ ] **Implement** bounded 150–250ms selection/page transitions, pause lifecycle, safe-area-aware transport and compact phone stage selection. Preserve functional animation stepping under reduced motion. Resolve layout issues through responsive CSS, without hiding required controls.
- [ ] **Verify:** `npm.cmd run typecheck`, focused motion tests and `npx.cmd playwright test e2e/ui-refresh.spec.ts e2e/tutorial-responsive.spec.ts e2e/timer-controls.spec.ts`; build and run the new production spec under both editions. Save screenshots and mark physical-phone performance unverified if only emulators were used.
- [ ] **Commit:** `git commit -m "feat: polish responsive motion and accessible cube workspaces"`. Continue to Plan 2; this task does not authorize a separate unreviewed publication.
