# Advanced Roux Club Learning and Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the verified solver teachable and usable through club courses, CMLL practice, route recommendations, Lab comparisons and physical records.

**Architecture:** Reuse the shared player and new worker protocol. Roux experiments have a separate database and method identity; reuse timing/summary logic through typed endpoints, not CFOP-shaped route casts. Publish the website preview only after integrated verification and review.

**Tech Stack:** Existing React/TypeScript, IndexedDB, Web Workers, Vitest and Playwright. No accounts/backend or new production dependency.

**Spec:** [Approved design](../specs/2026-10-23-advanced-roux-and-ui-design.md), Sections 5 and 10–13; [overview](2026-10-23-roux-ui-upgrade-plan.md). Tasks 16–22 of 26, after Task 15.

## Global Constraints

- Advanced Roux is club-only and Preview; Roux Test Lab is Experimental. Preserve Beginner Roux and existing CFOP Lab `#/lab` links/data.
- Lab routes: `#/roux-lab`, `#/roux-lab/compare`, `#/roux-lab/trials`; ordinary advanced method slug `advanced-roux`.
- Separate database `cubesteps.club.roux-lab`, schema 1. Default exports omit labels/trials unless explicitly included.
- Import limits: 10 MiB, 50 experiments, 5,000 attempt/revision records, four routes/six comparisons each, 512 tokens/128 actions per route, labels 60 chars, notes 2,000.
- Physical trial endpoint is both complete blocks before CMLL. Five complete matched A/B blocks are needed for descriptive medians; no significance/fastest claim.
- Timer's ao5/ao12, inspection and historical data remain unchanged. No tours/search/playback during active trial timing.

## Review Focus

- Existing progress is erased because an unloaded course is considered invalid — Tasks 16–17.
- Symmetric CMLL drills repeat/reveal the wrong case or use current global CFOP registry labels — Task 16.
- Re-ranking changes pinned route A/B or a trial's starting hold — Tasks 18–19.
- Corrupt/foreign imports or aborted saves appear successful — Task 20.
- Blur/retry/manual timing silently pollutes matched summaries — Task 21.

---

### Task 16: CMLL reference, practice and normal advanced entry

**Files:** Create `src/club/roux-advanced/AdvancedRouxFeaturePage.tsx`, `CmllLibrary.tsx`, `CmllCasePage.tsx`, `CmllPractice.tsx`, `preferences.ts`, tests and `roux-advanced.css`; create `src/methods/roux-advanced/cmll/demonstration.ts`/test. Modify `src/methods/availability.ts`, `src/app/routes.ts`, `src/club/routes.ts`, `ClubApp.tsx`, `src/app/SolvePage.tsx`, `src/club/learning/types.ts`, `src/player/playback-source.ts`, `playback-timeline.ts`, `PlaybackView.tsx`; create `e2e/cmll-library.spec.ts`, `cmll-practice.spec.ts`, `advanced-roux-input.spec.ts`.

**Interfaces:** Club routes add `#/cmll`, `#/cmll/<caseId>`, `#/cmll-practice`; invalid IDs are not-found. `createCmllDemonstration(engine,caseId,variantId,frameId,auf:Quarter):{source:PlaybackSource;recognition:string;holding:string}` independently admits the inverse-setup case and creates a verified player timeline without a fake full-cube solve. Add `PlaybackSource` member `{kind:'cmll';prepared:{timeline:PlaybackTimeline;setup:readonly TeachingMove[];algorithms:Readonly<Record<string,TeachingAlgorithm>>;label:string}}` and section IDs `cmll-setup`/`cmll-formula`; resolve labels/formulas from this prepared object, not the global CFOP catalog. Extend `src/player/initial-setup.ts` to use the verified prepared setup for this discriminant. `CmllPracticeSelection={version:1;caseIds:readonly string[];frameId:RouxFrameId}` under `cubesteps.club.cmll-practice.v1`; `pickCmllCase(selection,previousId,rng:()=>number):string|null` handles empty/singleton sets deterministically.

`SolvePage` accepts optional `rouxOptions:{allowedFrames:readonly RouxFrameId[];onAllowedFramesChange:(ids:readonly RouxFrameId[])=>void}` only for the new method. It passes immutable settings to Task 14, cancels on change and shows trace basis/evidence. Default white/blue; advanced feature route lazy-loads its runtime. Task 17 adds course registration and its Learn link before the feature is published. Do not import all advanced assets into the global shell.

- [ ] **Write tests:** all 42 cases filter/reveal/replay; chosen variant differs correctly from default; empty selection is explained, singleton selection works, symmetries do not duplicate IDs. Test corrupt/unavailable preference storage, new method club-only, and old deep links. Assert `expect(availableMethods('global')).not.toContain('roux-advanced')` and `expect(availableMethods('club')).toContain('roux-advanced')`.
- [ ] **Run red:** `npx.cmd vitest run src/club/roux-advanced src/methods/roux-advanced/cmll/demonstration.test.ts`.
- [ ] **Implement** family diagrams, recognition/holding, segmented formula, primary/alternate controls, source links and untimed selected-case drills. Use original engine-generated diagrams. Normal solving offers compact frame controls and clear optimized/fallback disclosure; preserve current color draft storage.
- [ ] **Verify:** focused unit tests and the three new browser specs. Validate real animation under each selected variant/hold and real solved/invalid/random/text/color inputs. No CFOP catalog assumption may label CMLL incorrectly.
- [ ] **Commit:** `git commit -m "feat: add club CMLL library and advanced Roux solving entry"`.

### Task 17: Nine-chapter course and neutral learning questionnaire

**Files:** Create `src/content/roux-advanced-course.ts`, `src/content/roux-advanced/{examples,diagrams,details}.ts`, their tests, `src/content/roux-advanced/example-fixtures.json`, `scripts/roux-advanced/build-examples.mts`; modify `src/content/courses.ts`, `src/club/roux-advanced/AdvancedRouxFeaturePage.tsx`, `src/club/learning/types.ts`, `recommend.ts`, `RouteQuiz.tsx`, `progress-store.ts` and their tests; create `e2e/advanced-roux-learning.spec.ts`.

**Interfaces:** Reuse `Lesson`/`CaseExample` from `src/content/course-types.ts`. `RouxWorkedExample=CaseExample & {frameId:RouxFrameId;recognition:string;physicalChecks:readonly string[]}`; `ADVANCED_ROUX_COURSE:readonly Lesson[]` and `ADVANCED_ROUX_DETAILS:Readonly<Record<string,{overview:string;workedExamples:readonly RouxWorkedExample[];mistakes:readonly {symptom:string;explanation:string;recovery:string}[];physicalChecks:readonly string[];referenceIds:readonly string[]}>>`. Register via `registerAdvancedRouxCourse(course:readonly Lesson[]):void`; lazy registration must not determine whether stored lesson IDs are valid.

Lesson IDs: `intro`, `ar-first-block`, `block-strategies`, `block-lookahead`, `ar-second-block`, `ar-cmll`, `ar-eolr`, `starting-block`, `practice-compare`. Use a lightweight allowed-lesson-ID map in route/progress validation so conceptual chapters need not fake solver stage IDs. Link last-four content inside `ar-eolr` and offer direct stage playback.

Quiz answers retain existing fields and add `preference:'layers'|'blocks'|'unsure'`, `foundation:'none'|'independent'|'cfop-two-look'|'roux-blocks'|'roux-basic'`. `recommendRoute` returns existing method/reasons/firstLessonHref/nextStep plus `alternatives:readonly MethodId[]`. Primary new solvers remain LBL with an explicit Beginner Roux alternative; independent block interest → Beginner Roux; basic Roux complete + advanced goal → Advanced Roux. Do not infer a new answer from an old stored one.

- [ ] **Write table-driven quiz tests** for every design row and conflicting input (advanced goal without prerequisites), and old progress fixtures with all four prior methods. Assert existing practice marks survive and a new unloaded course's valid lesson is not discarded. Course tests require worked cases, mistakes, physical checks and verified formula references for all nine chapters.
- [ ] **Run red:** `npx.cmd vitest run src/content/roux-advanced-course.test.ts src/club/learning/recommend.test.ts src/club/learning/progress-store.test.ts`.
- [ ] **Author original lessons/examples** for every construction family, M/M′, CMLL recognition, EOLR/basic comparison and eight-way hold selection. Generate legal fixture setups and validate the actual intended case. Build prerequisite links instead of requiring all 42 algorithms at once. Add `verify:advanced-roux:examples` with deterministic generator `--verify`.
- [ ] **Verify:** tests, new example verifier and browser learning spec; inspect readable mobile lessons and actual case/step consistency. Preserve manual choice of any offered course; no aptitude/fastest-method claim.
- [ ] **Commit:** `git commit -m "feat: teach advanced Roux and recommend method-aware learning routes"`.

### Task 18: Progressive Roux Lab analysis workspace

**Files:** Create `src/club/roux-lab/{RouxLabWorkspace,AnalyzePage,OrientationPicker,ResultSummary}.tsx`, `session.ts`, `preferences.ts`, `owner.ts`, their tests and `roux-lab.css`; modify `src/club/routes.ts`, `src/club/ClubApp.tsx`, `src/club/components/ClubHeader.tsx`; create `e2e/roux-lab-worker.spec.ts`, `roux-lab-workspace.spec.ts`.

**Interfaces:** `RouxLabSession={input:RouxInput|null;settings:RouxSettings;coverage:RouxCoverage|null;routes:readonly RouxRoute[];selectedId:string|null;status:'idle'|'initializing'|'searching'|'complete'|'stopped'|'failed';error:string}`. `reduceRouxLabSession(state,event):RouxLabSession` consumes validated Task 14 events and UI select/start/stop/reset actions. `createRouxLabOwner()` lazily owns the client and exposes `dispose()`; Tasks 20–21 add its repository and active-trial memory. Do not open IndexedDB just by importing the club shell. Persist a schema-1 nonempty frame set under `cubesteps.club.roux-lab.preferences.v1`; invalid values leave existing storage untouched and use the all-eight default in memory.

- [ ] **Write tests:** allowed subset never empty, setting/input changes cancel the prior request, all-eight defaults, actual explored-frame status, lower/proven bounds, deadline/error with saved incumbents, disposal and no redraw of a selected route. Assert a reference-only witness has no “Play full solve” action.
- [ ] **Run red:** `npx.cmd vitest run src/club/roux-lab/session.test.ts src/club/roux-lab/preferences.test.ts`.
- [ ] **Implement** Analyze with current input widgets, one player, bounded progress and explicit stop. Show the actual selected physical hold and why this route helps; expose count semantics/proof scope in details. No fictitious percentage, invented seconds or silent switch to an unselected orientation.
- [ ] **Verify:** focused tests + the new browser specs; ensure global edition loads no Roux Lab chunks/links on ordinary navigation and existing `#/lab` still opens CFOP.
- [ ] **Commit:** `git commit -m "feat: add progressive club Roux Lab analysis"`.

### Task 19: Stable route comparison and playback

**Files:** Create `src/club/roux-lab/{ComparePage,RouteSummary,RouxLabPlayer}.tsx`, tests; `src/roux-lab/comparison.ts`/test; extend session; create `e2e/roux-lab-player.spec.ts`, `roux-lab-compare.spec.ts`.

**Interfaces:** `RouxPinnedComparison={id:string;inputFingerprint:string;A:RouxRoute;B:RouxRoute}` immutable snapshots. `pinRouxComparison(a,b):RouxPinnedComparison` requires distinct verified routes from the same input. `RouxLabPlayer({engine,route,onPosition}:{engine:CubeEngine;route:RouxRoute;onPosition?:(snapshot:SourcePlaybackSnapshot)=>void})` uses shared PlaybackView and Task 13's adapter; no second renderer/controller.

- [ ] **Write tests:** A/B IDs survive rank updates, switching routes resets to the correct input/hold, playing route remains pinned, duplicate/foreign inputs rejected, and basic LSE is a separate verified route. Assert counts equal timeline tokens at the recorded block boundaries; CMLL/LSE counts never enter the FB+SB subtotal.
- [ ] **Run red:** `npx.cmd vitest run src/roux-lab/comparison.test.ts src/club/roux-lab/RouxLabPlayer.test.tsx`.
- [ ] **Implement** aligned desktop summaries and phone route cards with one active player. Show recommended, shortest-reference and actual alternatives only; fewer distinct routes produce fewer cards. Plain-English tradeoffs cite actual preserved pieces/grip events, and unproven references remain labeled.
- [ ] **Verify:** unit + new player/compare browser specs, including reverse rotations, stage/action replay, active pinning and reduced motion. Record target/current-move/explanation synchronization screenshots.
- [ ] **Commit:** `git commit -m "feat: compare stable Roux routes with shared playback"`.

### Task 20: Separate experiments, reliable storage and transfer

**Files:** Create `src/roux-lab/experiments/{types,schema,storage,repository,snapshots,transfer,csv}.ts` and tests; `src/club/roux-lab/{ExperimentTransfer,ExperimentPanel}.tsx`; create `e2e/roux-lab-storage.spec.ts`, `roux-lab-transfer.spec.ts`. Extract pure transaction/CSV/immutability helpers only where used twice; do not generalize CFOP route validation.

**Interfaces:** `RouxExperiment` schema 1 includes method `roux-advanced`, immutable input/settings/coverage, selected full `RouxRoute[]`, app/model/search/catalog versions, createdAt/id and setup witness. `RouxComparison` holds experimentId/routeAId/routeBId/id/createdAt. `RouxTrialBlock` uses stable A/B slots and intended AB/BA order. `RouxAttempt` uses existing attempt/revision fields with `endpoint:'roux-blocks'` and `method:'roux-advanced'`; timing enums stay keyboard/touch/external-manual. `RouxNotebook` has experiments/comparisons/trialBlocks/testers/attempts/attemptRevisions arrays.

`openRouxStore(factory:IDBFactory,verify:(e:RouxExperiment)=>Promise<void>):Promise<RouxStore>` uses only `cubesteps.club.roux-lab`, schema 1. `RouxStore` exposes `list`, `saveExperiment`, `saveComparison`, `saveBlocks`, `saveTester`, `saveAttempt(record,expectedRevision)`, `softDeleteAttempt(id,expectedRevision)`, `undoDelete(token)`, `commitImport(data)` and `close`; promises resolve only after transaction completion. `createRouxRepository(open:()=>Promise<RouxStore>)` exposes `snapshot`, `subscribe`, `refresh`, those save/import operations, `retry(id)` and `dispose`; snapshots include pending/conflict/error states. A delete token is `{id:string;revision:number}`.

`previewRouxImport(engine,text:string,assets):Promise<{data:RouxNotebook;conflicts:readonly {id:string;reason:string}[]}>` bounds before parse/replay; `exportRouxExperiments(snapshot,selection:{ids:readonly string[];includeTrials:boolean;includeLabels:boolean}):string`; `exportRouxCsv(attempts):string`. Imported previews are inert until explicit atomic save. Keep validated formula snapshots for archival playback. Wire the repository into Task 18's owner here; preserve its lazy initialization/disposal behavior.

- [ ] **Write tests:** exact 10MiB/50/5,000/4/6/512/128/60/2,000 boundaries; foreign CFOP files, unsupported version, executable-like strings, orphan references, malformed formulas, fingerprint mismatch, unavailable/quota-aborted DB, retry and multi-tab revision conflicts. Assert a failed transaction stays pending and cannot report saved. Existing CFOP/Timer database contents remain byte-for-byte unchanged by Roux operations.
- [ ] **Run red:** `npx.cmd vitest run src/roux-lab/experiments`; browser storage tests provide actual IndexedDB transaction evidence.
- [ ] **Implement strict domain validation and atomic persistence.** Bound total attempt+revision count together; preserve unknown/corrupt records for export instead of overwriting. Import full route replay includes centers and FB/SB endpoint. Escape CSV and neutralize formula prefixes. Default routes-only export excludes private tester labels even when they exist locally.
- [ ] **Verify:** new suites plus existing Lab storage/transfer and Timer storage browser tests. Inspect exported/imported snapshots against route/version identity; archive playback does not depend on a later preferred formula choice.
- [ ] **Commit:** `git commit -m "feat: persist and transfer independent Roux experiments safely"`.

### Task 21: Physical trials and descriptive summaries

**Files:** Create `src/roux-lab/trials/{types,machine,blocks,summary}.ts` and tests; `src/club/roux-lab/{TrialsPage,TrialTimer,TrialHistory,ComparisonSummary}.tsx`; modify existing pure `src/lab/trials/` helpers only for typed endpoint reuse; create `e2e/roux-lab-trials.spec.ts`.

**Interfaces:** Keep existing public CFOP types/functions as wrappers with default endpoint `cross-f2l`. Extract/genericize only pure trial state/eligible-pair logic to support literal endpoint `roux-blocks`; do not cast Roux attempts to the default CFOP type. `createRouxTrial(conditions:RouxTrialConditions,token?:number):RouxTrialState`; `reduceRouxTrial(state,event):{state:RouxTrialState;effects:readonly RouxTrialEffect[]}` mirrors current hold/release machine with exact existing 300ms hold. `summarizeRouxComparison(comparison,testerId,timingMethod,blocks,attempts)` returns status/counts/exclusions/medianA/medianB/medianDifference and separate rating distributions.

- [ ] **Write tests:** complete blocks 4 → `insufficient`, 5 → `ready`; use median of paired B−A differences. Exclude other input/route versions/endpoints/testers/timing methods and preserve exclusions. Cover AB then BA, invalid retry followed by explicit valid retry, absent ratings, manual malformed values, blur/hidden/Escape/navigation/touch cancellation, editable fields and duplicated key events.
- [ ] **Run red:** `npx.cmd vitest run src/roux-lab/trials`; existing CFOP trial tests must remain green under their unchanged default wrapper.
- [ ] **Implement** setup diagram + initially unchecked state/hold confirmations, warm-up/measured attempts, timing, classification and notebook. Quiesce all search/playback before timing; require setup reconfirmation for the next attempt. Explain the endpoint as both blocks, before CMLL. Timer does not sense turns or imply official competition timing. No ao5/ao12 or scientific winner label.
- [ ] **Verify:** new unit/browser tests, current `e2e/lab-trials.spec.ts`, Timer controls/history/storage; unsaved review drafts survive navigation interruptions for deliberate retry/export.
- [ ] **Commit:** `git commit -m "feat: compare physical Roux block trials without mixing conditions"`.

### Task 22: Guide, compatibility, independent review and website preview publication

**Files:** Modify `src/club/guide/types.ts`, `chapters.ts`, `screenshots.json`, `GuidePage.tsx`, `src/club/tutorial/{catalog,types}.ts`, `scripts/tutorial/{capture-guide,capture-contract,capture-fixtures}.mts`; create `e2e/advanced-roux-production.spec.ts`, `roux-lab-production.spec.ts`, update affected tours/e2e expectations, `README.md`, `docs/validation/2026-10-23-advanced-roux.md`, `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `package.json`.

**Interfaces:** New Guide section IDs `advanced-roux` and `roux-lab`; maintain all current IDs. Capture metadata records actual sourceRevision/route/scenario/size. New tour IDs are `advanced-roux` and `roux-lab`; selectors use existing guidance hooks and never intercept active timing. Both CI and Pages execute new `verify:advanced-roux`, example verifier, coverage/corpus scripts alongside every existing required gate.

- [ ] **Write compatibility checks:** preserved old links and progress, all advanced deep links, failed asset retry, no global club leakage, tours never launch during a trial, live build revision and no console errors. Confirm import/export and basic-mode switch use exact current UI instructions. Test publication metadata remains on the old accepted film until Task 26.
- [ ] **Implement** original Guide text, capture real screenshots, reconnect tour targets, update README without school identity/club promotion on the global page, and append the new gates to CI/Pages. The existing `GuideVideo` content stays intact until accepted replacement media exists.
- [ ] **Run complete verification:** current CI command list plus new advanced gates, all dev/production browser checks, desktop/mobile/zoom/reduced-motion/WebGL scenarios and the benchmark corpus. Save actual evidence and known limitations. No skipped/blocked check is reported PASS; no required gate is removed to reduce waiting.
- [ ] **Independent whole-branch review:** use `requesting-code-review` with a fresh reviewer per preserved Native workflow. Address findings, then rerun affected checks and the required final gates for the resulting commit. Prepare a reproducible owner/Josh physical test pack; physical acceptance may remain pending for Preview deployment.
- [ ] **Commit/publish website:** use the existing finishing workflow on the reviewed head; push/create PR, attach it to this chat, wait for required checks and resolve review findings. Merge only that verified head. Dispatch Pages with `publish_preview=true`, `teaching_accepted=false` for the new method unless the owner has actually supplied acceptance. Inspect workflow result and live build revision, new/old routes, mobile screenshots, errors and data preservation.
- [ ] **Synchronize and report:** preserve local changes, fast-forward primary main to remote, verify equality/cleanliness; archive/remove only merged disposable worktrees/branches, retaining needed ignored media/validation artifacts first. Report club/global/Guide links and pending physical acceptance. Continue to the media plan from a fresh isolated branch based on the verified website revision.
