# Beginner Roux validation

Status: **Preview**. The owner approved the design and all three implementation plans. Engine and club-browser validation are recorded below. Physical teaching acceptance is still pending.

## Scope and invariants

The input-to-Roux hold is a visible `x2 y`: white-bottom blocks, blue left, green right and red front. Middle centers can move during M turns. The solver builds both blocks, uses seven OCLL cases and T/Y corner permutation, and finishes through M/U last-six-edge policies. It does not require a yellow cross before the corner stage and does not call a CFOP or opaque full-cube fallback.

The unchanged per-solve ceilings are 1,000,000 expanded nodes, 15,000 ms of worker work including final replay, 160 emitted actions and 400 move tokens. Artifact loading precedes the work timer. A failure returns its stage and reason without a partial-success trace.

## Engine evidence

| Check | Evidence |
| --- | --- |
| Blocks | Ten independently enumerated subgoal domains, 11,736 total states; every admitted maneuver transition compared with cube-engine replay. Both pair orders, trapped/flipped targets and actual M/M' assistance are covered. |
| Corners | 24 permutations × 27 orientations × 4 center phases × 4 legal edge-orientation variants = 10,368 physical replays. All seven OCLL cases, T, Y and skips occur; T uses headlights left. |
| LSE | Independent legal enumeration equals M/U reachability: 184,320 states. Stage domains are 184,320 for EO, 2,880 for left/right placement and 96 for final completion. |
| LSE transitions | 1,105,920 primitive transitions and 184,319 selected policy transitions replay against the engine. Every selected rule matches the actual state and reports the complete affected-piece set. Every admitted start follows EO → left/right → final to the exact solved coordinate. |
| Physical placement drafts | All 2,880 oriented states run through the actual placement planners, checking block protection, relative corners, preserved left/right endpoints and final centers. |
| Full input corpus | Seeds 1–1,000, independent facelet seeds 2,001–2,100, 50 deterministic repeat seeds, solved cases and intermediate-stage fixtures pass. The initial combined corpus run passed 13 tests in 147.67 seconds. Each result is independently replayed with the Roux runtime. |
| Rejected data | Truncated/changed/version-mismatched assets, aborts, forged targets, phases, protection, explanations, formula boundaries, stage order, source states and final centers are rejected. |
| Limits | Node, elapsed, action and token limits fail honestly. A separate failing-then-passing regression covers time spent in final checkpoint/replay verification. |

The LSE state count follows six-edge permutations, even edge flips, four center phases and four top-corner offsets, with the combined permutation parity constraint: `6! × 32 × 4 × 4 / 2 = 184,320`. The three policy partitions overlap at their goals; they are not three independent full-cube state counts.

Block route comparison retains up to eight rank-decreasing candidate continuations. It favors familiar maneuvers, inspectable targets, a useful next pair, then tokens and stable rule order. This is a bounded teaching policy, not an optimal-speed or globally shortest-solve claim.

## Reproduction and artifacts

Run `npm run test:roux`, `npm run test:roux:coverage`, `npm run test:roux:corpus`, `npm run verify:roux`, and `npm run typecheck` on Node 24 or later. Existing checks remain required. Exhaustive test-runner deadlines are separate from the 15-second per-solve ceiling.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Block policies | 96,105 | `098f9828b345505de128d2d10c44ee3eecb785aa9ad27360d6214a0ef6a1e041` |
| LSE policies | 2,211,872 | `a4c1ae088771ff1341f243299087a27377c5a3c39d1cfb51f7e667268c0fb74d` |

Scoped Git attributes retain LF in policy JSON and treat policy bytes as binary, so Windows `core.autocrlf=true` cannot invalidate their hashes. Both generators reproduce the committed bytes. Loaded block data is frozen and LSE lookup buffers remain private.

The initial measurements use Windows, Node 24.18.0 and an AMD Ryzen 9 8945HX. The corpus can write its detailed measurements with `CUBESTEPS_ROUX_METRICS` set to an output file. File-backed asset loading includes decoding and integrity checks; it is not a network or phone measurement. Browser and real-phone measurements will be recorded separately.

The maintained corpus run passed 12 tests in 147.23 seconds. Across seeds 1–1,000, solve latency was 93.25 ms median, 125.21 ms at the 95th percentile and 184.25 ms maximum; cold file-backed asset loading took 48.30 ms. Maximum observed work was 3,821 nodes, 38 actions and 96 move tokens. Focused Roux checks passed 78 tests across 23 files; exhaustive coverage passed all three tests in 151.64 seconds. Both artifact generators and TypeScript validation passed.

## Browser evidence

The focused Roux browser checks run on Chromium and WebKit. They cover all eight chapters, M/M′/M2 demonstrations, a verified example per chapter, random and pasted input, live-generated six-face color input, method switching, cancellation and retry, temporary center phases, seek/reverse/replay, keyboard controls and reduced motion. Global Roux links fail gracefully, and global home/CFOP plus club Timer do not request the Roux catalog or policies.

Real browser testing found and fixed a discarded scramble when switching between Roux and CFOP. All solve methods now retain the same input component; Roux playback registration remains lazy and guards against stale requests. A separate failing-then-passing regression aligns the Roux sidebar's eight chapter numbers with its lesson headers. The final unit run passes 839 tests across 182 files.

Desktop (1,360 px) and phone (390 px) screenshots were visually inspected. No horizontal overflow or browser exceptions occurred in these checks. The following spot measurements include clicking Explain, runtime/worker loading and reaching a ready player, with two different scrambles per fresh browser context. They use the desktop Windows host during other regression work; phone widths emulate layout and are **not real-phone speed measurements**, distributions or performance promises.

| Browser / viewport | Cold solve | Next solve |
| --- | ---: | ---: |
| Chromium / 1,360 px | 1,303 ms | 395 ms |
| Chromium / 390 px | 1,302 ms | 382 ms |
| WebKit / 390 px | 2,516 ms | 1,219 ms |

## Physical acceptance to perform

- Confirm the starting input hold and visible `x2 y` regrip.
- Follow useful M and M' block setups, including a rear pair; verify the left block survives second-block work.
- Try all seven OCLL cases, T with left headlights, Y without headlights, and solved skips with unoriented top edges.
- Follow reference-center setup and 0/2/4/6 bad-edge cases, including a temporarily increased bad-edge count.
- Place yellow-blue/yellow-green edges relative to their corner neighbors, then restore the final centers and U alignment.
- Enter one real scrambled cube through six-face input and follow the complete solution without assuming invisible moves.

Automated replay and emulated phone layouts do not replace these physical checks. Keep Preview until the owner confirms the teaching experience.
