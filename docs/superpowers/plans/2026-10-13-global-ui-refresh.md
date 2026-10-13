# Global UI Refresh and Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved green-and-white CubeSteps presentation while preserving all teaching behavior, then verify the combined club/global release candidate.

**Architecture:** Scope visual tokens and component presentation through the existing edition boundary. Refine the shared lesson shell and playback markup without changing engine, trace or player-controller contracts. Browser and production checks cover the integrated route, animation and layout changes.

**Tech Stack:** Existing React/TypeScript/Vite, CSS, Vitest and Playwright (Chromium/WebKit); Node 24+, no new dependency or service.

**Spec:** [Approved design](../specs/2026-10-13-notation-and-ui-refresh-design.md), especially sections 5–9 and committed visual references.

**Status and order:** Awaiting implementation-plan review. Tasks 7–9 follow [hero Tasks 1–2](2026-10-13-club-hero-motion.md) and [explorer Tasks 3–6](2026-10-13-club-move-explorer.md). Keep Native implementation and a fresh independent whole-branch review at the end.

## Global Constraints

- Retain CubeSteps' name, mark, green/white palette and small warm accent; all product text remains English.
- The default global route remains the LBL introduction. Keep all LBL, Beginner CFOP and Advanced CFOP routes and acceptance labels.
- Real traces and existing lesson content are authoritative; the visual prototype's examples are placeholders.
- Preserve full formulas, repetitions, recognition, setup/regrip instructions, checkpoints, target highlights, stage jumps and every playback control.
- Scope global CSS through the edition boundary; retain club blue/white identity and its accepted independent Timer layout.
- No solver optimization, algorithm-selection change, new method, storage migration, analytics, account system or global promotion of the club URL.
- Verify 360, 390, 768, 1024 and 1440 px; primary touch targets at least 44 px, keyboard focus and readable contrast.

## Review Focus

1. A long algorithm/repeated formula or explicit F2L regrip reaches a phone layout: all moves, repetition and holding instructions remain reachable (Task 8).
2. A solved input, skipped stage or no-move action enters the new layout: truthful status replaces the prototype's sample token (Task 8).
3. A shared CSS selector leaks into club pages: the hero, Moves and Timer retain their own appearance and usable controls (Tasks 7 and 9).
4. A phone learner expands navigation or changes method: every available lesson/stage remains selectable with correct active state (Task 8).
5. A public/deep-link reload encounters missing lazy chunks or WebGL: working assets/recovery, no stranded blank page or false success (Task 9).

## File map

| Files | Responsibility |
| --- | --- |
| Modify `src/styles.css`, `src/app/App.tsx`, `src/ui/motion.css` if needed | Global tokens, shell, navigation and restrained motion |
| Modify `src/app/algorithms/algorithm-library.css`, `src/app/practice/practice.css`, `src/app/color-entry/color-entry.css` | Consistent global cards, forms and error/empty states |
| Modify `src/app/LessonLayout.tsx`, `LearnPage.tsx`, `SolvePage.tsx`, `src/player/PlaybackView.tsx`; create `src/app/LessonLayout.test.tsx` | Focused responsive lesson/player workspace with unchanged behavior |
| Extend `src/player/CubePlayer.test.tsx`, `playback-completion.test.tsx`, `cfop-player.test.tsx`, `algorithm-player.test.tsx` only where assertions are missing | Real action, formula, regrip and completion preservation |
| New `e2e/ui-refresh.spec.ts`, `e2e/notation-production.spec.ts`; extend `e2e/club-production.spec.ts` | Visual, accessible and built-site acceptance |
| New `docs/validation/notation-ui-refresh.md`; update `README.md` and the approved spec's status at completion | Reproducible evidence, honest feature/acceptance status and release handoff |

### Task 7: Scoped visual system and global shell

**Files:** Modify the global shell and CSS files in the map; create the shell/visual portions of `e2e/ui-refresh.spec.ts`. Add markup hooks in existing `src/app/algorithms/AlgorithmLibraryPage.tsx`, `AlgorithmDetailPage.tsx` or `src/app/practice/PracticePage.tsx` only when CSS cannot express the approved hierarchy; keep their public interfaces intact.

**Interfaces:** Consume existing root `data-edition='global'|'club'`, existing `data-motion`, route kinds and `MotionPreference`. Keep `App()` and shared feature-page props unchanged. Produce a scoped CSS token system for surfaces, ink, green accent, warm accent, spacing, radii and controls; name new tokens `--global-*` and define them under `[data-edition='global']`, not generic root overrides.

- [ ] Open the committed global desktop/phone references and current app. Record the visual checklist for type hierarchy, concise header, white/soft-green surfaces, card/form consistency, focus and motion. Add meaningful browser assertions for all four global nav destinations, semantic active state, no overflow and visible control labels; seed a club Timer session for a before/after comparison. Pure color/spacing changes use screenshots and visual review, not unit tests that copy CSS values.
- [ ] Implement the scoped tokens and presentation. Remove redundant banner density while retaining method/Preview context. Apply the same hierarchy to Algorithms, detail, Practice, color input and empty/loading/error states. Keep native color meanings for actual stickers. Reuse existing motion preferences and reduced-motion treatment; no new animation framework or font fetch.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run build` and `npx.cmd playwright test e2e/ui-refresh.spec.ts e2e/algorithm-library.spec.ts e2e/algorithm-practice.spec.ts e2e/club-entry.spec.ts e2e/timer-controls.spec.ts`. Compare screenshots at all five widths and verify focus/contrast manually. Require no global-green leakage into club UI and no Timer geometry/control regression.
- [ ] Stage explicit changed files; commit `style: refresh the global CubeSteps visual system`.

### Task 8: Clear lesson navigation and faithful player workspace

**Files:** Modify LessonLayout, LearnPage, SolvePage, PlaybackView and relevant tests from the map; extend `src/styles.css` and `e2e/ui-refresh.spec.ts`. Avoid changing `src/player/controller.ts`, solver modules or persistence code for presentation alone.

**Interfaces:** Preserve `LessonLayout({selected,children,free?,onSelect?,method?,presentation?})`, `LearnPage`, `SolvePage`, `PlaybackView` and player-controller props/returns. Consume real `SourcePlaybackSnapshot`, `TraceAction`, `SolveSession`, `getCourse(method)` and `getMethod(method)`. The lesson selector uses the current lesson/stage label and existing href/callback; it renders one navigation instance, not duplicate desktop/mobile focus trees.

- [ ] Write missing behavior assertions: global phone navigation opens to every `getCourse(method)` entry for all three methods; free-solve stages use `onSelect` and preserve current stage on collapse. Existing formula/regrip fixtures must retain the full move list, current move, repetition, segment, target toggle, range/speed, Previous/Next, Replay and checkpoints. For solved/skipped/no-move fixtures assert the correct actual completion/observation text and absence of a fabricated token. Keep existing stale-session/method-change assertions. Browser tests traverse the final lesson on a phone, a long formula and an explicit regrip, not just the first LBL screen.

  In `exposes every lesson after expanding the phone selector`, open the disclosure for each method and assert:
  ```ts
  const links = within(screen.getByRole('navigation', { name: 'Learning path' })).getAllByRole('link');
  expect(links.map(link => link.getAttribute('href'))).toEqual(
    getCourse(method).map(lesson => lessonRoute(method, lesson.id)),
  );
  ```

- [ ] Run `npx.cmd vitest run src/app/LessonLayout.test.tsx src/app/LearnPage.test.tsx src/app/SolvePage.test.tsx src/player/CubePlayer.test.tsx src/player/playback-completion.test.tsx src/player/cfop-player.test.tsx src/player/algorithm-player.test.tsx`; establish red for new responsive/semantic behavior, retain already-passing regression assertions.
- [ ] Refine the existing shell: desktop secondary navigation beside the prominent cube and nearby action explanation; phone current-lesson disclosure, cube/controls and instruction in reading order. Extend the current club disclosure pattern to global presentation with correct labels for learning versus solving. Keep the real method/lesson context in a focused header, and move/present existing PlaybackView sections rather than replacing them with prototype text. Use wrap/scroll-safe formulas without hiding tokens; preserve full control labels, action phase and regrip guide. Scope layout styles so club learning remains coherent and Timer is unaffected.
- [ ] Run those unit tests and `npx.cmd playwright test e2e/ui-refresh.spec.ts e2e/daisy.spec.ts e2e/cfop-learning.spec.ts e2e/advanced-learning.spec.ts e2e/f2l-holding.spec.ts e2e/color-entry.spec.ts e2e/player-readiness.spec.ts`. Check all widths, touch/keyboard, no occluding sticky overlays, no separate scroll traps, no lost lessons, full formulas and truthful skipped/solved states. Verify the visual result against references using real lesson states.
- [ ] Stage this task's files; commit `feat: clarify the responsive lesson and playback workspace`.

### Task 9: Integrated production verification and independent review

**Files:** Create `e2e/notation-production.spec.ts`, extend `e2e/club-production.spec.ts`, create `docs/validation/notation-ui-refresh.md` and update README/spec status with verified facts. Only fix source files if a concrete regression is found; keep each fix scoped and rerun its owning test.

**Interfaces:** Consume the built `/cube-steps/` and `/cube-steps/club/` entries, club `#/moves`, existing Pages workflow and Playwright production configuration. Reuse `renderedColors(page)` and Task 3 fixtures in Node-side tests, without `/src/` imports in a built/public browser. Produce evidence identifying tested commit, command results, screenshot paths, remaining physical acceptance and release state.

- [ ] Add production checks for direct Moves refresh, all-54 selected endpoint/sticker agreement, failed WebGL/static fallback, visible error/reload recovery after a deliberately rejected lazy module, and genuine post-build module/worker URLs. Record Home/quiz requests to ensure renderer/search/solver chunks remain unloaded before entering teaching. Include both editions and lesson/Solve/Algorithms/Practice/Timer routes; collect page errors and failed asset responses, excluding only the explicitly injected failure. Keep global navigation free of a club promotion. The previously observed lazy-import failure is a verification target, not an assumed diagnosis.
- [ ] Run a final clean local validation after source changes settle: `npm.cmd run typecheck`, `npm.cmd run verify:cross`, `npm.cmd run verify:cases`, `npm.cmd run test:unit`, `npm.cmd run test:corpus`, `npx.cmd vitest run tests/advanced-cross-table.test.ts`, `npm.cmd run test:efficiency`, `npm.cmd run build`, `npm.cmd run test:e2e`, and `npm.cmd run test:production`. Require successful exits and inspect output; retain all fixed-seed corpus sizes/assertions. Use configured Chromium/WebKit projects. Do not invent a lint script; no such script exists. Avoid repeating heavy suites absent a relevant change/failure or mandatory CI run.
- [ ] Complete visual/interaction evidence: five-width screenshots for club Home, Moves and representative global teaching; algorithm/practice/color-entry and unchanged Timer smoke checks; keyboard focus, primary target sizes, contrast, reduced motion mid-turn, lazy/WebGL recovery and animation-direction inspection. Record physical follow-along as a separate owner check: U/U′/U2/D/B and one wide/slice/whole-cube example. Never mark physical acceptance from automated tests. Update README with concise English feature descriptions, retaining the existing discreet community access wording without the full school name or prominent club advertising.
- [ ] Use `superpowers:requesting-code-review` for a fresh independent whole-branch review of all nine tasks. Give the reviewer the approved spec, these plans, base/head commits and evidence. Resolve actionable findings, verify affected paths, then record actual results in `docs/validation/notation-ui-refresh.md`. Stage explicit changed files and commit `test: verify notation and UI refresh across editions` once verification supports it; keep incomplete acceptance plainly labeled.
- [ ] Use `superpowers:finishing-a-development-branch` and the existing authorized release workflow. Prepare the reviewable PR and attach every created PR to this chat. Apply current user authorization to merge/publish; do not treat an earlier release's physical acceptance as acceptance of this new notation feature. Pages inputs distinguish `publish_preview` from `teaching_accepted`; never assert the latter without the new follow-along confirmation. After any authorized publication, verify deployed URLs, asset loads and build identity before reporting success; synchronize local main and remove only verified disposable task worktrees when authorized. Otherwise hand off the tested local/PR preview and remaining acceptance without claiming deployment.

## Plan self-review

Coverage: hero geometry/lifecycle → Tasks 1–2; catalog/conventions/independent fixtures → Task 3; readiness/races/clock → Task 4; real renderer/cameras/fallback → Task 5; club routing/mobile/accessibility → Task 6; global identity/cards → Task 7; real teaching layout/navigation → Task 8; production, regressions, independent review and acceptance → Task 9. Each Review Focus item is assigned an owning test/check above. Interfaces keep decoration, demonstrations, camera state and existing solve traces separate. No product implementation is part of the plan-writing commit.
