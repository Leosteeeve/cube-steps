# Solve, compare and practice implementation plan

The implementation follows [the approved design](../specs/2026-11-23-solve-practice-usability-design.md) on the local feature branch. Keep the existing workers, verification, playback controller, local stores and club typography. Count each non-rotation notation token once, including half turns and slices. Report rotations separately.

## Teaching trace

- [x] Reproduce the LBL middle-layer cancellation in the normal solve entry. Exercise seeds 1–32 and a solved input. Use the existing stage compactor and verify the returned trace. Preserve the original teaching explanations, especially repetitions and holding changes.
- [x] Check all original LBL stage assertions and the worker's result validation.

## Method comparison

- [x] Add a club comparison component to SolvePage using the verified scramble or colors from its SolveSession. Compare advanced CFOP and advanced Roux and expose the actual trace of either successful result with CubePlayer.
- [x] Count moves from the displayed trace. Test slice and rotation counting, isolated method failure, cancellation, stale input and re-entry. Prevent comparisons from replacing the teaching session.

## Formula lookup

- [x] In AlgorithmLibraryPage and CmllLibrary normalize case identifiers, search catalog labels, groups and IDs, restore filters and draft selections on return, and keep a separate reset for filters. Cover false positives, empty results, frame-aware CMLL links and practice entry.
- [x] Apply a responsive editorial treatment to both collections. Make search, recognition diagrams and practice actions identifiable at 320px and by keyboard.

## Interface and verification

- [x] Give solve setup, verified result and step controls a clear typographic hierarchy. Keep the next turn, previous/next controls, speed, replay and keyboard focus usable at a narrow width. Preserve existing tour targets.
- [x] Inspect captures at 375px and desktop alongside the baseline and inspect 320px for overflow. Exercise both engines, real worker comparison, lookup and playback. Run typecheck, build, unit and relevant browser regressions, and format changed files. Record measured results and limits.

## Verification notes

- Using seeds 1–32, the original LBL playback contained 5,667 non-rotation turns. The revised playback used 5,559 and kept the same 529 cube rotations. Thirty solutions shortened. The 27 within-stage revisits dropped to zero in this sample. Replaying each solution preserved its seven checkpoints, source instructions and solved endpoint.
- The existing 1,000-scramble deterministic corpus and 1,000-color-input worker corpus passed. Earlier concurrent timing runs exceeded the existing time limit. Stage predicates now evaluate only the goals needed at the requested stage. The isolated scrambled corpus passed in 44.733 seconds with its original 60-second limit.
- The production build passed 18 feature and navigation cases across Chromium and WebKit, including exact 54-sticker input, replay to the endpoint, returning to the original playhead, both library return positions, and a tour started from a solved session. Ten existing build and responsive checks passed, along with four CFOP/Roux Lab entry and keyboard checks.
- Manually inspected local captures at 320, 375 and 1,440 CSS pixels, including the starting-position net, turn controls, formula results and practice selection. A separate capture shows the synchronized 3D starting cube. The local preview retains the established club typography and palette.
- Shorter counts describe this corpus. Physical turning speed and comfort require practice with a real cube. The advanced candidates retain their Preview status.

The final serial unit run passed all 1,155 tests in 240 source files, and all three video crop regressions passed. TypeScript, the production build and formatting checks passed. Earlier overlapping verification runs included expected failing regressions during implementation, timing failures and a sandboxed local HTTP fixture. The final run used the existing timeouts and local loopback access.
