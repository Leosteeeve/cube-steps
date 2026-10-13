# Human-friendly F2L validation

Status: implementation and automated validation in progress. Revised Advanced CFOP remains Preview pending physical-cube follow-along acceptance. The owner authorized publishing the preview together with the club edition.

## Policy and regression evidence

The `f2l-human-v2` policy ranks actual recognition visibility and reviewed grip quality before effort. Preparation considers four horizontal holds at complete maneuver boundaries, retains immutable target identities and preserves completed pairs. Shortlists retain two candidates per resulting front color; one shared 262,144-call budget includes recognition, setup, insertion, lookahead and cache hits. Preparation remains limited to 1,024 states and two extractions per target.

The tests cover a useful regrip for `f2l-20/br/u0`, a retained `R' U' R` insertion for `f2l-02/br/u0`, a corner/edge trapped in different slots, four holding frames, continuation without a forced green-front reset, rejection of forged regrip metadata, and backward playback through an internal formula rotation. A deliberately changed regrip fails replay equality. All 41 cases are replayed in four slots and four horizontal frames.

## Baseline and tradeoffs

The unchanged old policy was measured at commit `7dc0fec5527dbfa490d60ba030c7cb1cda054e26`, before implementation in the separate worktree. The saved [baseline summary](data/f2l-human-baseline.json) records its environment and seeds. Across seeds 1–1,000, Advanced F2L averaged 30.458 face-turn equivalents and zero rotations; Beginner F2L from identical crossed states averaged 45.527 turns and 5.494 rotations.

The previous comparisons against 90% of Beginner mean turns, Beginner median turns and Beginner mean rotations are now reported diagnostics. They are not the acceptance criteria for this comfort-first policy. No measured human speed or globally shortest F2L is claimed.

The [new report](data/f2l-human-efficiency.json) records 31.949 mean / 32 median / 39 p95 F2L turns and 3.310 mean / 3 median / 6 p95 rotations. Mean turns increased by 1.491 (about 4.9%) over the old Advanced policy. Complete solves averaged 63.068 turns, compared with 61.677 previously. All three legacy comparisons against Beginner happen to remain true, but are diagnostics rather than the acceptance gate. Of 3,992 selected pair insertions, 3,784 had zero visibility/grip penalty and 208 had a nonzero penalty; this heuristic is not a human comfort rating.

## Checks completed so far

- TypeScript check and production build passed. Vite retains its existing large-chunk advisory for bundled puzzle/catalog assets.
- 75 unit-test files, 319 tests passed, including deep snapshot immutability and preservation of mutable input observations.
- The exact-cross asset verified all 190,080 states with unchanged SHA-256 `e9bfbe91bcaea8e85ce4dd56b350969adce7b058633be1f6175b01703c070f73`; its two exhaustive table tests passed.
- Case generation verified 972 physical fixtures for 119 cases.
- All four corpus files (five tests) passed in 528 seconds, including 1,000 Advanced scrambles solved twice plus their color inputs. The separate 1,000-seed efficiency run passed in 163 seconds.
- All 84 development browser checks and 10 production checks passed in Chromium/WebKit. A test readiness race was corrected by waiting for the new player identity before selecting its stage. After correcting catalog prose, the catalog/player targeted tests passed again.
- Current/destination holding labels, formula-boundary stepping, camera independence and 390/1440 px layouts were inspected. Screenshot capture waits for renderer completion and its initial canvas fade.

## Performance implementation

Profiling found repeated formula compilation, generic state serialization, pair observation and state-key generation. Bounded compiled-transform caching, per-selection simulation/observation caches, frozen-state pair observations, local state keys and explicit number-array snapshot copies remove repeated work. Snapshot freezing is preserved; mutable input states are never retained by the pair-observation cache. These changes do not alter candidate ranking, search limits or the shortest-cross table.

## Release and physical review

The accepted LBL daisy route and Beginner CFOP rules remain unchanged. The final independent review covers this shared change and the linked club plans on the integration branch. Before changing Advanced CFOP from Preview to accepted, follow the useful-regrip case, easy-rear case, wrong-slot extraction and a six-face input on a physical cube. Visual approval and automated replay do not replace that check.

## Desktop production benchmark

On the documented Windows Ryzen 9 8945HX desktop with Chromium 156, 20 fresh contexts had cold navigation-to-reply p95 416.9 ms (target 5,000 ms); 50 warm solves had worker p95 240.2 ms (target 2,000 ms). Twenty immediate cancellations had p95 0.8 ms. See the [benchmark report](data/f2l-human-benchmark.json). This was the local Task 4 build; its metadata predates uncommitted source changes. It is not mobile timing evidence or verification of a deployed commit.
