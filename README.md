# CubeSteps

Learn to solve the 3×3 cube with step-by-step animations and explained algorithms, starting with the beginner's method.

**Status: Planning. No runnable release yet.**

CubeSteps is an open-source learning project for cubing clubs and beginners. Its goal is to make each decision understandable: what to look for, how to set up a case, which algorithm to use, and what that algorithm changes.

Lessons and generated solutions will use the same teaching algorithms. The first release will focus on the layer-by-layer (LBL) beginner's method.

## First release — planned

- A guided introduction to notation, holding the cube, and the seven LBL stages.
- Random scrambles and pasted scramble sequences.
- LBL solutions with case recognition, setup moves, named algorithms, and explanations.
- A 3D player with play/pause, forward and backward steps, speed control, algorithm replay, and stage navigation.
- A clean, light interface for desktop and mobile, with all content in English.
- Browser-based use without an account, with source code available to run locally once the app is released.

## Roadmap

| Stage | Planned scope |
| --- | --- |
| V1 | Complete LBL lessons and algorithm-based solving, with random and text scramble input. |
| Later methods | Add CFOP, then Roux, then ZZ. Each method includes lessons and solving. |
| Later input options | Add manual face-color entry with validation, then camera scanning with manual correction. |

Future methods will start with beginner-friendly variants. Each release must pass correctness and teaching checks before publication.

## Design

Read the [approved design](docs/superpowers/specs/2026-10-11-cubesteps-design.md) for the teaching approach, architecture, and acceptance criteria.

The planned stack is React, TypeScript, Vite, and cubing.js. Solving will run in the browser, with GitHub Pages as the planned hosting target. Application code, installation instructions, and a live demo will be added when available.

## References

- [J Perm's beginner tutorial](https://www.jperm.net/3x3) — reference for the selected low-algorithm teaching route.
- [cubing.js](https://github.com/cubing/cubing.js) — planned puzzle, notation, and animation library.

CubeSteps will provide original explanations and examples, with credit to its references. It is an independent project.

## License

Original project code and documentation are available under the [MIT License](LICENSE). Third-party dependencies and materials retain their own licenses and notices.
