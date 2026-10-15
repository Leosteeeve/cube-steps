# CFOP Lab Club Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the verified search usable through the approved club Analyze/Compare workspace, progressive results, stable playback and clear instructions.

**Architecture:** A dedicated worker/client owns request lifetime and independently validated incumbents. One Lab session provider survives internal Lab tab changes. A prepared presentation payload extends the shared player without importing the Lab search into ordinary pages.

**Tech Stack:** Existing React/TypeScript, Vite module workers, cubing.js player, Vitest and Playwright. No new runtime dependency.

**Spec:** [Approved CFOP Lab design](../specs/2026-10-14-cfop-lab-design.md), sections 3–7 and 10; [approved visual reference](../specs/assets/cfop-lab/preview.html).

**Status and order:** Awaiting implementation-plan review. Native execution remains selected. Tasks 7–10 depend on [core Tasks 1–6](2026-10-14-cfop-lab-core.md), including the correctness and initial performance gate; [experiments Tasks 11–15](2026-10-14-cfop-lab-experiments.md) complete the feature before publication.

## Global Constraints

- Carry forward all core limits, physical frame contracts and evidence labels. The UI never fabricates a result, coverage percentage or fastest-solve claim.
- Lab routes are only `#/lab`, `#/lab/compare`, `#/lab/trials` in the club shell. No global entry, automatic redirection, account requirement or access-control claim.
- Display **CFOP Lab · Experimental**, **Recommended among searched routes**, and estimates separately from exact cross minima. Keep accepted teaching methods unchanged.
- Default All six; White, White + yellow and individual selections are available, with at least one selected. Only preferences and explicitly saved experiments are durable; active search/pins are session state.
- Load Lab search/profile assets only after entering Lab. Analyze starts the absolute 30-second deadline before worker/assets initialization; the main-thread watchdog is 30.5 seconds from that request.
- Preserve the playing/pinned route while new candidates arrive. Stop retains verified results; a new input invalidates old recommendations explicitly. Cancellation cannot turn a valid cube into an input error.
- English text, blue/white club design, keyboard navigation, reduced-motion support, descriptive text alongside color and locally contained table scrolling.

## Review Focus

1. A late message from a cancelled/older request must not replace current input or results (Task 7).
2. Initialization failure, worker hang or delayed main-thread validation must preserve incumbents and terminate within the declared deadline (Task 7).
3. Adding Lab playback must not skip Advanced validation, mislabel near-shortest paths, or turn hand-regrip annotations into cube moves (Task 8).
4. Navigating between Lab tabs or receiving a better recommendation must not silently reset a pinned route, draft or comparison (Task 9).
5. Guide/tutorial use on a phone must not load the Lab search unnecessarily or intercept an active physical timer (Task 10, exercised with the actual timer in Task 13).

---

## File map

| Task | Create                                                                                                                                                                                                                                    | Modify                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7    | `src/workers/lab-protocol.ts`, `lab-request.ts`, `lab.worker.ts`, `lab-request.test.ts`; `src/lab/client.ts`, `client.test.ts`; `e2e/lab-worker.spec.ts`                                                                                  | Lab core contracts only as necessary                                                                                                                                     |
| 8    | `src/lab/playback.ts`, `playback.test.ts`; `src/club/lab/LabPlayer.tsx`; `e2e/lab-player.spec.ts`                                                                                                                                         | `src/player/{playback-source,playback-timeline,initial-setup,cubing-adapter,controller}.ts`, `PlaybackView.tsx`, `CubePlayer.tsx`; existing player tests                 |
| 9    | `src/club/lab/{LabWorkspace,LabSessionProvider,AnalyzePage,ComparePage,LabInputPanel,LabCubeNet,CandidateCard}.tsx`, `session.ts`, `preferences.ts`, `lab.css`, matching session/preferences/workspace tests; `e2e/lab-workspace.spec.ts` | `src/club/routes.ts`, `routes.test.ts`, `ClubApp.tsx`, `components/ClubHeader.tsx`, `club.css`                                                                           |
| 10   | `e2e/lab-guide.spec.ts`; `public/club-guide/lab-analyze.png`, `lab-compare.png`                                                                                                                                                           | Guide types/chapters/tests/manifest; tutorial types/catalog/tests; `scripts/tutorial/capture-fixtures.mts`, `capture-guide.mts`; `docs/validation/cfop-lab-workspace.md` |

### Task 7: Streaming worker and a cancellation-safe client

**Files:** Task 7 row; extend `package.json`'s `test:lab` command as specified in Task 6. Consume `searchLab`, `validateLabRoute`, `LabBudget`, `LabSettings`, `LabRoute` and `LabCoverage` from package 1.

**Interfaces:**

```ts
type LabRequest = {
  kind: 'analyze';
  requestId: number;
  input: SolveInput;
  settings: LabSettings;
  startedAt: number;
  deadlineAt: number;
};
type LabReply =
  | { kind: 'initializing'; requestId: number }
  | { kind: 'progress'; requestId: number; coverage: LabCoverage }
  | { kind: 'candidate'; requestId: number; route: LabRoute }
  | { kind: 'done'; requestId: number; reason: string; coverage: LabCoverage }
  | { kind: 'error'; requestId: number; code: 'input' | 'assets' | 'search'; message: string };
```

Define `LabClientSnapshot` with request ID, input fingerprint, phase (`idle`, `initializing`, `searching`, `stopped`, `complete`, `error`), verified routes, recommended route ID, coverage and issue. `createLabClient(dependencies?): LabClient` injects worker factory, clock, timers and independent route verifier for tests; methods are `analyze(input, settings):void`, `stop():void`, `snapshot():LabClientSnapshot`, `subscribe(listener):()=>void`, `dispose():void`. `LabWorkerPort` uses the existing worker-port shape with `LabRequest`/`LabReply` types.

- [ ] Write client tests with fake ports/clocks for lazy creation, initial-load time counting toward the deadline, stop before first route, stop after an incumbent, superseding requests, stale messages/errors, invalid fingerprints, duplicate candidate IDs, schema-invalid routes, verifier rejection and hung workers. A queued candidate from the stopped request may never enter results after cancellation. Assert worker termination at 30,500 ms and disposal of timers/listeners.
- [ ] Write request tests for invalid colors/settings/input, corrupt/missing table assets, structured failures, deadlines already elapsed and cooperative interruption during F2L preparation. Test that progress counts are actual completed work and initialization is a separate status.
- [ ] Run `npx.cmd vitest run src/lab/client.test.ts src/workers/lab-request.test.ts`; establish red.
- [ ] Implement lazy worker asset loading and streamed scheduling. Use a shared epoch-aligned monotonic timestamp (`performance.timeOrigin + performance.now()`) for request/deadline comparisons; keep a main-thread elapsed timer as watchdog. Drain the core's resumable work only until 8 ms/256 operations and yield through an event-loop task, not an endless microtask chain. Throttle progress announcements. Publish only validated candidates and final coverage.
- [ ] Implement independent main-thread schema/input checks and physical finalist replay before exposing a candidate. Bound the validation queue, coalesce superseded updates and yield between replay chunks; cancel invalidates outstanding validation. Never trust a cloned brand/type assertion. Keep verified incumbents on stop/deadline/error, retain an explanatory status, and distinguish incomplete search from illegal input. The UI can stop immediately by terminating the worker; cooperative messages remain useful for normal completion.
- [ ] Run focused tests and `npx.cmd playwright test e2e/lab-worker.spec.ts` in both configured browsers using an isolated test harness. Measure real stop-to-usable-result latency ≤250 ms; inject a stuck worker to verify watchdog recovery. The temporary harness must not enter production output.
- [ ] Stage Task 7 files and precise core contract changes; commit `feat: stream bounded CFOP Lab results with safe cancellation`.

### Task 8: Physically faithful Lab playback through shared controls

**Files:** Task 8 row. Do not change `MethodId`, stable trace validators or catalog-selection policy.

**Interfaces:** Add a `PlaybackSource` variant `{kind:'lab'; prepared:LabPlaybackData}` and the six `LabSectionId` values to `PlaybackSectionId`. Define `LabPlaybackData` as a readonly presentation payload containing `timeline:PlaybackTimeline`, replay-verified `setup:readonly TeachingMove[]`, label and archived teaching-algorithm definitions. Shared player files import only its types, never the Lab search/profile runtime.

`createLabPlayback(context:LabContext, input:LabInput, route:VerifiedLabRoute): LabPlaybackData` in `src/lab/playback.ts` builds and freezes the payload after validation. Timeline actions remain the existing display-compatible `TraceAction` shape, but never contain Advanced `cross`/`selection` metadata: map Lab physical `rotation` to the existing renderer's `regrip` kind strictly as a presentation operation. Pure hand regrips remain separate boundary annotations.

`LabPlayer({engine, prepared, route, onHandle})` wraps `PlaybackView`. Add optional `onHandle?: (handle:{pause():void}|null)=>void` to `PlaybackView`, so Task 13 can synchronously pause it before a trial. Existing callers need no changes except exhaustively handling the widened section/source unions.

- [ ] Add playback tests for non-white bottom/front labels, initial positioning outside score/timer, backward stepping across y rotations, internal formula rotations, target IDs, repeated formulas, skipped stages, pure hand-regrip annotations and the F2L endpoint before OLL. An altered raw route must fail validation before a prepared payload exists. Ensure ordinary Advanced still displays and validates distance-decreasing shortest-cross evidence.
- [ ] Run `npx.cmd vitest run src/lab/playback.test.ts src/player`; new Lab fixtures should fail before the extension.
- [ ] Implement the Lab branch in timeline, initial setup, renderer move extraction and presentation selection. Use the prepared timeline without importing Lab algorithms into shared player modules; the Lab boundary alone creates this payload from verified data. Fix `CubePlayer` section callbacks to narrow real `StageId` values, not merely exclude the two algorithm-demo IDs. Keep existing solve/demonstration validation branches intact.
- [ ] Implement Lab labels and boundary handling instructions in the wrapper. Show exact cross minimum versus route length separately; never reuse the existing “Shortest cross” per-action message. Explain camera movement versus physical turns and estimated hand movement. Archive definitions drive historical formula display. Add pause-handle cleanup on controller replacement/unmount; renderer failure must retain readable instructions and stepping.
- [ ] Run player/domain tests and `npx.cmd playwright test e2e/lab-player.spec.ts e2e/advanced-player.spec.ts e2e/f2l-holding.spec.ts e2e/player-readiness.spec.ts`. Compare displayed state/holding/current token with replay at every selected boundary, including reverse steps, speed changes, stage jumps and formula replay.
- [ ] Stage Task 8 files and changed player tests explicitly; commit `feat: replay experimental routes with physical holds and handling guidance`.

### Task 9: Club Analyze and Compare workspace

**Files:** Task 9 row. Reuse `ColorEntry`, draft reducers/validation, `parseScramble` and `generateScramble`. Do not reuse `ScrambleNet` unchanged: its caption hardcodes White up/Green front. `LabCubeNet` must label the actual input or selected hold.

**Interfaces:** Extend `ClubRoute` with `{kind:'lab'; view:'analyze'|'compare'|'trials'}`. `LabSessionState` contains editable input draft, current request snapshot, pinned route ID, up to four compared route IDs and selected saved-experiment ID. `LabSessionEvent` explicitly distinguishes edit, analyze, candidate update, pin, comparison selection, tab change and loaded saved experiment. `reduceLabSession(state,event):LabSessionState` is pure. `LabSessionProvider` owns one client and exposes `quiesce():void` to stop analysis and pause registered playback before timing; leaving Lab disposes it. Lab tab changes preserve it.

`readLabPreferences(storage):LabSettings` and `writeLabPreferences(storage,settings):{ok:boolean}` use a versioned `cubesteps.club.lab.preferences.v1` key. Keep Lab color drafts in the Lab session; do not overwrite stable Solve's saved draft. Trial persistence follows in Task 11.

- [ ] Add route/preferences/reducer tests for all three direct links, unknown suffixes, invalid stored colors, at least one allowed color, data preservation across tabs and explicit invalidation after input changes. Better results update the recommendation but never the pinned route or existing A/B selection. Saving before a verified result is unavailable. Opening a saved experiment later does not silently rerun its search.
- [ ] Run `npx.cmd vitest run src/club/routes.test.ts src/club/lab`; establish red for new routes/session behavior.
- [ ] Add one lazy `LabWorkspace` boundary in `ClubApp` and a club-only header link. Exclude Lab from the ordinary learning-tools panel and method dispatch; let its own loading/error states own search initialization. Mount the provider once across its three views. The Trials tab will be completed by Task 13 before release; do not publish an unfinished placeholder.
- [ ] Implement Analyze from the approved reference: random/text/color input, actual input diagram/hold, color presets, Analyze/Stop, initialization/search progress, first verified recommendation and up to three distinct alternatives. Show incomplete/no-result/retry states clearly. Restore only settings automatically. Use native labeled controls and preserve text parse offsets/facelet issue locations.
- [ ] Implement Compare with matching input identity, exact minima, cross/F2L counts, actual rotations, estimated G/V/A, model cost, pair order, holds, rationale and coverage. Pin a route for playback; selecting another requires an explicit click. Keep tables within a scroll container on narrow screens and surface a useful comparison summary outside the table. Reuse the approved spacing, restrained motion and blue/white palette without decorative charts that suggest measured speed.
- [ ] Run `npx.cmd playwright test e2e/lab-workspace.spec.ts e2e/club-entry.spec.ts e2e/color-entry.spec.ts`. Cover 390 px and desktop, 200% zoom, keyboard-only use, reduced motion, failed assets and direct reload. Check no global entry or Lab worker/profile requests on global home, club home, ordinary Timer or Guide. Assert no unexpected console errors.
- [ ] Stage Task 9 files and exact club-shell changes; commit `feat: add the club CFOP Lab analysis and comparison workspace`.

### Task 10: Lab Guide, introductory tour and workspace verification

**Files:** Task 10 row; existing `src/club/guide/{types,chapters}.ts`, `chapters.test.ts`, `screenshots.json`, `src/club/tutorial/{types,catalog}.ts`, `controller.test.ts`.

**Interfaces:** Add Guide section `'lab'` and tour ID `'lab'`; preserve all existing IDs/preferences. `#/guide/lab` links to Analyze and explains the separate Trials endpoint. Intro targets are Lab input, allowed colors, progress, recommendation and comparison; complex timing/import behavior is explained in writing and tested in package 3. Use the existing `registerGuard`/`registerInputLock` hooks; no new tutorial controller. Extend the existing capture scene union with `'lab-analyze'|'lab-compare'`; Task 15 adds `'lab-trials'` using the same manifest contract.

- [ ] Add tests that the Guide loads without the engine/search, Lab tour waits for actual targets, starting a tour does not trigger Analyze, and a registered active-trial guard blocks the tour. Test missing screenshot fallback and deep-link focus. Inventory real controls rather than copying the mockup's example data.
- [ ] Run `npx.cmd vitest run src/club/guide src/club/tutorial`; establish failures for the new chapter/tour.
- [ ] Write English instructions for input, allowed colors, exact versus near-shortest cross, estimated score components, actual rotations/hand regrips, pinned routes, Stop/coverage and the practiced Cross + F2L trial endpoint. Explain that selecting a non-white bottom requires recognizing the corresponding colors. Include the scoring version and local-only nature of experiments without implying automatic member sharing or physical endorsement.
- [ ] Add deterministic real-UI capture scenarios to the existing capture scripts; capture Analyze/Compare from fresh profiles, labeled as examples. Use current verified route fixtures, readable crops and the existing screenshot manifest contract. Inspect both images visually. Task 15 will add Trials after its final UI exists. Do not recreate the accepted tutorial films.
- [ ] Run `npm.cmd run verify:guide`, focused Guide/tutorial tests, `npx.cmd playwright test e2e/lab-guide.spec.ts e2e/club-guide.spec.ts e2e/club-tutorial.spec.ts`, and `npm.cmd run build`. Record actual screenshots, keyboard/phone/console results and deferred trial checks in `docs/validation/cfop-lab-workspace.md`.
- [ ] Stage Task 10 files and approved screenshots; commit `docs: explain CFOP Lab routes and experimental evidence`.

## Plan self-review and handoff

Spec streaming/limits → Task 7; physical presentation and checkpoints → Task 8; approved layout and route lifecycle → Task 9; Guide and onboarding → Task 10. Saved experiments, A/B timing and transfer are deliberately assigned to the next package; the full feature remains unpublished until those tasks and final review pass. Review Focus failures each have explicit tests. Existing guide video files are unaffected.
