# Human-Friendly F2L Follow-Along

Status: written design approved by the owner on October 12, 2026. The implementation plan is being prepared for review. No product code has been changed for this phase.

## 1. Purpose and confirmed choices

Physical testing of CubeSteps exposed an execution problem: Advanced CFOP can avoid useful whole-cube rotations and leave the learner working around poorly visible pieces. Correct solutions must also be practical to follow with a real cube.

The owner selected one default policy: prioritize clear observation and comfortable formulas, then reduce unnecessary rotations. Do not add an execution-mode selector. Apply the improvement to the shared engine and teaching player used by both global CubeSteps and the upcoming Webb Cubing Club edition.

Keep the exact shortest-white-cross guarantee, the admitted formula library, full OLL/PLL, and the accepted LBL and Beginner CFOP teaching routes. This change does not claim the fastest execution for every person or a globally shortest F2L.

## 2. Current evidence and selected approach

The inspected implementation at `e0b2c40` has these properties:

- Beginner CFOP already emits physical regrips to bring its working slot to front-right.
- Advanced F2L preparation considers upper-layer alignment and protected extraction maneuvers, but does not explicitly enumerate alternative horizontal holding frames before preparation.
- Advanced candidate cost is face-turn equivalents plus twice the rotation count plus a small variant execution penalty. Some source formulas contain rotations; generated alternatives remove them through move conjugation.
- One-pair lookahead uses the same immediate-cost model. Correctness checkpoints and immutable piece IDs are already available.

Selected approach: expand the finite candidate model to compare useful physical holding frames, and give its execution policy explicit visibility and comfort criteria. Merely changing the rotation weight does not add the missing preparation choices. Always rotating every pair to front-right would be predictable but would discard easy insertions and useful continuity; it is not the selected approach.

## 3. Physical behavior

Keep white down throughout F2L. Consider the current hold and `y`, `y'`, or `y2` before a complete preparation or insertion maneuver. A useful regrip may bring a trapped working slot or the target insertion slot to front-right/front-left, or replace an awkward execution with an admitted comfortable formula.

Retain straightforward insertions in the current hold when their observation and execution remain suitable. Do not turn every rear-slot insertion into a mandatory rotation. Continue the next pair from the actual resulting hold; do not rotate back to green-front after each pair. The later OLL/PLL stages may still request their existing explicit holding setup.

Every added physical regrip must:

1. Appear as a distinct teaching action before the maneuver it supports.
2. Explain its purpose using the actual target or occupied working slot.
3. State the resulting front-center color and remind the learner to keep white down.
4. Update the cube state, target slot, holding labels, and subsequent notation together.

Camera orbit remains observation only. A camera reset cannot silently perform a physical move or change the solution state. Playback, single stepping, reverse stepping, replay and stage jumps must preserve this distinction.

## 4. Candidate generation and selection

Use immutable corner/edge identities across rotations. Re-observe positions, centers, signatures and protected slots in each candidate's actual holding frame. Do not carry a stale slot name into recognition after a regrip.

Extend the existing bounded preparation search to include horizontal holding choices at complete maneuver boundaries. Preparation still uses admitted extraction formulas and U alignments, with at most the existing two extraction maneuvers. Regrips cannot consume extraction depth or create repeated-orientation loops. Deduplicate equivalent resulting states while retaining the preferred explanatory path. Count all orientation, preparation, insertion and next-pair simulations against a shared finite work budget.

Candidate ranking uses a versioned, deterministic policy:

- First compare visibility/execution quality across this pair and the best valid next pair. Classify maneuvers using the actual recognition faces and reviewed formula metadata: a front-observable comfortable maneuver is preferred to one requiring awkward rear recognition or a documented awkward grip. A reviewed easy rear insertion can qualify as comfortable; slot position alone is insufficient.
- Among equally suitable choices, compare total face-turn equivalents and physical regrips across preparation and insertion, including next-pair continuation. Remove redundant consecutive setup rotations before comparison, without altering admitted formula boundaries.
- Resolve remaining ties with stable piece IDs, variant IDs and the full move sequence. The same input must produce the same trace.

The implementation plan must fix the numerical ranking representation, shortlist limits and shared work budget before product implementation. These are engineering parameters, not new user settings. Candidate pruning must retain useful holding-frame alternatives for each target rather than discarding all rotated candidates before lookahead. No unbounded full-F2L tree search is introduced.

Add reviewed execution metadata to admitted formula/preparation definitions rather than inferring comfort from variant names or treating every rotation-free sequence as comfortable. Generated no-regrip alternatives remain available when useful. Any changed or additional formula must pass the existing admission process, retain attribution, and have a verified fixture.

## 5. Trace, content and player integration

Version the selection metadata beyond `f2l-v1` and record why the selected hold/variant was suitable, alongside move and rotation counts. Derive the visible explanation from the actual selected candidate. Avoid unsupported claims such as a precise number of seconds saved or universal fingertrick superiority.

Keep physical setup separate from catalog formulas. Do not insert a rotation into an algorithm action while retaining an algorithm ID whose registered moves differ. Course examples, library demonstrations, practice and free solutions continue to reference the same admitted variants and their explicit holding requirements.

The player should show the current front/up orientation at regrip boundaries and make the working slot easy to identify. Keep the complete formula and active move synchronized with the trace. Update Advanced F2L teaching content to explain useful rotations and continuing from the new hold. Beginner CFOP may benefit from shared display improvements; do not replace its accepted pair-solving rules.

## 6. Correctness and failure behavior

Every completed extraction/insertion maneuver restores the cross and all previously completed pairs. Physical regrips preserve their solved status relative to the centers. Insertion must complete the selected pair, and the pair count must increase. Temporary disturbances inside a formula remain permitted only with a valid final checkpoint.

Bound orientation expansion, preparation states, candidate output and all lookahead simulations. On exhaustion, unsupported cases or repeated states, return a clear failure without hanging or silently switching methods. Cancellation and stale-result rejection remain effective for scramble and six-face input.

## 7. Acceptance

- Replay the 41-case F2L fixtures in all four target slots and horizontal holding frames, including extraction from a different slot, solved corners, already-completed pairs and formulas with internal rotations.
- Add explicit behavior fixtures where a useful regrip wins, where an easy insertion keeps its hold, and where continuing the current hold avoids a turn-back/turn-forward pair. A corpus rotation count alone is not an ergonomics test.
- Replay at least 1,000 deterministic Advanced CFOP scrambles and corresponding legal face-color states; validate final solved state, identity tracking, formula references and every checkpoint. Preserve existing exact-cross and OLL/PLL checks.
- Compare old/new move counts, regrips and the defined execution categories on the same corpus. Report tradeoffs rather than enforcing zero rotations or claiming measured human speed.
- Exercise physical rotations, back/forward stepping, replay, arbitrary camera orbit and stage changes on desktop and phone. Verify holding labels, target highlights and active notation at the same move index.
- Run applicable type, unit, corpus, browser and production-build checks. Inspect browser errors and cancellation responsiveness.
- Obtain physical-cube acceptance on representative front/rear pairs and six-face inputs before marking the revised Advanced CFOP teaching experience accepted. Approval of a visual prototype does not satisfy this check.

## 8. Delivery boundary

This is an independently reviewable shared-core change, with its own implementation plan and validation record. It can be delivered before the club edition. The club launch reuses its accepted behavior; it does not copy the solver. Creating a plan, changing code, merging and publishing are distinct stages, and this draft does not report any of them complete.
