# Webb Club Foundation and Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public Webb club entry point, approved visual identity, focused learning experience and explained route questionnaire while sharing CubeSteps' teaching core.

**Architecture:** Add a second Vite HTML entry in the existing repository and one shared feature renderer, preserving global hash routes. Club branding, recommendation rules and local progress live in focused modules; solver, catalog and playback logic remain shared. The independently testable timer follows in its own plan.

**Tech Stack:** Existing React, TypeScript, Vite, cubing.js, Vitest/Testing Library, Playwright, Node 24+, CSS and SVG; no new runtime dependency or external service.

**Spec:** [Approved Webb club design](../specs/2026-10-12-webb-cubing-club-design.md), sections 1–5 and 7–10. Timer section 6 is implemented by the [timer plan](2026-10-12-webb-club-timer-implementation.md).

**Status:** Approved by the owner on October 13, 2026. Execute sequentially using Native, with independent final review. The owner also authorized GitHub merge, Pages publication, local synchronization, and cleanup of redundant task worktrees.

## Global Constraints

- Keep the product entirely in English.
- The club site is public and opens from an ordinary link or QR code.
- No GitHub account, membership login, payment or backend is required.
- Global: `/cube-steps/`, preserving existing hash routes. Club: `/cube-steps/club/`.
- The primary club navigation is Home, Learn and Timer; publish the complete navigation only when its real timer is connected.
- Keep real cube sticker colors in teaching and scramble diagrams.
- Do not invent meeting times, member profiles, announcements or school endorsements.
- Preserve existing method Preview labels until their teaching acceptance is complete.
- Do not collect names, email, school rosters or questionnaire analytics.

## Review Focus

1. Opening a shared club lesson directly then refreshing: keep club branding and the selected method/lesson (Tasks 1 and 4).
2. Existing global selections and a malformed club preference: isolate namespaces and avoid silently overwriting recoverable data (Task 3).
3. An eager novice selects an advanced goal: ability still recommends LBL, with a clear manual route change (Task 3).
4. A slow solve/fixture response arrives after navigation: ignore it and retain the correct lesson/preview status (Task 4).
5. Reduced-motion preference changes during playback: suppress decoration without changing cube state, narration or keyboard focus (Task 5).

## Execution and file map

Use the isolated execution checkout selected through `using-git-worktrees`; inspect actual refs before continuing from F2L. Keep design changes and production implementation in the existing repository. No new GitHub project, hosting provider or dependency installation is part of this plan.

| Files | Responsibility |
| --- | --- |
| `club/index.html`, `src/club/main.tsx`, `ClubApp.tsx`, `routes.ts` (new); `vite.config.ts` | Second entry point and club routing |
| `src/app/SharedFeaturePage.tsx`, `use-cube-engine.ts`, `edition.tsx` (new); `App.tsx` | Shared feature composition and edition context |
| `src/club/components/ClubHeader.tsx`, `ClubFooter.tsx`, `ClubLogo.tsx`, `HomePage.tsx`, `club.css`, `assets/*.svg` (new) | Approved identity and homepage |
| `src/club/learning/types.ts`, `recommend.ts`, `progress-store.ts`, `use-club-progress.ts`, `RouteQuiz.tsx`, `ClubLearnPage.tsx` (new) | Pure recommendations and local learning state |
| `src/app/LearnPage.tsx`, `LessonLayout.tsx`, shared storage factories | Small edition-aware boundaries; retain method/content logic |
| `src/ui/motion.tsx`, `motion.css` (new), both entry points | Shared optional motion feedback |
| New `e2e/club-*.spec.ts`, `docs/validation/webb-club.md` | Club behavior, production evidence and approval record |

Entry-point contract: `src/club/main.tsx` mounts `ClubApp`; both entry points establish `data-edition="global" | "club"` on the document root. Keep all club-only selectors under `[data-edition="club"]` because the current build emits shared CSS. Use a two-entry `rolldownOptions.input` while retaining worker-safe code splitting. All internal assets use Vite-resolved imports or `import.meta.env.BASE_URL`; the root base remains `/cube-steps/`.

---

### Task 1: Share feature composition and add the club entry

**Files:** Create `club/index.html`, `src/club/main.tsx`, `ClubApp.tsx`, `routes.ts`, `routes.test.ts`, `src/app/SharedFeaturePage.tsx`, `SharedFeaturePage.test.tsx`, `use-cube-engine.ts`, `edition.tsx`, `e2e/club-entry.spec.ts`. Modify `src/app/App.tsx`, `vite.config.ts`. Preserve `src/main.tsx`'s development player fixture.

**Interfaces:** Define `SharedFeatureRoute = Exclude<AppRoute, {kind:'not-found'}>`. `SharedFeaturePage({route, engine}: {route:SharedFeatureRoute; engine:CubeEngine})` composes the existing Learn/Solve/Algorithms/Practice pages. `useCubeEngine(enabled: boolean): {engine:CubeEngine|null; error:string; retry():void}` caches a successful engine and clears a rejected load on retry. `EditionProvider({edition, children})` / `useEdition(): 'global'|'club'` default to global. `parseClubRoute(hash: string): {kind:'home'} | {kind:'quiz'} | {kind:'timer'} | AppRoute` distinguishes empty club home from the global default lesson.

- [ ] Write route tests: `expect(parseClubRoute('#/')).toEqual({kind:'home'})`; `expect(parseClubRoute('#/learn/cfop/intro')).toEqual({kind:'learn',method:'cfop-beginner',lessonId:'intro'})`; global `parseRoute('')` still returns LBL notation. Verify invalid club lessons are not silently replaced. Add a browser test that reloads `/cube-steps/club/#/learn/white-cross` and remains in the club entry. Test engine loading failure/retry and that home/quiz do not wait for an engine.
- [ ] Run `npx.cmd vitest run src/club/routes.test.ts src/app/routes.test.ts src/app/SharedFeaturePage.test.tsx`; establish red for the new entry contracts.
- [ ] Extract the existing page dispatch into `SharedFeaturePage`, preserving lazy imports, cancellation ownership and method status labels. Implement the entry/router contracts and shared engine hook. Reuse existing hash paths for shared features, so course/library links remain inside the current entry. Reserve the timer route but do not publish a nonfunctional timer link; Task 4 of the timer plan supplies its real view.
- [ ] Run the targeted tests, `npm.cmd run typecheck`, `npm.cmd run build`, `npx.cmd playwright test e2e/club-entry.spec.ts e2e/learning.spec.ts e2e/method-switching.spec.ts`. Check `dist/index.html` and `dist/club/index.html` both exist, worker URLs resolve, and club CSS cannot recolor the global page. A production route check belongs to Task 5 and final timer integration.
- [ ] Commit explicit changed files with `git commit -m "feat: add club entry with shared teaching features"`.

### Task 2: Build the approved club identity and homepage

**Files:** Create `src/club/assets/mark.svg`, `wordmark.svg`, `icon.svg`, `mark-mono.svg`; `src/club/components/ClubLogo.tsx`, `ClubHeader.tsx`, `ClubFooter.tsx`; `src/club/HomePage.tsx`, `club.css`. Modify `club/index.html`, `src/club/ClubApp.tsx`, `e2e/club-entry.spec.ts`.

**Interfaces:** `ClubLogo({compact?:boolean, monochrome?:boolean})`; `ClubHeader({active:'home'|'learn'|'timer', timerAvailable:boolean})`; `HomePage({resumeHref?:string})`. The approved references are committed under `docs/superpowers/specs/assets/webb-club/`; the selected logo is the middle B concept.

- [ ] Inspect the approved desktop/phone screenshots and logo study before authoring assets. Record the visual checklist: recognizable compact W/cube at 24 px and favicon scale; blue/white palette; A homepage spacing/headings; one restrained C-style blue club section; clear Start Learning action; no invented club schedule.
- [ ] Implement original geometric SVG assets from that direction and the scoped CSS/components. Use working palette navy `#08264A`, royal blue `#165DDE`, pale blue `#EDF4FF`, white `#FFFFFF`; these are project tokens, not official school codes. Check text contrast before finalizing. Use local/system fonts: Georgia for editorial headings and the existing sans-serif stack for controls. Preserve real puzzle colors. Add English title/description, SVG favicon and accessible wordmark labels to the club HTML.
- [ ] Open desktop 1280 px and phones 390/360 px. Verify the header, hero, blue section, footer, start/resume actions, navigation wrapping, focus outlines and logo at small sizes. Save screenshots and compare them to the approved composition. This is visual validation, not a snapshot assertion that merely copies CSS values.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run build` and the existing/new entry navigation tests; inspect browser errors. Keep the Timer link absent until connected rather than shipping a fake page. Commit with `git commit -m "feat: style the Webb club homepage and identity"`.

### Task 3: Recommend available routes and preserve local learning progress

**Files:** Create `src/club/learning/types.ts`, `recommend.ts`, `recommend.test.ts`, `progress-store.ts`, `progress-store.test.ts`, `use-club-progress.ts`, `RouteQuiz.tsx`, `RouteQuiz.test.tsx`; modify `src/club/ClubApp.tsx`, `HomePage.tsx`, `src/practice/storage.ts`, `storage.test.ts`, `src/app/color-entry/draft-storage.ts`, `draft-storage.test.ts`, `src/app/practice/PracticePage.tsx`, `src/app/SolvePage.tsx`.

**Interfaces:** `QuizAnswers = {ability:'new'|'beginner'|'f2l'|'two-look'; goal:'first-solve'|'smooth'|'advanced'; duration:'short'|'long'; setting:'club'|'home'|'both'}`. `recommendRoute(answers: QuizAnswers): {method:MethodId; firstLessonHref:string; reasons:string[]; nextStep:string}` implements the approved table, not a scored personality test.

`ClubProgress = {version:1; selectedMethod:MethodId; lastLesson?:{method:MethodId; lessonId:string}; practiced:Partial<Record<MethodId,string[]>>}`. `createClubProgressStore(storage:()=>Storage)` provides `load(): {value:ClubProgress; available:boolean; writable:boolean}`, `save(value:ClubProgress):boolean`, `reset():boolean`. Use key `cubesteps.club.progress.v1`; validate all lesson/method IDs against the existing registry. Unknown/corrupt versions use in-memory state and remain unwritten until an explicit Reset. No quiz answers are persisted.

Add an optional key argument to `createPracticeStore` and `createDraftStore`, retaining their existing default keys. Club wrappers pass `cubesteps.club.practice-selection.v1` and `cubesteps.club.color-draft.v1`; global callers retain defaults. `ClubProgressProvider({children:ReactNode})` owns one store. `useClubProgress()` exposes `{progress, available, writable, chooseMethod(method:MethodId), visitLesson(method:MethodId,lessonId:string), setPracticed(method:MethodId,lessonId:string,value:boolean), reset()}` backed by that provider so quiz, home and course views stay synchronized.

- [ ] Add a table test over all 4 abilities × 3 goals × 2 durations × 3 settings. A new member with `goal:'advanced'` still gets `lbl`; only `ability:'two-look', goal:'advanced'` gets `cfop-advanced`; the remaining independent solvers get `cfop-beginner`. Every first link parses to that method's introductory lesson. Changing duration/setting changes practice advice, not method. Test skip/back, keyboard completion and a manual override. Test last-lesson validation, local reload, denied/quota storage, corrupt/newer versions remaining byte-for-byte unchanged, and global/club namespace isolation.
- [ ] Run `npx.cmd vitest run src/club/learning src/practice/storage.test.ts src/app/color-entry/draft-storage.test.ts`; confirm missing contracts fail.
- [ ] Implement the pure rules and four-question UI using the spec's wording/meaning. Short sessions suggest one lesson segment or one small formula group; longer sessions add a second review/practice segment. Explain why, provide Start Lesson and Change Route actions, and retain raw answers only in component state. Wire persisted chosen method/resume to home, with visible local-save status and user-triggered Reset for invalid local state. Inject the storage keys through edition context, without changing global storage behavior.
- [ ] Run the targeted tests and `npm.cmd run typecheck`. Verify route IDs exist in `getCourse`, no Roux/ZZ result is generated and selecting Advanced preserves its current Preview label.
- [ ] Commit with `git commit -m "feat: recommend club learning routes and save progress"`.

### Task 4: Deliver focused lessons without duplicating teaching logic

**Files:** Create `src/club/learning/ClubLearnPage.tsx`, `ClubLearnPage.test.tsx`, `e2e/club-learning.spec.ts`; modify `src/app/LearnPage.tsx`, `LessonLayout.tsx`, `src/club/ClubApp.tsx`, `src/club/club.css`, `src/club/learning/use-club-progress.ts`.

**Interfaces:** `ClubLearnPage({engine,method,lessonId}: {engine:CubeEngine;method:MethodId;lessonId:string})` wraps the existing `LearnPage` with progress/resume controls. `ClubApp` dispatches its learn route to this wrapper; the global shared renderer does not import the club shell. Add optional `footer?: ReactNode` to `LearnPage` and a class/presentation boundary on `LessonLayout`; global defaults are unchanged. Content, examples, solve client and player remain in the existing shared page. Do not create a second lesson data set.

- [ ] Write tests for returning to a saved lesson, toggling Mark as practiced with self-reported copy, changing methods without losing another route's practiced IDs, and a delayed example response after navigation. Assert selected lesson and player source agree; global methods retain their current UI/status. Browser-test shared club solve/color entry, library, selected-case practice and browser Back/Forward without leaving `/club/`.
- [ ] Run `npx.cmd vitest run src/club/learning/ClubLearnPage.test.tsx src/app/LearnPage.test.tsx`; confirm new progress/club controls fail before implementing.
- [ ] Implement the focused B composition with lesson goal, holding guidance, player/instruction area, check and next action. Move the secondary lesson list into a compact phone control using existing link semantics. Keep free solving and formula tools reachable from Learn; use the shared F2L guide. Persist valid visits and self-reported practiced flags only; never infer mastery from playing an animation. Cancel pending solve/fixture work on route/source changes using existing clients.
- [ ] Run targeted tests and `npx.cmd playwright test e2e/club-learning.spec.ts e2e/color-entry.spec.ts e2e/algorithm-library.spec.ts e2e/algorithm-practice.spec.ts`; inspect 360/390 px and desktop, keyboard operation and browser errors. Verify LBL still teaches the white daisy and both CFOP routes are reachable.
- [ ] Commit with `git commit -m "feat: add focused club learning and resume controls"`.

### Task 5: Share restrained motion and verify both entry points

**Files:** Create `src/ui/motion.tsx`, `motion.test.tsx`, `motion.css`, `e2e/club-production.spec.ts`, `docs/validation/webb-club.md`; modify both root components, `src/styles.css`, `src/club/club.css`, `e2e/club-entry.spec.ts`, `e2e/club-learning.spec.ts`. Timer integration later extends the same validation record.

**Interfaces:** `MotionProvider({edition,children})`, `useMotion(): {enabled:boolean; preference:'system'|'off'; storageAvailable:boolean; setPreference(value:'system'|'off'):void; resetPreference():void}`. Keys are `cubesteps.motion.v1` and `cubesteps.club.motion.v1`, each storing `{version:1, preference:'system'|'off'}`. Unsupported/corrupt values remain unwritten until explicit reset; changes may still apply in memory. System reduced motion always wins; the local switch can disable motion but cannot override that preference. Root `data-motion="full"|'reduced'` controls CSS. Essential cube playback remains explicitly user-controlled and uses its existing speed/step controls.

- [ ] Test system preference changes, local Off/reload, unavailable storage, corrupt/newer data preservation/reset and edition-key isolation. While a cube is paused on a selected move, changing motion settings must leave its boundary state, selection and focus unchanged. No opacity-only transition may leave a focusable control invisible or unclickable.
- [ ] Run `npx.cmd vitest run src/ui/motion.test.tsx`; establish the missing behavior fails.
- [ ] Implement 120–180 ms control feedback and at most 240 ms panel entrance transitions using opacity/transform. No global continuous decorative loop is needed. Suppress decoration while hidden and expose the hook for the timer to request a static surface. Add the small motion preference control to both editions without applying club colors to global CubeSteps.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build`; run club entry/learning browser tests plus `npm.cmd run test:production` with the new club checks. Validate deep-link reloads, favicon/assets, keyboard focus, reduced motion and absence of console/page errors in Chromium and WebKit. Record actual evidence and any limitations; this foundation is locally usable without the Timer feature but is not the complete club launch.
- [ ] Commit with `git commit -m "feat: share accessible motion across CubeSteps editions"`. Continue into the timer plan after this slice is green. Do not deploy an incomplete club launch or claim the reserved Timer route is complete.

## Plan self-review and handoff

Architecture/branding map to Tasks 1–2, questionnaire/local data to Task 3, learning/feature reuse to Task 4, and motion/accessibility/entry verification to Task 5. Every Review Focus item has an owning assertion. Club preferences use explicit separate keys; current global defaults remain the compatibility contract. The timer plan consumes these entry, edition, motion and progress boundaries. The owner reviews this plan before Native execution; no product work is recorded complete here.
