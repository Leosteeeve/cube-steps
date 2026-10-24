# Advanced Roux and Roux Test Lab: physical review

Status: pending owner/Josh acceptance. Automated replay verifies states and teaching checkpoints; it does not establish human comfort or physical-phone responsiveness.

Use the published club entry. Record the `commit` from `/cube-steps/build-info.json`, device/browser, tester, chosen frames and exported experiment file before comparing results. Do not treat sample screenshots as recorded physical trials.

## Set up consistently

Start with a solved standard-color cube, white up and green front. Apply the outer-face scramble exactly. In Lab choose the listed frames and Analyze cube. Stop after verified choices appear, fix A/B, then Save Roux experiment. Every saved route has its own initial positioning; perform that positioning before timing. Follow later x/y/z as real cube rotations. Camera dragging changes only the screen view.

| Case                 | Input / entry                                              | What to inspect                                                                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Already solved       | Empty scramble; white/blue only                            | Completed stages skip without extra work. Both-block timing is disabled when there is no block work.                                                                                                                                         |
| Simple connection    | `R F U`; white/blue and yellow/red                         | Same input in different allowed frames. Full replay ends solved with matching centers. Changing a frame never changes a previously saved route.                                                                                              |
| First-block tradeoff | `D2 F' R' D`; all eight                                    | Compare shortest-first-block evidence against combined block turns and visibility. A shorter first block need not give the shortest two-block route. Record the actual search coverage; unexplored frames are not failures of cube legality. |
| Mixed sequence       | `R U F2 L D2 B R2 U' F D L2`; all eight                    | Can you locate the next target, preserve the completed left block, and follow every handling instruction? Note avoidable undo/redo, awkward back-face moves, hidden targets and useful rotations.                                            |
| Real entered cube    | Copy the previous scrambled cube into six-face input       | Use the editor's fixed centers and outside views. Compare the solution's initial state with the physical cube before following it.                                                                                                           |
| Block techniques     | Advanced Roux → Block strategies, each worked example      | Squares, paired pieces and a late base edge all have visible recognition, setup and result checks. Apply the example's own setup from solved; it is not the general scramble-input syntax.                                                   |
| CMLL                 | Practice one case from each of O, H, Pi, U, T, S, AS and L | Match the printed hold, recognize corners only, and preserve both blocks after the complete formula. Compare primary/alternate variants where offered. Edge disorder after CMLL is allowed.                                                  |
| LSE connection       | Advanced Roux EOLR examples; Lab basic-LSE switch          | Follow M/M′ without rotating the side-block hold. Centers now must match the actual middle centers. Compare combined versus basic explanations from the same setup; the separate route must end fully solved.                                |

## Run a small paired comparison

1. Rehearse both exact saved routes freely. Do not combine unfamiliar recognition learning with a claim about fingertrick speed.
2. In Trials & notes select one tester and one timing method. Create or choose a fixed comparison, then plan five alternating AB/BA blocks. Preserve actual attempt order.
3. Before each attempt reconstruct the original cube, match the six-face diagram, do initial positioning and check both confirmations. Start from neutral wrists and both hands supporting the cube.
4. Hold Space or the touch pad for 300 ms, release, and stop when **both 1×2×3 blocks are complete**, before CMLL. For an external timer enter its duration separately. The page does not sense cube turns.
5. Record whether the exact route was followed. Keep deviations, incomplete attempts and interruptions; retry explicitly rather than replacing an inconvenient result. Optional flow/recognition ratings stay separate from durations.
6. After five complete pairs inspect paired B−A differences and the rating distributions. A positive difference means B took longer in these trials. This is descriptive feedback, not a universal winner.
7. Export the selected experiment with trial records if sharing it. Tester labels remain optional. Keep the original export before making corrections.

## Observe on a real phone

Try the 320–430 px layouts in portrait and landscape, normal/reduced motion, and 200% zoom. Check readable bright stickers, unobscured controls, matching forward/backward moves and stable selected playback while search updates. Time one cold analysis and one warm analysis; report the actual wait and any input freeze. Try Stop search, leaving a running trial, returning to its interrupted review, export, refresh and explicit import. Browser viewport tests alone do not certify a physical phone.

## Feedback to record

Include the exact exported route IDs and versions, original scramble or face colors, allowed frames, stage and displayed move index. For an unnecessary sequence, copy the moves that undo or repeat work and describe which checkpoint you had already reached. For handling feedback say which piece was hard to see, how you held the cube, and the rotation or finger action you preferred. Do not infer a global optimum from one short route.

Acceptance is separate for teaching correctness, hand comfort, interface clarity and actual device performance. Keep Advanced Roux labeled Preview and Roux Test Lab Experimental until the owner confirms the relevant checks.
