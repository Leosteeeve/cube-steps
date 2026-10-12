# CubeSteps Design

Approved: October 11, 2026

**Status: Planning. No runnable release yet.**

This document records the approved product direction. It describes planned behavior, not implemented features or completed tests.

## Purpose

CubeSteps will help cubing club members learn to solve a 3×3 cube through controllable animation and clear explanations. It will begin with complete beginners and introduce advanced methods in later releases.

The central requirement is consistency between teaching and solving. Guided lessons and freely generated solutions must use the same fixed teaching algorithms. Each application must explain the recognized case, preparation, algorithm, and expected result.

The project will describe these capabilities directly without claiming that method-based solving is unprecedented.

## Current delivery

The current task is to create the public `Leosteeeve/cube-steps` GitHub repository through the user's Edge browser and publish an English README, this design document, an MIT license, and Node ignore rules. The default branch is `main`.

Application implementation and deployment are separate, later work. This initialization does not include a runnable app, a live site, or completed solver tests.

## V1: LBL learning and solving

### Teaching route

Start with notation and how to hold the cube, followed by seven stages:

1. Build the white cross.
2. Solve the first-layer corners.
3. Solve the second-layer edges.
4. Build the top cross.
5. Match the top-cross side colors.
6. Position the last-layer corners.
7. Orient the last-layer corners to finish the cube.

Use the low-algorithm route described in [J Perm's beginner tutorial](https://www.jperm.net/3x3) as a reference. Create original English explanations and examples. Credit the reference rather than copying its text, images, or videos into the project.

Cross construction includes observation, piece selection, alignment, and preparation. Explain those decisions even when they are not a named memorized algorithm.

The final stage can temporarily disturb previously completed pieces. Explain this behavior and check restoration at the appropriate checkpoint. Do not present an intermediate state as a solver failure merely because another layer is temporarily disturbed.

### Input and generated solutions

V1 accepts a generated random scramble or a pasted sequence of standard six-face moves (`U`, `D`, `L`, `R`, `F`, `B`, with prime or double-turn modifiers). Apply the sequence to a solved cube to obtain the starting state.

Generate a complete LBL solution using the fixed teaching rules. Preserve algorithm boundaries and repetition counts so a learner can recognize the same patterns taught in the lessons. Keep setup moves distinct from the algorithm they prepare.

Recognize already-completed stages and explain skips. Handle a solved starting state without inventing unnecessary moves.

For invalid input, identify the unsupported or malformed notation and explain how to correct it. For an internal rule failure, stop and report that no verified solution was produced. Guard against loops and unbounded execution. Do not substitute a generic short solution and label it as the selected teaching method.

### Learning experience

The site has a course entry point and a separate free-solve entry point. Both lead to a shared player and explanation layout.

For each stage, present its goal, what to inspect, setup moves, the selected algorithm, and a result check. Show the full algorithm, its name, and the current animated move together. Emphasize relevant pieces with supporting text so the lesson does not depend on color alone.

The player supports orbiting the view, play/pause, forward and backward single steps, speed control, replaying an algorithm, and jumping between stages. Camera movement must not change the logical cube state or the meaning of notation. When a lesson requires physically reorienting the cube, show that action explicitly.

Members primarily follow along with a physical cube. V1 does not assess user turns or provide scores, unlockable levels, or a full practice platform.

### Interface and access

Use English throughout the interface and project documentation. Keep the visual design light, spacious, and readable, using cube colors and restrained accents to guide attention.

On desktop, arrange stage navigation, the 3D cube, and the explanation in three coordinated areas. On mobile, stack them vertically while keeping playback controls easy to reach. Provide keyboard-accessible controls and visible focus states.

The app requires no account. V1 will be available as an online website with downloadable source code. An installable offline app and desktop packages are outside V1.

## Planned architecture

Use React, TypeScript, and Vite for the interface and build. Use [cubing.js](https://github.com/cubing/cubing.js) for puzzle representation, notation, and animation. Implement LBL teaching rules independently from the presentation layer.

All solving runs in the browser. GitHub Pages is the planned hosting target. Configure the repository base path and refresh-safe navigation when the application is implemented; follow the [Vite deployment guide](https://vite.dev/guide/static-deploy.html#github-pages).

Keep these responsibilities separate:

| Module | Responsibility |
| --- | --- |
| Cube state | Represent the puzzle, apply moves, and expose observations and checkpoint checks. |
| Teaching algorithms | Define the shared algorithms, names, recognition rules, and teaching metadata. |
| Method solver | Apply the selected method and produce a trace explaining its actual decisions. |
| Course content | Organize original explanations and examples around the shared rules. |
| Player | Render and navigate a trace while keeping animation and explanations synchronized. |

### Method interface

A method solver accepts a cube state and returns a structured `SolveTrace`. The trace includes stages, recognized cases, setup moves, algorithm references, explanations, move sequences, and checkpoints. A failure must be distinguishable from a successful trace.

The interface is an internal module contract, not a network API. Later method solvers will use the same contract. V1 exposes only the implemented LBL method to users.

Course examples and free solves share algorithm definitions and playback. Explanations must describe the rule that actually generated the moves; they must not be generic captions added to an unrelated solution.

## Acceptance criteria for application development

These are future release requirements, not checks completed during repository initialization.

- Test basic turns, inverse operations, algorithm recognition, and stage completion checks.
- Replay at least 1,000 reproducible, seeded random scrambles through the solver. Verify the final solved state and a complete teaching trace for each.
- Cover solved states, partially completed stages, trapped or misplaced pieces, repeated algorithm applications, and skipped stages.
- Verify algorithm preconditions and expected effects at their defined boundaries. Account for intentional temporary disruption in the last stage.
- Verify that manual stepping, reverse stepping, replay, and stage jumps keep the displayed state, current move, and explanation aligned.
- Test invalid notation, solver failure handling, desktop and mobile layouts, and keyboard operation.
- Run type checking, relevant tests, and a production build. Inspect browser errors and manually follow representative lessons with a physical cube before release.

Passing random tests is evidence of coverage, not a mathematical proof that every cube state is handled. Document tested cases and any known limitations honestly.

## Version roadmap

| Track | Order |
| --- | --- |
| First release | Complete LBL courses, fixed-algorithm solving, and random/text scramble input. |
| Additional methods | CFOP, then Roux, then ZZ; each includes teaching and generated solutions. |
| Additional inputs | Manual six-face color entry with legality checks, then camera scanning with manual correction. |

Later methods initially use beginner-friendly variants, such as two-look OLL/PLL for CFOP. Their detailed designs belong to their own development stages. This roadmap does not set release dates or fix the interleaving of method and input releases.

Publish each version only after its correctness and teaching criteria pass. Label planned work clearly; do not imply that unavailable methods or inputs can already be used.

## Licensing and attribution

Release original project code and documentation under MIT. Retain all third-party licenses and attribution notices. Treat dependencies and referenced teaching materials according to their own terms.

Keep the README concise and distinguish the current repository state from future capabilities. Add setup commands, downloads, and a live demo only when those deliverables exist and have been verified.
