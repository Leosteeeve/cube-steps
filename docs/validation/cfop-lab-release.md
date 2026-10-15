# CFOP Lab release validation

**Release state: validation in progress; not yet merged or deployed.**

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

Final command counts, integrated timing measurements, independent review and publication receipt will be recorded here after their corresponding checks complete. Partial or failed runs are not passes.

The first integrated smoke test found the old 30.5-second scheduled watchdog surfaced at 30,510 ms with a deliberately silent worker. A deterministic failing timer test confirmed the missing headroom; the watchdog was changed to 30.4 seconds and the test passed. A fresh built-UI run is required below before release.

Guide screenshots use isolated examples, explicitly labeled where appropriate. The accepted five-minute Guide film and 30-second outreach clip are unchanged. The README retains the public club entrance without naming the school or claiming restricted access.

## Publication and rollback

Publication awaits completed checks and one independent review. The authorized workflow is feature PR → required validation → merge → Pages preview deployment → deployed revision/browser verification → primary checkout synchronization. The prior deployed/main revision is `7298560961d102d26087a908a4fd2f97923b8294`; it remains a rollback reference. No public link should be reported as updated until the deployed build receipt matches the merged commit.
