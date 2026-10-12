# CubeSteps V1.2: Beginner CFOP

Date: October 12, 2026 (America/Los_Angeles).

**Status: Written design for owner review. The owner requested the first CFOP version and selected a direct white cross on the bottom. This document has not yet received written-spec approval. No CFOP implementation or validation is complete.**

## 1. Purpose and established direction

Help club members move from LBL to beginner CFOP while understanding the pieces and decisions behind every move. Deliver the course and a complete method-specific solver together. Keep the interface and documentation in English, computation in the browser, and access free of accounts.

The existing roadmap specifies intuitive F2L, two-look OLL, and two-look PLL for the first CFOP release, followed by full PLL and then full OLL in later releases. The owner selected **building the white cross directly on the bottom** for CFOP. LBL retains its yellow-center daisy route.

This design extends the working V1.1 application at commit `1518aeed5a6ed98b434f5ec75a2ea65c1f18c86b`. It does not change historical acceptance records or claim physical-cube acceptance for the new method.

## 2. Scope and implementation approach

Add `Beginner CFOP` beside `LBL` in both learning and free solving. Support random scrambles, pasted standard face-turn scrambles, and the existing guided six-face color input. Every successful solve must return a complete, replay-verified CFOP teaching trace from the exact supplied state.

Use independent CFOP rules with the shared cube engine, input validation, trace infrastructure, and player. This is the proposed approach because the same input and playback behavior should work for both methods. A separate CFOP page with duplicated playback would allow independent UI development, but would also require maintaining the same accessibility, input, and animation behavior twice. A runtime plugin system is unnecessary for two built-in methods; use explicit typed registrations.

Out of scope: full PLL, full OLL, an advanced 41-case F2L memorization course, optimal cross search, color-neutral solving, speed scoring, accounts, camera input, offline installation, and Roux or ZZ. These remain roadmap items.

## 3. Teaching route and holding frame

Keep the current input convention: start a scramble with white up and green front; color entry uses the existing fixed center scheme. Playback first reproduces that exact input. Any change to white down and yellow up is an explicit whole-cube regrip in the trace, not a camera movement or an invisible replacement of the input state.

Teach four main phases with the following internal stages:

| Main phase | Trace stage | Goal |
| --- | --- | --- |
| Cross | `cfop-cross` | Four white edges solved on the bottom, with side stickers matching their centers |
| F2L | `cfop-f2l` | Four corresponding corner-edge pairs solved together in their slots |
| OLL | `cfop-oll-edges` | Yellow edges face up; the first two layers remain solved |
| OLL | `cfop-oll-corners` | The entire yellow face points up; the first two layers remain solved |
| PLL | `cfop-pll-corners` | Top corners have their correct relative order, allowing a final U alignment |
| PLL | `cfop-pll-edges` | The entire top layer has its correct relative order, allowing a final U alignment |
| Finish | `cfop-auf` | Apply a needed U, U2, or U' to finish; otherwise explain the skip |

Explain AUF as "adjust the upper face" in the lesson. A solved stage is skipped with a reason. A solved input produces no moves and seven skipped stages. If the cross is already solved but the cube is not, establish white down at the beginning of the first stage that needs work; do not build the cross again just to establish the grip.

Evaluate stage goals relative to the centers, independently of the starting whole-cube orientation. In the table, "bottom," "top," and "U alignment" describe the active white-down teaching frame; they do not require turning an already-solved input. Each stage check also preserves the goals established by the earlier phases. Relative-order checks allow rotation of the yellow layer until the final alignment stage.

### 3.1 Direct bottom cross

Solve one selected white edge at a time. Explain its two colors, its current position and orientation, its destination, and how the moves preserve edges already placed. Use deterministic, location-based teaching rules with a stable piece order; do not optimize the whole cross for minimum moves.

Cover edges in the upper, middle, and bottom layers, including flipped bottom edges and edges in the wrong bottom position. Extraction, alignment, and insertion are separate visible decisions. A short maneuver may temporarily move a completed edge, but the maneuver must restore every protected edge at its declared checkpoint. Record the growing set of completed cross edges and finish with four matched edges on the bottom.

### 3.2 Intuitive F2L

A pair consists of one white corner and the middle-layer edge sharing its other two colors. Highlight both pieces together, identify their matching slot, and show progress as `Pair 1 of 4` through `Pair 4 of 4`. A pair already solved at the start contributes to progress and is protected rather than extracted.

For each unsolved pair, use these visible phases when needed:

1. **Find and prepare:** locate both pieces; bring trapped or incorrectly inserted pieces to the working layer using an explained extraction maneuver.
2. **Pair:** recognize their relative colors and orientation; separate incorrectly connected pieces or arrange separated pieces into a connected pair above the correct slot.
3. **Insert:** open the slot, move the connected pair into it, and close the slot.
4. **Check:** both pieces match their centers; the cross and all previously solved pairs are restored.

Use a finite set of beginner case families: connected pair, separated pieces with matching side colors, separated pieces with opposite side colors, white facing up, and pieces trapped in a slot. Normalize these with explicit U preparations and y regrips to a working front slot. Each family has a concrete predicate, a bounded preparation or named maneuver, and an expected result. Mirrored insertion patterns must have their own displayed moves and teaching explanation.

Use the same named F2L maneuvers and case definitions in the lessons and solver. The learner should understand opening, pairing, and closing rather than memorize a long case table. The solver must nevertheless handle every legal starting arrangement, including a solved corner with an unsolved matching edge and pieces trapped in different slots. It must not solve all first-layer corners and then all middle edges and label that process F2L.

### 3.3 Two-look OLL

Teach one edge-orientation recognition step followed by one corner-orientation recognition step:

- Edge cases: dot, L, line, and already oriented. Define three canonical case formulas; the dot formula may be a fixed composition with visible sub-pattern boundaries, executed as one recognized case.
- Corner cases: seven non-solved orientation cases and already oriented. Define one canonical formula for each case, with U setup shown separately.

This gives ten non-solved OLL case entries. Use actual sticker observations to choose a case and explain its required orientation. Do not implement repeated Sune trials and describe them as two-look OLL. Each substage uses at most one recognized case formula after preparation.

At the complete-formula checkpoints, the first two layers must be restored. Corner OLL must also preserve the oriented yellow edges. Some moves inside a formula temporarily disturb these goals; the interface explains the checkpoint boundary.

### 3.4 Two-look PLL and final alignment

Teach adjacent and diagonal corner-permutation cases using T and Y permutations, followed by the four edge-permutation cases Ua, Ub, H, and Z. Recognize already satisfied goals and skip them. Preparation may include U alignment and explicit y regrips; each substage uses at most one selected case formula.

Corner recognition concerns relative corner order, not necessarily alignment with side centers yet. Edge recognition uses the corner frame so that the completed upper layer differs from solved by at most one U-family turn. Keep final alignment as a separate, explained action; do not hide it inside a case label.

Use outer-face variants for OLL, T, Y, Ua, and Ub. H and Z use M-slice forms: the CFOP introduction must teach `M`, `M'`, and `M2` before they appear. M turns only the middle slice in the L direction; it is not a whole-cube regrip. Add these tokens to teaching playback and inverse/replay verification. Keep the pasted-scramble input contract restricted to the existing six face turns, with its existing explicit errors for other notation.

## 4. Courses and interface behavior

### Learning

Add a `Beginner CFOP` introduction covering the transition from LBL, pair and slot terminology, the four phases, two-look recognition, AUF, and M notation. Use the existing responsive layout and controls. Organize navigation under Cross, F2L, OLL, PLL, and Finish, while exposing the seven internal stages clearly.

Include one reproducible full example with non-empty work in every core substage. Provide small, selectable case examples inside the relevant lesson so every taught F2L family and all sixteen last-layer cases can be inspected and replayed. This is a case reference, not a timer or practice-scoring feature. Each example provides a starting scramble, relevant holding instructions, an explanation, and the formula from the shared catalog. Lessons and case examples use the same solver and case predicates as free solving.

Published example scrambles must use the accepted six-face notation even when the solution uses M moves. Applying an example scramble from the stated white-up, green-front start must reproduce the documented case; verify this independently of the formula used to solve it.

Retain existing LBL links such as `#/learn/white-cross`. Add CFOP lesson links under `#/learn/cfop/<lesson>`. Method switching in Learn opens that method's introduction. Unknown lesson paths show the introduction for the recognized method. Both old and new links must survive refresh on GitHub Pages.

### Free solving

Use `#/solve` for the existing LBL default and `#/solve/cfop` for Beginner CFOP. Changing method updates the route without remounting the free-solve input state. Preserve the current input mode, scramble text, color draft, selected face, and color-validation result. Changing method cancels any active solver or random-scramble request, clears the old result and playback, and resets stage navigation to the selected method's first stage.

Do not solve automatically on a method change. The user starts the new request with `Explain with LBL` or `Explain with Beginner CFOP`. A late result from the previous method must never replace the current result. Browser back/forward through method routes follows the same cancellation and input-preservation behavior.

Keep V1.1 behavior for edits within the same method: a previous verified result may remain visible, but it must clearly state when its recorded input no longer matches the edited draft. Method identity is part of result identity and may never be relabeled to match a newer selection.

The method selector, stage navigation, case selector, explanations, and all playback controls remain keyboard accessible. Show text labels as well as highlighted pieces. At mobile widths, both pieces of an F2L pair and the current explanation remain understandable without horizontal page scrolling.

## 5. Architecture and contracts

Keep React, TypeScript, Vite, and cubing.js. No additional runtime package is required by this design.

| Unit | Responsibility and boundary |
| --- | --- |
| Core cube/input modules | Apply teaching moves, observe pieces, validate colors, and preserve input provenance; independent of the selected method |
| Method definitions | Explicit `lbl` and `cfop-beginner` identifiers, stage order and labels, formula catalogs, and stage/case checks |
| Shared trace utilities | Record state transitions, validate catalog references and checkpoints, enforce budgets, flatten and replay traces |
| LBL rules | Preserve the current daisy-based route and its teaching behavior while adopting the common trace contract |
| CFOP rules | Direct cross, intuitive pair solving, two-look OLL/PLL, and final alignment with method-specific predicates |
| Worker dispatcher | Validate the requested method and input, run the chosen solver, and return an immutable verified session or a structured error |
| Course registry | Method-specific lessons and case examples referencing the same definitions used by their solver |
| Shared player | Display the session's method, stages, case/formula metadata, target pieces, and synchronized moves |

Extend `SolveTrace.method` beyond the existing literal `lbl`. Define method-specific stage sets and prevent a trace from combining stages or algorithms from different methods. Shared trace validation must receive the selected method's definitions; it must not import the LBL catalog or silently default to LBL stage checks. Move generally useful observation and trace helpers out of the LBL module only where both methods use them.

Add an explicit method to worker requests. Update every application caller to send it. Reject missing or unknown method identifiers as invalid requests; there is no persisted legacy worker protocol to migrate. The returned trace must match the requested method before the client accepts it. Method definitions shown by the UI must not pull the solver implementation into the main UI bundle; dispatch solver implementations inside the worker.

Retain the existing action fields: rule and case identifiers, recognition, explanation, targets, moves, optional algorithm reference, before/after states, and checkpoint. Add optional structured F2L pair metadata containing target corner/edge identities, target slot, phase, and pair progress so the UI does not infer semantics from rule-name strings. Case/formula references must be scoped by method and resolve to exactly the moves executed.

Formula definitions contain names, canonical moves, recognition/precondition metadata, expected effects, and preservation conditions. Rules may choose among a finite set of registered preparations or case maneuvers; they may not obtain a generic solution and add teaching captions afterward. Every choice must have a tested predicate describing what the learner can observe.

Replay the entire trace before returning success. Verify initial-input equality, each recorded before/after state, each algorithm's canonical moves and preconditions, declared checkpoint effects, ordered stage goals, and a solved final state. Keep the current private setup reconstruction for color-input rendering; it initializes the exact entered state and must remain outside the visible teaching timeline for both methods.

## 6. Bounded execution and errors

Use deterministic case selection and stable tie-breaking. Keep the existing defaults of 512 actions and 4,096 teaching moves per solve. Bound F2L normalization to at most 32 complete preparation/pairing maneuvers per target pair, with a progress key that includes the selected pair, protected pairs, working phase, and state. There must be no unbounded search or retries. An unrecognized legal case is a solver error to fix, not a reason to substitute LBL or a generic solve.

Budget exhaustion, repeated states, missing case coverage, invalid method requests, and verification failures return actionable failures. The interface shows that no verified solution was produced, the selected method, and the failing phase where available. Do not display an incomplete trace as a usable solution. Preserve the supplied scramble or colors for correction or retry.

Worker termination remains the cancellation mechanism. Method changes, relevant input changes, and unmounts invalidate request identity. Renderer failures retain the existing text-and-step fallback; a failed 3D initialization must not imply that entered colors or a verified solver trace are invalid.

## 7. Validation and release acceptance

### Solver and teaching correctness

- Verify M, inverse operations, four-quarter-turn identity, center observations, and playback boundaries; keep input-parser behavior unchanged.
- Test direct-cross rules across position/orientation families, with previously solved cross edges protected at complete-maneuver checkpoints.
- Test each F2L family, all four target slots, connected and separated pieces, white-up cases, wrong-slot extraction, a solved corner with an unsolved edge, and zero through three previously solved pairs. Verify both target pieces and every protected piece at the declared boundaries.
- For each of the ten OLL and six PLL formulas, independently verify recognition, preconditions, result, preservation, and supported U/y setups. Include positive and negative recognition fixtures rather than only inverse-generated happy paths.
- Exercise all 216 legal top-layer edge/corner orientation combinations with suitable legal permutations, and all 288 parity-compatible top-layer permutation combinations with orientation solved. Include solved, stage-skipped, and final-AUF cases. These finite checks supplement mixed-state tests; they do not prove all full-cube behavior.
- Solve at least 1,000 fixed-seed scrambles with CFOP and replay every transition, case reference, pair checkpoint, stage goal, and final state. Repeat requests to verify deterministic output. Pass the same 1,000 states through six-face entry and the worker, checking exact initial-state equality and method identity.
- Preserve the existing LBL unit and corpus checks, including the complete daisy before lowering any petals, matched transfers, partial stages, and color-input replay. Exercise representative CFOP cases in all 24 whole-cube orientations at the engine boundary.

### Interface and integration

- Cover selecting either method, both input modes, color-draft preservation, obsolete worker replies, randomization cancellation, route back/forward, old LBL URLs, new CFOP URLs, and refresh under `/cube-steps/`.
- Verify one-move forward/backward stepping, formula replay, stage and case jumps, completion, zero-move sessions, method labels, and the exact starting cube for color input. Verify M animation against the recorded logical state.
- Check desktop and 390px mobile layouts, keyboard access, visible focus, text fallbacks, browser errors, and missing production assets in Chromium and WebKit.
- Run type checking, unit/corpus tests, build, end-to-end tests, and production-path checks. Include the new CFOP corpus in CI and the Pages workflow's test command. Run end-to-end and production tests sequentially because their existing outputs share a directory.

### Delivery and physical acceptance

Use an isolated development branch and a fresh independent final code review after implementation. Resolve material findings before integration. Record exact commands, outcomes, example scrambles, and any remaining limitations in a V1.2 validation document.

Follow the existing delivery flow: passing GitHub checks, merge, local main synchronization, and the manual GitHub Pages deployment. Until the owner confirms representative physical-cube CFOP lessons, label the new method as a preview and record physical acceptance as pending. Automated checks and screenshots do not constitute physical acceptance. Use the existing preview deployment option rather than marking teaching acceptance complete.

Verify the public site's CFOP lesson and both input paths after deployment, including starting colors and a solved endpoint. Provide the site and PR links plus representative screenshots. Do not create a final accepted release solely because automated tests pass.

## 8. Later versions and references

After Beginner CFOP is accepted, add full PLL and then full OLL in separate versions, each with matching lessons, recognition, and generated solutions. Roux, ZZ, and camera input remain separate future milestones.

- [Existing product design](2026-10-11-cubesteps-design.md)
- [V1.1 input design and method roadmap](2026-10-12-guided-face-color-entry-design.md)
- [J Perm: CFOP overview](https://jperm.net/3x3/cfop)
- [J Perm: two-look OLL reference](https://jperm.net/algs/2look/oll)
- [J Perm: two-look PLL reference](https://jperm.net/algs/2look/pll)
- [J Perm: move notation](https://jperm.net/3x3/moves)

Write original explanations and examples. Reference common algorithm names and verified move sequences without copying tutorial prose, images, or videos. Preserve the project's MIT license and dependency notices.
