# Advanced Roux, Roux Test Lab, and the Next UI

Status: **Owner-approved written design (2026-10-23). Implementation plans are awaiting separate review.**

Implementation handoff: [Five plans and 26 tasks](../plans/2026-10-23-roux-ui-upgrade-plan.md), preserving Native execution and the separate video acceptance checkpoints.

Independent builder check: complete. The two material questions were resolved by making complete baseline fallback availability explicit (Section 7) and separating preview deployment from physical acceptance and replacement-video acceptance (Section 13). No material planning ambiguity remained in the focused recheck.

Date: 2026-10-23. Repository baseline: `5305a54` (the released redundant-move improvements). This design extends the existing club edition and the shared global player. The owner has approved the combined-block recommendation strategy, advanced LSE scope, visual direction and engineering defaults in this document.

## 1. Intent and delivery order

Make CubeSteps easier to read and operate, and give club members a serious but understandable progression beyond Beginner Roux. A member should see why a block-building choice helps, compare it with another choice, and test both on a physical cube. A good result is a useful, explainable route with clear evidence about its limits, not a low move count presented as a universal fastest solve.

Deliver in three dependent parts:

1. **Shared UI and cube player:** the global green/white edition and club blue/white edition receive the approved visual refresh, clearer navigation, responsive layouts, and purposeful motion.
2. **Club Advanced Roux and Roux Test Lab:** complete lessons and solving, full CMLL, advanced LSE, eight optional starting orientations, route comparisons and physical trials. Add Roux to Find your route and update the Guide/tours.
3. **Two refreshed films:** a roughly 30-second introduction and a 4–6-minute walkthrough, recorded from the finished interface. Both use music, modest sound effects and English prompts, with no spoken narration.

The architecture remains React, TypeScript, Vite and cubing.js. Computation stays in the browser, with workers and lazy assets for expensive work. GitHub Pages and the existing repository remain the delivery mechanism. The club is publicly accessible without accounts; club placement is not access control. Keep school identity and the club URL out of the global interface and global promotional material. The club itself retains Webb branding.

## 2. Decisions, approaches and boundaries

### Owner decisions

- Prefer a smoother **first block plus second block** sequence, while showing a shortest-first-block comparison. An extra first-block move can be worthwhile.
- Include common advanced LSE, including EOLR and better last-four-edge continuation, while retaining basic step-by-step explanations.
- Explore block construction beyond a fixed base-edge-first or 3+3 recipe, including squares, pairs, lines and later insertion of the base edge.
- Offer dual-bottom, eight-orientation solving; research full CMLL with comfortable execution.
- Keep Beginner Roux available, introduce Advanced Roux, and include Roux in the learning questionnaire.
- Use **A's bright homepage and reading hierarchy with B's focused player and Lab workspace**.
- Retain the accepted no-narration video style and the original closing composition.

### Approaches considered

| Area            | Approach                                 | Tradeoff and decision                                                                                                        |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Block selection | Always prefer the shortest first block   | A useful reference, but can leave a poor second block. The owner chose combined-block fluency as the recommendation instead. |
| Block selection | Compare complete two-block continuations | Selected product behavior: explain the extra move, transition or preserved pair that makes a route preferable.               |
| Visual system   | A: open learning throughout              | Strong readability; less concentration around the player. Retain its homepage and prose treatment.                           |
| Visual system   | B: focus studio throughout               | Strong operation/comparison workspace; a darker, denser homepage. Retain its player and Lab organization.                    |
| Visual system   | Combine A and B                          | Selected. One consistent design system, without an A/B style selector in the shipped product.                                |

The proposed implementation uses bounded progressive search and verified teaching data. Unbounded exhaustive optimization of an entire Roux solve is not an interactive product target. The first-block reference may carry a mathematical shortest-path proof; the combined recommendation remains the best rated candidate within the recorded search coverage.

### Included and deferred

Include complete Advanced Roux solving from random outer-face scrambles, pasted outer-face notation, and the existing legal six-face editor. Include a 42-case CMLL reference, recognition practice without scores/timing, the advanced course, and Lab trials. Existing LBL, both CFOP levels, Beginner Roux, CFOP Lab, Timer, Moves and Guide remain available.

Defer unrestricted 24-orientation color neutrality, one-handed/left-hand-specific optimization, learned personal scoring, 3D hand animation, automatic cube-turn sensing, accounts/cloud synchronization, competitions, and advanced subsets such as non-matching-block CMLL, EOLRb-specific teaching, EOBF, and last-slot variants. Useful physical rotations remain allowed when correctly mapped and explained; neither zero rotations nor fewer moves is a goal at any cost.

The UI study is a throwaway prototype. Its lessons, routes and numbers are illustrative and must not become solver data or published evidence.

## 3. Approved visual direction

The comparison artifacts are retained for reference:

- [Interactive directions](assets/roux-advanced-refresh/directions.html)
- [A: homepage](assets/roux-advanced-refresh/open-home.png)
- [B: player](assets/roux-advanced-refresh/focus-player.png)
- [B: Lab](assets/roux-advanced-refresh/focus-lab.png)

The blended production design uses A's open, predominantly light surfaces, generous spacing and clear heading hierarchy. Primary actions are visually distinct; related information forms a coherent section instead of a card for every sentence. Blue/white and green/white share geometry, typography and behavior, with separate brand assets. Never reuse the club's W mark as the global logo.

Use B's dark navy/forest cube stage inside an otherwise light learning or Lab workspace. Keep holding, the active move, playback controls and the immediate explanation adjacent. Detailed references, input configuration and diagnostic information expand when needed. Do not make a dark background a prerequisite for reading explanations or viewing the cube: provide a persistent **Light cube background** preference for glare/color visibility needs.

### Navigation and page hierarchy

- Club navigation: Home, Learn, Practice, Labs, Guide. Practice exposes Timer, notation/Moves and formula practice. Labs exposes CFOP Lab and Roux Test Lab; these are named choices, not ambiguous replacements of one another.
- Global navigation retains only globally available features. The redesign does not expose club links or silently publish club-only methods globally.
- Home offers Find your route, resume learning if progress exists, and clear entry points for first solves, continued learning and optional experiments. Do not manufacture social proof, activity counts or member avatars.
- Learn/Solve uses one compact method control, a stage navigator, the player and a reading panel. Avoid stacking several full-width navigation bars before the cube.
- Preserve existing deep links and browser Back/Forward. The current `#/lab` remains CFOP Lab; add club `#/roux-lab`, `#/roux-lab/compare` and `#/roux-lab/trials`. Advanced Roux uses the existing method-route convention with ID `roux-advanced`.
- Guide retains notation, written tutorials, tours, screenshots and the full film. New Roux chapters link to the relevant course/reference, rather than duplicating entire lesson content.

### Responsive layout and accessibility

Desktop uses a compact stage rail, a large cube region and a readable explanation column. Lab uses selectable route summaries beside one main player; do not run several animated 3D canvases at once. On phones, use a compact stage selector, show the current instruction with the player, and place longer explanations below. Input panels collapse after a solve begins. The cube should not be pushed below a long form or a large decorative title.

Use comfortable 16px body text, legible controls and at least 44px touch targets for primary actions; compact metadata may be smaller but not essential instructions. Maintain visible keyboard focus, meaningful labels, color-independent state cues, sufficient contrast, 200% zoom, and no page-level horizontal scrolling at 320–430px. Contained comparison scrolling is allowed with an obvious affordance. Any sticky transport must respect safe-area insets and never cover focused content, the on-screen keyboard, or trial controls.

Motion explains change: short page/selection transitions, current-step emphasis, and the existing gentle hero cube motion. Avoid scroll hijacking, continuous background parallax and animated metric counters. Decorative motion pauses off-screen/in hidden tabs, has a visible pause control, and defaults off for reduced motion. Essential cube turns remain user-controlled; reduced motion offers immediate stepping instead of animated turns. No website UI audio is added.

## 4. Cube rendering and playback

Keep cubing.js as the physical rendering/notation source. The prototype's canvas renderer is not a replacement. Improve stage sizing, camera framing, contrast, sticker separation and target visibility without visually changing the puzzle state.

Required controls are play/pause, previous/next move, replay action/formula, stage jump, speed, reset view, and target emphasis. Preserve keyboard equivalents while excluding text fields, selectors and active timers from shortcut handling. Reversing a real rotation must restore both state and displayed holding.

- **View versus holding:** dragging the camera changes only the view. Actual x/y/z turns are visible timeline events with their own hold instructions. Provide compact physical holding cues and a view-reset action; never update the cube's logical frame because the user orbited the camera.
- **Targets:** use stable piece IDs across moves and rotations. Prefer a distinct outline or equivalent color-independent cue, with gentle context dimming; retain identifiable colors on non-target pieces. A fallback must still identify the correct target in the matching six-face diagram. Do not replace true colors with a decorative blue cube in a teaching scene.
- **Hidden faces:** offer a collapsed, synchronized six-face diagram and an optional back-face viewing aid. Label which is a view aid. Avoid doubling stickers ambiguously in the main view.
- **Move readability:** keep the current move, adjacent moves, action purpose and hold available together. Preserve full source formulas as references when the executed trace has safely combined adjacent actions. The executed timeline is the authority for counts, stepping and checkpoints.
- **State transitions:** preserve camera preference during play/pause and explanation updates; reset intentionally for a new input or explicit request. Do not remount WebGL for each move. Correctly release canvases/workers on route changes.
- **Fallback:** if WebGL fails, keep readable moves, explanations, target references and synchronized 2D facelets. Report that 3D is unavailable instead of leaving a blank panel.

The adapter currently uses experimental cubing.js APIs. Keep them behind the adapter and test against the pinned version. Exact bevels, camera defaults, typography tokens and breakpoint values are builder choices, subject to the accepted visual direction and browser acceptance.

## 5. Advanced Roux course and method behavior

Retain `roux-beginner` and add `roux-advanced`; do not silently change a beginner's method or saved lesson. Advanced Roux includes a complete explained solution, not only a shortcut to experimental results.

The course progresses through:

1. **From steps to connections:** prerequisite review, fixed frame, wide turns, M/M′/M2, camera versus physical rotation.
2. **Seeing a first block:** premade pairs, 2×2×1 squares, line connections, and the complete 1×2×3 target.
3. **More than one construction:** square + pair, line + line, two pairs followed by the missing base edge, and adapting to pre-existing pieces. The diagrams must show actual constituent pieces, so informal “2+2” or “3+3” labels never imply a different block size.
4. **Plan the next block:** preserve/influence useful right-block pieces while completing the left; compare one extra move with its concrete continuation benefit.
5. **Second block:** flexible square/pair order, DR-edge choices, M-assisted pairing and R/r/U/M insertions, including safe rear cases and when to change the view or grip.
6. **CMLL recognition and learning:** orientation family first, side-color relationships second; full-case versus two-look comparison, AUF and justified algorithm variants.
7. **Advanced LSE:** EO reference, EOLR, and last-four-edge continuation, with the basic EO → LR → last four route available for explanation.
8. **Choose a starting block:** white/yellow bottom, four side colors each, familiarity filters, an explained selected hold, and examples of a useful pre-existing pair.
9. **Practice and compare:** recognition practice, Lab evidence labels and a repeatable physical comparison routine.

Every chapter includes an original worked example, recognition cues, the actual sequence, mistakes to watch for, a physical checkpoint, and links back to prerequisite ideas. Common constructions have named, verified patterns; an unusual searched sequence is described honestly through its observed effects, not given an invented standard algorithm name.

The normal Advanced Roux solver defaults to the familiar white-bottom/blue-left frame and one recommended route. It offers a compact opt-in eight-orientation setting. Lab defaults to all eight and displays alternatives. Both use the same case definitions, predicates and trace contract. Normal solves do not require learning every CMLL case in advance; members can replay any case and open its reference entry.

## 6. Color frames and move accounting

### Eight starting orientations

Keep the input convention and legality rules unchanged: standard color scheme, white up/green front, existing outer-face scramble grammar and six-face editor. Interpret dual-bottom/eight-orientation as **white or yellow down × four adjacent choices for the left side**, commonly called x2y neutrality. The actual front/right/back colors derive from the cube's handed color scheme, never from an arbitrary permutation of labels. Custom color schemes are outside this release.

Offer all eight, the familiar white/blue frame, and an explicit non-empty subset. Persist the choice locally and show the set used by each result. A user who restricts colors must never receive an out-of-set fallback. Changing the set starts a new analysis; it does not modify a saved route or active trial.

Canonical search coordinates may reuse one logical block frame, but every result maps back to original piece identities, physical move tokens, actual sticker colors and an explicit initial hold. The left and right side centers anchor the block frame. M turns can move the other centers; “white bottom” describes the completed block stickers, not a demand to restore the white center after every move. Track the center phase and upper-corner offset through CMLL/LSE.

### Counts and proof scope

Use a declared **slice-turn metric (STM)** for the first-block reference: an outer-face, middle-slice or two-layer wide quarter/half turn costs one. The primitive alphabet is all U/D/L/R/F/B, M/E/S and Uw/Dw/Lw/Rw/Fw/Bw variants. Normalize aliases such as `r` to `Rw`. Search does not award free whole-cube rotations. Initial positioning is outside solving turns and shown separately; later physical rotations are explicit events counted separately.

The first-block endpoint requires all five block cubies in their correct slots/orientations and the selected left/right side-center frame. The remaining middle-center phase may be any valid Roux phase. A heuristic over only the five cubies is a lower bound, not proof that the full endpoint was reached. Replay and check the centers too.

Show first-block turns, second-block turns, combined turns, physical rotations and modeled regrips separately. Useful M turns cost one STM in the Roux model; do not silently import CFOP Lab's different slice-effort weight. Explain counting in a nearby details panel. Any execution rewriting must preserve the declared count semantics and full physical effect, or recompute the counts and proof applicability.

## 7. First/second-block search and route quality

### Candidate generation

Use two cooperating paths per allowed orientation:

- **Reference path:** an admissible shortest-path search over the stated primitive alphabet and endpoint. An exact first-block distance requires exhausting all shorter lengths (or a verified exact table covering that full endpoint). Symmetry/pruning must preserve completeness; heuristic search alone does not establish optimality.
- **Practical candidates:** deterministic, bounded search that retains different useful intermediate connections and different second-block continuations. Seed it with verified existing Roux policies so a complete legal route can be shown before extensive optimization. A seed remains labeled as a baseline until genuinely improved or compared.

Candidate generation must not require the base edge first or require every route to follow a single named construction. Preserve diversity across already connected pairs, first square, line construction and base-edge placement. Classify observed constructions after checking actual intermediate states. Retain unclassified but valid candidates with a factual description.

For a proven first-block minimum d, explore up to d+2 STM for the combined recommendation. While d is unresolved, candidates may be explored within the current best first-block upper bound +2, with their excess explicitly unknown; the next update removes ineligible recommendations if a tighter proven bound excludes them. Pin any currently playing/saved route instead of changing it underneath the user.

The d+2 condition governs **optimized recommendation eligibility**, not the availability of a correct solution. Generate and verify a complete baseline for an allowed orientation before optional optimization; it may use the existing block policy followed by validated CMLL/LSE. Never discard that solution solely because a later proof puts it outside d+2. It remains playable as **Baseline fallback — optimization limit reached**, with the actual excess shown when known and no comfort/optimality claim. Lab may retain it as a labeled comparison reference. Thus normal solving has three explicit outcomes: a verified eligible optimized route, a verified complete baseline fallback, or an incomplete/error result when no complete route could be verified (for example, asset initialization failed or consumed the entire deadline). The last outcome must not be called an invalid cube. Representative full-replay acceptance requires a complete result, optimized or fallback, within the limits; fallback rate and improvement rate are reported separately.

Second-block continuation compares DR-first, pair-first, front/back square choices, M/wide insertions and subsequent pair readiness. Every admitted maneuver protects the completed first block at its declared endpoint; physical explanation distinguishes temporary changes from preserved pieces. The first-block proof is not a shortest-two-block proof.

Include the current beginner baseline for the same input/orientation in offline regression and, when useful, in Lab comparison. Do not recommend a candidate Pareto-dominated by that baseline on combined turns, rotations and the same fully rated execution model. If no better route exists within the budget, show that plainly. Never force variation just to make an advanced route look different.

### Evidence labels

Each orientation has independent evidence:

- **Proven minimum:** complete proof for this endpoint, alphabet and count version, with a verified witness.
- **Best found:** a verified witness and best known upper bound; lower bound/search depth is visible in details. Optimality is unresolved.
- **Not explored / incomplete:** no verified witness yet or initialization/search stopped. Neither is an invalid-cube diagnosis.

Only say “best among all eight” after all selected orientations have comparable completed evidence; otherwise say “best found among the explored orientations.” More generally, the recommendation means best model cost among the validated, eligible candidates searched, never fastest human execution or a globally optimal Roux solve.

### Execution model

Version a separate `roux-execution-v1` policy. Default to common right-hand-dominant two-handed execution, visibly stated in Lab. Model feasible entry/exit grip states through primitive or admitted maneuver profiles, preserving transitions across the FB/SB boundary. Distinguish M flicks, wide turns, back-face wrist actions, actual rotations, pure hand regrips and recognition visibility. A rotation's handling is not charged twice as a regrip.

Proposed initial block score in model units: `T + 2R + 2G + 2V + 2A`, where T is executed FB+SB STM, R is physical rotations during those blocks, G is modeled pure regrip events, V is a recognition boundary needing additional viewing, and A is an explicitly admitted awkward but feasible transition. Events counted as G or V are not counted again as A. These weights are engineering defaults, not measured seconds.

Maintain a small dynamic program across grip transitions rather than adding isolated formula penalties. Invalid grip paths are excluded. A sequence without adequate execution profiles can be a verified **unrated reference**, but cannot receive invented regrip counts or a comfort recommendation. Useful rotations can lower the overall score by improving visibility or grip. Tie-break by turns, rotations, regrips and stable route ID. Color familiarity is expressed through allowed orientations, not inferred psychological ability.

### Bounds and progress

Initial engineering ceilings (to be measured, not silently expanded):

| Resource                                        | Normal Advanced Roux | Roux Test Lab           |
| ----------------------------------------------- | -------------------- | ----------------------- |
| Wall-clock ceiling, including initialization    | 8 seconds            | 30 seconds              |
| Accounted search/simulation work                | 500,000 operations   | 2,000,000 operations    |
| First-block candidates retained per orientation | 16                   | 64                      |
| Second-block frontier per root                  | 16                   | 32                      |
| Shared cached/frontier entries                  | 25,000               | 25,000                  |
| Published complete candidates                   | 1                    | Up to 4 distinct routes |

These are global budgets per request, not new budgets for each orientation, stage or cache hit. Reserve work for obtaining a valid baseline before optional optimization. Bound retained snapshots to 512 move tokens and 128 actions. Load the advanced assets only on demand. Target at most 32 MiB decoded static tables and 128 MiB retained worker data; table layout and admissible pattern databases are implementation choices within those limits. Offline generation is reproducible and versioned, not performed on a member's phone.

Yield at bounded batches (at most 8ms or 256 accounted operations); check cancellation/deadline there. A main-thread watchdog handles failed or stuck initialization. Aim to provide a first complete route within 3 seconds on the recorded reference desktop and 6 seconds on the recorded reference phone; these are performance targets to measure, not current guarantees. If unmet, report it and adjust within the approved ceilings before claiming performance acceptance.

Progress shows elapsed time, explored orientations, verified routes, evidence status and stop reason, never a fabricated percentage of all possibilities. Stop retains validated results. New input, route exit or owner disposal cancels the worker and rejects stale request IDs. A selected/playing route stays fixed while new candidates arrive. Search failure preserves valid incumbents and distinguishes budget exhaustion, unsupported internal cases, failed verification and invalid input.

## 8. Full CMLL and advanced LSE

### CMLL catalog

Include **42 non-solved CMLL cases plus a solved/skip case**, with the conventional O, H, Pi, U, T, Sune, Anti-Sune and L families. Identify cases by actual upper-corner orientation and relative side-color permutation modulo appropriate U setup, rather than borrowing OLL IDs or relying only on top-face stickers.

Use Kian Mansour's original CMLL document and execution video as the baseline source. It provides alternatives with different edge effects and marks personal execution preferences. Treat those as candidate recommendations, not a universal fastest ranking. Verify the original document's formatting when extracting a preferred variant; plain text loses bold emphasis. Where a credible alternate improves M/r usage, grip continuity or LSE continuation, include it with its own provenance and verified physical effect.

Every admitted variant stores a stable case/variant ID, notation, setup/holding, normalized moves, original explanatory text, segment boundaries, entry/exit grip profiles, protected block IDs, resulting center phase and remaining-edge transformation, source URL/date, and any usage/license notes. Create original case diagrams from the engine; do not copy tutorial diagrams or prose into the MIT project. Each default and alternate must preserve both complete blocks and solve the upper corners up to a recorded U offset. Do not confuse this with COLL or demand an oriented edge cross before CMLL.

Choose among a small set of validated variants and AUF setups by a separate CMLL+LSE continuation score using the same event definitions, with visible reasons. FB+SB recommendation ranking stays separate. A case's default formula is the learning reference; a solver-selected alternate links directly to its variant and explains the choice. No unexplained case-dependent algorithm substitution.

The reference provides family filters, diagrams, recognition/holding, segmented algorithm animation, a default/alternatives selector and source links. Recognition practice allows selected cases, random case order, reveal/replay and local selection persistence. It uses legal case states produced by inverse/replayed algorithms and AUFs, covers real side-color recognition, and does not add timing or achievement scores. Equivalent/symmetric cases are deduplicated deterministically.

### LSE scope and invariants

The advanced route uses common EOLR to combine edge orientation with the placement of the two lateral upper edges, then compares valid last-four-edge continuations. Teach how changing an EO setup or LR insertion affects what follows. M/M′ direction, target edge identity, corner-ring offset and center phase stay explicit.

For this release, the EOLR endpoint uses the existing beginner `left-right` meaning generalized to the chosen frame: all six edges oriented in a valid reference phase and the two upper lateral edges matching their neighboring corners up to the common U offset. This is ordinary EOLR, **not EOLRb** (the separate strategy of deliberately placing those edges on the bottom). EOLRb-specific material found during research is a later extension, not silently mixed into this course.

A finite verified M/U transition graph can compare EOLR endpoints and last-four completion, retaining alternatives when an extra early move reduces the remainder. Carry center phase and upper-corner offset as state. Do not greedily minimize EO moves while ignoring LR/last-four continuation. At the final endpoint restore the whole cube, including centers and final U alignment.

Retain a real basic EO → LR → last-four comparison path. “Explain the basic steps” expands supporting concepts and can load that alternative trace; it must not pretend the optimized route had an intermediate checkpoint it never reached. Show which trace is playing, and restart at a verified boundary when switching. All reachable LSE states must have a verified completion or an explicit internal failure; no silent wrong result or infinite loop is allowed.

## 9. Trace contract and redundant-move protection

Extend the shared trace/presentation contracts with Advanced Roux stage IDs and typed metadata; avoid copying the existing player into a second implementation. Search and the normal solver share the same physical mapping and replay validator. Do not force Roux data into CFOP cross/pair fields.

A result records the input fingerprint, chosen orientation, starting/final holds, search/model/catalog versions, proof scope and coverage, physical move sequence, action boundaries, target/protected piece IDs, formula variant references, observed recognition, explanation, checkpoints, count breakdown and execution events. Add block-construction and EOLR metadata where needed. Saved results are immutable snapshots.

For search-derived block segments, derive explanations from replayed before/after states: which pieces connect, what remains connected, which working space changes and what the next endpoint requires. There need not be a named formula for every block-building idea. Never claim a move preserves a piece that actually moves, or creates a square that was not created.

Retain the released adjacent-action compaction and verified source-formula references. Reject nontrivial exact same-state cycles within each stage and avoid adjacent inverse/same-face redundancy in emitted execution. The audit includes center phase and holding; a zero-action skipped stage is not a loop. Formula repetition can be legitimate; judge repeated physical states and effects rather than banning repeated strings. Do not simplify across a real pedagogical checkpoint without updating its endpoint and provenance. Costs, replay, explanation text, diagrams and playback index derive from the same finalized trace.

Before publication, the worker replays each complete candidate from original input through FB, SB, CMLL, LSE and final alignment. The main thread validates bounded message structure/request identity and independently replays finalists. Reject invalid candidates without replacing a valid incumbent. Empty or already-satisfied stages are explicit skips, not phantom moves.

## 10. Roux Lab workflow and data

Reuse the existing CFOP Lab's interaction principles, worker lifecycle and storage validation where applicable. Preserve its routes, data and model behavior; Roux uses a distinct method identity and score.

### Analyze and Compare

Analyze accepts random/text/color input, allowed orientations and the stated execution profile. Show a complete playable recommendation as soon as one is validated. Display up to three useful alternatives: the shortest-first-block reference, a lower-rotation route, or a different allowed orientation. Deduplicate physical routes, prefer meaningful tradeoffs, and display fewer alternatives when fewer valid routes exist.

Compare first/second/combined STM, initial hold, later rotations, modeled regrips, evidence status and one concrete explanation. CMLL/LSE and total solve counts are secondary details, explicitly outside the optimized block subtotal. A shortest-first-block witness with no validated full continuation may appear only as a clearly labeled reference snippet; it is not a complete recommended solve or eligible full route trial.

Pin two exact route snapshots with stable A/B labels. New recommendations do not swap those identities. Keep one active player, with state reset when changing routes. A mobile comparison uses compact selectable summaries and one player, not a shrunken desktop table.

### Physical trials

The primary endpoint is **both complete blocks**, immediately before CMLL. Use the existing practiced-execution trial model: inspect/rehearse freely before the timer, confirm the saved starting state/hold, then time execution. Support the current keyboard/touch protocol and manual external times. Pause all background search and playback while timing. Never imply the app senses actual turns.

Record familiarization/measured kind, route, timing method, duration, followed/deviated/incomplete/interrupted outcome, optional flow/recognition ratings and a note about a specific awkward move. Preserve interruption and retry history. Use A–B then B–A matched blocks; summarize only like-for-like input, endpoint, tester, route versions and timing method. Retain the existing five-complete-matched-block threshold for descriptive medians and paired differences. It is not a statistical significance claim. Ordinary Timer ao5/ao12 remains unchanged.

### Storage and transfer

Use a separate versioned Roux Lab IndexedDB namespace (`cubesteps.club.roux-lab`), keeping current CFOP storage untouched in this release. Share validated repository code where useful, not the stored record identity. Saved experiments include method, original state/setup, allowed frames, actual routes, model/catalog versions, evidence, endpoint, formula snapshots and trial records. Preferences and case selections use schema-validated namespaced local storage.

Import/export follows existing Lab limits: at most 10 MiB JSON, 50 experiments, 5,000 attempts, four routes/six comparisons per experiment, 512 tokens/128 actions per route, labels up to 60 characters and notes up to 2,000. Validate method/version, notation, legal state, references, endpoint and full route replay before atomic import. Unsupported CFOP files are not reinterpreted as Roux experiments. Default exports omit tester labels/trials unless explicitly included; CSV protects formula-like text. Never execute imported content or load arbitrary remote formula assets.

Do not claim save success until the transaction commits. Preserve unsaved work with retry/export on failures; protect corrupt/unsupported storage from automatic replacement. Keep old snapshot playback possible with validated embedded formula data even if current catalog defaults later change.

## 11. Find your route, Guide and compatibility

Revise the questionnaire so it no longer assumes every experienced solver wants CFOP. Ask a neutral learning preference (layer/pair-based, block-based, or unsure) and relevant method foundation in addition to ability, goals and available time. Use explicit, deterministic recommendation rules with plain reasons:

| Current foundation and interest                                                 | Primary suggestion                                                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cannot yet solve independently                                                  | LBL; show Beginner Roux as a deliberate alternative if block learning is requested, with notation/M prerequisites |
| Can solve; interested in blocks or switching to Roux                            | Beginner Roux                                                                                                     |
| Can independently complete both Roux blocks and basic LSE; wants advanced study | Advanced Roux, beginning at the weakest prerequisite rather than all 42 CMLLs                                     |
| Has F2L and two-look last-layer foundation; wants advanced CFOP                 | Advanced CFOP                                                                                                     |
| Other independent solvers preferring layers/pairs or unsure                     | Beginner CFOP, with an explicit Roux alternative                                                                  |

The questionnaire suggests a starting lesson; it does not measure talent or promise a faster method. Members can choose any available course. Persist method selection, previous lesson and practice marks without invalidating old progress. If new answers are required, keep the old recommendation until the quiz is completed again; do not invent answers during migration.

Update contextual tours, target selectors, Guide screenshots, move notation links, route descriptions and written instructions to match the new UI. Keep guided interactions skippable and avoid launching tours during active solves or trials. Existing routes, saved Timer records, CFOP experiments and formula selections must survive. Advanced Roux/Lab material stays club-only; shared rendering improvements apply globally.

## 12. Video refresh

Use the accepted short source in `sharing/club-website-introduction/no-narration-v3/` and full source in `sharing/club-website-introduction/full-no-narration-v1/` (workspace-level media folders). The deployed full film is currently configured by `scripts/tutorial/guide-video.json`; repository code is the authority for live integration, as older local sharing notes may predate deployment.

Record real operation of the completed UI. Keep cube turns at their actual displayed speed, readable cursor/click cues, deliberate pauses for recognition, short English action prompts and restrained transitions. Reuse cleared music/effects when suitable, retain credit/license records, and explain edits. Avoid simulated narration, fake member testimonials or prototype search results. Review a revised ~30-second cut before producing the full film; the already accepted style remains the default, so this is a concrete media acceptance checkpoint.

- **Short introduction:** around 30 seconds, invite curiosity, show learning/playback and a glimpse of practice/Roux, and point to the full Guide. Deliver a 1080p H.264/AAC MP4 plus an email-friendly copy if needed (target under 10 MiB). The user shares it; do not send email automatically.
- **Full walkthrough:** 4–6 minutes following a normal member session: find a route, learn a move/lesson, use a personal cube, practice/Timer, and discover Roux/Lab when ready. Do not cram the CMLL catalog or technical scoring into this introduction. Preserve the closing composition and wording: **“Your turn. Keep your curiosity.”**
- **Guide integration:** after media acceptance, publish a new immutable video asset using the existing release/checksum workflow, update the player/poster/download size/credits/on-screen transcript/chapter times, and retain the written Guide as a complete alternative. Do not overwrite the older release asset in place or autoplay the film on page entry.

Check the whole film for readable prompts, actual UI correspondence, safe crop margins, music continuity, modest SFX, no clipping/blank frames and the intended closing. Verify download integrity, MIME/range playback and desktop/mobile loading after deployment. Website implementation can be tested independently; do not advertise the new film before it exists and is accepted.

## 13. Verification and acceptance

### Solver and data evidence

- Unit/invariant coverage for all move mappings, all eight frames, center phases, corner offsets, notation aliases, count semantics, protected-piece endpoints, CMLL recognition and final solved state.
- Validate every CMLL default/alternate in all relevant AUFs and eight frame mappings, using representative legal remaining-edge states; verify case coverage/uniqueness and actual edge transformations. The source formula alone is not a correctness test.
- Exhaustively validate the reachable finite M/U LSE domain and all admitted policy transitions, including combined EOLR and basic explanations. Check center and corner-offset restoration, not only visible edge colors.
- Run at least **1,000 fixed-seed scrambles across all eight orientations (8,000 full replays)** for Advanced Roux; compare normal and Lab result contracts. Use deterministic work-limited headless generation for this corpus rather than spending the full 30-second Lab optimization window on every seed. Exercise full-budget/progressive Lab behavior on a separate representative performance corpus. Include solved/partially solved blocks, premade pairs, late base-edge insertion, CMLL skips, unfavorable rear pieces and all LSE pattern classes. Add legal facelet equivalents and invalid-input cases.
- Independently prove shallow first-block fixtures by exhaustive search, check witness distances, and test interrupted proofs/status labels. Verify that symmetries or pruning cannot label an unproven result optimal.
- Audit emitted traces for exact state loops, reducible adjacent execution and stale reference explanations. Compare FB/SB metrics with the released beginner baseline and retain difficult regressions as fixtures. Report distributions and counterexamples; do not declare human fluency from a move-count histogram.
- Run existing method, Timer, CFOP Lab, tutorial, import/export and full-build checks. Test cancellation, initialization failures, budget limits, stale messages, pinning, corrupt imports, unsaved data and storage conflicts.

### Browser and performance evidence

Inspect the real renderer on desktop Chromium/Edge and mobile Chromium/WebKit profiles, including physical or clearly labeled emulated device evidence. Check 320–430px layouts, landscape, 200% zoom, keyboard navigation, reduced motion, WebGL fallback, dark/light cube backgrounds, all phase jumps and reverse stepping through physical rotations. Verify the cube, current move, explanation, net and targets stay synchronized.

Record reference hardware/browser, cold/warm asset load, first-valid-result latency, actual wall-clock stop behavior, peak retained memory and main-thread responsiveness. Do not present a local headless check as physical phone performance or physical-cube acceptance. Test both global and club production base paths and the preserved deep links.

### Human acceptance and delivery

Ask the owner/Josh to try a compact, reproducible set covering alternate first-block constructions, eight-way selection, M/r transitions, CMLL variants, EOLR and repeated-motion regressions. Keep their feedback and model estimates distinct. “Comfortable” is a provisional recommendation until physical testing supports it; code correctness can pass while ergonomic acceptance remains pending.

Physical acceptance does **not** block a club preview deployment after the approved implementation plan, automated correctness/browser checks and independent code review have passed. Ship Advanced Roux with a visible **Preview** label and Roux Test Lab as **Experimental**, keep both beginner methods available, and report physical acceptance as pending. Promote Advanced Roux beyond Preview only after owner acceptance; Lab remains Experimental. Do not claim a physically validated improvement merely because a preview is live. A known correctness or data-loss failure blocks deployment regardless of those labels. Video acceptance remains the separate concrete checkpoint in Section 12; an unfinished/unaccepted replacement film does not replace the existing Guide film.

After written design and implementation-plan approval, proceed in the established Native workflow, perform an independent final code review, submit the reviewed changes, wait for required checks, merge, deploy, verify live pages/assets, synchronize local main and remove only merged disposable branches/worktrees. Documentation and video acceptance checkpoints remain explicit. This design phase creates no production feature or new live publication.

## 14. Research and decisions left to implementation

Primary references consulted on 2026-10-23:

- [Kian Mansour: CMLL](https://sites.google.com/view/kianroux/cmll), including the [original algorithm document](https://docs.google.com/document/d/1S_y2evAxJ2vMMFDtfGSOsgHuDMYR-sEjoEU_mtSD7Qc/edit) and execution video. Basis for case/variant research; each admitted sequence still needs independent validation.
- [The Roux Reader: blockbuilding/orientation](https://book.rouxers.com/blockbuilding.html). Orientation vocabulary and the eight-way interpretation.
- [The Roux Reader: first block](https://book.rouxers.com/fb.html). Multiple construction families and planning the continuation.
- [Roux Tutorial: second block](https://tutorial.rouxers.com/intermediate/second-block.html). M/wide-turn pairing and flexible square construction.
- [The Roux Reader: CMLL recognition](https://book.rouxers.com/cmll.html). Side-color recognition and progression beyond orientation-only cases.
- [The Roux Reader: LSE](https://book.rouxers.com/lse.html), which links [EOLR descriptions](https://docs.google.com/document/d/1dvGERLfN-0rVwN914HH1zRPHLfdM6d5rPfe0HxOMK08/edit). Its EOLRb-specific subsections are distinguished from the ordinary EOLR endpoint specified here.
- [Ao1K's reconstruction notation](https://www.ao1k.com/recon/). A practical STM counting reference; this design explicitly fixes the first-block search alphabet, endpoint and rotation treatment so proof scope remains unambiguous.

These sources establish techniques and candidate material, not a proven fastest algorithm set. Original explanations, generated diagrams and implementation remain project work; third-party materials retain their own rights.

Implementation may settle component/file decomposition, exact pattern-database partitioning, offline generator layout, typography/camera tuning, and which validated CMLL alternatives best fit the stated execution profile. It may tune search inside the stated ceilings and document the configuration version. It may not quietly broaden color scope, drop full CMLL/basic explanations, remove beginner routes, change trial endpoints, claim universal fastest execution, expand resource ceilings, or replace no-narration films with synthetic voice.
