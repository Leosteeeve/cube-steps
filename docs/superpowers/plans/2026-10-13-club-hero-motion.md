# Club Hero Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the distorted club homepage illustration with a correctly proportioned, gently animated blue-and-white cube.

**Architecture:** A pure local geometry module supplies a small canvas component and static SVG fallback. The existing motion preference remains authoritative; the component owns only its temporary pause state and visible animation clock. It has no teaching-engine dependency.

**Tech Stack:** Existing React, TypeScript, Vite, Canvas/SVG, Vitest, Testing Library and Playwright; Node 24+, no new dependency.

**Spec:** [Approved design](../specs/2026-10-13-notation-and-ui-refresh-design.md), sections 2–3 and 6–9.

**Status and order:** Approved and implemented under Native execution; local validation and independent review are complete. See the notation/UI validation record for release and physical-acceptance status. Preserve Native execution and one independent final review. Execute Tasks 1–2 here, then [Move Explorer Tasks 3–6](2026-10-13-club-move-explorer.md), then [global UI and integration Tasks 7–9](2026-10-13-global-ui-refresh.md). These are nine tasks total, not separate releases.

## Global Constraints

- All product text remains English. Keep the existing W-in-cube logo and approved blue/white identity.
- Equal-sized cubies share one three-dimensional coordinate system and camera; the decoration is not a teaching-state authority.
- The homepage must not import solver, algorithm registry or cubing.js rendering/search chunks.
- Preserve primary Start/Resume learning, questionnaire, lessons and independent Timer access.
- Existing edition motion settings and system reduced motion override local Play. No new persisted preference.
- Verify 360, 390, 768, 1024 and 1440 px widths; primary touch targets are at least 44 px.

## Review Focus

1. A layer is halfway through its turn: stickers remain on their cubies and stationary geometry does not deform (Task 1).
2. A tab is hidden or the illustration scrolls offscreen: stop scheduling and resume without a time backlog (Task 2).
3. Motion is disabled while turning: show the assembled static cube and no misleading Play control (Task 2).
4. Canvas is unavailable or its drawing fails: keep a proportionate static illustration and usable learning links (Task 2).
5. A returning learner visits Home on a narrow phone: keep their resume target and prevent notes/control overflow (Task 2).

## File map and execution

Use `superpowers:using-git-worktrees` before implementation; inspect the actual repository at `D:/Projects/Cubing Calculator/cube-steps`, the approved design commit and current refs. Keep an isolated execution checkout; do not implement on `main`. Read the spec and its committed visual references before authoring. Paths below are repository-relative.

| Files | Responsibility |
| --- | --- |
| New `src/club/hero/geometry.ts`, `geometry.test.ts` | Cubie geometry, reversible pose and common projection |
| New `src/club/hero/HeroCube.tsx`, `HeroCube.test.tsx`, `hero.css`, `hero-static.svg` | Drawing, lifecycle, local pause, responsive decoration and fallback |
| New `src/ui/use-system-reduced-motion.ts`, `use-system-reduced-motion.test.tsx`; modify `src/ui/motion.tsx` | Reusable system preference subscription, without conflating decoration and teaching motion |
| Modify `src/club/HomePage.tsx`, `src/club/club.css`; new `e2e/club-hero.spec.ts` | Homepage integration and browser acceptance |

### Task 1: Proportionate geometry and reversible decorative sequence

**Files:** Create the two geometry files above. No app integration yet.

**Interfaces:** Produce `Vec3 = readonly [number, number, number]`; `HeroFace = {id:string; cubie:Vec3; vertices:readonly Vec3[]; fill:string}`; `HeroPose = {upperAngle:number; latitude:number; longitude:number}` (angles in radians); `ProjectedHeroFace = {id:string; points:readonly (readonly [number,number])[]; fill:string; depth:number}`. Export `buildHeroMesh():readonly HeroFace[]`, `sampleHeroPose(elapsedMs:number):HeroPose`, and `projectHeroFaces(mesh:readonly HeroFace[], pose:HeroPose):readonly ProjectedHeroFace[]`. Project into a fixed normalized view box with painter ordering and back-face culling.

- [ ] Write geometry tests asserting equal cubie edge lengths and square stickers in 3D, constant gaps, stable face IDs/colors, unchanged lower-layer coordinates during a U turn, and a quarter-turn top layer that returns exactly. Pin a 12,000 ms loop: rest 0–2,000; turn 2,000–4,000; hold 4,000–5,000; inverse 5,000–7,000; rest to 12,000. Assert `sampleHeroPose(0).upperAngle === 0`, the 4,500 ms angle is one quarter turn, and poses at 0 and 12,000 ms match. Check projected bounds and depth ordering at rest and halfway through both turns; do not merely snapshot the implementation's output.

  Pin the test `returns to the assembled pose after one decorative loop` with:
  ```ts
  expect(sampleHeroPose(0).upperAngle).toBe(0);
  expect(Math.abs(sampleHeroPose(4500).upperAngle)).toBeCloseTo(Math.PI / 2);
  expect(sampleHeroPose(12000)).toEqual(sampleHeroPose(0));
  ```

- [ ] Run `npx.cmd vitest run src/club/hero/geometry.test.ts`; confirm the new geometry contracts fail before implementation.
- [ ] Implement the interfaces in `geometry.ts`: equal cubies with inset stickers, body surfaces visible during turns, rigid upper-layer transformation and a common camera. Use smooth easing and gentle periodic rocking of at most 3 degrees around a three-quarter view; keep one predetermined sequence, no general notation parser.
- [ ] Run the targeted test and `npm.cmd run typecheck`; require passing geometry invariants and finite, bounded projection throughout sampled loop frames.
- [ ] Stage only this task's files; commit `feat: model a proportionate reversible club hero cube`.

### Task 2: Accessible motion lifecycle and homepage integration

**Files:** Create the remaining files in the file map; modify the listed HomePage, club styles and motion provider. Preserve `src/ui/motion.test.tsx` coverage and extend it only for the hook extraction.

**Interfaces:** Consume Task 1 geometry, `useMotion()` and unchanged `HomePage({resumeHref?:string})`. Produce `useSystemReducedMotion():boolean` (subscribes to media changes, false when unsupported) and `HeroCube():React.JSX.Element`. The motion provider uses the hook without changing its public context, storage keys, corruption protection or visibility policy. The later explorer consumes only the system hook for essential playback.

- [ ] Write tests for mount/subscription races, media changes and cleanup; hero Pause freezes the current pose, Play resumes it, while preference Off/system reduction resets to assembled. With mocked visibility/intersection/RAF, assert pending frames become zero when hidden, offscreen or unmounted, and visible resumption advances by the new frame delta only. Assert canvas failure shows the static fallback. Test that Off offers an explanation instead of enabled Play; a local pause does not write storage. Browser assertions retain a seeded resume link, questionnaire and Timer links at 360 px.

  In `does not offer Play when decoration is disabled`, render with the existing motion provider set to Off and assert:
  ```ts
  expect(screen.queryByRole('button', { name: 'Play motion' })).not.toBeInTheDocument();
  expect(screen.getByText('Decorative motion is off.')).toBeVisible();
  ```

- [ ] Run `npx.cmd vitest run src/club/hero/HeroCube.test.tsx src/ui/use-system-reduced-motion.test.tsx src/ui/motion.test.tsx`; establish red for the new lifecycle behavior.
- [ ] Implement the hook and `HeroCube`, replace the local `DecorativeCube` in HomePage, and scope new CSS to the club hero. Distinguish hidden/offscreen suspension from policy Off: suspension preserves elapsed progress, policy Off resets. Use ResizeObserver, cap canvas pixel ratio at 2, remove all listeners/observers/frames, and catch drawing failure. Supply a code-authored static SVG fallback. Keep the canvas decorative but place its labeled Pause/Play control outside `aria-hidden`; preserve orbit/notes without overlap. The Moves entry is added with the working route in Task 6.
- [ ] Run targeted unit tests, typecheck and `npx.cmd playwright test e2e/club-hero.spec.ts e2e/club-entry.spec.ts`. Inspect all five widths and screenshots at rest/mid-turn; confirm continuous edges and actual visible layer movement. Record request URLs on Home/quiz and confirm neither starts teaching/solver chunks; repeat against built assets in Task 9.
- [ ] Stage only this task's files; commit `feat: animate the club homepage with accessible motion controls`.

## Handoff

The next plan reuses only `useSystemReducedMotion`; decorative geometry never becomes notation truth. Final combined review, production verification and physical follow-along acceptance are owned by Task 9. Product code starts only after the owner reviews these implementation plans.
