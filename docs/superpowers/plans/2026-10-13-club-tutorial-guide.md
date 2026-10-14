# Club Written Guide and Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an accurate, readable club Guide with real screenshots, complete control references, and reusable page-tour entry points.

**Architecture:** A static chapter catalog and screenshot manifest feed a lazy club route that does not require the cube engine. Capture tooling uses fresh browser contexts and fixed examples, outside the production dependency graph. End-to-end verification covers the combined tours and Guide before release.

**Tech Stack:** Existing React/TypeScript/Vite and Playwright; Node 24+ capture scripts using `.mts`; PNG screenshots. No added website dependency.

**Spec:** [Approved club tutorial design](../specs/2026-10-13-club-tutorial-design.md), sections 3, 5, 7 and 9–11.

**Status and order:** Approved by the owner on 2026-10-13 for Native implementation. Tasks 6–7 follow [tour Tasks 1–5](2026-10-13-club-tutorial-tours.md). Preserve Native execution. [Media Tasks 8–10](2026-10-13-club-tutorial-video.md) reuse the verified UI/capture conventions; the website can release independently of full-film production.

## Global Constraints

- The Guide is a lightweight page readable even if the cube engine or WebGL is unavailable.
- Every user-facing control gets a written explanation; the introductory bubbles prioritize the controls needed to start.
- Use production UI screenshots captured from a fresh, isolated browser profile.
- Screenshots need readable crops, captions, alternative text, and an accessible enlarged view.
- Text and buttons remain usable while screenshots load or if an image fails. Links remain within the club shell.
- The Guide ships with complete text and screenshots; it must not show a broken player or a coming-soon video placeholder.
- All text remains English, club branding stays blue/white, and the global site receives no club tutorial navigation or storage.

## Review Focus

1. Direct Guide reload with engine/WebGL requests blocked must still show all text and chapter navigation (Task 6).
2. A chapter link or pending tour request must not auto-submit data or unexpectedly navigate a member away from current work (Task 6).
3. Missing screenshots, slow images, 360 px layouts and 200% zoom must preserve readable instructions and keyboard-accessible enlargement (Tasks 6–7).
4. Timer screenshots must clearly identify example results and cannot read from or seed a member's browser profile (Task 7).
5. A late renderer, changed label or production-only code path must not produce outdated screenshots or mask browser errors (Task 7).

## File map

| Files | Responsibility |
| --- | --- |
| New `src/club/guide/types.ts`, `chapters.ts`, `screenshots.json`, `GuidePage.tsx`, `GuideImage.tsx`, `guide.css`, `chapters.test.ts`, `GuidePage.test.tsx` | Static reference content, route actions and accessible images |
| Existing `src/club/routes.ts`, `routes.test.ts`, `ClubApp.tsx`, `components/ClubHeader.tsx`, `components/ClubFooter.tsx`, `club.css`; Task 2's `TourEntry.tsx` and provider | Guide entry, engine exclusion, active navigation and tour requests |
| New `scripts/tutorial/capture-contract.mts`, `capture-guide.mts`, `capture-fixtures.mts`, `capture-contract.test.ts` | Repeatable real-UI captures and manifest checks |
| New `public/club-guide/` PNG assets and `docs/validation/club-tutorial.md` | Shipped screenshots and verification evidence |
| New `e2e/club-guide.spec.ts`, `e2e/tutorial-production.spec.ts` | Built route, data preservation and engine-independent reading |

### Task 6: Club-only Guide with full references and working tour links

**Files:** Create all Guide files above and `e2e/club-guide.spec.ts`; modify the listed route/header/footer/provider files.

**Interfaces:**

- `GuideSectionId = 'start'|'moves'|'lessons'|'solve'|'algorithms'|'practice'|'timer'|'help'`.
- `GuideChapter = {id:GuideSectionId; title:string; summary:string; steps:readonly string[]; controls:readonly {name:string; description:string}[]; href?:string; tourIds:readonly TourId[]; screenshotIds:readonly string[]}`. Export `GUIDE_CHAPTERS:readonly GuideChapter[]`.
- `GuideScreenshot = {id:string; src:string; alt:string; caption:string; route:string; width:number; height:number; sourceRevision:string; scenario:string; exampleData:boolean}`. `screenshots.json` holds `{version:1, images:GuideScreenshot[]}`; capture provenance includes the tree/source revision and dirty flag in the validation record.
- Extend `ClubRoute` with `{kind:'guide'; section?:GuideSectionId}`. Accept `#/guide` and `#/guide/<section>`; unknown sections are not-found. Sections use route suffixes, not a second hash. `GuidePage({section?:GuideSectionId})` reads static content and scrolls/focuses the requested heading after render. `GuideImage({image:GuideScreenshot})` lazily loads an image and exposes a dialog enlargement with focus return.
- Extend the Task 2 provider with `openTour(href:string,id:TourId,mode:'start'|'resume'|'restart'):void`. This explicit Guide action records one in-memory pending request, navigates, and starts only when the expected route/targets and guards are ready. Cancel it on a different navigation or reload. Same-page use does not navigate. Page-tour Guide links end the overlay before opening the requested written section.

- [ ] Write `GuidePage.test.tsx` tests for all eight chapters, route variants, written instructions with failed images, accessible image enlargement, and explicit tour launch after route readiness. Tests for `chapters.ts` assert every catalog guideSection is a real chapter and every tour ID resolves. Assert Guide reload never requests cube-engine/solver assets or shows the welcome dialog. Pin routing:
  ```ts
  expect(parseClubRoute('#/guide/timer')).toEqual({ kind: 'guide', section: 'timer' });
  expect(parseClubRoute('#/guide/unknown')).toEqual({ kind: 'not-found' });
  ```
- [ ] Run `npx.cmd vitest run src/club/routes.test.ts src/club/guide src/club/tutorial`; establish red for the new route and content.
- [ ] Implement Guide navigation (Home, Moves, Learn, Timer, Guide), footer entry, page actions and chapter index. Exclude Guide from both cube-engine enablement and learning-tools rendering. Write original instructions for each feature; inventory current visible buttons, menu options and important conditional controls in the control-reference arrays. Include one short daily routine, orientation/notation explanations, local-only storage/export limits, and how to resume/restart tours. Reference real method/stage labels, but do not import engine-heavy registries. Use screenshot-free captions/text until Task 7 supplies actual assets; do not use invented UI images or placeholders in the release candidate. Keep screenshot IDs stable so Task 7 only adds assets/metadata.
- [ ] Run the unit tests and `npx.cmd playwright test e2e/club-guide.spec.ts e2e/club-tutorial.spec.ts`. Verify desktop/phone navigation, direct reload, blocked engine requests, image failure, keyboard enlargement and tutorial links to each supported route. Require zero unexpected console errors.
- [ ] Commit as `feat: add the club guide and page-tour directory`.

### Task 7: Current screenshots, combined validation and website release

**Files:** Create the capture scripts/tests, assets and validation document from the map. Modify `package.json` to add `capture:guide` and `verify:guide`; fill `screenshots.json`. Add `e2e/tutorial-production.spec.ts`. Update existing `e2e/club-entry.spec.ts`, `club-hero.spec.ts`, `club-learning.spec.ts`, `club-production.spec.ts`, `notation-explorer.spec.ts`, `notation-production.spec.ts`, `notation-renderer.spec.ts`, `timer-controls.spec.ts`, `timer-history.spec.ts`, `timer-production.spec.ts`, `timer-storage.spec.ts` only where explicit first-visit dismissal is needed. Keep all original assertions.

**Interfaces:**

- `CaptureScenario = {id:string; route:string; viewport:{width:number;height:number}; prepare(page:Page):Promise<void>; ready(page:Page):Promise<void>; target?:string; exampleData:boolean}`. `captureGuide({baseUrl:string,outputDir:string,sourceRevision:string}):Promise<GuideScreenshot[]>` uses a new isolated context for each scenario and closes it in finally. It writes only inside the resolved outputDir. No persistent browser profile or existing browser tab is used.
- `prepareTutorialScene(page:Page,scene:'home'|'quiz'|'moves'|'lesson'|'solve'|'algorithms'|'practice'|'timer'):Promise<void>` in `capture-fixtures.mts` owns deterministic setup usable later by media recording. Synthetic timer records remain capture-only; create them in the isolated context using the current storage schema and label the captured example visibly. Fixed scrambles and moves come from actual UI actions and verified fixtures.
- `verifyGuideManifest(manifest:{version:1;images:GuideScreenshot[]},assetRoot:string):Promise<string[]>` reports missing/duplicate assets, unsupported paths, invalid dimensions, absent alt/caption/revision, or unlabeled examples. Package scripts run the `.mts` capture entry with `--base-url`, `--output-dir`, `--revision`, or `--verify`.

- [ ] Add manifest tests rejecting traversal, missing image files, duplicate IDs and unlabeled timer examples. Add production tests for welcome + skip, Moves hands-on tour, safe Timer tour, Guide direct reload without engine assets, image failures, and no global-site tour. Pin the example requirement:
  ```ts
  expect(await verifyGuideManifest(unlabeledTimerFixture, assetRoot))
    .toContain('timer: example caption required');
  ```
- [ ] Run `npx.cmd vitest run scripts/tutorial/capture-contract.test.ts`; establish red. Implement the scripts and capture 10–12 focused desktop images covering all chapters and important solve/timer modes, plus 2–3 phone-specific examples. Use a built local site, await actual rendered cube frames and settled layout, and annotate through capture-only DOM callouts if needed. Do not replace real UI with drawings. Use readable crops, modest PNG sizes and lazy loading; verify every captured file visually before admission.
- [ ] Run `npm.cmd run build` and serve it with `npm.cmd run preview -- --port 4173 --strictPort`. Read `git rev-parse HEAD` into `$captureRevision`, then run `npm.cmd run capture:guide -- --base-url http://127.0.0.1:4173/cube-steps/ --output-dir public/club-guide --revision $captureRevision`. Record any dirty source state explicitly. Run `npm.cmd run verify:guide`; require no manifest issues. Rebuild once after adding the captured assets and check the final Guide images in desktop/phone browsers.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build`, `npm.cmd run test:e2e`, and `npm.cmd run test:production`. Also run the focused capture-contract test. Existing CI retains corpus/table/efficiency verification; do not remove those gates. If shared controller tests or broader checks uncover new risk, run the relevant additional regression rather than repeating already-passing suites without a change. Preserve actual error assertions and render-readiness waits in production tests. Document counts, commands, screenshots and limitations; do not call physical testing or owner acceptance complete without evidence.
- [ ] Perform the Native independent final review of Tasks 1–7 and address its actionable findings under the execution skill. Commit the validated website changes as `feat: complete the club tutorial guide and screenshots`, keeping task commits/review fixes as appropriate. Approval of this plan includes the established website integration workflow after checks/review: push a feature branch, create and attach its PR, wait for required checks, merge, publish Pages, verify the public club Guide/tour and global site, and synchronize the primary local main. Keep existing teaching-preview metadata/Pages flags unless separate physical acceptance exists. Record the deployed revision and links. No tutorial video is uploaded by this step.
- [ ] Preserve review and screenshot evidence outside disposable worktrees. Only remove an owned worktree once later tasks no longer depend on it and ignored media files have been copied to a verified workspace output folder. A delay in choosing a voice must not prevent completing the reviewed website release.

## Website completion record

`docs/validation/club-tutorial.md` records the code revision, first-visit behavior, all page-tour coverage, input/data-preservation checks, screenshot manifest revision, both browser projects, phone/keyboard/reduced-motion observations, independent-review disposition and live verification when published. Keep the video sample/full-film acceptance statuses explicitly separate.
