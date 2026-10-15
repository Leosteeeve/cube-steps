# CFOP Lab physical comparison worksheet

**Status: automated replay passed; physical acceptance and fingertrick calibration are pending.** These are practice fixtures, with no recorded human times or endorsements. The model assumes common right-hand-led two-handed handling. A lower estimated cost is a reason to try a route, not a prediction in seconds.

## Load the exact routes

Download [physical-fixtures.json](physical-fixtures.json) as a JSON file. Open the club entrance, choose **CFOP Lab**, select the file under **Import experiment JSON**, review the seven experiments, then **Commit validated import**. The file contains routes only, no tester labels or attempts. Existing conflicting experiments can be skipped or imported as copies.

Use **Saved experiments** to study a route. **Trials & notes** provides its original setup, six-face diagram, actual starting bottom/front, positioning moves and estimated hand instructions. Follow physical x/y/z turns on the cube; camera dragging only changes the view. Initial positioning happens before timing. Start from neutral wrists with both hands supporting the cube; then follow the displayed hand notes and report where they do not match comfortable human handling.

All fixtures use `lab-search-v1`, `lab-execution-v1` and `cubesteps-cfop-2026-10-14`. Their full formula definitions, holds, states and checkpoints are in the JSON. Route IDs below are exact content identities. Recorded coverage is a synthetic fixture receipt, not a timed production-search benchmark. No default scoring weights have been calibrated from these fixtures.

| Experiment | Route ID(s) | Starting bottom / front | Question to test |
| --- | --- | --- | --- |
| 01 · Physical rotation | `lab-83fd838245d9a57ffd55cfaff2b71265` | White / green | Does the declared rotation make the next pair easier to see and execute? Mark any unnecessary turn or hand reset. |
| 02 · Cross tradeoff | A: `lab-11c1fcc467543d5aa5cab01d590ace6c`; B: `lab-b1b5fefb11212bd5375d2661b533ec89` | White / green | A uses the exact six-turn cross; B uses seven. Their model subtotals are 35 versus 32 turn equivalents and costs 58 versus 52. Does the whole practiced segment actually feel better? These estimates are not human times. |
| 03 · Hand continuity | `lab-692147ac848b9e653385189b47c11f7c` | White / green | After the last cross turn, can the first F2L action begin comfortably from the actual resulting grip? Identify the move boundary of a regrip or hesitation. |
| 04 · Rear slot | `lab-11c1fcc467543d5aa5cab01d590ace6c` | White / green | Study rear-slot target actions. Can you recognize and follow them without guessing hidden stickers? Would a rotation improve observation? |
| 05 · Wrong-slot extraction | `lab-c365d4ad11b3ca99f2ebe4890940e095` | White / green | Check the extraction explanation, protected solved pairs and subsequent insertion. Report the exact action where the physical state or explanation becomes unclear. |
| 06 · Non-white bottom | `lab-ea4c2b1bc33cf366a20af82e28ec7c38` | Red / green | Check physical piece colors and every hold after rotation. Record color-neutral recognition difficulty separately from hand comfort. |
| 07 · Six-face input | `lab-5ec5a1636a21512b1d6397d299f22980` | Yellow / green | Reconstruct the setup and compare all faces with the saved diagram before positioning. Confirm that the replay matches the actual cube, without substituting white-bottom instructions. |

## Reproducible physical inputs

Apply each sequence from a solved cube held **white up, green front**. The JSON's setup and diagram are the authority if a separately copied sequence disagrees.

- Rotation: `F2 B2 U2 D B' U2 L2 D' L2 U2 D B R B2 R U D R' L' B' R' F' D L' F'`
- Cross tradeoff and rear slot: `D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'`
- Hand continuity, non-white bottom and six-face input: `U F' L' R' F L2 B F' B' D U F' R L2 R' B2 L2 D' B2 D' F' B2 U2 B' L2`
- Wrong-slot extraction: `D2 R' U' B F' B U R B2 R2 D' R2 F R L2 B D F' B U2 F' R' D2 L' F'`

For the color-input check, also enter those physical colors through **Analyze → Face colors** and verify the original diagram before generating a fresh result. A fresh search is a different experiment; it must not replace the saved routes used for an existing comparison.

## Run a comparison

1. Familiarize yourself with both routes without a time limit. Keep warmups separate. Add a separate anonymous tester or optional label for each person and choose one timing method for the whole comparison.
2. In experiment 02, assign the six-turn-cross route to A and seven-turn-cross route to B. Create the five fixed AB/BA blocks. For other questions, first save a deliberate pair of alternatives from the same input; exploratory trials alone do not form a comparison.
3. Reset the original cube before every attempt. Perform initial positioning, then check setup and starting hold. Use the 300 ms hold-and-release keyboard/touch timer or enter an external time. **Stop immediately when the cross and all four F2L pairs are complete, before OLL.**
4. Explicitly classify the attempt as followed, deviated or incomplete. Interruptions remain interrupted. Record optional flow and recognition ratings from 1 to 5; leave unknown ratings blank. Note the action, physical rotation, finger transition or hidden piece that caused difficulty.
5. Keep invalid originals. Use the linked retry for their planned slot. After five complete matched blocks, inspect route medians and paired B − A. Positive B − A means B took longer. Do not combine testers, timing methods, route versions or different inputs into a supposed winner.
6. Export selected JSON with trial history when you want someone else to reproduce the comparison. Include tester labels only deliberately. CSV is for analysis; it includes prior revisions and exclusions, so filter current eligible heads before computing summaries. Nothing is automatically uploaded or sent.

## Feedback fields

| Field | Your observation |
| --- | --- |
| Tester alias, date, cube and device/browser | |
| Experiment and route IDs; model/catalog versions | |
| Timing method and completed blocks | |
| Actual starting hold and initial positioning | |
| Difficult move boundary / formula / pair | |
| Needed physical rotation or hand regrip | |
| Visibility or color-recognition issue | |
| Formula comfort; suggested finger transition | |
| Deviations, interruptions and retry reasons | |
| Flow and recognition ratings (optional) | |
| Physical result, remaining concern or proposed change | |

Do not mark this worksheet accepted until a real tester has completed it. No acceptance has been prefilled for the club or its members.

## Regenerate the automated fixtures

Run `WRITE_LAB_PHYSICAL_FIXTURES=1 npx vitest run tests/lab-physical-fixtures.test.ts` in a shell with that environment variable (PowerShell: set `$env:WRITE_LAB_PHYSICAL_FIXTURES='1'` first). Without the variable, the test only replays the saved fixtures. Recheck the IDs in this worksheet if the route model or catalog changes.
