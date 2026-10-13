# Notation and UI refresh validation

Status: implementation and all required local verification are complete. Independent review found no blocking issues. New notation physical-cube acceptance is pending. Publication status is tracked separately by GitHub Actions and the deployed `build-info.json`.

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
- All four fixed-seed correctness corpus files passed (five checks, 655.91 seconds); seed counts, deterministic re-solves, color inputs and checkpoint assertions are unchanged. The exact-cross table suite passed both checks.
- The 1,000-seed F2L efficiency baseline passed (211.14 seconds); no teaching-policy or metric threshold changes were made.
- Task 8 browser regression: **48 checks passed** across both browsers, including every method's final phone lesson, exact color input and playback boundaries, daisy checkpoints, F2L regrips and five-width global layouts.
- New production selection: **10 checks passed**, including all 54 moves in both browsers, direct refresh, actual bundled module/worker requests, Home/quiz lazy boundaries, static fallback and rejected-module reload recovery.
- Complete development browser suite: **160 checks passed** in Chromium and WebKit (16.6 minutes).
- Final TypeScript check and production build passed. Complete production browser suite: **24 checks passed** in Chromium and WebKit (7.1 minutes), covering both editions, refreshed deep links, all 54 notation endpoints, fallbacks, real worker assets, exact colors, formula practice, Timer persistence and exports. Normal paths had no page errors or failed asset responses; only the deliberately aborted module is excluded in its fault-injection test.

The Windows restricted runtime cannot resolve Vite worker paths reliably (`EPERM`) and previously failed temporary Vitest imports. Builds/tests use the normal host runtime. One automatic approval review timed out; the same approved checks ran successfully as explicit commands. The build's existing large-chunk advisory remains.

## Visual and interaction checks

Screenshots cover 360, 390, 768, 1024 and 1440 px for club Home, Moves and global learning in both browser engines. Actual rendered frames and canvas fade completion are awaited before capture. Desktop and phone screenshots were compared with the approved references; formulas wrap without dropping tokens, no horizontal page overflow is permitted, and primary move controls are at least 44 × 44 px. Keyboard focus and semantic current navigation remain visible. Functional sticker colors retain their meanings.

Calculated contrast for key text/background pairs: global ink/white 11.49:1, muted/white 6.08:1, muted/soft green 5.42:1, green/white 6.55:1; notation navy/white 11.72:1, muted/pale blue 5.44:1 and blue Play/white 6.23:1. This is a scoped text-color check, not a claim of a full accessibility certification.

Representative final captures:

| Surface | Desktop (1440 px) | Phone (390 px) |
| --- | --- | --- |
| Club Home | [Capture](assets/notation-ui-refresh/club-home-desktop.png) | [Capture](assets/notation-ui-refresh/club-home-phone.png) |
| Move Explorer | [Capture](assets/notation-ui-refresh/moves-desktop.png) | [Capture](assets/notation-ui-refresh/moves-phone.png) |
| Global learning | [Capture](assets/notation-ui-refresh/global-learning-desktop.png) | [Capture](assets/notation-ui-refresh/global-learning-phone.png) |

Intermediate U/U′, D/D′, B/B′, M/M′, E, S, Rw and x frames were inspected to distinguish moving layers from stationary layers and to verify direction. All 54 renderer endpoints include center stickers; independent hand-derived reference fixtures cover the 18 base conventions. Mid-turn reduced-motion changes, selection changes, camera switches and leaving the route are covered. Timer before/after captures retain the same geometry; randomized scrambles naturally differ.

## Owner follow-along still required

With a physical cube starting white up and green front, follow U, U′, U2, D and B, then one wide turn (Rw), slice (M) and whole-cube turn (x). Confirm that the outside-face direction and displayed new holding frame are easy to follow. Automated state correctness and the owner's earlier LBL/CFOP acceptance do not replace this new check.

## Execution decisions

1. Use an ignored project-local Git worktree because the native creation tool sees the outer non-repository folder. Cost: manual cleanup of this known worktree.
2. Split canonical method information from algorithm-bearing presentations after Home request tests exposed eager catalog loading. Cost if wrong: metadata drift; presentations consume the same canonical values and course/request tests cover the boundary.
3. Use a separate DEV-only notation fixture instead of expanding the solve-player fixture. Cost if wrong: test-only entry leakage; production verifies the query cannot expose the notation fixture.

## Independent review

One fresh independent reviewer examined `914e87a..23fb6ed`, the approved specification, all three plans and their 15 review-focus scenarios, surrounding code, test coverage, execution rulings and saved visual evidence. It found **no Critical or Important issues**, no declined judgments, and assessed the code as ready to merge once the running required verification succeeds. It did not modify files or rerun the heavy suites.

One **Minor** item is deferred under the approved Native review policy: explain lowercase wide-turn aliases near the advanced picker (for example `r = Rw`, `u = Uw`). Canonical explicit `w` controls and their animations work; the supplementary cross-notation explanation is missing. No additional review/fix cycle was run for this wording item.

## Release boundary

The reviewed application source is committed in `23fb6edaca7802dd4ba46ceaff01ab082ac17186`. All required local suites completed successfully on that source. Logs and the full responsive screenshot matrix are also preserved outside the disposable worktree under the project validation directory.

The initial GitHub push run passed all 160 development browser checks but hit an intermittent WebKit production reload check; the parallel pull-request run passed completely. The saved failure trace shows full-page navigation cancelling the previous document's unfinished 3D module request. Delaying that request reproduced the failure locally even after waiting for enabled controls, which only establishes timeline readiness. The production check now also awaits an actual rendered frame before each reload/navigation. Ten repeated Chromium/WebKit checks passed with the delayed download; all original page-error, asset-error and preference assertions remain. This follow-up changes the test and validation record only, not the reviewed application source.

Use the owner's existing GitHub integration/publication authorization with **publish_preview=true** and **teaching_accepted=false**. GitHub checks and the Pages workflow run the required suites again. The deployed `build-info.json` identifies the actual published commit; verify it and the public Home/Moves/global lesson routes before reporting publication. The owner follow-along checklist above remains outstanding.
