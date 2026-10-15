# CFOP Lab core validation

Recorded October 14, 2026. Software correctness and the desktop **core** first-result target pass. This is a temporary worker harness, before the club UI and its independent main-thread verification. Integrated performance, representative physical-phone performance, and human handling calibration remain pending. Nothing in this report establishes a fastest human solve or globally optimal F2L.

## Reproducible configuration

- Search `lab-search-v1`; execution model `lab-execution-v1`; catalog `cubesteps-cfop-2026-10-14`.
- Shared search ceilings: 2,000,000 accounted operations, 25,000 retained entries, 96 crosses per bottom, 32 beam nodes per depth/root, 12 insertion candidates per target, 512 route tokens and 128 actions. The clock includes lazy initialization and stops at 30 seconds.
- The first complete seed uses one feasible preparation/formula per physical working hold, comparing every remaining pair. Wider refinement retains bounded preparation/variant enumeration and alternative pair orders. This tuning reduces initial work without omitting any selected color or changing validation.
- The worker harness checks after each bounded generator step, targeting 4 ms or 128 operations to leave headroom inside the design's 8 ms / 256-operation scheduling thresholds. It yields through event-loop tasks, so Stop can be delivered.
- Machine: Windows 11 build 26200, AMD Ryzen 9 8945HX, Node 24.18.0, Chromium 156.0.8078.4. Measurements identify base revision `57cc4b5` plus dirty status and hashes of the subsequently changed search/benchmark files. These are recorded development measurements, not production build results.

## Correctness

[Corpus evidence](data/lab-corpus.json) records all 1,000 fixed seeds from `tests/fixtures/lbl-cases.ts`. Every input produced a valid shortest-cross seed for each of the six bottoms: **6,000 complete physical solutions**. There were **zero rejected candidates**. Inputs alternated between scramble and face-entry forms; every returned route was independently replayed from both equivalent physical states, and input immutability was checked.

The independent replay uses actual stickers, pieces and centers. It does not obtain expected endpoints through the Lab frame adapter. It independently extracts the four selected-color cross coordinates, checks the distance table, replays every action and setup, verifies protected pairs and stage predicates, and counts physical turns/rotations.

The catalog test covers **41 F2L cases × 4 slots × 4 horizontal holds × 6 bottoms = 3,936 combinations**, with every applicable admitted variant. It also replays all fixture alignments for **57 OLL and 21 PLL cases** in six colors, including AUF. Domain tests cover skipped stages, solved objectives, wrong-slot extraction, useful rotations, a locally dearer insertion with a cheaper complete continuation, forged metadata, archived-model routes, cancellation, late candidate failure and incremental/whole-route score agreement. Advanced CFOP still rejects non-descending cross steps; Lab separately permits valid `d + 1` / `d + 2` paths.

The 190,080-state cross table was reverified against SHA-256 `e9bfbe91bcaea8e85ce4dd56b350969adce7b058633be1f6175b01703c070f73`.

The full corpus and catalog completed in 186.90 seconds. Across six-color seed generation, the maximum was 155,313 operations, the maximum retained-entry high-water mark was 394, and the largest work gap between generator yields was 50 operations. These are corpus observations, not reduced production ceilings. Caller interruption released retained entries.

## Desktop core latency

[Cold/warm measurements](data/lab-core-benchmark.json) use 40 fixed inputs in fresh browser contexts and the same 40 inputs in a warm worker. The first result includes worker creation, lazy imports, engine/table initialization, search and worker validation. UI and main-thread validation are excluded.

| Measurement                  | Cold, 40 runs | Warm, 40 runs |
| ---------------------------- | ------------: | ------------: |
| Median first verified route  |        803 ms |        697 ms |
| p95 first verified route     |      1,154 ms |      1,052 ms |
| Maximum first verified route |      1,201 ms |      1,082 ms |
| p95 Stop-to-done             |        6.9 ms |        5.9 ms |
| Maximum Stop-to-done         |        7.7 ms |        7.2 ms |
| Maximum operations per batch |           161 |           161 |

The desktop first-result p95 target of 5 seconds and core cancellation target of 250 ms are met in this harness. The largest observed cold batch was 8.2 ms; warm batches peaked at 2.5 ms. A strict 8 ms wall-clock maximum is **not** demonstrated: a non-preemptible step, scheduling or collection can cross a clock threshold before the next check. The implementation uses headroom and retains the operation bound; integrated checks must continue to record actual maxima.

[Three full progressive runs](data/lab-core-progressive.json) ended with `time-limit` at 30,015.6, 30,002.3 and 30,004.4 ms. All seeded six colors with zero rejected candidates. They consumed 777,097–781,704 operations, peaked at 6,427 retained entries and released all retained entries at completion. The largest batch was 197 operations / 8.6 ms. Deadline delivery is bounded by the next cooperative step, with a 30.5-second watchdog to be enforced by the client.

The worker exposed no heap-memory API. Entry counts do not establish a byte-level memory bound, and no heap number is invented. No representative physical phone was connected; neither the 8-second phone target nor a phone memory profile is verified. This gap is carried into integrated acceptance, with no claim that desktop or viewport emulation substitutes for a phone.

## Baseline comparison

[Baseline evidence](data/lab-efficiency.json) uses 40 fixed inputs, each under stable Advanced CFOP, White-only Lab seeds and All-six Lab seeds. This compares initial complete seeds; it does not credit the optional 30-second refinement. Advanced is rescored under the same execution model, with initial holding and last layer excluded. All 40 results in each group were rated and physically valid.

| Cross + F2L metric          | Advanced | Lab White-only | Lab All-six |
| --------------------------- | -------: | -------------: | ----------: |
| Mean counted turns          |   38.825 |         39.675 |      34.825 |
| Median counted turns        |       39 |             40 |          35 |
| Mean cube rotations         |      3.2 |            3.3 |         2.8 |
| Mean estimated hand regrips |     2.45 |          2.175 |         1.6 |
| Mean estimated cost         |   53.575 |         55.475 |      46.225 |

The White-only seed is not universally better than the accepted solver. All-six selection improves these aggregate metrics on this sample, but color neutrality adds recognition demands and the handling model remains an uncalibrated hypothesis. Costs are not seconds. Right-hand-leading physical trials with members are still needed.

## Commands and remaining gates

```text
npm.cmd run typecheck
npm.cmd run test:lab
npm.cmd run test:lab:corpus
npm.cmd run test:lab:efficiency
npm.cmd run verify:cross
npm.cmd run benchmark:lab -- --phase core --runs 40
npm.cmd run benchmark:lab -- --phase core --runs 0 --full-runs 3 --output test-results/lab-core-progressive.json
```

The benchmark also accepts `--base-url` and `--output`. Diagnostic corpus limits are explicitly labeled partial and are not accepted as the full corpus. `--phase integrated` currently refuses to claim a result until Task 15 adds the completed UI path. Temporary harness files are removed after execution and are outside the production module graph.

Tasks 7–15 must still verify main-thread admission, stale-message handling, pinned playback, real browser interaction, trial persistence, import/export, ordinary-method regressions, production assets and final independent review. Physical-phone performance and human handling feedback must remain visibly unverified until measured. The club feature remains unpublished during these steps.
