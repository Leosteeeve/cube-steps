# CubeSteps

Learn to solve the 3×3 cube with step-by-step animations and explained algorithms, starting with the beginner's method.

**Status: V1 local preview. Not yet published as a release. Physical-cube teaching acceptance is pending.**

## Learn the method

- Eight English lessons: notation, then the seven LBL stages.
- A complete teaching solution for random or pasted six-face scrambles.
- The same fixed formulas in lessons and generated solutions, with recognition, setup, repetition counts, and result checks.
- An interactive 3D cube: orbit, play/pause, single-step backward/forward, replay, speed, stage navigation, and target highlighting.
- Browser-only computation, no account, responsive layouts, and keyboard controls.

Begin with white up and green front. Camera orbit only changes your view; explicit x, y, and z regrips change the holding frame. The final corner stage can temporarily disturb solved pieces: finish each complete trigger and keep the prescribed grip.

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

The production output is `dist/`, configured for the GitHub Pages path `/cube-steps/`. Serve it over HTTP; opening `index.html` directly does not support module workers. The Pages workflow is manual and requires teaching acceptance; no site is published by a local build.

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

The corpus replays seeds 1–1,000, checks all teaching checkpoints, and repeats every solve for deterministic output. Passing it is coverage evidence, not a proof over every legal cube state. See [validation and remaining acceptance](docs/validation/v1.md).

Cube state, teaching rules, course content, and playback are separate modules. Start with the [design](docs/superpowers/specs/2026-10-11-cubesteps-design.md) and [implementation plan](docs/superpowers/plans/2026-10-11-cubesteps-v1-implementation.md). For rule changes, include a reproducing scramble and test its trace as well as the final state. Use `npm run format` for source formatting.

## Roadmap

| Version track | Planned work |
| --- | --- |
| V1 | Complete LBL lessons and formula-based solving; finish club acceptance before release |
| Later methods | CFOP → Roux → ZZ, each with lessons and generated solutions |
| Later inputs | Manual six-face colors with legality checks, then camera scanning with correction |

V1 does not include color entry, scanning, user-turn scoring, offline installation, or desktop packages. Its 3D view needs WebGL; textual steps remain available if rendering is unavailable.

## References and license

The beginner route is inspired by [J Perm's tutorial](https://www.jperm.net/3x3). Explanations and examples are original. Puzzle representation and animation use [cubing.js](https://github.com/cubing/cubing.js); the LBL teaching solver is implemented independently.

Original project code and documentation: [MIT](LICENSE). Dependencies keep their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). No referenced tutorial images or videos are included.
