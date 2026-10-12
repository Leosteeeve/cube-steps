# CubeSteps V1.1: Guided Face-Color Entry

Date: October 12, 2026 (America/Los_Angeles).

**Status: Design and implementation plan approved by the owner on October 12, 2026. V1.1 implementation and automated checks are complete; independent review and delivery are in progress. New physical-input acceptance remains pending.**

## 1. Intent and decisions

Club members should be able to enter the colors of a physical 3x3 cube without knowing its scramble, check the entry, and receive the same explained LBL solution already taught by CubeSteps.

The owner confirmed physical-cube acceptance of the existing LBL version and requested manual six-face entry plus incremental method updates. The owner selected **guided entry one face at a time, followed by a six-face overview**. Keep the interface and project documentation in English, all computation in the browser, and access free of accounts and installation.

Deliver the input feature first. It should provide a reusable validated starting state for subsequent methods. It must not change the accepted LBL teaching route or disguise an unrelated short solution as LBL.

### Incremental roadmap

| Milestone | Scope |
| --- | --- |
| V1.1, this design | Guided face-color entry, legality validation, and complete LBL playback from the entered state |
| Next method milestone | Beginner CFOP: intuitive F2L, two-look OLL, two-look PLL; courses and generated solutions together |
| Later CFOP increments | Full PLL, then full OLL, each with matching course and solver coverage |
| Later methods and inputs | Roux, ZZ, then camera input with manual correction, as separate designs |

This roadmap preserves gradual delivery. Only V1.1 is specified for implementation here; the later milestones are proposed ordering, not implemented capabilities or committed release dates.

## 2. Scope and defaults

Add an **Enter colors** mode beside the existing **Scramble** mode on the free-solve page. Random and pasted scrambles continue to work. Color entry uses the existing standard color scheme: white up, yellow down, green front, blue back, red right, orange left.

The six center colors are fixed and clearly identified. The other 48 stickers begin unfilled, so an untouched sticker cannot accidentally pass as a confirmed color. Custom center arrangements, picture cubes, and center-sticker orientation are outside this version.

The accepted default is a normal six-color 3x3 cube. The introductory instructions must let a member check the center scheme before filling. If their center arrangement differs, explain that this version does not support it; do not silently reinterpret it.

Out of scope: scanning, uploading photographs, interactive 3D painting, scoring user turns, new teaching methods, accounts, cloud storage, and a general solver fallback.

## 3. Guided entry

### Enter and paint

Show six progress steps in this order: **Front, Right, Back, Left, Up, Down**. Each step contains a large 3x3 grid, a named color palette, an eraser, Back/Next controls, and completion status. Selecting a color then clicking or tapping a non-center sticker paints it. Selecting another face preserves every entered sticker. A member may revisit any face at any time.

Show the selected color with both a name and a visual indicator. Every sticker has an accessible label containing face, row, column, and its current color or unfilled state. Palette and sticker buttons support keyboard focus and Enter/Space activation. Centers are read-only with an explicit label. Controls remain usable on a 390px-wide viewport, with touch targets of at least 44px for painting and navigation.

Keep the palette selection stable until the member changes it. Do not rotate, advance faces, or assign colors automatically after a paint action. Allow editing even if a color count exceeds nine; show the error and let the member correct it.

Provide **Undo** for paint, erase, and reset actions in the current page session. **Reset colors** clears the 48 editable stickers and validation state while retaining the centers; it is one undoable action.

### Holding directions

Every face is displayed as seen directly from outside the cube. Use row-major positions from top-left to bottom-right; the center is index 4. Show the face's center name and the neighboring center that must be above it. These direction labels refer to adjacent face centers, not the colors of scrambled edge stickers.

| Face being entered | Center facing the member | Neighbor at the top | Neighbor at the right |
| --- | --- | --- | --- |
| Front, F | Green | White, U | Red, R |
| Right, R | Red | White, U | Blue, B |
| Back, B | Blue | White, U | Orange, L |
| Left, L | Orange | White, U | Green, F |
| Up, U | White | Blue, B | Red, R |
| Down, D | Yellow | Green, F | Red, R |

Use a simple original holding illustration and explicit English instructions for each step. Changing a viewed face requires rotating the whole cube in the hands, without turning a layer. The member can establish each listed grip independently; correctness must not depend on remembering the previous rotation.

Before solving, instruct the member to return to **white up, green front**, matching the animation's initial holding frame.

### Review and solve

After entry, show all six faces with their names, orientation markers, and the same row/column mapping used during entry. Desktop may use an unfolded net; mobile may wrap the labeled faces to keep stickers readable. A face's **Edit** action returns to its guided editor without losing other colors.

Show total entry progress and six color counts, including the centers. **Check colors** performs full validation. A valid complete entry enables **Explain with LBL**. Any edit invalidates the previous validation result and cancels an outstanding solve. Never substitute an automatic repair for the member's entry.

The result includes a read-only **Colors used for this solution** snapshot. If the member edits the draft afterward, keep any prior verified solution explicitly associated with its original snapshot. Do not make an old solution appear to describe the edited draft.

### Draft recovery

Keep a versioned color draft in sessionStorage for the current browser tab, including colors, selected face, and selected palette color. Restore it after refresh or returning from a lesson. Validate stored shape, version, and color values before use. Ignore malformed stored data and start a blank draft safely.

If storage is unavailable, editing and solving must still work in memory. Briefly tell the member that the draft cannot be restored after refresh. Undo history and generated solutions do not need to survive a reload. No color data is uploaded.

## 4. Validation and error behavior

Treat color entry as untrusted structured input at both the UI and worker boundaries. Use these ordered checks:

1. Exactly six faces of nine cells, using known colors or the explicit unfilled value; centers match the fixed scheme.
2. All editable stickers filled and exactly nine stickers of each color, including centers.
3. Each edge and corner color combination corresponds to a real piece, with every piece present exactly once. Reject impossible combinations and mirrored corner arrangements; corner sticker order must match a valid cyclic orientation.
4. The decoded state has an even total edge-flip sum, a corner-twist sum divisible by three, and matching edge/corner permutation parity in the project's cubie convention.

The last checks distinguish an attainable cube from a superficially plausible set of colors. They validate state, not the behavior of the LBL solver. Do not ask the solver to detect illegal states through a timeout or a failed solve.

Use structured errors with stable codes, English messages, and facelet references when justified. Examples include unfilled cells, excess/missing colors, impossible or repeated pieces, edge orientation, corner orientation, and permutation parity. Evaluate piece and reachability checks only after earlier prerequisites pass, to avoid cascades of misleading errors.

Highlight exact cells or pieces for local errors. For global orientation/parity failures, explain that the arrangement cannot result from normal turns and provide a route back to review; do not falsely identify one sticker as the cause. A typing or holding-direction error is possible, so do not assert that the physical cube was assembled incorrectly.

All entered colors remain available after validation or solver errors. Solver failures retain the existing bounded-computation behavior and clearly state that no verified solution was produced.

## 5. Architecture and integration

### Facelet codec

Add a pure facelet codec and validator in the cube-domain layer. It owns the single mapping between the six 3x3 grids and the existing edge, corner, and center orbit order. Both state-to-facelets and facelets-to-state conversions use the documented outside-view coordinates.

The validator returns either a valid immutable CubeState or structured errors. It uses the pinned cubing.js representation already used by CubeSteps; external examples are mathematical references, not a reason to copy their different piece ordering. Preserve the existing treatment of ordinary, unmarked center stickers.

### Input and session contracts

Replace the assumption that every SolveSession has scrambleMoves with explicit input provenance: either parsed scramble moves or a complete facelet snapshot. The session's SolveTrace.initial remains the authoritative starting CubeState. Verify that the recorded input decodes to that state.

The worker request carries a request ID and a discriminated input. Scramble input is applied to the solved cube as today. Facelet input is validated and decoded before calling the existing solveLBL(engine, state). The worker independently checks incoming data even when the UI already reported it valid.

Retain cancellation, stale-response protection, and preservation of previous verified results. Editing colors, changing input modes, resetting the draft, and leaving the solve page cancel an outstanding request. A late reply may never replace a newer session. Switching modes preserves their separate drafts while making the active mode explicit.

V1.1 keeps the current LBL stages and catalog. Do not prematurely generalize method-specific UI or add unavailable CFOP selectors. Direct-state input is the shared foundation needed by the next method milestone.

### Renderer startup

The current pinned renderer adapter starts from an algorithm applied to a solved cube. Keep that renderer detail private; an entered color state must never be presented to the member as a scramble they performed.

For color-origin sessions, initialize the renderer using the inverse of the **verified teaching trace**, adjusted for its final solved holding orientation. Let S be the default solved state, I the entered state, A the trace moves, and F = I applied with A. Find a whole-cube rotation Q among the 24 orientations for which S applied with Q equals F in the existing ordinary-cube representation. Then Q followed by inverse(A) initializes the renderer to I. The visible animation remains A, starting at move zero.

Verify the constructed setup against I before attaching it to the player. A failed equality check is a rendering-initialization failure, not permission to show a different starting cube. The setup sequence is internal and excluded from move counts, teaching steps, and user-facing scramble labels. This needs no additional search solver and does not change the taught solution.

Scramble-origin sessions retain their original setup moves and provenance. Existing lessons, whole-cube regrips, highlighting, step boundaries, replay, and stage jumps must preserve their behavior. Without WebGL, the face editor, review, validation, and textual solution remain usable.

### Responsibility boundaries

| Area | Responsibility |
| --- | --- |
| Cube domain | Facelet coordinates, piece decoding, legality checks, immutable state creation |
| Color-entry UI | Guided editing, holding instructions, review, accessible controls, draft recovery |
| Solve client and worker | Input discrimination, validation boundary, cancellation, LBL dispatch |
| Playback | Verified initial-state setup and existing trace playback |
| Tests and release records | Mapping evidence, impossible-state fixtures, regressions, browser and physical-input acceptance |

Retain React, TypeScript, Vite, cubing.js 0.65.1, hash routing, and the GitHub Pages base path. No new backend or product dependency is required by this design.

## 6. Verification and acceptance

### Domain and legality

- Verify every face's corner and edge coordinates against independent golden fixtures. Include asymmetric moved cubes so a rotated or mirrored back, up, or down face cannot hide behind uniform solved colors.
- Check single moves and inverses on all six faces. Round-trip seeded legal states through facelets and back with exact state equality under the existing center convention.
- Test malformed shape, unknown colors, missing cells, bad centers, wrong color counts, missing/duplicate pieces, invalid color combinations, and mirrored corners.
- Test a single flipped edge, a single twisted corner, and parity-mismatched swaps; accept legal paired flips, balanced twists, and matching permutations.
- Decode and solve at least 1,000 fixed-seed legal scrambles through the color-input path. Replay each teaching trace from the decoded state and require a solved result and valid stage checkpoints.
- Preserve the existing 1,000-scramble LBL corpus and solved/partially solved behavior.

### UI and concurrency

- Complete guided entry through all six faces; revisit, overwrite, erase, undo, reset, review, and correct an invalid entry without losing unrelated stickers.
- Verify palette and sticker keyboard access, center locking, clear selection/focus indicators, and errors accessible without color alone.
- Verify refresh/lesson-return draft recovery, malformed stored drafts, and unavailable storage.
- Verify that editing, resetting, switching modes, and navigating away cancel pending work; stale results do not overwrite a new draft or session.
- Keep prior solution input snapshots accurate when the editable draft changes.

### Rendering and deployed behavior

- In Chromium and WebKit, compare the actual renderer's state at move zero with a deliberately asymmetric entered state, including all 54 colors. Verify subsequent single steps, regrips, backward steps, replay, stage jumps, and the final solved state.
- Test final solved orientations other than the default when constructing renderer startup. An internal setup sequence must not appear as user instructions or counted moves.
- Retain the WebGL fallback and reduced-motion checks. Inspect desktop and 390px mobile layouts and browser errors.
- Run type checking, applicable unit/integration suites, both solver corpora, production build, and production browser tests at /cube-steps/. Verify the public Pages URL after deployment, including workers and route refresh.

### Physical acceptance and delivery

The owner's completed LBL acceptance does not imply that the new entry workflow has been accepted. Before describing V1.1 as physically validated, a club member must enter at least two differently scrambled physical cubes using the holding guide, compare the review/player start state to the actual cube, and follow the generated LBL solution. Include deliberate entry correction during this check.

Deliver through a reviewed development branch, passing GitHub validation, and the existing manual Pages workflow. Public preview deployment may be used for the new physical-input check; record that check as pending until actually confirmed. Do not mark CFOP or later features available in this release.

## 7. Source and design references

- [Approved CubeSteps direction](2026-10-11-cubesteps-design.md), including shared teaching formulas and gradual method/input releases.
- [Current LBL validation and owner acceptance](../../validation/v1.md).
- [Kociemba's cubie-level explanation](https://kociemba.org/math/cubielevel.htm) and [reference cubie validation implementation](https://github.com/hkociemba/RubiksCube-TwophaseSolver/blob/master/cubie.py), used to check the legality invariants. CubeSteps keeps its own pinned cubie conventions and original implementation.
- [J Perm's CFOP overview](https://jperm.net/3x3/cfop), as context for the later beginner-CFOP milestone; not an implementation scope for V1.1.

## 8. Handoff

The owner approved this written specification and its implementation plan on October 12, 2026. Native implementation is recorded in the implementation plan; automated evidence and the separate physical-input checklist are in [V1.1 validation](../../validation/v1.1.md). Independent review and delivery follow the approved plan.
