# CubeSteps V1.3: Advanced CFOP and Algorithm Practice

Status: written design approved by the owner on October 12, 2026. The next deliverable is an implementation plan for review; Advanced CFOP implementation has not started.

## 1. Intent and confirmed choices

Help club members progress from accepted Beginner CFOP to efficient, explained speedsolving. Preserve the English, account-free, browser-only experience and the existing physical-cube follow-along workflow.

The owner confirmed these choices on October 12, 2026:

- Keep LBL and Beginner CFOP; add a separate **Advanced CFOP** method.
- Guarantee a shortest white cross in face turns. A 180-degree face turn counts as one; whole-cube rotations are recorded separately.
- Prefer practical F2L formulas and fewer rotations; choose pairs and formulas using the current pieces and their next-pair continuation.
- Deliver full OLL and PLL in this version, together with courses and generated solutions.
- Include an algorithm library with classification, recognition diagrams, animation, and random practice from selected cases.
- Practice hides the answer until revealed. Save the selected practice range locally. Timers, results, and memorization tracking are outside this release.

V1.2 Beginner CFOP has owner-confirmed physical teaching acceptance. V1.3 needs its own acceptance after delivery. The V1.2 follow-up changes only notation guidance, submit labels and acceptance status; it is independent of this design.

## 2. Method and user journeys

Add method ID `cfop-advanced`, with five ordered stages: `advanced-cross`, `advanced-f2l`, `advanced-oll`, `advanced-pll`, `advanced-auf`. The visible phases are Cross, F2L, OLL, PLL, and final alignment. The course has an introduction plus these five lessons; remove the current seven-lesson assumption from the shared lesson layout.

Routes:

| Purpose | Route |
| --- | --- |
| Introduction | `#/learn/advanced-cfop/intro` |
| Stage lesson | `#/learn/advanced-cfop/<stage-id>` |
| Free solving | `#/solve/advanced-cfop` |
| Library and case detail | `#/algorithms`, `#/algorithms/<case-id>` |
| Selected-case practice | `#/practice` |

Keep existing LBL and Beginner CFOP URLs and behavior. Method switching preserves scramble/color drafts, selected face, undo history and valid color checks; it cancels pending work and clears the old result. An explicit method-named button starts the next solve. Unknown routes/case IDs show a useful fallback without pretending to be a different supported case.

Courses, free solving, library demonstrations and revealed practice use the same admitted formula definitions. Each applicable action displays actual recognition evidence, preparation, the named formula, its move groups and expected checkpoint. An algorithm's result is checked at its complete boundary; temporarily disturbed pieces inside a formula are explained.

## 3. Shortest white cross

The goal is four white edges correctly aligned with their side centers on the white bottom face. This is an exact cross optimum, not a claim about optimal total CFOP length. Skip an already-matched cross, including unusual holding frames; show any necessary regrip explicitly before subsequent work.

Use a complete distance table over the four labeled white edges: `12 × 11 × 10 × 9 × 2^4 = 190,080` abstract states. A reproducible offline breadth-first generator uses the 18 outer-face turns (`U D L R F B`, prime and half turns). The table stores exact distance to the matched cross. At runtime, follow only moves decreasing distance by one. This is a cross-specific calculation; subsequent stages select admitted teaching formulas.

Normalize the holding frame for lookup without adding hidden user moves. The table is versioned, generated deterministically and loaded only for Advanced CFOP. A missing, incompatible or invalid table must produce a clear error, never silently return a longer cross labeled shortest. Bound initialization and solving; cancellation must terminate its worker.

Choose equal-length paths deterministically. Prefer fewer awkward face changes where this can be decided within the shortest-path candidates; shortest distance always wins. Cross-to-first-pair optimization and X-cross are future extensions and must not weaken the shortest-cross guarantee.

Show the minimum face-turn count, separate regrips, and the effect of each move on the relevant white edges. Derive descriptions from before/after states. Explain when a matched edge temporarily moves to enable the combined solution; do not invent a human reasoning story from a search result. The final cross checkpoint validates all four side-center matches.

## 4. Efficient formula-based F2L

Use a finite, explicit case library covering the standard 41 F2L cases, with verified handling for trapped pieces, wrong slots, a solved corner with an unsolved edge, and already-completed pairs. A case's stable ID is distinct from its formula variant ID and its numbered source reference; numbering conventions must not be assumed interchangeable across sources.

Recognize target corner/edge identity, position, orientation, intended slot and protected completed pairs. Admit one practical default per standard case and an alternative only where it materially reduces rotations or avoids an awkward execution. Support insertion into all four slots through validated oriented variants; do not rotate every target to front-right by default. Extraction/preparation remains explicit for inputs that require it, and may combine extraction and pairing through a documented rule.

Compare finite candidates for every remaining pair. A candidate consists of recognized preparation plus an admitted formula, with a checked resulting state. Look ahead to the cheapest valid next pair, then choose deterministically. Candidate scoring combines face-turn equivalents, explicit rotations, and a small reviewed execution penalty for awkward variants. Weights are fixed, versioned and documented in the implementation; they are an execution heuristic, not a measured prediction of a person's speed.

Alternatives considered: fixed pair order is simpler but misses useful choices; searching the entire F2L combination tree increases latency and makes selection harder to explain. The selected bounded candidate comparison preserves recognizable formula boundaries and predictable cost. It does not promise a globally shortest F2L.

Every accepted maneuver preserves the white cross and previously completed pairs at its checkpoint. The chosen target must make measurable progress, and insertion must solve the pair. Keep immutable piece IDs across regrips. Bound candidate expansions and preparation depth; repeated states or missing cases fail explicitly without cycling or relabeling Beginner CFOP as Advanced.

Show why the chosen pair is suitable, the selected variant, preparation and insertion segments, affected slot, and completed-pair count. Keep explanations grounded in the matched rule and its actual starting state.

## 5. Full OLL, full PLL and notation

Cover **57 OLL cases** and **21 PLL cases**, excluding the already-satisfied state. For each unsolved look, recognize a case and execute one admitted OLL or PLL formula. U alignment and y regrips are separate preparations. Final AUF is a separate final stage; skips are explicit. Do not present a composed two-look sequence as a full one-look formula.

Each case contains a canonical pattern, recognition guide, target pieces, holding conditions, default algorithm, trigger segments, expected effect and source references. Recognition uses actual piece/sticker signatures under allowed setups, not trial-solving every formula. OLL recognition ignores last-layer permutation; PLL recognition checks relative permutation and allows final U alignment. Every case must preserve F2L at the completed formula boundary.

Expand teaching notation to support admitted wide turns and slice turns (`M E S`), alongside face turns and `x y z`. Use one canonical internal spelling for two-layer wide turns (`Rw`, etc.), with familiar lowercase display aliases documented in the lesson. Normalize aliases at catalog admission; never rely on ad hoc string replacement during playback. Inversion, validation, frame tracking, highlighting and the actual renderer must agree for every supported move.

Keep free-scramble input limited to its existing six-face notation in this release. Physical practice setup sequences also use six-face notation from the documented white-up, green-front start. Formula playback may use the expanded teaching notation. Counts are clearly defined: the shortest-cross badge uses outer-face turns; formula comparisons use outer-block equivalents (face/wide turn = one, middle-slice turn = two; half turns follow the same rule), with whole-cube rotations listed separately.

## 6. Shared algorithm library and practice

The library covers F2L, OLL and PLL. Provide group filters, stable case IDs/names, recognition diagrams generated locally from verified cube states, holding notes, default formula, trigger groups, explanation and animation. Case-detail links are shareable. Show admitted alternatives when present; selecting an alternative updates its demonstration together. A library selection does not silently change the free solver's default preference.

Library diagrams are original renderings. Reference the source of each formula, but do not copy tutorial prose, PDFs, screenshots, or diagrams. Displayed cases and formulas must refer to the same registry entries used by the solver.

Practice flow:

1. Select case IDs or groups from F2L, OLL or PLL; show the active count.
2. Generate a verified recognition exercise and provide its physical setup sequence. Begin from the actual case state, not from an unrelated full solve.
3. Hide the case name and formula until **Show solution**; keep the puzzle, holding frame and controls accessible without leaking the answer in labels.
4. Reveal the recognized case, formula, explanation and player. Allow stepping, replay, speed and view controls.
5. **Next case** advances to another exercise. A shuffled bag balances selected case IDs; avoid an immediate repeat when at least two are selected. With one case selected, vary its verified U/setup orientation.

Use case-specific legal fixtures with verified prerequisites and independent recognition checks. Setup sequences are reproducible and must reach the exact displayed state. Selecting an OLL/PLL case cannot select a different case accidentally; selecting a formula variant cannot invalidate the case. Completed layers and protected F2L slots are defined per fixture. Do not claim a self-reported next action proves a physical solve.

Save only the selected practice IDs/groups in versioned local storage, with ID validation, migration of known fields and graceful behavior when storage is unavailable. Do not collect solve times, scores, accounts or cloud history. Empty selections show instructions; changing the pool/case/route cancels pending generation and playback, clears revealed answers and rejects stale results.

## 7. Architecture and integration

Preserve the existing cube engine, input validation, immutable input provenance, shared trace recorder and method-aware player. Add the Advanced method/runtime and its catalog through the current registry. Extend the route parser and worker protocol explicitly; never default an unknown method to a successful different-method result.

Introduce an algorithm registry that separates case identity, formula variants and presentation from runtime recognition. It serves four consumers: method solver, lessons, library and practice. Keep execution rules in workers and lightweight presentation metadata in the UI. Migrate existing metadata only where required; regression fixtures must preserve accepted LBL/Beginner behavior.

Keep a complete `SolveTrace` exclusive to a whole-method solve. Introduce a validated algorithm-demonstration model for library/practice clips with its initial state, holding frame, case/variant IDs, moves, segments and stage-specific checkpoint. Adapt both sources to a shared playback timeline without manufacturing a fake whole-cube solution for an F2L/OLL exercise. Raw moves without a verified catalog reference cannot appear as an admitted algorithm.

Full solves and practice generation carry request IDs and method/case identity. Changing mode, method, case or pool invalidates outstanding work. A worker failure returns a useful failure result and leaves input drafts usable. Limit search/candidate work deterministically and keep the page responsive; never substitute an unverified answer when a budget is exceeded.

## 8. Acceptance and measurement

Correctness gates:

- Preserve all existing LBL/Beginner corpora and accepted trace snapshots.
- Verify distance-table coverage, unique zero goal, transition consistency and a distance-decreasing successor for every non-goal cross state. Independently check coordinates/transitions against actual cube states and all 24 holding frames. Tests must demonstrate optimality, not merely successful crosses.
- Independently admit every F2L/OLL/PLL case and every published variant. Cover setup symmetries, all slots, trapped pieces, solved/partial inputs and protected-pair checkpoints. Do not derive all expected cases solely by inverting the formula under test.
- Cover the full legal last-layer orientation and permutation pattern spaces, with arbitrary irrelevant last-layer data where appropriate. Require one formula per unsolved OLL/PLL stage, preserved lower layers, correct AUF and explicit skips.
- Run at least 1,000 fixed-seed scrambles twice for deterministic Advanced traces and the same states through six-face color input. Replay every move, case precondition and checkpoint. Include budgets, corrupt assets, repeated states and late replies.
- Verify exact starting colors and every relevant rendered boundary for wide/slice/rotation sequences in Chromium and WebKit, including reverse stepping, replay and color-input initialization. Retain the text fallback without WebGL.
- Validate every practice fixture's setup, recognized case, prerequisites, revealed formula and endpoint; cover selected pools, no-repeat behavior, refresh/storage failures, cancellation and hidden-answer accessibility.

Efficiency gates use the same fixed seed corpus and publish actual distributions. Cross length equals the independently verified minimum for every input. Compare both F2L methods from identical matched-cross states to isolate F2L quality: target at least a 10% reduction in mean face-turn equivalents, no increase in median turns, and no increase in mean explicit rotations. Also report whole-solve median and 95th-percentile turns and rotations. These are corpus acceptance targets, not a promise that every individual Advanced solve uses fewer turns.

Measure cold initialization, warm solve latency and cancellation on a named desktop and a real mobile device when available. Record versions and observed timings. CI uses generous bounded timeouts to catch runaways; it does not claim real-device performance from desktop emulation. If measured efficiency or usability misses the gates, tune admitted variants/scoring and rerun the same corpus before release.

Browser acceptance includes desktop and 390px layouts, keyboard navigation, refreshed routes, method/draft preservation, library filters, selected-case practice, all move types, no uncaught errors and no missing assets. Physical acceptance covers representative shortest crosses, awkward F2L cases, wide/slice OLL/PLL formulas and practice setup on a real cube.

## 9. Delivery boundary

Implement in dependency order: notation and catalog contracts; shortest-cross table; F2L cases/selection; full OLL/PLL; complete Advanced traces and worker; courses; library; practice; final verification. These are internal milestones of the requested version, not permission to advertise incomplete case coverage as Advanced CFOP.

Use the existing reviewed-PR, passing-CI, merge, local-main synchronization and GitHub Pages workflow. First publish Advanced CFOP as a preview with its physical acceptance pending; the accepted LBL and Beginner methods retain their status. Verify the exact deployed commit and public solve/library/practice flows before reporting delivery. The owner then performs the new version's physical acceptance.

Roux, ZZ, camera scanning, custom color schemes, color-neutral or X-cross solving, timer/statistics, user formula editing, and cloud progress are later work.

## References

- [J Perm: F2L concepts and optimization](https://jperm.net/3x3/cfop/f2l)
- [CubeSkills: F2L formula reference](https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf)
- [CubeSkills: OLL formulas](https://www.cubeskills.com/uploads/pdf/tutorials/oll-algorithms.pdf)
- [CubeSkills: PLL formulas](https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf)
- [J Perm: OLL trainer](https://jperm.net/algs/oll) and [PLL trainer](https://jperm.net/algs/pll), for comparative workflow research; explanations and UI remain original.
- [WCA notation and move-count definitions](https://www.worldcubeassociation.org/regulations/#12a)

## Design self-review

The requested capabilities map to sections 3–6 and independent acceptance in section 8. Exact shortest-cross claims are separated from heuristic F2L selection. Complete solve traces and partial formula demonstrations have distinct contracts. Beginner routes and acceptance stay intact. Formula references, setup frames, cancellation, storage failures, wrong-case practice and unsupported notation have explicit handling. The owner approved this written design; the next review is the separate implementation plan.
