# CubeSteps

Learn to solve the 3×3 cube with step-by-step animations and explained algorithms, starting with the beginner's method.

**Status: Advanced CFOP and its revised F2L holding strategy are a preview pending renewed physical-cube acceptance. LBL and Beginner CFOP retain their existing acceptance. A separate club edition adds guided learning and a personal timer.**

[Open CubeSteps](https://leosteeeve.github.io/cube-steps/) — use it directly in your browser, with no account or installation.

## Learn the method

- Three English courses: LBL, Beginner CFOP, and Advanced CFOP. The first two have an introduction and seven stages; Advanced has an introduction and five stages.
- A daisy-first white cross: collect four white petals around yellow, match each petal's side color to its center, then turn that face 180° to send it down to white.
- A complete teaching solution for entered face colors, random scrambles, or pasted six-face moves.
- Beginner CFOP: a direct bottom cross, intuitive corner-edge pairing, two-look OLL, two-look PLL, and final upper-face alignment (AUF).
- Advanced CFOP: a guaranteed shortest white cross, 41 formula-based F2L cases with pair selection, all 57 OLL cases, all 21 PLL cases, and final AUF. F2L prioritizes visible target pairs and comfortable formulas, using explicit physical regrips when helpful, then reduces unnecessary turns and rotations. It does not promise a globally shortest F2L.
- 23 verified Beginner CFOP practice examples, including five F2L families, ten OLL cases and six PLL cases. Each unsolved last-layer look uses one recognized formula.
- A shared library with recognition diagrams, holding instructions, formula segments, references and alternative demonstrations. Practice selected cases without a timer or scores; reveal the answer when ready.
- Switch methods without losing the scramble, painted draft, selected face, or current color validation. Switching clears the old solution and cancels pending work; solve again explicitly.
- The same fixed formulas in lessons and generated solutions, with recognition, setup, repetition counts, and result checks.
- A refreshed green-and-white learning workspace with a complete expandable phone lesson path, a clear current-turn display and the full teaching formula.
- An interactive 3D cube: orbit, play/pause, single-step backward/forward, replay, speed, stage navigation, and target highlighting.
- Browser-only computation, no account, responsive layouts, and keyboard controls.

Begin with white up and green front. Camera orbit only changes your view; explicit x, y, and z regrips change the holding frame. The final corner stage can temporarily disturb solved pieces: finish each complete trigger and keep the prescribed grip.

For the LBL white cross, follow the player's regrip to **yellow up, white down**. Build the complete daisy before lowering any petals. White stays down for the first-layer corners. CFOP instead builds the white cross directly on the bottom and solves each corner-edge pair together. An already matched cross is skipped in both methods.

[Learn Beginner CFOP](https://leosteeeve.github.io/cube-steps/#/learn/cfop/intro) or [solve with CFOP](https://leosteeeve.github.io/cube-steps/#/solve/cfop). Follow the displayed recognition and preparation before applying a formula. H and Z use M slice turns, defined in the player; pasted scrambles still accept six-face notation only. Case and stage jumps change the screen instantly, so follow all earlier moves first on your physical cube.

Ready to progress? [Learn Advanced CFOP](https://leosteeeve.github.io/cube-steps/#/learn/advanced-cfop/intro) or [solve with Advanced CFOP](https://leosteeeve.github.io/cube-steps/#/solve/advanced-cfop). Wide/slice turns and whole-cube rotations are explained in the introduction and player. A half turn counts as one face turn; a slice counts as two outer-block equivalents and rotations are counted separately.

## Browse and practice formulas

Open the [algorithm library](https://leosteeeve.github.io/cube-steps/#/algorithms), filter by family or group, and explore a case. The diagram comes from its verified cube state. Switching a formula variant updates the recognition view, move groups and animation together.

Select cases in the library and choose **Practice selected cases**, or open [Practice](https://leosteeeve.github.io/cube-steps/#/practice). Each round uses a verified physical setup from white up, green front. Read the diagram or follow the setup on your cube, then choose **Show solution**. **Next case** hides the answer again. Selection is balanced across cases; a single selected case uses different verified variations.

Only the selected cases and groups are saved in this browser's localStorage. There are no times, scores, accounts or cloud history. If storage is blocked, practice still works for the current session. A partial demonstration ends with **Algorithm complete**; it need not solve the whole cube.

## Enter your cube

Choose **Solve your cube → Enter colors** and select LBL, Beginner CFOP or Advanced CFOP. Follow the center-based holding guide for Front, Right, Back, Left, Up, and Down. Pick a named color and paint each sticker, review all six faces, then choose **Check colors** and **Explain with** your selected method.

- Standard centers only: white up, yellow down, green front, blue back, red right, orange left. Centers are locked; the other 48 stickers start blank.
- Undo, erase, reset, and return to any face. Counts and legality checks help identify entry errors without automatically changing your colors.
- Your draft stays in this tab's sessionStorage for refresh and lesson return. No colors are uploaded. If storage is blocked, the page still works and shows a recovery notice.
- Each verified solution keeps its own **Colors used for this solution** snapshot. Editing a draft does not change an earlier solution.

Before following the animation, return to **white up, green front**. Custom color schemes, picture cubes, and camera scanning are not supported.

## Run locally

Install Node.js 24 or newer, then:

```sh
git clone https://github.com/Leosteeeve/cube-steps.git
cd cube-steps
npm ci
npm run dev
```

Open the `/cube-steps/` URL printed by Vite. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm run build
npm run preview
```

The production output is `dist/`, configured for the GitHub Pages path `/cube-steps/`. Serve it over HTTP; opening `index.html` directly does not support module workers. A local build does not publish the site.

## Community edition

[Club member entrance](https://leosteeeve.github.io/cube-steps/club/) · [Personal timer](https://leosteeeve.github.io/cube-steps/club/#/timer) · [Website guide](https://leosteeeve.github.io/cube-steps/club/#/guide)

This separate edition is intended for our club members. Please share the link within the club rather than promote it publicly. Anyone with the link can open it without a GitHub account; it is public, not access-controlled. The club entry requests search engines not to index it, but that is not a privacy guarantee. The main CubeSteps homepage does not advertise this entrance.

The club edition shares the same courses, formulas, solvers and player. It adds a blue-and-white layout, a short route questionnaire, self-reported lesson progress, and an independent timer with real scrambles, matching six-face diagrams, optional inspection, ao5/ao12, corrections, history, trends, and CSV/JSON export. All quiz recommendations use available methods. No questionnaire answers are saved.

First-time members can choose a short tour, postpone it, or stop automatic offers. **Page tour** stays available on each feature page; **Guide** collects written steps, control references, real screenshots, and links to start, resume or restart a walkthrough. Simple Moves and lesson steps invite hands-on practice; input drafts, practice answers and Timer history are protected. Timer help opens only while idle and locks timing inputs until a fresh press after exit. Tutorial choices use their own local-storage key and never mark a lesson mastered.

The Guide starts with a five-minute website walkthrough with English on-screen instructions, music and occasional sound effects, with no spoken narration. It loads only after selecting **Watch the 5-minute guide**, and includes a download link, music credits and an expandable written version of the on-screen guide. The written chapters work without loading the video or cube engine. Timer demonstrations and screenshots use visibly labeled examples captured in isolated browser contexts.

The homepage cube now has equal-sized pieces, gentle motion and occasional layer turns. Pause it locally or turn decorative motion off. **Moves** opens a separate notation workbench: choose from 54 face, wide, slice and whole-cube turns; read the direction from the relevant face; then play, pause or replay one move. Holding and Direction views change only the camera. Reduced motion or unavailable 3D rendering provides static Before/After diagrams. The new notation workbench is a preview pending physical-cube follow-along acceptance.

Progress and preferences use separate club storage keys; timer history stays in this browser's IndexedDB. There are no accounts or cross-device synchronization. Export a backup before clearing browser data. Unsaved attempts remain visible and exportable with a **Not saved** label. Leaving, hiding or losing focus during a timed solve records an interrupted DNF; a hard browser close can prevent an unfinished save. Manual +2 adds to inspection +2; DNF overrides numeric time. Each average discards one best and one worst result, and two DNFs make the window DNF.

For local development, open `/cube-steps/club/`. Both entries are built and deployed from this repository. See the [club validation record](docs/validation/webb-club.md) and [notation/UI validation](docs/validation/notation-ui-refresh.md).

The club entrance also contains **CFOP Lab · Experimental** (`#/lab`), with instructions in **Guide → Explore CFOP Lab** (`#/guide/lab`). It searches selected bottom colors and all four starting fronts, using each color's exact cross minimum as a reference while also considering one or two extra cross turns. It compares complete Cross + F2L paths with a versioned right-hand-led handling estimate; it does not promise globally optimal F2L or the fastest human solve. Verified routes appear progressively, and Stop keeps the current choices. Stable LBL and CFOP solvers retain their own rules.

Save fixed experiments before practicing. Lab trials stop at the end of F2L, use unlimited preparation and keep keyboard, touch and external times separate. Five complete matched A/B blocks are required for descriptive medians; deviations, interruptions, warmups and missing ratings remain visible. The ordinary full-solve Timer is separate. JSON exports default to routes only, with trials and tester labels opt-in. Imports are physically validated and previewed before an atomic commit; conflicts can be skipped or copied, and old-model routes are labeled archived. All records remain local until you deliberately share a file. See the [Lab validation record](docs/validation/cfop-lab-release.md) and [physical comparison worksheet](docs/lab/physical-review.md). Human fingertrick calibration and representative physical-phone performance remain pending.

`npm run dev` and `npm run build` first prepare the Guide video: download the accepted 36 MB MP4 from a versioned GitHub Release and verify its size and SHA-256. The verified file is reused locally and stays outside Git history. Run `npm run prepare:guide-video` explicitly if needed. Builds fail if the download or verification fails; the published site serves its own copy and needs no third-party video player. See [video publication notes](docs/validation/guide-video-v2-publication.md).

## Publish to GitHub Pages

Pages uses GitHub Actions. Run **Publish CubeSteps to Pages** manually on `main` after changes pass validation. Select **publish_preview** to publish a club preview while teaching acceptance is pending; select **teaching_accepted** only after a club member has completed the physical-cube check. The workflow runs all automated checks before deployment. Updating `main` alone does not publish a new version.

## Validate and contribute

```sh
npm run typecheck
npm run verify:cross
npm run verify:cases
npm run test:unit
npm run test:corpus
npm run test:lab:corpus
npm run test:efficiency
npm run test:lab:efficiency
npm run verify:guide
npx playwright install chromium webkit
npm run test:e2e
npm run build
npm run test:production
```

Four correctness corpus suites cover seeds 1–1,000 through scramble and color input for all three methods, checking teaching checkpoints, deterministic output and final states. Advanced admission covers all 41/57/21 cases, 972 physical setup variations, and 318 formula variants. The exact-cross table covers 190,080 coordinates. Human-friendly Advanced F2L prioritizes visible recognition and comfortable formulas, allowing useful physical regrips. From identical crossed states, it averages 31.949 face-turn equivalents and 3.310 rotations versus Beginner's 45.527 turns and 5.494 rotations. The previous Advanced policy averaged 30.458 turns and zero rotations: the new policy deliberately trades some moves for follow-along comfort. These are corpus measurements, not measured human speed or global F2L optimality. See [F2L validation](docs/validation/f2l-human-friendly.md), [V1.3 validation](docs/validation/v1.3.md), [V1.2 CFOP validation](docs/validation/v1.2.md), [V1.1 color-entry validation](docs/validation/v1.1.md), and [original LBL validation](docs/validation/v1.md).

Cube state, teaching rules, course content, and playback are separate modules. Start with the [design](docs/superpowers/specs/2026-10-11-cubesteps-design.md) and [implementation plan](docs/superpowers/plans/2026-10-11-cubesteps-v1-implementation.md). For rule changes, include a reproducing scramble and test its trace as well as the final state. Use `npm run format` for source formatting.

## Roadmap

| Version track | Planned work |
| --- | --- |
| V1 | LBL lessons and formula-based solving are available; physical-cube teaching acceptance is complete |
| V1.1 | Guided six-face colors, legality checks, and LBL playback; new physical-input acceptance pending |
| V1.2 | Beginner CFOP: intuitive F2L, two-look OLL and PLL, with lessons and generated solutions; physical teaching acceptance complete |
| V1.3 preview | Advanced CFOP alongside Beginner CFOP: shortest white cross, efficient F2L formulas, full OLL/PLL, and a shared library with selected-case practice; Advanced physical teaching acceptance pending |
| Later methods and inputs | Roux → ZZ, then camera scanning with correction, in separate versions |

Future roadmap items are not available yet. Scanning, user-turn scoring, offline installation, and desktop packages are not included. The 3D view needs WebGL; color entry, validation, and textual steps remain available if rendering is unavailable.

## References and license

The LBL route is inspired by [J Perm's tutorial](https://www.jperm.net/3x3). CFOP references include [J Perm's F2L overview](https://www.jperm.net/3x3/cfop/f2l) and CubeSkills' [F2L](https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf), [four-look last layer](https://www.cubeskills.com/uploads/pdf/tutorials/4-look-last-layer.pdf), [OLL](https://www.cubeskills.com/uploads/pdf/tutorials/oll-algorithms.pdf), and [PLL](https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf) formula sheets. Explanations, diagrams and examples are original. Puzzle representation and animation use [cubing.js](https://github.com/cubing/cubing.js); the teaching solvers are implemented independently. See [catalog admission and source notes](docs/algorithms.md).

Original project code and documentation: [MIT](LICENSE). Dependencies keep their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). No referenced tutorial images or videos are included.
