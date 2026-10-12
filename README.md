# CubeSteps

Learn to solve the 3×3 cube with step-by-step animations and explained algorithms, starting with the beginner's method.

**Status: V1.2 preview adds complete Beginner CFOP lessons and explained solving. Physical-cube CFOP teaching acceptance is pending. Earlier LBL and color-entry acceptance records remain in their dated validation documents.**

[Open CubeSteps](https://leosteeeve.github.io/cube-steps/) — use it directly in your browser, with no account or installation.

## Learn the method

- Two English courses: LBL and Beginner CFOP, each with an introduction and seven stages.
- A daisy-first white cross: collect four white petals around yellow, match each petal's side color to its center, then turn that face 180° to send it down to white.
- A complete teaching solution for entered face colors, random scrambles, or pasted six-face moves.
- Beginner CFOP: a direct bottom cross, intuitive corner-edge pairing, two-look OLL, two-look PLL, and final upper-face alignment (AUF).
- 23 verified CFOP practice examples, including five F2L families, ten OLL cases and six PLL cases. Each unsolved last-layer look uses one recognized formula.
- Switch methods without losing the scramble, painted draft, selected face, or current color validation. Switching clears the old solution and cancels pending work; solve again explicitly.
- The same fixed formulas in lessons and generated solutions, with recognition, setup, repetition counts, and result checks.
- An interactive 3D cube: orbit, play/pause, single-step backward/forward, replay, speed, stage navigation, and target highlighting.
- Browser-only computation, no account, responsive layouts, and keyboard controls.

Begin with white up and green front. Camera orbit only changes your view; explicit x, y, and z regrips change the holding frame. The final corner stage can temporarily disturb solved pieces: finish each complete trigger and keep the prescribed grip.

For the LBL white cross, follow the player's regrip to **yellow up, white down**. Build the complete daisy before lowering any petals. White stays down for the first-layer corners. CFOP instead builds the white cross directly on the bottom and solves each corner-edge pair together. An already matched cross is skipped in both methods.

[Learn Beginner CFOP](https://leosteeeve.github.io/cube-steps/#/learn/cfop/intro) or [solve with CFOP](https://leosteeeve.github.io/cube-steps/#/solve/cfop). Follow the displayed recognition and preparation before applying a formula. H and Z use M slice turns, defined in the player; pasted scrambles still accept six-face notation only. Case and stage jumps change the screen instantly, so follow all earlier moves first on your physical cube.

## Enter your cube

Choose **Solve your cube → Enter colors** and select LBL or Beginner CFOP. Follow the center-based holding guide for Front, Right, Back, Left, Up, and Down. Pick a named color and paint each sticker, review all six faces, then choose **Check colors** and **Explain with** your selected method.

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

## Publish to GitHub Pages

Pages uses GitHub Actions. Run **Publish CubeSteps to Pages** manually on `main` after changes pass validation. Select **publish_preview** to publish a club preview while teaching acceptance is pending; select **teaching_accepted** only after a club member has completed the physical-cube check. The workflow runs all automated checks before deployment. Updating `main` alone does not publish a new version.

## Validate and contribute

```sh
npm run typecheck
npm run test:unit
npm run test:corpus
npx playwright install chromium webkit
npm run test:e2e
npm run build
npm run test:production
```

Three corpus suites cover seeds 1–1,000 through scramble and color input for both methods, checking teaching checkpoints and final states. Both scramble solvers repeat each solve for deterministic output. CFOP also covers all 96 upper-layer pair arrangements, 216 last-layer orientation patterns, 288 legal oriented permutations, and 24 holding frames. Passing these checks is coverage evidence, not a proof over every legal cube state. See [V1.2 CFOP validation](docs/validation/v1.2.md), [V1.1 color-entry validation](docs/validation/v1.1.md), and [original LBL validation](docs/validation/v1.md).

Cube state, teaching rules, course content, and playback are separate modules. Start with the [design](docs/superpowers/specs/2026-10-11-cubesteps-design.md) and [implementation plan](docs/superpowers/plans/2026-10-11-cubesteps-v1-implementation.md). For rule changes, include a reproducing scramble and test its trace as well as the final state. Use `npm run format` for source formatting.

## Roadmap

| Version track | Planned work |
| --- | --- |
| V1 | LBL lessons and formula-based solving are available; physical-cube teaching acceptance is complete |
| V1.1 | Guided six-face colors, legality checks, and LBL playback; new physical-input acceptance pending |
| V1.2 | Beginner CFOP preview: intuitive F2L, two-look OLL and PLL, with lessons and generated solutions; physical acceptance pending |
| Later CFOP versions | Full PLL, then full OLL |
| Later methods and inputs | Roux → ZZ, then camera scanning with correction, in separate versions |

Future roadmap items are not available yet. Scanning, user-turn scoring, offline installation, and desktop packages are not included. The 3D view needs WebGL; color entry, validation, and textual steps remain available if rendering is unavailable.

## References and license

The LBL route is inspired by [J Perm's tutorial](https://www.jperm.net/3x3). CFOP references include [J Perm's F2L overview](https://www.jperm.net/3x3/cfop/f2l) and CubeSkills' [four-look last layer](https://www.cubeskills.com/uploads/pdf/tutorials/4-look-last-layer.pdf), [OLL](https://www.cubeskills.com/uploads/pdf/tutorials/oll-algorithms.pdf), and [PLL](https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf) formula sheets. Explanations and examples are original. Puzzle representation and animation use [cubing.js](https://github.com/cubing/cubing.js); both teaching solvers are implemented independently.

Original project code and documentation: [MIT](LICENSE). Dependencies keep their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). No referenced tutorial images or videos are included.
