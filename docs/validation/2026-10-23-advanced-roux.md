# Advanced Roux validation

Status: required core corpus, coverage, compatibility and browser benchmark gates verified. An additional CFOP Lab six-color corpus is running. This report is not physical acceptance or a claim of globally optimal two-block solving.

## Reproducible gates

- `npm run verify:advanced-roux`: regenerates the block projection and LSE policies, checks exact bytes and manifests, and admits the CMLL catalog.
- `npm run test:advanced-roux:coverage`: independent shallow physical first-block oracle; all CMLL classes, holds and center phases; the complete legal LSE domain.
- `npm run test:advanced-roux:corpus`: seeds 0–999 in all eight holds, independent endpoint/checkpoint replay, representative color equivalents, input and snapshot corruption, and physical-loop checks.
- `npm run benchmark:advanced-roux -- --output test-results/advanced-roux-benchmark.json`: real browser worker/client requests, cold and warm delivery, normal and full-budget Lab, stop and immutable pinned snapshots.

The corpus runs eight isolated test processes, each with 125 seeds and all eight holds. Files remain serial at the top-level test command. This reduces elapsed verification time without sharing engines, caches, budgets or results between requests. Every seed/frame identity must occur exactly once in the combined report. Failed seeds are saved, never removed. Each request has a 400,000-operation worker allocation within the normal ceiling and stops after its first complete route. This measures baseline coverage, not the optional optimization success rate or real-time latency. Seed zero uses a documented nonzero xorshift state because zero is absorbing.

Recorded core results:

- 8,000/8,000 complete physical replays, all centers restored to the selected hold; zero failures and zero unexplained loops or reducible action boundaries.
- 1,049 explicitly explained cross-stage reference connections. These are counted separately, not silently removed from the audit.
- Maximum first-route work: 147,392 accounted operations. All 8,000 first routes were the preserved baseline; optional optimization was intentionally stopped for this coverage run.
- 128 independent color-state/hold combinations matched the corresponding text-scramble teaching moves. Malformed input, corrupted endpoint/center/evidence and a 1,000-turn legal input passed their respective rejection/witness checks.
- Eight representative snapshots passed the independent 100,000-operation normal-client allocation.
- 42 CMLL classes / 46 admitted variants; all 184,320 legal LSE states and their admitted transitions; independent shallow physical first-block oracle passed.
- Generated block/LSE/CMLL bytes matched their committed manifests. The advanced corpus command passed 10 tests in four files; exhaustive advanced coverage passed eight tests in three files. Existing Beginner Roux coverage and corpus also passed.
- Existing LBL/color/Beginner CFOP/Advanced CFOP corpus command passed five tests in four files, including 1,000 Advanced CFOP inputs solved twice and as colors. The relevant CFOP Lab regression passed 174 tests in 23 files.

## Integrity and teaching boundaries

Active block and LSE table bytes are private. Public inspection buffers cannot change search bounds or policy transitions; both copies count toward retained-memory estimates. Imported minimum claims are independently checked against a replayed witness and the admitted lower-bound table. A claim without an independent certificate is downgraded rather than trusted.

The replay audit distinguishes removable loops inside a stage from a named formula meeting a real stage checkpoint. For example, a second-block `R′` followed by a CMLL `R′` can become `R2` during continuous execution, but the complete-block checkpoint exists between the two quarter turns. The player explicitly describes that connection, including cancellable suffix/prefix sequences, and says that continuous execution skips the intermediate check. The teaching replay retains the real checkpoint and counts its actual displayed turns. The audit separately counts these explained reference connections; it does not claim that every cross-stage teaching replay is a globally reduced speedsolve sequence. Original formula boundaries remain available.

## Desktop browser measurements

Reference machine: Windows 11 build 26200, AMD Ryzen 9 8945HX, 32 logical CPUs, Node 24.18.0, Chromium 156.0.8078.4. A blank same-origin page runs the actual search client/worker and independent main-thread admission. Vite module delivery is included; unrelated home animation is excluded. These are desktop measurements, not a phone simulation or production deployment measurement.

The first scheduler used nested zero-delay timers. Initial results ranged from approximately 3.00–5.43 seconds in the normal requests. A regression test exposed that dependency. Using a MessageChannel task boundary removes timer clamping while preserving cancellation opportunities and closing both ports after each yield.

After that change, the same eight-frame benchmark measured:

| Measurement                           | Observed result                              |
| ------------------------------------- | -------------------------------------------- |
| Cold first complete normal result     | 1.54 s                                       |
| Seven warm-cache normal first results | 0.51–0.62 s                                  |
| Normal complete bounded request       | 1.11–2.67 s                                  |
| Two full-budget Lab requests          | 7.51 s / 7.59 s, stopped at the work ceiling |
| First complete Lab result             | 0.53–0.54 s                                  |
| Explicit stop settlement              | 0.20 ms after the stop callback              |
| Largest 16 ms main-thread probe gap   | 43.4 ms, including startup and admission     |
| Pinned snapshots changed              | 0                                            |

All eleven benchmark requests retained a complete verified route. Six of eight holds produced verified baselines in each full-budget all-frame Lab run; two remained honestly labeled not explored when the shared budget ended. This sample does not establish all-frame completion under every time/work budget. Two of eight normal requests returned an optimized route in this fixed benchmark; the corpus reports baseline coverage separately.

The 43.4 ms probe gap is an observed event-loop interval, not a claim that every task lasted at most 8 ms. Generator quantum tests cover cold admission, complete baseline, scoring, independent validation and optional exploration; actual device performance remains subject to engine primitives, imports and garbage collection.

## Pending acceptance

- The supplementary CFOP Lab 1,000-input/six-color corpus also passed: 3 tests in 2 files, 589.63 seconds. It supplements the required 174-test Lab regression above.
- Integrated desktop/mobile viewport, keyboard, reduced-motion, storage and publication checks follow the club-page implementation.
- Physical phone responsiveness and human finger-trick/block-choice calibration remain pending.
- Short and full no-narration films retain their separate user approval gates.

## Club integration evidence (2026-10-24, release checks in progress)

Tasks 16–21 add the club-only advanced solver, 42-case CMLL reference and untimed practice, nine original chapters with 26 independently replayed examples, method-aware learning recommendations, fixed Lab comparisons, separate experiments and two-block trials. The shared player uses brighter stickers following the owner's feedback. The accepted Guide film remains `club-guide-video-v2`; replacement films require their own approvals.

- Task 16: 38 focused tests in five files; real solved/text/random/color inputs, eight holds, CMLL preference recovery and playback checked in Chromium.
- Task 17: 35 focused tests in eight files; generated example verification, all nine chapters, neutral quiz and retained progress checked in the browser.
- Task 18: 15 focused tests in six files and four browser flows covering lazy initialization, edits/cancellation, actual coverage and old CFOP Lab links.
- Task 19: fixed A/B snapshots, exact block endpoints, reverse rotations and a separate basic LSE route checked in three desktop/phone browser cases.
- Task 20: 24 targeted tests in seven files and ten browser cases including actual IndexedDB transaction abort, retry, immutable identity conflicts, atomic imports, corrupt-data recovery and separation from CFOP/Timer stores.
- Task 21: 78 related unit tests in 19 files and 22 browser cases including keyboard/touch cancellation, timing quiescence, retained unsaved review, five matched AB/BA blocks and reversible deletion.
- Task 22: the first full unit run passed 1,060 tests in 233 files. A subsequent real basic-LSE save/export flow exposed a mismatch between shared maneuver snapshots (catalog-key identity) and CMLL variants (embedded identity). The new regression failed before the schema fix, then all 13 experiment tests passed. A real search → basic route → save → export → fresh browser import → full replay → 12.34-second manual trial → export flow passed.
- Twenty-eight real Guide scenes were captured at source revision `2470dfea51c79aea419fe1a17f641c389b1d44c6`, including phone layouts. Example sessions are marked as sample data. Captures and their dimensions are recorded in the capture manifest; inspected images include the brighter player, full CMLL family cards, fixed comparisons, trial setup and legacy CFOP/Timer/Guide screens.

These are automated and desktop-browser observations. Full final regression, independent review, GitHub checks, deployment and live verification must be recorded before publication is claimed. The reproducible [physical review worksheet](../lab/roux-physical-review.md) remains for owner/Josh testing; no physical comfort, fastest-human-route or real-phone performance acceptance is implied.
