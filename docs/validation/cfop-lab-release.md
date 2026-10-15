# CFOP Lab release validation

**Release target: club-only Experimental preview.** Automated results and the independent review are recorded here; publication is verified separately against the associated pull request and Pages workflow.

This record covers the club-only Experimental CFOP Lab. Stable LBL, Beginner CFOP and Advanced CFOP retain their method contracts. The Lab explores six selectable physical bottoms, four fronts per bottom and crosses at the exact minimum through minimum + 2, then evaluates complete F2L sequences under a right-hand-led handling model.

## Evidence classes

- **Automated correctness:** independent physical replay, state/hold identity, formula boundaries, exact cross references and current-model score checks. Earlier detailed evidence is in [core validation](cfop-lab-core.md) and [workspace validation](cfop-lab-workspace.md).
- **Browser integration:** actual production workers, player, color entry, search cancellation, lazy loading, immutable snapshots, IndexedDB, trial timing and JSON/CSV transfer. Development and production runs are reported separately below.
- **Performance:** actual built UI measurements include main-thread independent verification before a result becomes visible. Cold profiles and warm page/cache runs are distinct. Renderer heap estimates do not prove a worker-specific memory bound.
- **Physical acceptance:** pending. No user or club-member execution times, endorsements, phone performance or fingertrick calibration have been invented. [Seven reproducible fixtures and a worksheet](../lab/physical-review.md) are supplied for real testing.

## Contracts and limitations

The current score is `T + 2R + 2G + 3V + 2A`, version `lab-execution-v1`. Search/catalog versions are `lab-search-v1` and `cubesteps-cfop-2026-10-14`. Initial positioning and OLL/PLL/AUF are outside the Cross + F2L objective and trial interval. The score is an estimate, not seconds or a global optimum.

The 30-second search deadline includes initialization. A 30.4-second emergency watchdog leaves scheduling headroom beneath the 30.5-second foreground target; browsers can delay timers in suspended/background tabs. Stop terminates the worker and drops queued or late results while retaining independently verified choices. Operational ceilings remain two million accounted operations and 25,000 retained entries across worker and admission; this is not a claim about every browser allocation.

Trials use unchecked setup/hold confirmations, a 300 ms readiness hold and explicit outcome review. Focus loss, navigation, visibility changes and pointer cancellation cannot create a followed result. Fixed comparison blocks retain AB/BA order through reload. Only five complete matched blocks from the same tester, timing method, routes and endpoint enable descriptive medians. Deleted/revised attempts remain recoverable; failed saves remain explicitly pending.

Transfers are capped at 10 MiB, 50 experiments and 5,000 attempt/revision records. Exact schemas, graph references, immutable revision chains and physical replay are checked before writes. Import commits recheck conflicts atomically. Copies remap snapshot/record identities while preserving exact content-addressed route IDs. Archived versions retain original formulas and estimates, and cannot be presented as current recommendations. No imported code or remote resource executes.

## Verification record

| Gate | Observed result |
| --- | --- |
| Typecheck and production build | Passed, including the review fixes. Existing large cubing chunk warning remains. |
| Exact cross table | 190,080 states; SHA-256 `e9bfbe91bcaea8e85ce4dd56b350969adce7b058633be1f6175b01703c070f73`. |
| Admitted algorithm fixtures | 972 fixtures across 119 cases, passed. |
| Full unit suite after review fixes | 150 files / 739 tests passed. |
| Stable solver/color corpus | 4 files / 5 tests passed, 616.10 seconds. |
| Lab catalog and corpus | 2 files / 3 tests passed, 228.97 seconds; 1,000 seeded inputs × six physical bottoms, plus catalog/last-layer replay. |
| Stable efficiency regression | 1 test passed, 179.54 seconds. |
| Lab efficiency comparison | 1 test passed, 16.10 seconds; fixed sample, not a universal improvement claim. |
| Guide manifest | Passed; Analyze, Compare and Trials screenshots recaptured and visually checked. |
| Exhaustive cross table and physical fixture replay | 2 files / 3 tests passed. |
| Production browser integration | 36/36 Chromium/WebKit passed before review fixes; the affected built Lab workflow and lazy-loading checks then passed 4/4 after fixes. Final full CI remains a publication gate. |
| Complete development browser suite | 246 discovered; first full run had 239 passes and seven failures from obsolete navigation/watchdog expectations or lazy-image timing. Corrected affected suites passed 18/18 and 4/4; a fresh complete GitHub CI run gates merge. |
| Integrated desktop benchmark | 40 cold + 40 warm runs, three full searches and one silent-worker watchdog passed the desktop targets; detailed values below. No physical-phone result claimed. |

Partial or failed runs are not passes. The first production run had 34 passes and two obsolete eight-chapter assertions; the Guide now has nine chapters, including Lab. Updating that exact expectation and explicitly checking the Lab heading produced the green 36-test run.

The first integrated smoke test found the old 30.5-second scheduled watchdog surfaced at 30,510 ms with a deliberately silent worker. A deterministic failing timer test confirmed the missing headroom; the watchdog was changed to 30.4 seconds and the test passed. The fresh built-UI watchdog completed at 30,414.1 ms.

## Integrated desktop measurements

[Raw measurements](data/lab-integrated-benchmark.json) come from clean production build `787fda6ec5c8e0b9a711fd93ace5e7d6a86f3d0e`, Windows 11 / AMD Ryzen 9 8945HX / Chromium 156.0.8078.4. One serial WebKit regression suite ran on the same desktop; this was not an idle-host benchmark. Cold runs use a fresh browser profile; warm runs reuse the page/cache but each analysis creates a new worker. Every first visible candidate has passed main-thread physical verification.

| Measurement | Cold (40) | Warm (40) |
| --- | ---: | ---: |
| Median Analyze-to-first verified route | 856.9 ms | 835.9 ms |
| p95 Analyze-to-first verified route | 1,205.6 ms | 1,184.2 ms |
| p95 including initial page readiness | 2,140.7 ms | 1,184.2 ms |
| Maximum click-dispatch-to-worker-terminate call | 0.3 ms | 0.1 ms |

The desktop p95 target of 5 seconds is met, including cold page readiness. The Stop measurement covers the actual worker termination call, not an estimate of when an operating system reclaims every allocation. Three full searches ended at 30,005.4–30,008.2 ms, with 749,850–755,002 combined operations and a maximum retained-entry high-water count of 6,436. The deliberately silent worker was stopped at 30,414.1 ms, within the 30.5-second foreground target. All measured console-error lists were empty.

No representative physical phone was available, so the 8-second phone target is unverified. Experimental labeling, progressive results and Stop/current-route use are the release tradeoff until real-device testing. Renderer heap estimates are supplemental and do not establish a worker-specific heap-byte bound.

Guide screenshots use isolated examples, explicitly labeled where appropriate. The accepted five-minute Guide film and 30-second outreach clip are unchanged. The README retains the public club entrance without naming the school or claiming restricted access.

## Independent review and fix pass

One fresh-context `gpt-6-astra` reviewer examined the whole branch `7298560..7e6e448` read-only, including targeted diagnostics. It established no critical issues and three Important findings. All three received a focused failing regression before the fix:

- Loading a saved experiment now replaces the displayed scramble or facelet draft, clears obsolete validation, and keeps the input diagram aligned with its routes.
- CSV eligibility now uses the same complete matched blocks and exact tester/method grouping as the on-screen summary; incomplete blocks and superseded revisions retain their exclusion reasons.
- Every client termination records its actual reason and current elapsed/work accounting, including Stop, watchdog, admission limits and errors. A delayed browser receipt may honestly exceed 60 seconds without extending the 30-second active-search budget; it remains saveable instead of being rejected solely for scheduling delay.

Post-fix full unit/type/build checks passed; browser and final deployment receipts remain distinct gates. There are no deferred minor findings. No second review was dispatched.

The reviewer explicitly left physical-phone behavior, human fingertrick benefit, worker-specific heap bytes, global search optimality and eventual deployment outside its established evidence. These remain limitations or separate executor gates, not silent approvals.

The [complete implementation decision record](cfop-lab-decisions.md) preserves each ruling and its stated cost if wrong.

## Publication and rollback

The authorized workflow is feature PR → complete required CI → merge → Pages preview deployment → deployed revision/browser verification → primary checkout synchronization. The [validation workflow](https://github.com/Leosteeeve/cube-steps/actions/workflows/ci.yml) and [Pages workflow](https://github.com/Leosteeeve/cube-steps/actions/workflows/pages.yml) provide the exact run/commit receipts. Pages is dispatched with `publish_preview=true` and `teaching_accepted=false`; no physical acceptance is implied.

Verify `build-info.json` against the merged commit, inspect the deployed Lab/Guide/global entries, and preserve the receipt with local release evidence. The prior deployed/main revision is `7298560961d102d26087a908a4fd2f97923b8294`; it remains a rollback reference. No public link should be reported as updated until the deployed build receipt matches the merged commit.
