# Webb Club Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved standalone club timer with real scrambles, matching six-face diagrams, reliable local history, ao5/ao12, penalties, accessible trends and export.

**Architecture:** A pure clock-driven state machine produces idempotent record effects. A native IndexedDB repository stores validated attempts, while a coordinator binds keyboard/pointer events, scramble generation and persistence to a focused React page. Statistics and export are pure functions over ordered history, independent of animation.

**Tech Stack:** Existing TypeScript/React, shared cubing.js scramble/cube engine, native IndexedDB and BroadcastChannel, CSS/SVG, Vitest/Testing Library and Playwright. No new runtime or test dependency is required; test real IndexedDB behavior in browsers.

**Spec:** [Approved Webb club design](../specs/2026-10-12-webb-cubing-club-design.md), sections 6–9. Consumes the [foundation plan](2026-10-12-webb-club-foundation-implementation.md).

**Status:** Approved by the owner on October 13, 2026. Execute sequentially using Native, with independent final review. The owner also authorized GitHub merge, Pages publication, local synchronization, and cleanup of redundant task worktrees.

## Global Constraints

- Timer is a separate page at `/cube-steps/club/#/timer`; the global UI does not gain Timer in this launch.
- Generate fresh 3x3 scrambles through the existing cubing.js scramble service.
- Use the documented white-up, green-front hold, face labels and the existing facelet layout.
- Hold Space or the timing surface for 300 ms to arm, then release to start.
- Inspection is optional and off by default: below 15 seconds is normal, 15 to less than 17 seconds is +2, and 17 seconds or more is DNF.
- Inspection and manual time penalties add; DNF overrides a numeric result.
- Ao5 removes one fastest/slowest from five; ao12 removes one fastest/slowest from twelve. Two DNFs make either window DNF.
- The trend chart shows the latest 50 attempts. History is paginated, newest first.
- Records live in the current browser. No account, cross-device synchronization, hardware timer or import is added.

## Review Focus

1. Keyboard auto-repeat, simultaneous touch and a synthetic click: exactly one start/stop/record (Tasks 2 and 4).
2. Hold starts before 15/17 seconds but releases after the boundary: assess inspection at release (Task 2).
3. A delayed scramble response arrives after another request or during a solve: never replace the frozen attempt or mismatch its net (Task 4).
4. Save fails, another tab edits history, then retry succeeds: retain/export the unsaved attempt and avoid duplicate or stale overwrites (Task 3).
5. DNF, identical times, two additive +2 penalties or fewer than twelve attempts: show correct statistics and chart gaps (Tasks 1 and 5).

## File map and contracts

All new timer modules live in `src/club/timer/`:

| Files | Responsibility |
| --- | --- |
| `types.ts`, `statistics.ts`, `format.ts` | Serializable attempts, exact result rules, display |
| `machine.ts`, `input.ts` | Pure transitions and DOM input eligibility |
| `storage.ts`, `repository.ts`, `settings.ts` | Native IDB transactions, pending saves, local settings |
| `scramble.ts`, `controller.ts`, `use-timer.ts` | Exact scramble/state unit, coordinator and lifecycle |
| `TimerPage.tsx`, `TimerSurface.tsx`, `ScrambleNet.tsx`, `timer.css` | Timing and scramble UI |
| `TimerHistory.tsx`, `TimerTrend.tsx`, `export.ts` | History, charts, export |
| Adjacent `*.test.ts(x)`; `e2e/timer-*.spec.ts` | Domain tests and real browser behavior |

Core serializable contract:

```ts
type Penalty = 'none' | 'plus2' | 'dnf';
type Interruption = 'escape' | 'blur' | 'hidden' | 'leave' | 'pointer-cancel';
type TimerAttempt = {
  version: 1; id: string; createdAt: string; rawMs: number; scramble: string;
  inspectionMs: number | null; inspectionPenalty: Penalty; manualPenalty: Penalty;
  interruption: Interruption | null; revision: number; deletedAt: string | null;
};
type TimerSettings = { version: 1; inspectionEnabled: boolean };
type PreparedScramble = { id: string; text: string; state: CubeState; facelets: FaceletSnapshot };
type TimerResult = { kind: 'time'; ms: number } | { kind: 'dnf' } | { kind: 'insufficient' };
```

IDs are generated once by `crypto.randomUUID()` when preparing each next attempt. Creation time is the completion timestamp in ISO format; elapsed duration uses `performance.now()`, never the wall clock. Statistics use active records ordered by `(createdAt, id)` ascending, so every consumer uses the same deterministic window. Records store full precision; round only for the final hundredths display. The `revision`/`deletedAt` fields support concurrent edits and Undo; deleted records are excluded from ordinary history and exports.

---

### Task 1: Define attempts, penalties and statistics

**Files:** Create `src/club/timer/types.ts`, `statistics.ts`, `statistics.test.ts`, `format.ts`, `format.test.ts`.

**Interfaces:** `effectiveResult(attempt: TimerAttempt): TimerResult`; `averageOf(attempts: readonly TimerAttempt[], count: 5 | 12): TimerResult`; `summarizeHistory(attempts): {count:number; best:TimerResult; ao5:TimerResult; ao12:TimerResult}`; `formatResult(result:TimerResult):string`. All functions ignore soft-deleted entries and take the last requested chronological window; they must not mutate inputs.

- [ ] Write tests with a local `attempt(ms, overrides)` fixture builder: `expect(averageOf([10000,11000,12000,13000,14000].map(ms => attempt(ms)),5)).toEqual({kind:'time',ms:12000})`; twelve times 10–21 seconds yield 15.5 seconds. Test one/two DNF windows, fewer than five/twelve, tied best/worst, 10.000 s with two +2 penalties producing 14.000 s, DNF overriding penalties, and deleted attempts leaving the window. Check `59999` ms displays `1:00.00`, DNF stays text, and insufficient results explain the missing count in the UI rather than appearing as zero.
- [ ] Run `npx.cmd vitest run src/club/timer/statistics.test.ts src/club/timer/format.test.ts`; confirm red before implementing.
- [ ] Implement the declared pure functions. Remove exactly one best and one worst by stable sorted position; one DNF is worst, two DNFs exceed the allowed discarded result. Keep unrounded values for averaging, and round only when formatting. A normal manual penalty does not erase an automatic inspection penalty or interruption DNF.
- [ ] Run targeted tests and `npm.cmd run typecheck`; verify input arrays/records remain unchanged. Commit with `git commit -m "feat: define club timer results and averages"`.

### Task 2: Implement the timing state machine and input rules

**Files:** Create `src/club/timer/machine.ts`, `machine.test.ts`, `input.ts`, `input.test.ts`.

**Interfaces:** `createTimerState(settings: TimerSettings): TimerState`; `transitionTimer(state: TimerState, event: TimerEvent): {state:TimerState; effects:TimerEffect[]}`. States are `loading`, `idle`, `inspection`, `arming`, `running`, `stopped`, `error`, with an optional last completed attempt retained for display. Active state carries the immutable `PreparedScramble`; arming carries its input token and monotonic start; inspection carries its original start; running carries solve start and the frozen inspection penalty. Stopped carries the stop-input token until its matching release is consumed.

`TimerInput` is a discriminated union: `scramble-ready` with prepared scramble; `scramble-error` with message; `settings` with settings; `down`/`up` with input token; `tick`; or an `Interruption`. `TimerEvent = TimerInput & {atMs:number; wallTime:string}`. Input tokens are `keyboard` or `pointer:<pointerId>`. Effects are `{type:'record'; attempt:TimerAttempt}` and `{type:'next-scramble'}`. `isTimerKeyTarget(target:EventTarget|null):boolean` excludes editable elements, buttons, links, selects, summary elements and their descendants; the timing surface itself is the explicit exception managed by its handler.

- [ ] Use a local event-driving test helper with explicit timestamps. Assert early release at 299 ms stays idle; release at 300 ms starts; wall-clock changes never change elapsed milliseconds. For inspection, release at 14,999/15,000/16,999/17,000 ms yields none/+2/+2/DNF, including a hold begun below the threshold. Assert repeat down, an unrelated pointer release and a synthetic click cannot restart; one stop produces one record effect and next scramble waits for matching release. Escape/blur/hidden/leave cancel an unstarted attempt; during running they produce one interrupted DNF and request the next scramble without waiting for a lost release. Pointer cancel abandons arming; active input loss cannot create a valid completed time.
- [ ] Run `npx.cmd vitest run src/club/timer/machine.test.ts src/club/timer/input.test.ts`; establish red for every state/input boundary.
- [ ] Implement the pure transition function, including preservation of inspection start after an early arming release. On stop, use `max(0, atMs - solveStartedAt)` from the monotonic clock and the original frozen scramble. Settings changes only apply to the next idle attempt. Handle valid input tokens once; ignore auto-repeat in the DOM adapter as well as repeated down events in the machine. Press/release first begins inspection; the second hold/release starts the solve. Crossing 17 seconds displays DNF but permits the user to finish the practice attempt as DNF. In an already stopped state, pointer cancellation/focus loss drains the missing release and requests the next scramble without changing or recording the completed attempt again.
- [ ] Run targeted tests and `npm.cmd run typecheck`; assert every event sequence emits at most one record per prepared ID and time never depends on animation frames. Commit with `git commit -m "feat: implement keyboard and touch timer transitions"`.

### Task 3: Store attempts atomically and retain failed saves

**Files:** Create `src/club/timer/storage.ts`, `repository.ts`, `repository.test.ts`, `settings.ts`, `settings.test.ts`, `e2e/timer-storage.spec.ts`.

**Interfaces:** `openTimerStore(factory:IDBFactory = indexedDB, name = 'cubesteps.club.timer'):Promise<TimerStore>`. Database version 1 has `attempts` keyed by `id`, indexed by `createdAt`. `TimerStore` provides `list():Promise<{attempts:TimerAttempt[]; invalidCount:number}>`, `add(attempt):Promise<void>`, `updatePenalty(id, expectedRevision, penalty):Promise<TimerAttempt>`, `softDelete(id,expectedRevision,deletedAt):Promise<{id:string;revision:number}>`, `undoDelete(token):Promise<boolean>`, and `close():void`.

`createTimerRepository(open:()=>Promise<TimerStore>):TimerRepository` supplies `record(attempt):Promise<void>`, `retry(id:string):Promise<void>`, `snapshot():RepositorySnapshot`, `refresh():Promise<void>`, `subscribe(listener:(snapshot:RepositorySnapshot)=>void):()=>void`, `dispose():void`, and edit/delete/undo methods forwarding the above contracts. `RepositorySnapshot = {attempts:TimerAttempt[]; pendingIds:string[]; error:string}`. Cache a successful connection; after an open failure, retry calls the injected factory again. Pending records stay in memory and appear in snapshots for display/export. Use `BroadcastChannel('cubesteps.club.timer.v1')` to notify record changes; refresh on window focus as a fallback. Closing an old IDB connection on versionchange must not overwrite an unsupported newer database.

`loadTimerSettings(storage:()=>Storage):{value:TimerSettings; available:boolean; writable:boolean}` and `saveTimerSettings(storage,settings):boolean` use `cubesteps.club.timer-settings.v1`; unknown/corrupt versions remain unwritten until a user-triggered reset. Add that reset through the timer settings UI in Task 4.

- [ ] Unit-test repository fault handling with a small injected store: rejected add retains the attempt/pending ID; retry succeeds once; duplicate record effects do not duplicate history; a late load cannot erase a pending record. Browser-test the real IDB module in the Vite development page: close/reopen persistence, two simultaneous adds preserving both, stale revision updates rejected, soft-delete/undo conflicts not resurrecting another tab's newer edit, malformed rows preserved and reported, and version 2 rejected without destructive reset. Test denied storage and incompatible settings without clobbering their original bytes.
- [ ] Run `npx.cmd vitest run src/club/timer/repository.test.ts src/club/timer/settings.test.ts` and `npx.cmd playwright test e2e/timer-storage.spec.ts`; confirm the intended persistence cases are red. The browser test may import the app's module from the local Vite page; do not add a production test-only route or database mock dependency.
- [ ] Implement per-record readwrite transactions; wait for transaction completion before reporting Saved. `add` is idempotent only for the identical original record; it cannot overwrite a later edit. Edits increment revision and check the expected revision in the same transaction; conflicts trigger refresh and visible retry guidance. Soft deletion retains the record, and Undo compares the returned revision token. Validate version, IDs, timestamps, finite nonnegative durations, penalty enums and six-face scramble notation; preserve invalid raw rows. Keep pending attempts until persistence succeeds, including export availability. IDB open/blocked/quota failures become usable in-memory behavior with a Not saved notice.
- [ ] Run the targeted unit/browser tests and `npm.cmd run typecheck`. Check actual IDB contents after reopening and cross-tab notification; do not infer persistence from in-memory UI. Commit with `git commit -m "feat: persist club timer history with recoverable saves"`.

### Task 4: Connect real scrambles, six-face diagrams and the timer page

**Files:** Create `src/club/timer/scramble.ts`, `scramble.test.ts`, `controller.ts`, `controller.test.ts`, `use-timer.ts`, `TimerPage.tsx`, `TimerSurface.tsx`, `ScrambleNet.tsx`, `ScrambleNet.test.tsx`, `timer.css`, `e2e/timer-controls.spec.ts`. Modify `src/club/ClubApp.tsx`, `components/ClubHeader.tsx`, `HomePage.tsx`.

**Interfaces:** `prepareTimerScramble(engine:CubeEngine, text:string, id:string):PreparedScramble` parses with the existing `parseScramble`, applies exactly those moves to `engine.solved()`, then uses `stateToFacelets`. `createTimerController({engine, repository, settings, generate, clock}):TimerController` consumes `repository:TimerRepository`, `settings:TimerSettings`, `generate:()=>Promise<string>` (default existing `generateScramble`) and `clock:{now():number; iso():string}`. It exposes `snapshot():TimerState`, `subscribe(listener:(state:TimerState)=>void):()=>void`, `dispatch(input:TimerInput):void`, `newScramble():Promise<void>`, `setInspection(enabled:boolean):void` and `dispose():void`. Dispatch stamps machine events with the injected clock. `useTimer({engine,repository,settings}):{controller:TimerController;state:TimerState;history:RepositorySnapshot}` owns DOM subscriptions/controller lifetime. Keep the repository at club-app lifetime so interruption effects survive page teardown; dispose its connection on application teardown after initiated writes settle. `ScrambleNet({facelets,label}: {facelets:FaceletSnapshot;label:string})` accepts the prepared/recorded snapshot only, with no separate random generator.

- [ ] Test a fixed text such as `R U R' U'`: its displayed net equals `stateToFacelets(engine.apply(engine.solved(), parsed.moves))` and validates back to the same state. Test invalid generator text, retry, out-of-order promises, and leaving the route before a promise settles. While running/inspecting, New scramble is disabled and responses cannot alter the frozen prepared ID. Test immediate record dispatch once, release consumption before next generation, and controller disposal during a run producing one interrupted DNF in the repository.
- [ ] Run `npx.cmd vitest run src/club/timer/scramble.test.ts src/club/timer/controller.test.ts src/club/timer/ScrambleNet.test.tsx`; verify red before wiring the page.
- [ ] Implement request epochs for scramble generation; the library request need not support physical cancellation, but stale completions must be discarded. Build the approved large clock/scramble/net layout, inspection toggle, start/stop instructions and empty/error/Not saved/retry states. Net uses U above F, L/F/R/B across, D below F with actual sticker colors and orientation labels. Timing surface uses Pointer Events, captures its active pointer and suppresses duplicate click behavior; Space handling is scoped away from other controls/dialogs. Timing handlers use the injected clock at the event boundary; requestAnimationFrame refreshes display only. Freeze secondary/decorative motion during timing. Connect the real `#/timer` route and enable Timer navigation/home action.
- [ ] Run targeted tests and `npx.cmd playwright test e2e/timer-controls.spec.ts e2e/club-entry.spec.ts`. Test Space, touch, lost focus, route change, inspection defaults, 300 ms arming, first load, generation failure and restoration after a stop. Use a controller/repository lifetime that records interruption before page teardown; hard browser termination cannot guarantee an asynchronous save and must never be reported as a persisted success. Verify current net updates atomically with its scramble.
- [ ] Commit with `git commit -m "feat: connect club timer and matching scramble diagrams"`.

### Task 5: Add history, accessible trends and complete exports

**Files:** Create `src/club/timer/TimerHistory.tsx`, `TimerHistory.test.tsx`, `TimerTrend.tsx`, `TimerTrend.test.tsx`, `export.ts`, `export.test.ts`, `e2e/timer-history.spec.ts`; modify `TimerPage.tsx`, `timer.css`, `statistics.ts`, `statistics.test.ts` and repository bindings.

**Interfaces:** `buildTrend(attempts:readonly TimerAttempt[]):{id:string; index:number; single:TimerResult; ao5:TimerResult; ao12:TimerResult}[]` lives in `statistics.ts` and computes windows over all active history before taking the latest 50. `TimerTrend({attempts})` provides single/ao5/ao12 controls, labeled axes and accessible point details. `TimerHistory({repository, engine})` pages 25 rows newest first and derives a selected record's net through `prepareTimerScramble`. `exportTimerCsv(attempts:readonly TimerAttempt[], pendingIds:readonly string[] = []):string`; `exportTimerJson(attempts:readonly TimerAttempt[], exportedAt:string, pendingIds:readonly string[] = []):string`, with JSON `{version:1, exportedAt, attempts, unsavedIds}` and a CSV save-status column. Exports derive unsaved IDs from the repository snapshot, not from a speculative record field.

- [ ] Add tests: attempt 51's ao12 includes attempts 40–51 despite the chart's display cut; DNF is a labeled gap, not zero/infinity; penalties recalculate affected windows; paginated history preserves order; deleting/undoing changes averages; a concurrent edit conflict does not revert newer data. Verify CSV header/row count, real CRLF lines, quoting, all raw/inspection/manual/interruption fields, and JSON round trip. Pending unsaved attempts must be exportable exactly once along with saved history. UI tests use keyboard to reveal a graph point and select a historical scramble.
- [ ] Run `npx.cmd vitest run src/club/timer/TimerHistory.test.tsx src/club/timer/TimerTrend.test.tsx src/club/timer/export.test.ts`; establish red for those observable behaviors.
- [ ] Implement history, correction controls, soft deletion with Undo, full-history statistics and SVG trend series. Display DNF distinctly and provide textual result access. Export visible nondeleted records from the repository snapshot, including pending records; include effective results in CSV alongside raw fields, and preserve structured raw records in JSON. Mark unsaved state in the UI and export status rather than implying durability. Add a device-local explanation near export. Keep initial history empty; no prototype sample solves ship.
- [ ] Run targeted tests and `npx.cmd playwright test e2e/timer-history.spec.ts e2e/timer-storage.spec.ts`; download/parse actual CSV/JSON, reload the page to confirm durable results, and inspect historical nets. At 360/390 px check net containment, readable graph axes and >= 44 px timing/primary controls; small penalty controls need an adequate touch area even if their visual glyph is compact.
- [ ] Commit with `git commit -m "feat: add timer history trends penalties and export"`.

### Task 6: Validate the complete club release and prepare publication

**Files:** Extend `e2e/club-production.spec.ts`, add `e2e/timer-production.spec.ts`, update `scripts/write-build-info.mjs`, `docs/validation/webb-club.md`, `README.md`. Preserve `.github/workflows/ci.yml` and `pages.yml` checks, editing only if additional validation commands are needed.

**Interfaces:** Build metadata retains the exact Git commit and truthful method acceptance, and adds entry paths for global `./` and club `./club/`. Existing production test configuration selects both new `*production.spec.ts` files. Do not set a method to accepted based on code/visual checks alone.

- [ ] Add production tests for both root entries, direct club Timer/Learn links and reload, actual scramble-worker generation, storage reload, successful Space/touch timing, current/historical diagrams, downloaded export and no page/console errors. Confirm global routes still work and club links stay in the club entry. On slow generation, the timer start remains disabled; if the next scramble fails after a completed solve, the result remains visible/exportable.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run test:production`. Complete the repository's existing CI checks, including solver corpus/cross/case verification and efficiency, on the final branch before integration. Reuse prior unaffected local solver evidence where appropriate, but never bypass required CI. Verify the IDB/keyboard/touch flows in Chromium and WebKit. Compare 1280 px and 360/390 px screenshots to the approved design; inspect reduced motion, focus, no horizontal overflow and no hidden-time screen-reader announcement flood.
- [ ] Update the validation record with commands, results, screenshots, browser/environment, storage/export evidence and remaining manual acceptance. Have one fresh independent reviewer inspect the complete club diff against the approved spec and both club plans. Resolve actionable findings and rerun affected checks. Provide the owner a working local preview for the club-use acceptance scenario before declaring launch-ready.
- [ ] Commit with `git commit -m "test: validate Webb club launch and both Pages entries"`. Follow the finishing workflow and attach any created PR. Complete all concrete review/test work before requesting any release permission still missing; reuse authorization already granted rather than asking again for the same action. Do not replace an accepted global deployment with incomplete club output.
- [ ] After integration/publication is authorized and acceptance status is accurate, publish the complete artifact through the existing Pages workflow. Verify `https://leosteeeve.github.io/cube-steps/club/` and its Timer/Learn deep links, asset/worker paths, public build commit, phone layout and persistent history. Provide the verified club link. Keep deployment outcome distinct from local build success; if public checks fail, report the actual state and repair or restore the previously working artifact under the authorized release scope.

## Plan self-review and handoff

Timer layout/scramble correctness map to Task 4; input/inspection to Task 2; penalties/averages to Task 1; persistence/failure recovery to Task 3; history/trends/export to Task 5; complete rollout/accessibility to Task 6. All five Review Focus items have concrete assertions. The controller consumes the same machine, repository and prepared-state contracts declared here; the page does not duplicate their logic. Native execution starts only after plan review. No timers, database changes or public deployment have been performed by writing this plan.
