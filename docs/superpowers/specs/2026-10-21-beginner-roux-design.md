# Beginner Roux: Club Lessons and Explained Solving

Status: the owner approved both the conversational teaching structure and this written specification on October 21, 2026. The three implementation plans below are ready for owner review; product implementation has not started. The previously selected Native execution method is preserved.

Implementation plans: [Blocks and corners — Tasks 1–5](../plans/2026-10-21-beginner-roux-blocks.md), [LSE and complete solver — Tasks 6–10](../plans/2026-10-21-beginner-roux-solver.md), and [Club teaching and delivery — Tasks 11–15](../plans/2026-10-21-beginner-roux-club.md).

## 1. Purpose and confirmed decisions

Give club members a complete, approachable way to learn Roux on a physical 3x3 cube. Members should understand how blocks, corners and the middle slice work together, rather than copy a solution whose reasoning they cannot follow.

The first release belongs to the club edition. It includes a complete course and an explained automatic solver, with random scrambles, pasted outer-face scrambles and the existing six-face color editor. All content is in English. Lessons and generated solutions share the same moves, teaching rules, algorithms and player.

The owner confirmed:

- A fixed **white-bottom, blue-left block frame**, with green on the right.
- Seven OCLL corner-orientation cases, followed by **T-perm for adjacent corner exchange** or **Y-perm for diagonal corner exchange**. There is no yellow-cross prerequisite.
- Detailed block-building, corner and last-six-edge explanations, including why an action works and which completed pieces it protects.
- Flexible use of **M and M' in both lessons and generated solutions**, including block building. Teach M2 alongside them.
- A low memorization burden and few unnecessary rotations, while acknowledging that block building requires more understanding and practice.
- A complete course and solver delivered together. Full CMLL, advanced Roux optimization and color-neutral solving are later work.

The club site remains publicly accessible without an account. Club-only placement is a product boundary, not private access control. The learning quiz continues to recommend LBL to first-time solvers; Roux is initially a deliberate choice in the club method selector.

## 2. Product boundaries

### Included

- An eight-chapter Beginner Roux course with original diagrams, worked examples, common mistakes and physical-cube checkpoints.
- One deterministic, understandable solving route for each supported legal input within the documented resource limits.
- Real middle-slice actions, visible preparation moves, algorithm boundaries, skips and final alignment in the solution trace.
- A small Roux reference within the course for its nine corner algorithms and recurring block/LSE maneuvers, using the same definitions as the solver.
- Club method selection, lesson progress, a Guide section and contextual links to the existing Moves page.
- Desktop and mobile playback, keyboard access, cancellation, recoverable error states and regression checks for existing methods.

### Deferred

Full CMLL, alternative block colors, route comparison, shortest-block or fastest-solve guarantees, advanced LSE techniques, a Roux Lab, a separate timed algorithm-drill system, personalized fingertrick scoring, 3D hand animation, new accounts and changes to CFOP Lab are outside this release. Existing tutorial films do not need to be remade to add this course.

The nine corner algorithms are not the entire learning workload. Members also learn pairing, safe insertion and short M/U maneuvers. Avoid advertising this as a method that needs only nine sequences and no further reasoning.

## 3. Physical frame and notation

### 3.1 Input hold versus Roux hold

Keep the existing input convention: white up, green front. Scramble playback and color-entry validation continue to use that convention.

For the project's standard color scheme, the explicit starting regrip **x2 y** changes the solved input hold to:

| Direction | U | D | L | R | F | B |
| --- | --- | --- | --- | --- | --- | --- |
| Roux reference color | Yellow | White | Blue | Green | Red | Orange |

Record this as a real regrip action at the start of the trace, with an explanation and replayable moves. Show both the input hold and the destination hold. Do not silently rotate the physical state by changing camera settings. Any computational coordinate mapping must map piece identities, moves, diagrams and checks back to that same physical trace.

For an already solved input, explain that no solving turns are necessary. The player may still show the initial positioning action; subsequent solved stages are skipped with a reason.

### 3.2 What "white bottom" means

It describes the **block frame**: the white stickers of the completed lower block pieces point down. It does not require the white center to remain on D after every middle-slice turn.

The blue and green side centers remain left and right. M moves the four centers in the middle slice, together with four edges, while leaving both completed side blocks and all corners in place. Teach members to follow piece colors and the fixed side frame instead of trying to put every center back after each move.

The first version does not introduce physical cube rotations after the starting hold. Use camera orbit to inspect a hidden target without changing the move frame. Wide turns, where useful in a verified block maneuver, remain physical layer moves with their own notation explanation. This fixed-frame policy supports the beginner course; it is not a claim that every Roux solve should be rotation-free.

### 3.3 M, M' and M2 foundation

Teach the middle slice between L and R. M follows the direction of L; M' reverses it; M2 is a half turn. Use moving stickers and a direction arrow, not the ambiguous instruction "turn clockwise" without a viewing direction.

From the reference hold, an M moves the yellow center from U toward F, and an M' moves the white center from D toward F. Animate the full cycle and its inverse, then let the learner predict where one selected edge will go. Demonstrate that M followed by M' restores the state, and M2 followed by M2 does too.

Provide front and side inspection views and a brief two-handed handling note. Do not imply that the application measures finger movement or proves a universally best grip. M and M' must remain visible in the notation and explanation; do not obscure them behind equivalent long outer-face sequences.

## 4. Learning experience

Reuse the club's blue-and-white layout, shared cube player and current navigation. Add **Beginner Roux** beside the existing methods, with a short description: "Build two blocks, solve the corners, then finish with the middle slice."

Each chapter contains:

1. A goal illustration and a plain-language description of what counts as finished.
2. Recognition instructions that identify the actual target pieces.
3. Slow worked examples divided into **Look, Prepare, Do, Check**.
4. An explanation of what is protected and what may change temporarily.
5. Common mistakes with a recovery explanation, followed by a physical-cube checkpoint.

Use front and rear examples where a rule has both forms. Important diagrams must use text, shapes or outlines as well as color. Beginners must be able to pause, orbit the view, step backward, replay a maneuver and return to the documented hold.

| Chapter | Main teaching goal | Required examples and checks |
| --- | --- | --- |
| Holding and the middle slice | Establish the fixed frame and understand M/M'/M2. | Input-to-Roux regrip; inverse moves; moving centers; camera orbit versus physical moves. |
| First block | Place the white-blue base edge, then build two corner-edge pairs into a left 1x2x3 block. | A base edge in place, flipped or displaced; a joined pair; separated pieces; a piece trapped in the wrong slot; useful M/M' setup. |
| Second block | Build the white-green block while preserving the left block. | Right base edge; front/back pair choices; R/U/M work; both directions of the slice; extraction without losing the completed left block. |
| Orient the corners | Put all four yellow corner stickers on top using one of seven OCLL cases. | All seven cases, solved skip, U setup, and examples with deliberately unoriented top edges. |
| Position the corners | Recognize solved order, one pair of headlights or no headlights. | T-perm, Y-perm, U setup and final corner alignment; no edge-permutation requirement. |
| Orient the last six edges | Establish a valid center reference and recognize edge orientation. | Zero, two, four and six bad edges; front/back arrow cases; setup to an arrow; M versus M' choice. |
| Place the left and right top edges | Place the yellow-blue and yellow-green edges relative to the solved corner ring. | Targets on top or in the bottom middle slice; safe transport; relative alignment; one or both targets already complete. |
| Finish the last four edges | Finish edge placement and restore centers and top alignment. | White-red/white-orange targets, displaced centers, common residual cycles, all-solved skip and whole-cube check. |

The overview explains the dependency between stages before introducing formulas. It defines a block, pair, orientation, permutation, headlights and LSE in ordinary English. Describe CMLL as the Roux corner task; this course uses a two-look route instead of the complete CMLL case set.

## 5. Block building and meaningful slice use

### 5.1 Fixed targets

In the reference frame, the left block comprises the white-blue edge at DL, blue-red and blue-orange edges at FL/BL, and the white-blue-red and white-blue-orange corners at DFL/DBL, around the blue center. The right block uses the corresponding green pieces at DR, FR/BR and DFR/DBR.

Block predicates use these physical piece identities and sticker directions. They must not require the four movable middle-slice centers to be in their final positions.

### 5.2 First block

Start with the white-blue base edge. Then choose between the front and rear corner-edge pairs according to the present positions and the clarity of the next maneuver. Prefer a joined or easily accessible pair when it avoids unnecessary extraction. The course's example order is not a mandatory solver order.

Explain how to identify the matching corner and edge, align their common side colors, move them together and insert them while restoring completed parts. Recognize already correct pieces and pairs. If a target is trapped, explain why it must be taken out before rebuilding it.

### 5.3 Second block

Keep the left block complete at each maneuver checkpoint. Use the freedom of the right face, upper layer and middle slice to build the right block. The base-edge and pair structure remains recognizable to a learner, even when a useful pair is prepared before the base edge is finally inserted.

R, U, M and their inverses/half turns are the normal working vocabulary. A wide-turn variant is eligible only when its physical action, purpose and protection conditions have been taught and verified. Do not expand this into an exhaustive speedcubing F2B catalog in the first release.

### 5.4 Rules and route selection

Use a Roux-specific catalog of named maneuvers: base-edge placement, extraction, separation, pairing, insertion and slice-assisted setup. Each has a case predicate, targets, allowed preparation, resulting effect and a checkpoint. Lessons and solver actions refer to the same definitions.

A bounded planner can compare sequences of these maneuvers. Rank valid choices in this order:

1. Preserve required completed work at the declared checkpoints.
2. Prefer clear recognition and familiar, short maneuvers.
3. Prefer visible or easily inspected targets and a usable continuation.
4. Break remaining ties by move count and stable rule order.

Search may use compact piece coordinates internally, but its output must be explainable through the registered maneuvers. Do not compute an arbitrary full-cube solution and divide it afterward into invented teaching steps. Do not use a CFOP continuation and label it Roux.

M/M' are eligible working actions in both blocks, not decorative additions or an artificial quota. Include verified generated-solve fixtures in which M helps one block and M' helps another; each must identify the moved target, the reason for that direction and the completed pieces that remain protected. A state that needs no slice move should not receive one just to satisfy a feature checklist.

## 6. The two-look corner stage

### 6.1 Corner orientation

Recognize only the four top corners and their visible side stickers. Ignore the top edges when selecting a case. A yellow cross is neither checked nor constructed as a prerequisite.

Use the familiar seven OCLL sequences below with **Roux-specific** recognition, hold, explanation and effects. The existing CFOP catalog supplies candidate move sequences, not reusable CFOP preconditions. Keep a distinct Roux identity or an explicit shared-sequence boundary so a future CFOP wording change cannot silently change Roux lessons.

| Reference case | Sequence |
| --- | --- |
| OCLL 21 | `R U2 R' U' R U R' U' R U' R'` |
| OCLL 22 | `R U2 R2 U' R2 U' R2 U2 R` |
| OCLL 23 | `R2 D R' U2 R D' R' U2 R'` |
| OCLL 24 | `R U R D R' U' R D' R2` |
| OCLL 25 | `R' F R B' R' F' R B` |
| OCLL 26: Anti-Sune | `R U2 R' U' R U' R'` |
| OCLL 27: Sune | `R U R' U R U2 R'` |

Each case needs a verified recognition diagram in its execution hold. Gray out irrelevant edges. Show U preparation separately from the formula, and retain the whole formula boundary even when moves at neighboring boundaries could cancel. If corners are already oriented, skip with an explanation.

Temporary block disturbance inside a formula is expected. Check restoration after the complete formula, not after every animation frame.

### 6.2 Corner permutation

Headlights are the two matching side stickers of adjacent top corners. Do not confuse them with matching top edges or a completed side face.

- **Solved cyclic order:** skip the algorithm and explain any required U alignment.
- **Adjacent exchange:** use U preparation to put the headlights on the left, then T-perm.
- **Diagonal exchange:** use the verified Y-perm hold for the no-headlights pattern, then align U as needed.

| Algorithm | Sequence |
| --- | --- |
| T-perm | `R U R' U' R' F R2 U' R' U' R U R' F'` |
| Y-perm | `F R U' R' U' R U R' F' R U R' U' R' F R F'` |

The corner-stage endpoint has both blocks restored and all corners in their correct positions and orientations in the block frame. Remaining six-edge permutation and orientation are unrestricted.

## 7. Last six edges: reference, orientation and placement

### 7.1 Center reference and orientation

Before an EO decision, bring a white or yellow center to U with a visible M setup if needed. Under that reference, an unsolved edge is oriented when its white/yellow sticker faces U or D. Position is a separate question: a correctly oriented edge can still be in the wrong slot.

After a quarter-M move, the top center can be red or orange. During that intermediate state, show **"Middle-slice setup in progress"** instead of reclassifying every edge with the reference rule or declaring the cube invalid. Re-evaluate EO at a declared reference checkpoint.

This checkpoint rule must be shared by the solver, lesson diagrams and player explanations. A screenshot or replay seek in the middle of a maneuver must not imply that the learner has made a mistake.

### 7.2 A small, explained LSE vocabulary

Use a verified catalog of U setups, M/M'/M2 adjustments, arrow maneuvers and transport maneuvers. Examples include `M' U M` and `M U' M'` for a correctly prepared arrow, and `M' U2 M` / `M U2 M'` for front/back transport. These are conditional operations, not formulas that solve every state from every hold.

Teach how a setup creates the intended case, which edges move and why the closing slice move restores the reference. A transport maneuver changes more than two stickers; highlight its full affected set and avoid claiming it is a pure two-edge swap.

For EO, cover all reachable orientation patterns and their valid reference phases, including zero, two, four and six bad edges. Use a finite verified rule graph to reduce cases to familiar maneuvers. A single action need not reduce the number of bad edges, but its explanation must state the intended intermediate case and its progress measure must prevent loops.

### 7.3 Left/right edge placement

The targets are yellow-blue and yellow-green. Explain transport through the middle slice, any U preparation of the corner ring, and placement relative to the correct neighboring corners.

U turns during LSE can move the top corners away from their absolute final slots. Preserve their orientation and **relative cyclic order**, and record the U offset. The left/right-edge endpoint requires the target edges to match their neighboring corners up to that common U offset. Do not reject a valid route merely because an intermediate U setup changes absolute corner positions.

### 7.4 Last four edges and final alignment

Finish with the same M/U vocabulary, restore the center frame, and resolve the U offset. Earlier relative achievements may move together during a maneuver, but must be restored at its declared endpoint. The final check is the whole solved cube, including all centers in the reference hold, not only a white face or two solved blocks.

Build the LSE transition model from actual move effects. Exhaustively enumerate the reachable M/U subgroup from the solved reference state, with center phase and corner offset included. Verify that the stage policy completes from every reachable state admitted at its boundary. Include corner-stage outputs in integration tests to confirm that they enter that domain.

## 8. Trace contract and checkpoints

Extend the existing method architecture with `roux-beginner`. Keep the current trace shape and verifier where possible; add narrowly scoped Roux metadata rather than weakening current LBL/CFOP predicates.

The trace has these ordered stages:

| Stage identifier | Completion condition |
| --- | --- |
| `roux-frame` | Explicit initial regrip connects the input hold to the fixed side frame. |
| `roux-first-block` | All five left-block pieces and the blue side reference are correct. |
| `roux-second-block` | Both five-piece blocks are correct; middle-slice centers remain unrestricted. |
| `roux-corner-orientation` | Both blocks restored and all four top corners oriented. |
| `roux-corner-permutation` | Both blocks restored and all corners solved in the block frame. |
| `roux-edge-orientation` | Both blocks intact; corners oriented in the solved cyclic order; valid EO reference and all six edges oriented. |
| `roux-left-right-edges` | Prior invariants hold; yellow-blue/yellow-green edges match their correct adjacent top corners up to the recorded U offset. |
| `roux-last-four-edges` | Entire cube solved, with final center and U alignment. |

The introductory course chapter maps to `roux-frame`; there is no separate hidden solver phase. Existing solved stages produce a skip reason and preserve state continuity.

Every action carries its rule/case identity, physical targets, observed recognition, preparation or formula moves, explanation, before/after state and a testable checkpoint. Additional Roux metadata identifies the block/pair goal, protected pieces, center-reference phase, corner offset and any temporary disturbance window where relevant.

Distinguish three kinds of conditions:

- **Always protected:** for example, the left block during the standard R/U/M second-block work.
- **Maneuver endpoint:** pieces temporarily moved by an insertion or a corner algorithm must be restored at its end.
- **Stage endpoint:** the stage goal is complete; later legal setup actions may temporarily change absolute alignment as documented.

The player never displays an internal partial solve as a complete result. Preserve formula and maneuver boundaries, repetition counts and the reasons for skipping. Explanations come from matched rules and observed pieces; they must not be generic text attached after search.

## 9. Implementation boundaries

| Boundary | Responsibility |
| --- | --- |
| Roux frame and observation helpers | Physical targets, fixed side frame, movable center phase, corner offset, reference normalization. |
| Roux teaching catalog | Maneuver/formula identities, predicates, holds, move sequences, explanation templates and lesson references. |
| Block planner | Base-edge and pair construction using those maneuvers, deterministic selection, bounded work and progress checks. |
| Corner recognizer | Seven corner-only OCLL cases, headlights/T/Y/skip decisions and exact U setups. |
| LSE rules and coverage model | Reference-aware EO, target-edge transport, last-four completion and complete finite-state checks. |
| Roux runtime and trace builder | Ordered stage construction, actual action explanations, checkpoint validation and final replay. |
| Course and club integration | Chapters, selectors, routes, progress, Guide help and familiar player controls. |

Suggested homes are `src/methods/roux/` and the existing course-content area. Reuse the established cube engine, legal color validation, worker protocol, cancellation behavior and player components.

Extend the explicit `MethodId`/`StageId` unions, method info/registry, worker request validation and dispatch, stage presentation, lesson routing and progress validation. Review exhaustive switches rather than casting the new method into an existing identifier. Roux-specific catalog loading should not initialize on the global home, Timer or CFOP pages.

Keep global and club method availability explicit. Club routes may use `#/learn/roux/...` and `#/solve/roux`; global direct links to those paths must not open a supported global Roux flow. Method selectors and route handlers use the same edition policy. Bundled code or a worker is not a security boundary, and no private-access promise is made.

Preserve current local learning records. Expand the validated method/progress shape safely, default a missing Roux entry to empty progress, and retain the existing recovery behavior for malformed data. Existing lesson IDs and bookmarks continue to resolve. The quiz does not need new personality scoring or a recommendation rewrite.

Add a concise Guide section explaining the fixed hold, middle-slice centers, method entry points and the difference between Roux and the existing layer/cross routes. Add textual notation help beside M/wide moves and a link to the Moves page; do not rely on an unimplemented deep-link selection feature there.

## 10. Limits, failure and responsiveness

All computation remains local to the browser in a worker. The first version returns one complete verified route, not a stream of experimental alternatives. Show a visible working state and a cancel control. Cancelling or submitting a new input prevents an old response from replacing the latest session.

Set explicit limits for expanded search nodes, wall-clock work, trace actions and emitted moves. Initial development ceilings are **1,000,000 expanded nodes, 15 seconds of worker work, 160 trace actions and 400 teaching-move tokens** per solve. They are safety limits, not a speed or solution-length promise. Measure desktop and mobile behavior before release; record any justified adjustment in the implementation and validation notes.

Track visited states with the full coordinates needed by a rule, including protected pieces and reference/offset state. Use a decreasing policy rank or a verified next-state graph for multi-step reductions; a repeated macro state must not spin indefinitely.

An exhausted budget, uncovered case or failed checkpoint returns a clear method/stage failure. Keep the user's input and allow retry or method switching. Never report success, hide missing stages or silently relabel another solver as Roux. Reproducible legal cases that fail belong in the coverage corpus and must be addressed before the teaching release is accepted.

Invalid scramble notation retains the current position-specific feedback. Invalid coloring retains the current legality checks; it must be rejected before Roux solving. A legitimate intermediate M-slice state inside a trace is not re-submitted to the color editor's fixed-center input validation.

## 11. Validation and release acceptance

### 11.1 Existing design evidence

A local mathematical probe enumerated all **648 top-corner states**: 24 permutations times 27 legal orientations, with edge parity matched and two remaining edges deliberately flipped. All reached solved corners using the seven proposed OCLL sequences and T/Y or skip with U setup/alignment; both blocks were restored at algorithm endpoints. The probe also checked that M preserves the blocks/corners and M followed by M' is the identity.

This supports the chosen corner route without a yellow cross. It does **not** validate a complete Roux solver, instructional case recognition, all center phases, LSE coverage, fingertricks or physical usability. Turn the relevant properties into maintained implementation tests rather than treating an external research file as permanent product evidence.

### 11.2 Required automated evidence

- Move/frame tests for x2 y, M, M', M2 and any taught wide turn, including center cycles, inverse operations and unchanged side-block pieces.
- Predicate tests for partial/complete blocks, corner orientation/order, center reference, corner offset, EO and final alignment. Include states where colors look locally correct but pieces are wrong.
- Maneuver tests for preconditions, full affected sets, protected pieces, temporary disturbances and endpoint restoration. Lesson examples and generated actions must use the same tested catalog.
- Exhaustive 648-state corner recognition/solve checks with irrelevant edges varied; also cover every reachable M-center phase and U preparation. Check all seven case diagrams, T/Y holds and solved skips.
- Exhaustive reachable-state LSE verification, including rule completeness, non-looping transitions, center/reference phases and U offsets. If partitioned to control CI time, every partition remains a required check.
- Block-rule coverage for extracted, paired, separated, flipped, trapped and already-solved targets, including front/back variants, both pairing orders and genuine slice-assisted generated routes.
- At least **1,000 fixed-seed legal scrambles**, replayed end to end with complete traces, plus a separate fixed color-entry corpus and targeted stage-boundary fixtures. Solved and partly completed inputs must skip correctly. Scramble and equivalent facelet inputs must agree on physical results.
- Full replay verification of every corpus result: exact initial state, stage order, move legality, catalog identity, observed targets, meaningful explanations, checkpoints and final solved state. A solved cube alone is insufficient.
- Limit, cancellation, stale-response, malformed-storage and worker-failure tests, with honest errors and retained input.
- Route/selector tests for club availability and global exclusion, plus regression checks for LBL, Beginner/Advanced CFOP, CFOP Lab, Guide, Timer and existing progress data.

The corpus is a regression gate, not a proof of globally complete block search. Exhaustive subproblem coverage or a documented completeness argument is required for the staged block-rule domain, while bounded runtime failures remain explicit. No known valid unsupported teaching case may be hidden in a passing corpus summary.

### 11.3 Browser and physical acceptance

Verify desktop and phone layouts, keyboard controls, reduced-motion behavior, readable diagrams, highlights, move/description synchronization, step-back, replay and stage jumps. Check production builds and browser errors. Ensure a seek inside a formula displays temporary-state guidance rather than a false failed checkpoint.

Physical acceptance covers:

- Correct input hold and starting regrip.
- At least one useful M and M' block-building example, including a rear target.
- All seven orientation cases, T/Y and solved-corner skips without a yellow cross.
- EO examples that require center setup and changes in the bad-edge count.
- Left/right edge placement, final centers/U alignment and recovery from common mistakes.
- A full solve from six-face input, following the player without inferred invisible moves.

The owner and available club testers assess whether the explanations and moves are followable. Automated success cannot stand in for that physical feedback. Mark the method **Preview** while physical acceptance is pending; use the accepted label only after the owner confirms it. Follow the existing reviewed PR, required CI, Pages deployment and local synchronization workflow after the implementation is ready and authorized.

## 12. Sources and original teaching material

The project will create its own explanations, case diagrams, examples and player scenes. Link to the teaching resources that informed the design, without copying their prose, illustrations or videos. Do not claim a new solving method or a universally best execution style.

- [Roux Tutorial: First Block](https://tutorial.rouxers.com/beginners/first-block.html) informs the fixed side-color frame and base-edge/pair progression.
- [Roux Tutorial: CMLL](https://tutorial.rouxers.com/beginners/cmll.html) informs corner-only recognition, algorithm explanation and headlights. Its repeated-Sune route is not the owner's selected seven-case course.
- [Roux Tutorial: Last Six Edges](https://tutorial.rouxers.com/beginners/lse.html) informs the reference-center requirement and M/U teaching vocabulary. All project predicates and move effects require independent verification.
- [CubingApp: 2-Look CMLL](https://cubingapp.com/algorithms/2-Look-CMLL) provides another two-look corner reference. Retain the owner's T-perm choice rather than substituting its adjacent-permutation choice.
- [SpeedCubeDB: 2-Look OLL](https://www.speedcubedb.com/a/3x3/2LookOLL) is a reference for the seven corner-orientation cases; Roux does not inherit its yellow-cross prerequisite.
- [Kian's Roux Guide: Second Block](https://sites.google.com/view/kianroux/second-block) provides further block-building context. Advanced efficiency techniques remain outside this beginner release.

The existing code and dependency license policy remains unchanged. The Guide video replacement is a separate release and is not a dependency for the Roux teaching design.
