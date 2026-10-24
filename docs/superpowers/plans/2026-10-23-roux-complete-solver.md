# Complete Advanced Roux Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish block candidates with full CMLL and advanced LSE, then expose verified progressive and normal solves with honest fallback/evidence states.

**Architecture:** Reuse Plan 2's frames, budgets and block contracts. CMLL admits physical transformations; finite M/U tables carry center/corner offsets. One finalizer produces immutable routes used by the normal solver, Lab, courses and archival playback.

**Tech Stack:** Current cube engine, TypeScript, Node generators, Web Workers, Vitest/Playwright; no new solver dependency.

**Spec:** [Approved design](../specs/2026-10-23-advanced-roux-and-ui-design.md), Sections 7–9 and 13; [overview](2026-10-23-roux-ui-upgrade-plan.md). Tasks 11–15 of 26, after Task 10.

## Global Constraints

- 42 non-solved CMLL cases plus solved/skip; both blocks preserved at CMLL endpoints, top corners solved modulo recorded U offset.
- Ordinary EOLR endpoint is oriented six edges plus upper lateral edges matching neighboring corners; EOLRb is deferred.
- All original colors, centers, piece identities and actual rotations survive mapping. A fully solved cube, including center phase, is the final check.
- Normal 8 seconds / 500,000 operations; Lab 30 seconds / 2,000,000. Same global 25,000-entry, 32MiB static, 128MiB worker and 512-move/128-action ceilings as Plan 2.
- Score is `T + 2R + 2G + 2V + 2A` model units; FB+SB ranking is distinct from CMLL+LSE continuation ranking.
- Every published complete route is physically replayed; interrupted proofs remain unproven, and a correct baseline remains usable.

## Review Focus

- Two cases share top stickers but differ in side-color permutation — Task 11.
- A comfortable CMLL variant changes edges/center phase and breaks the assumed LSE start — Tasks 11–12.
- A basic explanation invents an intermediate checkpoint absent from the optimized trace — Tasks 12–13.
- A tighter proof removes the only complete route, or a stale worker replaces the new input — Tasks 13–14.
- Corrupt generated assets, color input or snapshots bypass final replay — Tasks 13–15.

---

### Task 11: Complete CMLL catalog and admission

**Files:** Create under `src/methods/roux-advanced/cmll/`: `types.ts`, `catalog.ts`, `recognize.ts`, `admission.ts`, `plan.ts`, corresponding tests and `data.ts`. Create `scripts/roux-advanced/verify-cmll.mts`, `tests/advanced-roux-cmll-coverage.test.ts`, `docs/research/roux-cmll-sources.md`.

**Interfaces:** `CmllFamily='O'|'H'|'Pi'|'U'|'T'|'Sune'|'Anti-Sune'|'L'`; `CmllMatch={caseId:string;family:CmllFamily;setup:readonly TeachingMove[];recognition:string;targetIds:readonly string[]}|{caseId:'solved';setup:readonly TeachingMove[]}`. `recognizeCmll(engine,state,frame):CmllMatch` checks legal block/corner domain first.

`CmllVariant` extends `TeachingAlgorithm` from `src/methods/contracts.ts` with `id:string`, `caseId:string`, `holdingMoves:readonly TeachingMove[]`, `recognition:string`, `sourceRefs:readonly {url:string;title:string;accessed:string;usageNotes:string}[]`, `executionProfileId:string`, `protectedIds:readonly string[]`, required `segments:{label:string;start:number;end:number}[]` (the existing segment convention), `centerPhaseDelta:Quarter`, `edgeTransform:{permutation:readonly number[];orientationDelta:readonly number[]}` (12 edge entries, engine-derived), and `default:boolean`. `CmllCatalog={version:string;cases:readonly {id:string;family:CmllFamily;label:string;variantIds:readonly string[]}[];variants:Readonly<Record<string,CmllVariant>>;digest:string}`. Export `CMLL_CATALOG`; `planCmllVariants(engine,state,frame,catalog,budget):readonly {variantId:string|null;actions:AdvancedRouxActionDraft[];state:CubeState}[]`, capped at two admitted variants × four AUFs, stable ordering. Holding/setup and original explanatory text accompany each variant in the teaching definition; store actual segment bounds, not inferred whitespace grouping.

- [ ] **Write recognition/admission tests:** `expect(CMLL_CATALOG.cases).toHaveLength(42)` and exact family counts O2/H4/Pi6/U6/T6/Sune6/Anti-Sune6/L6. Include same-top/different-sides, solved corners, AUF symmetries, altered middle edges, all center phases and eight frames. Every primary variant must have a feasible profile. Admit credible verified alternatives when grip/M/r usage or LSE continuation benefits; do not invent an alternate solely to fill every case's list.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/cmll tests/advanced-roux-cmll-coverage.test.ts --maxWorkers=1`.
- [ ] **Research and admit candidates.** Read the original Kian document linked in the spec with its bold/default formatting intact, plus primary execution sources for alternatives. Keep source dates and exact notation; create original recognition explanations/diagrams. Select a primary for the declared right-hand profile, not a claimed universal fastest formula. Independently replay defaults/alternates, calculate edge/center effects and verify blocks/corner order. Do not copy third-party prose/images or assume MIT covers them.
- [ ] **Verify:** the focused suite, `node scripts/roux-advanced/verify-cmll.mts` and typecheck. Generate legal cases with inverse formulas and additional legal remaining-edge states; ensure recognizer coverage is not merely testing each formula against itself.
- [ ] **Commit:** `git commit -m "feat: admit complete CMLL cases and ergonomic alternatives"`.

### Task 12: Joint EOLR/last-four planning and real basic alternative

**Files:** Create `src/methods/roux-advanced/lse/{model,assets,plan,explain}.ts` and tests; `data/lse-advanced.bin`; `scripts/roux-advanced/build-lse.mts`; `tests/advanced-roux-lse-coverage.test.ts`. Reuse pure transition math from `src/methods/roux/lse/model.ts` through a canonical frame adapter.

**Interfaces:** `AdvancedLseAssets={version:1;coordinateVersion:1;tables:Uint8Array;digest:string}`. `AdvancedLsePlan={mode:'combined'|'basic';actions:AdvancedRouxActionDraft[];state:CubeState;eolrBoundary:number;score:RouxExecutionScore}`. `planAdvancedLse(engine:CubeEngine,initial:CubeState,frame:RouxFrame,assets:AdvancedLseAssets,execution:RouxExecutionCatalog,budget:RouxSearchBudget,mode:'combined'|'basic'):AdvancedLsePlan` and `verifyAdvancedLseDomain(engine,assets):{reachable:number;verified:number;failures:readonly string[]}`. Boundary counts physical moves from the supplied initial state.

- [ ] **Write tests** for all reachable M/U coordinates including center phase/corner offset; test basic EO intermediate checkpoints exist in its own trace. Assert `expect(report.verified).toBe(report.reachable)` with `expect(report.failures).toEqual([])`. Pin a fixture where a slightly longer EO/LR prefix improves the last-four continuation and one where last four is skipped.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/lse tests/advanced-roux-lse-coverage.test.ts --maxWorkers=1`.
- [ ] **Implement reproducible finite-domain tables** derived from actual U/U′/U2/M/M′/M2 effects. Compare EOLR endpoints together with complete remaining paths; retain bounded grip-distinct alternatives. Ordinary EOLR means upper lateral placement, not bottom placement. Preserve both blocks and relative corner order; restore all centers and final AUF. `basic` uses a separately verified EO→LR→last-four sequence and labels its real checkpoints.
- [ ] **Verify:** generator `--verify`, exhaustive domain/admitted-transition suite and typecheck. Report reachable-state count, digest and maximum path lengths; reject table holes rather than narrowing the legal domain.
- [ ] **Commit:** `git commit -m "feat: optimize EOLR and last-four continuation with basic guidance"`.

### Task 13: Complete routes, selection and shared verification

**Files:** Create `src/methods/roux-advanced/{assets,presentation,definition,complete,search,selection,finalize,validate}.ts` and tests. Create `src/roux-lab/types.ts`, `playback.ts`, `playback.test.ts`. Modify `src/core/types.ts`, `src/methods/registry.ts`, `src/player/playback-source.ts`, `playback-timeline.ts`, `initial-setup.ts` and `PlaybackView.tsx` for the new discriminant only.

**Interfaces:**

- `AdvancedRouxAssets={blocks:BlockSearchAssets;beginner:RouxAssets;cmll:CmllCatalog;lse:AdvancedLseAssets;execution:RouxExecutionCatalog;version:string}`. `loadAdvancedRouxAssets(fetcher:typeof fetch,signal:AbortSignal):Promise<AdvancedRouxAssets>` verifies all bytes/hashes/versions and static memory limits before use; the 32MiB total includes reused beginner tables, not only new arrays.
- `RouxSettings={allowedFrames:readonly RouxFrameId[];mode:RouxSearchMode;modelVersion:'roux-execution-v1'}`. `RouxCoverage={elapsedMs:number;operations:number;entries:number;retainedBytes:number;frames:Partial<Record<RouxFrameId,FirstBlockEvidence>>;verifiedRoutes:number;reason?:RouxStopReason}`.
- `RouxRoute={kind:'roux-lab';schemaVersion:1;id:string;input:RouxInput;frameId:RouxFrameId;trace:SolveTrace;basis:'optimized'|'baseline-fallback';evidence:FirstBlockEvidence;score:RouxExecutionScore;counts:{first:number;second:number;combined:number;rotations:number};boundaries:{firstStart:number;firstEnd:number;secondEnd:number;cmllEnd:number};lseMode:'combined'|'basic';formulas:Readonly<Record<string,CmllVariant|TeachingAlgorithm>>;versions:{app:string;search:string;catalog:string;model:string}}`. Boundary/counts derive from finalized execution, not original formula strings.
- `completeRouxCandidate(engine,input,frame,blocks:TwoBlockCandidate,assets,budget):RouxRoute`; `withBasicLse(engine,route,assets,budget):RouxRoute` produces a new immutable route with the same verified prefix, not a cosmetic explanation switch.
- `AdvancedRouxOutcome={ok:true;routes:readonly RouxRoute[];coverage:RouxCoverage}|{ok:false;code:'budget'|'initialization'|'verification'|'unsupported-case';message:string;coverage:RouxCoverage}`. `searchAdvancedRoux(engine,input,settings,assets,budget):Generator<{kind:'work'}|{kind:'result';route:RouxRoute}|{kind:'progress';coverage:RouxCoverage},AdvancedRouxOutcome>`.
- `validateRouxRoute(engine,raw:unknown,assets:AdvancedRouxAssets):RouxRoute` bounds structure then replays original input and all checkpoints. Archival formula data is admitted as inert verified transformations, never callbacks. `createAdvancedRouxRuntime(assets:AdvancedRouxAssets,frameId:RouxFrameId):MethodRuntime` owns all six stage checks for that frame; do not validate a yellow-frame trace with a globally registered white-frame predicate.
- `prepareRouxPlayback(engine,route,assets):{timeline:PlaybackTimeline;setup:readonly TeachingMove[];algorithms:Readonly<Record<string,TeachingAlgorithm>>;label:string}`; setup replays from solved to the timeline's initial state. Add `PlaybackSource` member `{kind:'roux-lab';prepared:ReturnType<typeof prepareRouxPlayback>}`. Standard complete solves still use a `SolveSession`. Add optional `SolveTrace.rouxAdvanced` as `Pick<RouxRoute,'frameId'|'basis'|'evidence'|'counts'|'lseMode'> & {modelVersion:'roux-execution-v1'}` metadata for normal-page disclosure, using a type-only declaration to avoid a runtime core-to-Lab import.

- [ ] **Write tests:** d+2 eligibility is separate from fallback; `expect(outcome.ok && outcome.routes.some(r=>r.basis==='baseline-fallback')).toBe(true)` after optional search stops. Test tighter proof, mixed rated/unrated routes, dominated candidates, partial first-block references, already solved input, formula compaction provenance, late candidate corruption and CMLL+LSE score not changing the block subtotal.
- [ ] **Run red:** `npx.cmd vitest run src/methods/roux-advanced/search.test.ts src/methods/roux-advanced/finalize.test.ts src/roux-lab/playback.test.ts`.
- [ ] **Implement baseline-first completion**, then fair round-robin exploration across allowed frames with shared limits. Complete CMLL/LSE before publishing a recommended candidate. Keep shortest incomplete witnesses as evidence only. Max 1 normal / 4 Lab routes, deduplicated and meaningfully different. Preserve pending proof bounds, never silently substitute forbidden colors.
- [ ] **Implement finalized trace verification**, six stages/skips, truthful block explanations and compaction through the existing runtime contract. Select complete CMLL+LSE continuation separately. Validate formula snapshots and all center/protection endpoints. Rendering must not require current CFOP assets for Roux traces.
- [ ] **Verify:** focused tests, generated assets checks, existing player/compaction tests and typecheck. A missing profile yields an unrated reference, not zero regrips.
- [ ] **Commit:** `git commit -m "feat: finalize verified advanced Roux routes and fallback results"`.

### Task 14: Progressive worker and normal solve integration

**Files:** Create `src/workers/roux-advanced-protocol.ts`, `roux-advanced-request.ts`, `roux-advanced.worker.ts` and protocol/request tests; `src/roux-lab/client.ts`, `client.test.ts`; modify `src/app/solve-client.ts`, its tests, `src/workers/solve-request.ts`/tests for edition guards, `src/player/PlaybackView.tsx`, `playback-timeline.ts` for prepared frame-bound runtime selection; create `src/methods/roux-advanced/browser-runtime.ts`.

**Interfaces:** `RouxRequest={kind:'analyze';requestId:number;edition:'club';input:SolveInput;settings:RouxSettings;startedAtEpochMs:number}` or `{kind:'cancel';requestId:number}`. Replies are `{requestId,kind:'progress',coverage}` / `{requestId,kind:'candidate',route}` / `{requestId,kind:'done',outcome}` / `{requestId,kind:'error',message}`. Validate unknown messages before use.

`createRouxSearchClient(engine:CubeEngine,options?:{workerFactory?:()=>RouxWorkerPort;now?:()=>number}):RouxSearchClient`; `start(input,settings,onEvent:(event:RouxClientEvent)=>void,timing?:{startedAtEpochMs:number}):{stop():void;done:Promise<AdvancedRouxOutcome>}`, `dispose():void`. Events expose verified candidates/progress only. `RouxWorkerPort` follows existing postMessage/onmessage/onerror/terminate shapes with the new protocol. A main-thread watchdog uses request start time; epoch transport initializes worker-relative elapsed time without confusing different performance.timeOrigin values.

Extend normal `createSolveClient(factory?:()=>WorkerPort,edition:'global'|'club'='global',advancedFactory?:(engine:CubeEngine)=>RouxSearchClient)` with the third optional dependency; preserve existing first/second argument behavior. Add optional third argument `{allowedFrames:readonly RouxFrameId[]}` to `solveScramble(text,method,options?)`/`solveFacelets(facelets,method,options?)`; return the existing `Promise<SessionResult>`. The normal adapter lazily obtains the cube engine and delegates only `roux-advanced` in the club edition. Start its deadline before lazy engine initialization, pass the original epoch deadline into client startup, and invalidate both paths on cancellation/new-method/input. `prepareAdvancedRouxPlayback(frameId:RouxFrameId):Promise<MethodRuntime>` loads verified assets with bounded retry; `getPreparedAdvancedRouxRuntime(frameId:RouxFrameId):MethodRuntime|undefined` creates a frame-bound runtime from cached assets. Normal playback waits for preparation and obtains the runtime for its trace metadata, rather than mutating a singleton frame shared with another lesson. Register common presentation once; retain frame-specific validation.

- [ ] **Write fake-clock/port tests:** stale IDs/input/frame sets rejected; stopped clients retain previously verified incumbents; a playing/pinned snapshot is not mutated; initialization consumes deadline; cancellation after import is ignored; globals reject the method. Assert no success comes from malformed, over-limit or mismatched input replies.
- [ ] **Run red:** `npx.cmd vitest run src/workers/roux-advanced-request.test.ts src/workers/roux-advanced-protocol.test.ts src/roux-lab/client.test.ts`.
- [ ] **Implement bounded pumping** (8ms/256 operations) including startup/asset load under the same wall clock. Publish first validated baseline before optional work. Main thread independently validates finalists before any event exposes them; use time-sliced verification if needed. Terminate a stuck worker and retain validated routes with the actual stop reason. Never expose an unfinished trace as success.
- [ ] **Verify:** focused tests + `src/app/solve-client.test.ts`, existing worker tests and typecheck. Normal default frames are `['white-blue']`; Lab defaults all eight. Tightened budgets do not affect other methods' existing limits.
- [ ] **Commit:** `git commit -m "feat: stream bounded Roux results with safe normal-solver fallback"`.

### Task 15: Full corpus, independent proof and integration gates

**Files:** Create `tests/advanced-roux-corpus.test.ts`, `advanced-roux-color-input.test.ts`, `advanced-roux-efficiency.test.ts`, `advanced-roux-trace.test.ts`, `scripts/roux-advanced/benchmark.mts`; modify `package.json`; create `docs/validation/2026-10-23-advanced-roux.md`.

**Interfaces:** Package scripts: `verify:advanced-roux` runs block/LSE generator `--verify` and CMLL admission; `test:advanced-roux:coverage` runs proof/CMLL/LSE coverage serially; `test:advanced-roux:corpus` runs the four corpus/color/efficiency/trace files serially; `benchmark:advanced-roux` writes versioned JSON with actual hardware/configuration and latency/coverage distributions.

- [ ] **Write corpus assertions:** seed range 0–999 × every `ROUX_FRAMES` entry; `expect(report.fullReplays).toBe(8000)`, solved cube/center frame and trace checks for every returned route, zero unexplained state loops/reducible execution boundaries. Require complete optimized or fallback results within normal caps for the representative corpus; record fallback/improvement rates separately. Include all facelet equivalents from a bounded representative subset, malformed inputs and deliberate corrupted route/assets.
- [ ] **Run red:** focused new tests must fail on deliberate endpoint/center/evidence corruption, not merely on missing report files.
- [ ] **Implement reusable corpus/benchmark harnesses** using deterministic operation budgets; do not spend 30 seconds on each corpus seed. Benchmark real full-budget Lab requests separately, include cold/warm initialization, yield responsiveness, stopped/pinned cases and all eight orientations. Preserve tricky regressions as legal fixtures.
- [ ] **Verify:** all three new verification scripts, existing `test:roux:coverage`, `test:roux:corpus`, `test:corpus`, relevant Lab regression and typecheck. Save failures rather than skipping seeds. Report physical phone/ergonomic evidence as pending where absent.
- [ ] **Commit:** `git commit -m "test: verify advanced Roux coverage and bounded complete solving"`. Continue to Plan 4; no production release yet.
