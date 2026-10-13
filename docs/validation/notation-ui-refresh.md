# Notation and UI refresh validation

Status: implementation complete; final integrated verification and independent review in progress. New notation physical-cube acceptance is pending. This record does not claim publication.

## Scope and reference

The owner approved the [design](../superpowers/specs/2026-10-13-notation-and-ui-refresh-design.md) and three linked Native implementation plans on October 13, 2026. Branch `codex/notation-ui-refresh` starts from `914e87a7833a578a42ae3032c3341091beac6137`; Tasks 1–8 end at `b9b2d8e2c4e64e7f10d8db7fde8fd66055bea43e`. Task 9 adds production checks and this record without changing teaching rules, solve traces, player-controller logic or stored data formats.

## Implemented behavior

- The club hero projects 27 equal cubies from one coordinate system. Its 12-second cycle includes rest, a U turn, a hold and its inverse, plus gentle rocking. Local Pause preserves the frame; offscreen/hidden pages stop scheduling; system reduced motion and decorative Off return to the assembled static view. A matching static SVG remains available.
- Club `#/moves` offers 18 move bases with plain, prime and half-turn amounts: 54 native moves. Basic face moves are shown first; rotations, wide moves and slices are expandable. Every example starts solved with white up and green front and executes exactly one actual teaching move.
- Direction text and fixed arrows use the appropriate outside face: x/R, y/U, z/F, M/L, E/D and S/F. Holding and Direction views only change the camera. Dragging pauses playback. Center-color captions come from actual cube state, including wide/slice/rotation endpoints.
- The independent notation controller guards asynchronous readiness, stale selections, late failures and animation clocks. Selection/reset/replay return to the selected move's own initial state. Before/After diagrams remain usable with reduced motion or WebGL failure. A lazy-module failure keeps the club shell and exposes Reload, Home and the static notation lesson.
- Global styling stays green/white and is scoped to its edition root. Desktop learning keeps path, cube and explanations together; a single phone disclosure exposes every course or solution stage, with the selected label visible while collapsed. Formula tokens, current turn, repetitions, segments, physical regrips, highlights, range, speed and replay keep their original data and behavior. Empty/skipped/completed examples do not invent a move.
- Club learning retains blue/white styling. Timer layout, storage and behavior are unchanged. Home and questionnaire do not request renderer/search/solver/catalog chunks; method labels now come from canonical lightweight metadata shared with teaching presentations. Production excludes the development notation fixture.

## Automated evidence

Verified locally on Windows, Node 24, Chromium and WebKit:

- Task-level RED→GREEN tests cover new geometry, catalog conventions, native endpoints, controller races, renderer failure/readiness, club routing, phone navigation and current-turn semantics.
- Full unit suite: **105 files / 489 tests passed**.
- Cross asset verification: **190,080 states**. Case asset verification: **972 physical setups / 119 cases**.
- Task 8 browser regression: **48 checks passed** across both browsers, including every method's final phone lesson, exact color input and playback boundaries, daisy checkpoints, F2L regrips and five-width global layouts.
- Remaining final corpus, full development/production runs and independent-review outcomes will be recorded below once complete.

The Windows restricted runtime cannot resolve Vite worker paths reliably (`EPERM`) and previously failed temporary Vitest imports. Builds/tests use the normal host runtime. One automatic approval review timed out; the same approved checks ran successfully as explicit commands. The build's existing large-chunk advisory remains.

## Visual and interaction checks

Screenshots cover 360, 390, 768, 1024 and 1440 px for club Home, Moves and global learning in both browser engines. Actual rendered frames and canvas fade completion are awaited before capture. Desktop and phone screenshots were compared with the approved references; formulas wrap without dropping tokens, no horizontal page overflow is permitted, and primary move controls are at least 44 × 44 px. Keyboard focus and semantic current navigation remain visible. Functional sticker colors retain their meanings.

Intermediate U/U′, D/D′, B/B′, M/M′, E, S, Rw and x frames were inspected to distinguish moving layers from stationary layers and to verify direction. All 54 renderer endpoints include center stickers; independent hand-derived reference fixtures cover the 18 base conventions. Mid-turn reduced-motion changes, selection changes, camera switches and leaving the route are covered. Timer before/after captures retain the same geometry; randomized scrambles naturally differ.

## Owner follow-along still required

With a physical cube starting white up and green front, follow U, U′, U2, D and B, then one wide turn (Rw), slice (M) and whole-cube turn (x). Confirm that the outside-face direction and displayed new holding frame are easy to follow. Automated state correctness and the owner's earlier LBL/CFOP acceptance do not replace this new check.

## Execution decisions

1. Use an ignored project-local Git worktree because the native creation tool sees the outer non-repository folder. Cost: manual cleanup of this known worktree.
2. Split canonical method information from algorithm-bearing presentations after Home request tests exposed eager catalog loading. Cost if wrong: metadata drift; presentations consume the same canonical values and course/request tests cover the boundary.
3. Use a separate DEV-only notation fixture instead of expanding the solve-player fixture. Cost if wrong: test-only entry leakage; production verifies the query cannot expose the notation fixture.

Final review, release and any deferred findings are pending below.
