# CFOP Lab Physical Experiments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members reproduce fixed Lab routes, record honest Cross + F2L comparisons, preserve/export their work and assess the experiment on real cubes.

**Architecture:** Separate immutable experiment/comparison snapshots from revisioned attempt records. A Lab-specific timer state machine feeds a transaction-aware repository, descriptive paired summaries and bounded import/export. The everyday Timer database and scoring remain independent.

**Tech Stack:** Existing TypeScript/React, native IndexedDB, Vitest and Playwright. Reuse pure input/timing helpers only when semantics match. No accounts, backend, telemetry, cloud sync or new runtime dependency.

**Spec:** [Approved CFOP Lab design](../specs/2026-10-14-cfop-lab-design.md), sections 8–11.

**Status and order:** Awaiting plan review; preserve Native execution. Tasks 11–15 follow [core Tasks 1–6](2026-10-14-cfop-lab-core.md) and [workspace Tasks 7–10](2026-10-14-cfop-lab-workspace.md). The final task includes the independent review and established GitHub/Pages workflow after applicable gates pass.

## Global Constraints

- Every trial is tied to immutable physical input, route, starting hold, model/catalog/search versions and timing method. New searches never rewrite a saved experiment or comparison.
- This measures practiced Cross + F2L execution, ending before OLL. Preparation is unlimited, initial positioning happens before timing, and adherence/completion are self-reported. No WCA inspection penalties, +2, ao5 or ao12 in Lab.
- Use `cubesteps.club.lab`, IndexedDB schema 1. Do not change `cubesteps.club.timer`, learning progress or existing color drafts.
- No aggregate comparison until five complete matched A/B blocks for the same tester, input, two exact routes, timing method and endpoint. Raw attempts remain visible immediately.
- JSON defaults to routes-only. Include trials/tester labels only by deliberate selection. Import is staged, validated, previewed, then committed atomically. CSV is a readable analysis export, not an import format.
- File ceilings: 10 MiB, 50 experiments, 5,000 attempts, four routes/six comparisons per experiment, 512 teaching tokens/128 actions per route, 60-character labels and 2,000-character notes. Never truncate silently or delete corrupt/unknown records automatically.
- Preserve public-access behavior and English text. Physical endorsement is pending real user/Josh feedback even after automated correctness passes; the feature always remains Experimental.

## Review Focus

1. A save promise can resolve before IndexedDB commits, or a tab can overwrite another tab's revision: test transactional completion, conflicts and pending recovery (Task 11).
2. Keyboard/touch events during editing, blur, navigation or a tour can create false successful times: test the state machine and actual browser events (Tasks 12–13).
3. Invalid originals plus retries can be counted twice, and mixed testers/routes can imply a false winner: test block membership and exact summary keys (Task 13).
4. A plausible JSON/CSV file can contain mismatched states, unsupported versions, excessive definitions or spreadsheet formulas: validate bytes, references, physical replay and escaping before commit (Task 14).
5. A desktop automation pass does not prove phone performance or human fingertricks: report those evidence classes separately and preserve a real physical-test worksheet (Task 15).

---

## File map

| Task | Create                                                                                                                                                                           | Modify                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 11   | `src/lab/experiments/{types,schema,snapshots,storage,repository}.ts`, `schema.test.ts`, `snapshots.test.ts`, `repository.test.ts`; `e2e/lab-storage.spec.ts`                     | Lab session/provider and workspace save action                                                            |
| 12   | `src/lab/trials/{types,machine,input,parse-duration}.ts`, matching `.test.ts` files                                                                                              | Shared domain types only where needed                                                                     |
| 13   | `src/lab/trials/{blocks,summary}.ts`, matching tests; `src/club/lab/{TrialsPage,TrialTimer,TrialHistory,ComparisonSummary}.tsx`, `TrialsPage.test.tsx`; `e2e/lab-trials.spec.ts` | Lab session/workspace, `lab.css`, tutorial guard integration                                              |
| 14   | `src/lab/experiments/{transfer,export}.ts`, matching tests; `src/club/lab/ExperimentTransfer.tsx`; `e2e/lab-transfer.spec.ts`                                                    | Repository/storage import transaction, archive playback boundary                                          |
| 15   | `e2e/lab-production.spec.ts`, `public/club-guide/lab-trials.png`, `docs/validation/cfop-lab-release.md`, `docs/lab/physical-review.md`                                           | Guide/capture manifest/content; benchmark script; `package.json`, `.github/workflows/ci.yml`, `README.md` |

### Task 11: Immutable snapshots and a recoverable local repository

**Files:** Task 11 row. Consume frozen verified results from Task 7; persisted route snapshots contain domain data, not runtime brands or player controllers.

**Interfaces:** In `experiments/types.ts` define:

- `LabExperiment`: schemaVersion 1, ID, createdAt, optional label, input and fingerprint, verified setup/diagram hold, settings, recorded search limits/coverage, app/model/catalog/search versions, one to four exact `LabRoute` snapshots and only their referenced formula definitions.
- `LabComparison`: schemaVersion 1, ID, experimentId, routeAId, routeBId and createdAt. A/B identities never change after creation; a new pair creates a new comparison.
- `TrialBlock`: ID, comparisonId, createdAt, intended order (`AB` or `BA`) and exactly two immutable slots `{id, label:'A'|'B', routeId}`. Persist blocks separately so incomplete plans and their IDs survive reload without mutating the comparison.
- `LabTester`: local stable ID plus optional label. The same anonymous tester can retain a local ID without entering a real name.
- `LabAttempt`: ID, revision, previous revision, createdAt/updatedAt, experimentId, routeId, optional comparisonId/blockId/slot/retryOf, testerId, timing method (`keyboard`, `touch`, `external-manual`), endpoint `'cross-f2l'`, kind (`warmup`, `measured`), outcome (`followed`, `deviated`, `incomplete`, `interrupted`), rawMs or null, setup/hold confirmations, intended/actual order, interruption reason, optional flow/recognition ratings 1–5, note and deletedAt. Defaults must never assert adherence or setup confirmation.

`createExperiment(snapshot:LabClientSnapshot, selectedRouteIds:readonly string[], label?:string):LabExperiment` requires current independently verified matching-input routes; archive snapshots are imported through Task 14. `createComparison(experiment, routeAId, routeBId):LabComparison` requires two distinct saved routes.

`LabStore` methods: `list()`, `saveExperiment(experiment)`, `saveComparison(comparison)`, `saveBlocks(blocks:readonly TrialBlock[])`, `saveAttempt(attempt, expectedRevision:number|null)`, `softDeleteAttempt(id,expectedRevision)`, `undoDelete(token)`, `close()`. `openLabStore(factory:IDBFactory=indexedDB):Promise<LabStore>` creates `experiments`, `comparisons`, `trialBlocks`, `testers`, `attempts` and `attemptRevisions` stores; attempts point to current revisions while revision records remain immutable. Save referenced tester IDs and validate block/slot identity transactionally with attempts.

`createLabRepository(open?):LabRepository` exposes matching write methods plus `snapshot()`, `subscribe(listener)`, `retry(id)`, `refresh()` and `dispose()`. `LabRepositorySnapshot` distinguishes saved and pending records, recoverable failures, incompatible-record count and conflicts. Writes do not report success until the transaction completes.

- [ ] Write schema/snapshot tests for cross-input route selection, mutation after save, more than four routes/six comparisons, invalid references, required versions/holds/setup, label/note limits, inconsistent outcome/duration and missing definition references. Define validators here so the timer and transfer reuse the same contract.
- [ ] Write repository tests using an injected store: transaction abort, failure then retry without duplicate IDs, pending records remaining exportable, delayed refresh not deleting pending entries, soft-delete/undo with revision checks and disposal while a write is pending. Write real IndexedDB browser tests for reload, cross-tab revision conflict, blocked/version-change connection, corrupt/unknown rows preserved and everyday Timer records untouched.
- [ ] Run `npx.cmd vitest run src/lab/experiments`; establish red. Implement structural validation and immutable cloning first, then transactional persistence. Validate schema and physical snapshots before admitting records, while keeping structurally incompatible persisted bytes untouched and reported as excluded. Do not silently reset an unknown database version.
- [ ] Implement optimistic revision checks in the same read/write transaction; retain previous versions and soft deletion. Use a Lab-specific BroadcastChannel to refresh other tabs; a conflict refreshes the visible head and asks for deliberate reconciliation rather than last-write-wins. A blocked transaction reports a retryable failure.
- [ ] Connect Save experiment in Analyze/Compare and a saved experiment picker. Keep the lazily created repository in a club-session lifetime owner so navigating away from Lab does not discard in-memory unsaved records; it must not initialize IndexedDB before first Lab use. Dispose only when the club app closes. Warn about pending unsaved work on browser close using the native unsaved-change hook, and show retry/export actions on return; do not promise persistence across closing a browser after a failed save.
- [ ] Run focused tests and `npx.cmd playwright test e2e/lab-storage.spec.ts e2e/timer-storage.spec.ts`. Require no saved-success UI before transaction completion and identical experiment route content after reload.
- [ ] Stage Task 11 files and exact session/workspace changes; commit `feat: preserve immutable Lab experiments and recoverable trial records`.

### Task 12: Cross + F2L trial timing and input safety

**Files:** Task 12 row. Use `LabAttempt` from Task 11; ordinary Timer types/state machine remain unchanged.

**Interfaces:** `TrialConditions` selects immutable experiment/route, optional comparison block slot, tester, kind and timing method. `TrialState` discriminates `preparing`, `holding`, `ready`, `running`, `review`; it includes unchecked setup/hold confirmations and start timestamp where applicable. `TrialEvent` covers confirm setup/hold, press/release, elapsed hold readiness, stop, interrupt, manual time, classify and next attempt. `reduceTrial(state,event):{state:TrialState;effects:TrialEffect[]}` is pure. Effects request quiescence, a completed draft or interruption; repository writes occur only after explicit classification/save.

`parseTrialDuration(text:string):{ok:true;ms:number}|{ok:false;message:string}` accepts decimal seconds or `m:ss.mmm`, with positive finite results and seconds <60 in the latter form. `isTrialInputTarget(target:EventTarget|null):boolean` identifies inputs, textareas, selects, buttons, links and editable content where global timer shortcuts must not act.

- [ ] Add transition tests for unchecked setup, hold not confirmed, key auto-repeat, early release, 300 ms arming followed by release-to-start, stop on next press, and time calculated from monotonic timestamps. Touch uses the same hold/release start and pointer-down stop. Confirmations reset after every attempt; initial positioning and unlimited practice never add elapsed time.
- [ ] Test blur, hidden document, Escape, route departure and pointer cancellation while armed/running; running attempts become interrupted and never followed. Test stale scheduled readiness after cancellation, keyboard focus in every editable target, overlay input lock and invalid/non-finite/negative/manual durations. Warmup may be untimed; interrupted-before-start may have null duration. A measured followed result requires positive finite duration and setup/hold confirmation.
- [ ] Run `npx.cmd vitest run src/lab/trials`; establish red. Implement the reducer, monotonic clock adapter and key/pointer filter without DOM access in the reducer. Do not invent inspection penalties or trust a user's end time as automatic cube verification.
- [ ] Require `quiesce()` before entering ready/running: stop background search, synchronously pause playback through Task 8's handle and prevent new Analyze/play actions during timing. Request tutorial guard/input-lock coordination through existing hooks. Timer stop leads to review with outcome/rating/note choices; it never saves an assumed successful solve automatically.
- [ ] Run focused tests and `npm.cmd run typecheck`. Ensure start/stop operations emit one draft at most and manual entry is stored as `external-manual`, never merged with browser timings.
- [ ] Stage Task 12 files; commit `feat: time practiced Cross and F2L trials safely`.

### Task 13: Trial notebook, fixed A/B blocks and honest summaries

**Files:** Task 13 row; wire the finished Trials view into Task 9's workspace.

**Interfaces:** `createComparisonBlocks(comparison:LabComparison, count:number):readonly TrialBlock[]` creates stable block/slot IDs with AB then BA order alternating, reusing Task 11's persisted block type. Default to five blocks, and save them before starting measured attempts. `selectEligibleAttempts(attempts, blocks):BlockSelection` keeps all raw entries and resolves the first later eligible linked retry for each slot. `summarizeComparison(comparison, testerId, timingMethod, blocks, attempts):ComparisonSummary` returns raw/eligible/excluded counts, exclusions by reason and either `insufficient` or `ready` with per-route medians, median paired `(B-A)`, rating counts/distributions and complete-block count. The readiness threshold is five complete blocks; no significance test or winner label.

- [ ] Add tests at four versus five complete blocks, same input but different exact route versions, different testers/methods, warmups, deviations, interruptions, deleted/revised attempts and missing ratings. A retry can replace its invalid original once; multiple linked retries choose the first later eligible one. Reject cross-slot/cross-condition retries and cycles. Preserve unmatched exploratory attempts but exclude them from matched summaries. Positive B−A means B took longer; assert the sign and that missing ratings are never imputed.
- [ ] Add a zero-work fixture: when Cross + F2L is already complete, show that checkpoint and disable measured timing for this route instead of creating phantom moves or a meaningless comparison. A skipped cross with unfinished F2L remains a legitimate partial-route trial, labeled accordingly and compared only under the same saved conditions.
- [ ] Run `npx.cmd vitest run src/lab/trials src/club/lab/TrialsPage.test.tsx`; establish red for summaries/UI.
- [ ] Build the notebook with immutable experiment/comparison picker, setup sequence and actual six-face diagram, starting bottom/front/grip instructions, unchecked confirmations, optional tester label, warmup/measured choice, AB/BA next slot, integrated timer and external-time entry. Show “Stop when the cross and all four F2L pairs are complete; do not continue into OLL.” Display formula holds/finger notes before timing; pause them during a timed attempt.
- [ ] Build review/history with outcome choice, optional 1–5 ratings, notes, revision-aware edits and delete/undo. Keep intended/actual order, retries and failed/deviated entries visible. Permit exploratory single-route trials without counting them toward A/B summaries. Show raw data immediately and explain the missing complete blocks until the threshold is met.
- [ ] Integrate repository pending/error/retry states and preserve unsaved review drafts across Lab tab changes. Navigation/blur interrupts an active timer before teardown; the draft remains recoverable in the club-session owner. Register tutorial guards so a bubble cannot steal a running timer's keys. Quiesce actual worker/player objects, not only their UI buttons.
- [ ] Run unit tests and `npx.cmd playwright test e2e/lab-trials.spec.ts e2e/lab-storage.spec.ts e2e/timer-controls.spec.ts e2e/timer-history.spec.ts`. Exercise real keyboard/touch, browser visibility, hash navigation, focus in notes, attempts saved after a failed write, five-block summaries and no changes to ordinary Timer averages/penalties. Check phone/desktop, keyboard access and live announcements without announcing every timer tick.
- [ ] Stage Task 13 files and exact workspace/tutorial integration changes; commit `feat: compare fixed Lab routes with a local physical-trial notebook`.

### Task 14: Bounded transfer, conflict resolution and archived replay

**Files:** Task 14 row. Use Task 11 schema/storage and Task 5 physical validator; do not execute imported content.

**Interfaces:** `LabExportSelection` specifies selected experiment IDs, optional comparison IDs, `includeAttempts:boolean` and `includeTesterLabels:boolean` (both false by default). `buildLabExport(snapshot,selection):LabTransferFile` includes schemaVersion 1, experiments, comparisons, referenced blocks/definitions/testers and selected attempts/revisions, including explicitly labeled pending records. Never export an incomplete dangling reference graph. Count all attempt revision records against the 5,000-record import/export ceiling; include only blocks referenced by selected attempts, avoiding unbounded empty block plans in a transfer.

`stageLabImport(file:File, context:LabContext, existing:LabRepositorySnapshot):Promise<LabImportPreview>` returns validated records, deduplication counts, conflicts and archive warnings without writing. `commitLabImport(preview, resolutions):Promise<void>` rechecks current storage conflicts and atomically commits the selected graph. Resolutions are `skip` or `import-copy`; copying remaps IDs and all dependent references while retaining original provenance. Existing different content is never overwritten.

`exportLabCsv(snapshot,selection):string` exports raw conditions, order, classification, timing method, revisions, eligibility/exclusion, ratings, notes, pending/deleted flags and version IDs. Escape quotes/newlines and prefix dangerous user-controlled spreadsheet cell values, including formula prefixes hidden after leading whitespace/control characters. Typed numeric duration/difference columns remain numeric.

- [ ] Add import tests for >10 MiB before reading, unknown schema, excessive counts/strings, missing/surplus definitions, malformed notation, incorrect setup/state/centers, invalid scores/checkpoints under a known model, broken/cyclic references and external executable/resource fields. Validate arrays/objects/depth before recursive traversal; reject unexpected fields rather than interpreting them. The input graph's bounded schema prevents deeply nested payloads from reaching recursive freeze/replay.
- [ ] Test identical-ID deduplication, conflicting IDs, import-copy reference remapping, simultaneous cross-tab changes and one malformed record causing zero writes. Test export limits with explicit selection narrowing, pending attempts, routes-only defaults and tester-label opt-in. Add CSV fixtures for quotes, Unicode, embedded newlines and `=`, `+`, `-`, `@` after whitespace.
- [ ] Run `npx.cmd vitest run src/lab/experiments/transfer.test.ts src/lab/experiments/export.test.ts`; establish red.
- [ ] Implement staged schema/reference validation followed by bounded physical replay. Known schema with old/unknown model/catalog may retain a physically valid route and its archived definitions/estimates, visibly marked **Archived · not a current recommendation**. Do not evaluate old estimated grip events as current-profile evidence or silently upgrade their version. Unsupported schema or physically invalid routes are rejected. Formula definitions are plain data; render strings as text and never load resources from imported URLs.
- [ ] Implement preview and explicit commit UI with record counts, pending/archive labels and conflicts. Add a single atomic transaction across affected stores, rechecking conflicts inside it. Route-only export must remain useful for setup/playback, while optional trial exports retain revision history and comparison conditions. Narrow over-limit exports instead of truncating.
- [ ] Run focused tests and `npx.cmd playwright test e2e/lab-transfer.spec.ts e2e/lab-player.spec.ts`. Round-trip on two fresh browser contexts, replay archived non-white routes, inspect CSV output and prove failed imports leave storage unchanged.
- [ ] Stage Task 14 files and exact repository/archive changes; commit `feat: transfer reproducible Lab experiments with validated archives`.

### Task 15: Complete verification, physical-review materials and publication

**Files:** Task 15 row. Keep evidence outside disposable worktrees as well as its committed summary.

**Interfaces:** Extend `benchmark:lab --phase integrated` to drive the actual built Lab UI/worker/client and capture initialization, first independently verified route, coverage, stop latency and watchdog. `docs/lab/physical-review.md` is a reproducible worksheet with fixture input/setup, route IDs/versions, declared holds/finger instructions, trial endpoint and feedback fields; examples are never prefilled as accepted physical results.

- [ ] Add production assertions for Lab direct reload, search/stop/retained playback, actual color-input setup, saved experiment reload, trial interruption and import preview/commit. Add network assertions that ordinary global/club/Timer/Guide navigation does not request the Lab worker/profile chunks. Add a mixed-regression case proving stable Advanced rejects a near-shortest trace while Lab accepts its correctly bounded route.
- [ ] Run `npm.cmd run build`, then `npm.cmd run test:production` through the existing production harness; establish failures for any missing built integration before completing it. Add `test:lab:corpus` and `test:lab:efficiency` to CI alongside existing cross/catalog/corpus/efficiency gates; do not remove or silently shorten existing checks. Include worker/protocol unit tests in `test:lab` and the CI unit command if they are not already covered by `test:unit`.
- [ ] Complete Guide trial/transfer instructions and capture `lab-trials.png` from an isolated profile with clearly labeled sample records. Verify all Lab controls have concise references, screenshots are readable and failed images leave usable text. README describes a public club experiment without naming the school or presenting unmeasured superiority; retain the existing way of finding the club link. Leave accepted films unchanged.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run verify:cross`, `npm.cmd run verify:cases`, `npm.cmd run test:unit`, `npm.cmd run test:corpus`, `npm.cmd run test:lab:corpus`, `npm.cmd run test:efficiency`, `npm.cmd run test:lab:efficiency`, `npm.cmd run verify:guide`, `npm.cmd run build`, `npm.cmd run test:e2e` and `npm.cmd run test:production`. Run `tests/advanced-cross-table.test.ts` if not included by the executed commands. Use `npm.cmd run test:production` for production-only specs, not a dev-server run that skips them. Capture actual counts/failures and browser-console evidence; no PASS for blocked checks.
- [ ] Run the integrated fixed-input benchmark in cold/warm conditions: first-result p95 targets ≤5 seconds desktop/≤8 seconds representative phone, Stop ≤250 ms, watchdog ≤30.5 seconds, tracked bounds/memory and coverage. A phone-sized viewport or throttled desktop is only supplemental evidence. Tune within existing ceilings; if a target remains unmet or a real device is unavailable, state the gap and proposed tradeoff before release rather than treating missing evidence as success.
- [ ] Prepare physical fixtures for a useful rotation, shortest-versus-near-shortest tradeoff, cross-to-first-pair grip continuity, rear insertion, wrong-slot extraction, non-white bottom and color-input setup. Give the user the worksheet/local preview for real trials. Human evaluation can follow automated publication with an explicit unreviewed-model label, but never mark the model physically reviewed without actual user/Josh results. No automatic message is sent to either tester.
- [ ] Write `docs/validation/cfop-lab-release.md` separating automated correctness, device performance, independent review, deployment and physical acceptance. Run the Native independent final review of the complete branch with one fresh reviewer under the execution/review skills. Address actionable findings, repeat only affected checks plus required CI, and record remaining limitations.
- [ ] After approved implementation scope, required checks/review and performance gates are satisfied, follow the existing authorized workflow: push the feature branch, create and attach the PR, wait for required checks, merge and verify GitHub Pages. Inspect the deployed club Lab/Guide and global site, compare deployed build revision, then synchronize the primary local main. Preserve a rollback path and never overwrite unrelated dirty local work. Do not merge solely because the implementation is written.
- [ ] Commit documentation/assets/review fixes with exact paths (`docs: record CFOP Lab validation and physical review protocol`, or focused fix commits). Preserve local validation files and needed ignored media before archiving only owned disposable worktrees. Report the club Lab and Guide links, final revision and the precise physical/performance status to the user.

## Cross-plan self-review

| Approved requirement                                             | Owning tasks  |
| ---------------------------------------------------------------- | ------------- |
| Physical input/identities, six bottoms/four fronts, replay setup | 1, 5–6, 8     |
| Exact cross reference, d/d+1/d+2, safe diversity/deduplication   | 2, 5–6        |
| Full F2L order, fixed formulas, continuity/visibility estimates  | 3–6           |
| Global work/time/memory bounds, streaming/cancel/watchdog        | 2, 4–7, 15    |
| Separate Lab contract, independent replay, stable methods        | 1, 5, 7–8, 15 |
| Approved Analyze/Compare/Trials layout, Guide/accessibility      | 9–10, 13, 15  |
| Fixed routes, practiced endpoint, timing safety, retries         | 11–13         |
| Five matched blocks, missing data and honest summaries           | 13            |
| Transaction safety, revisions, conflicts, pending recovery       | 11, 13–14     |
| Bounded transfer, archived playback, deliberate sharing          | 14            |
| Corpus, regression, real performance, physical acceptance        | 6, 15         |

All five Review Focus risks have explicit tests. Runtime types originate in the owning task and are reused downstream. The three plans describe 15 sequential tasks; they are instructions for future work, not evidence that implementation, publication or human testing has occurred.
