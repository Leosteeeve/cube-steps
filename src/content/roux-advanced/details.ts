export const ADVANCED_ROUX_TEXT = {
  intro: {
    title: 'Think in blocks, then connect the steps.',
    shortTitle: 'Your Roux foundation',
    overview:
      'Advanced Roux keeps the same four jobs: first block, second block, corners, and last six edges. What changes is the choice inside each job. Keep a reliable basic solve while you learn one new connection at a time. You do not need 42 CMLL formulas before starting this course.',
    observe:
      'Check your foundation first: identify both five-piece side blocks, explain what M and M′ move, and complete basic LSE without changing your physical side frame.',
    prepare:
      'Begin with white bottom and blue left. Learn another hold only when you can identify the two side centers and the block pieces without guessing. Camera movement helps inspection; printed x/y/z moves are actions to perform.',
    check:
      'After each example, inspect the actual side colors, not just the white stickers. The block-bottom color refers to the corner and edge pieces; an M turn can move the white center away temporarily.',
    tip: 'If block recognition or basic LSE is still uncertain, use Beginner Roux first. Slower, correctly recognized moves are more useful here than memorizing a longer sequence.',
    mistake: [
      'I treat every M setup as a mistake.',
      'M deliberately moves the middle edges and centers without moving the two side blocks.',
      'Keep the side centers fixed, read the displayed middle-center phase, and follow the endpoint check.',
    ],
    checks: [
      'Demonstrate M and M′ and name their destinations.',
      'Complete a Beginner Roux solve before trying unfamiliar frames.',
    ],
  },
  'ar-first-block': {
    title: 'Choose useful pieces before choosing moves.',
    shortTitle: 'Choose the first block',
    overview:
      'A first block contains two corners and three edges around a side center. Instead of always inserting the bottom edge first, look for work already done: a corner-edge pair, a three-piece square, or a connected line. Select a construction that preserves useful connections and leaves visible pieces for the second block.',
    observe:
      'Locate all five target pieces by their colors. A square has the base edge plus one correctly joined corner-edge pair. An off-slot pair can still be valuable if its relative orientation matches the solved block.',
    prepare:
      'Trace where a joined group will go before moving it. Open a useful working area, bring the missing group toward the square, and close the block. An actual rotation is allowed when it makes the target easier to see.',
    check:
      'At the endpoint, verify the left side color on all five pieces, the bottom stickers, and the front/back side colors. A group of white stickers alone is not a solved block.',
    tip: 'The one-turn square example is deliberately small: notice the connection before learning complicated insertions. Shortest-left-block evidence is a reference; second-block consequences still matter.',
    mistake: [
      'I break a ready pair to follow my usual base-first recipe.',
      'The first block does not require a fixed insertion order.',
      'Pause, identify the pair as a group, and test whether inserting the missing piece later preserves more work.',
    ],
    checks: [
      'Point to the five pieces in the target block.',
      'Identify the ready square and off-slot pair before pressing Next.',
    ],
  },
  'block-strategies': {
    title: 'Squares, lines, pairs—and a later base edge.',
    shortTitle: 'Four construction ideas',
    overview:
      'Use a square plus a pair when those groups already exist. Two pairs plus a base edge can be better when the pairs are easy and the base is trapped. A line can carry useful relative positions even before it looks like a finished square. These are ways to see the cube, not four formulas that apply to every scramble.',
    observe:
      'Compare the four examples below. Read both shared colors on each pair. In the late-base example, both pairs are connected while the base edge is displaced; the absence of a square is intentional.',
    prepare:
      'Choose the smallest missing job. Preserve a square while bringing its partner toward it; keep two pairs together while opening a path for the base; or turn a rigid line into the correct pose before adding pieces.',
    check:
      'Follow the whole maneuver before judging the result. Some openings temporarily disturb a group and restore it at the endpoint. Check which pieces were preserved throughout and which were restored afterward.',
    tip: 'The late-base maneuver is a recognition exercise, not a shortest-solution claim. In the Lab, compare it with alternatives on the same input and count the entire two-block continuation.',
    mistake: [
      'I call two touching pieces a pair.',
      'Adjacency does not guarantee the correct relative orientation or shared colors.',
      'Read the complete corner and edge colors, then compare the solved relative arrangement in the diagram.',
    ],
    checks: [
      'Explain the difference between a pair, square and line.',
      'Try the late-base example and identify the base edge before and after the maneuver.',
    ],
  },
  'block-lookahead': {
    title: 'Finish one block with the next one in view.',
    shortTitle: 'Connect the two blocks',
    overview:
      'A shorter first block can leave a poor second block. The worked input below has a two-turn first block followed by a one-turn right-block finish. A one-turn first-block reference exists too, but its continuation costs more. The lesson is to compare both blocks together, not to add setup turns without a reason.',
    observe:
      'Start from the exact displayed practice setup. Before U′ F, notice the right-side pieces that will become useful after the left block is complete. Pause after the second move and identify the ready right-block continuation.',
    prepare:
      'Plan the first block and one plausible second-block entry. Keep your physical hold while inspecting the rear with the camera. If you choose a real rotation, include it in the route rather than silently changing the meaning of R.',
    check:
      'After U′ F the left block must be complete; after Rw both blocks must be complete. Count three slice turns for this specific example and record any regrip separately.',
    tip: 'A search score estimates execution characteristics; it does not know your hands. Compare stable A/B routes in physical trials before deciding which feels better for you.',
    mistake: [
      'I optimize the left-block number and ignore the next pause.',
      'The chosen endpoint can make the next pair harder to see or insert.',
      'Compare first, second and combined counts, then rehearse the transition without a timer.',
    ],
    checks: [
      'Pause at the real first-block endpoint, not one move later.',
      'Describe the right-side continuation before executing it.',
    ],
  },
  'ar-second-block': {
    title: 'Keep an anchor. Use the middle freely.',
    shortTitle: 'Build the second block',
    overview:
      'The first block becomes your anchor. R, U and M provide a useful working area on the other side. Wide R turns combine outer and middle movement and can make a transition concise. Choose a front or rear pair by its actual position and visibility; do not automatically rebuild the front first.',
    observe:
      'Identify the right base and both matching pairs. Check whether a target needs extraction, orientation, pairing or insertion. Look at the middle slice as a route for an edge rather than treating it as forbidden space.',
    prepare:
      'For an ordinary R/U/M sequence, keep the completed left block intact at every turn. Before M or M′, name the target edge and its destination. The two one-turn slice examples below make the directional difference explicit.',
    check:
      'At the end, inspect both blocks and all front/back side stickers. Keep the side frame even if a middle center has moved. More general routes may restore protected pieces only at a named maneuver endpoint; read that checkpoint.',
    tip: 'Do not replace M′ with three M turns by habit. The displayed inverse is a useful action in its own right. Practice the movement slowly without forcing an uncomfortable finger trick.',
    mistake: [
      'I turn L instead of M and lose my anchor.',
      'The middle slice and the left face are different layers, even when their notation directions are related.',
      'Return to the last matching state and use Moves to compare M/M′ before replaying the maneuver.',
    ],
    checks: [
      'Watch the left block through the R U′ R′ example.',
      'Demonstrate both slice directions without moving the two side blocks.',
    ],
  },
  'ar-cmll': {
    title: 'Read the corners. Let the edges wait.',
    shortTitle: 'Learn full CMLL gradually',
    overview:
      'CMLL solves the four top corners while restoring the two completed side blocks. Recognition combines the top-sticker pattern with the colors on the sides. There are 42 classes in eight families; the remaining six edges are irrelevant to identifying the corner case. Keep your two-look corner method as a fallback while learning small groups.',
    observe:
      'First identify O, H, Pi, U, T, Sune, Anti-Sune or L from the top-color corner stickers. Then compare bars, headlights and opposite side colors. Two cases in the same family can require different formulas.',
    prepare:
      'Use a U setup to match the selected execution hold. Keep the printed side frame; if a formula includes a wide turn or actual rotation, follow it exactly. The library offers verified primary and selected alternate formulas with original-source links.',
    check:
      'After the complete formula, both blocks must be restored and the upper corners must be in cyclic order. A remaining U offset is allowed until LSE restores the reference. Do not demand a yellow cross before or after CMLL.',
    tip: 'Begin with cases you already recognize, then practice a small selection without a timer. Recognition comes before recall, and recall before fast execution. No formula is guaranteed to suit every hand.',
    mistake: [
      'The yellow pattern matches but the corners end up swapped.',
      'The side-color arrangement was not included in recognition.',
      'Rewind, inspect the four side pairs, and select the complete CMLL case rather than only its orientation family.',
    ],
    checks: [
      'Identify a family and the distinguishing side colors.',
      'Inspect both blocks only at the complete formula endpoint.',
    ],
  },
  'ar-eolr': {
    title: 'Orient, place, and leave a useful finish.',
    shortTitle: 'Connect EOLR and last four',
    overview:
      'Basic LSE separates edge orientation, lateral-edge placement and the last four edges. Combined EOLR considers orientation and lateral placement together, then chooses a useful continuation. A slightly longer EOLR segment can leave a shorter final-four finish. This course uses ordinary EOLR, not EOLRb or other advanced subsets.',
    observe:
      'Both blocks and the corner ring are complete. Read edge orientation in the fixed side frame and account for the current middle-center phase. Locate the two lateral edges relative to the corner ring, including its U offset.',
    prepare:
      'Compare the combined and basic examples from the identical six-edge setup. Use the displayed M/U turns without changing the physical hold. In basic mode, pause at the real EO checkpoint; in combined mode, follow the chosen joint path.',
    check:
      'At the EOLR boundary, orientation and lateral-edge placement both hold. Jump to Last four to inspect the continuation. At the final endpoint, all stickers, centers and the corner U offset must agree with the chosen solved hold.',
    tip: 'Compare the entire remaining sequence, not just the first EO-looking state. The basic explanation remains useful when you need a clear checkpoint to diagnose an error.',
    mistake: [
      'I stop when the edges look oriented but centers are shifted.',
      'Orientation is not a complete solved-state check.',
      'Continue through lateral placement, the final four edges and the recorded center/U-offset restoration.',
    ],
    checks: [
      'Compare the same starting state in basic and combined mode.',
      'At the final endpoint, check every face including the bottom.',
    ],
  },
  'starting-block': {
    title: 'Add a new frame when you can read it.',
    shortTitle: 'Eight optional starting holds',
    overview:
      'Dual-bottom selection allows white or yellow as the bottom color, with blue, green, red or orange on the left: eight holds. The system maps complete physical states, not just color names. It only searches holds you allow; an unsearched hold is not evidence of a worse solution.',
    observe:
      'Pick one hold below and identify its bottom, left, right and front colors. A familiar formula uses the same spatial letters, but the target pieces and top color change with the hold.',
    prepare:
      'Start from the normal white-up, green-front cube before executing the printed practice setup. Follow the initial whole-cube positioning. A camera orbit alone never changes the physical meaning of U, R or M.',
    check:
      'Keep the two side centers as anchors. Distinguish the bottom color of the block pieces from the moving middle center. Check that the example returns to the selected hold, not automatically to white-bottom/blue-left.',
    tip: 'Leave normal solving on white/blue until it feels reliable. Add one new comfortable hold at a time; eight-way analysis is optional and does not make color recognition instantaneous.',
    mistake: [
      'I change colors in my head but keep the old front.',
      'The frame includes a real handed orientation, not an arbitrary color swap.',
      'Use the displayed bottom/left/front description and repeat the actual positioning moves from solved.',
    ],
    checks: [
      'Name the front color for each selected hold.',
      'Confirm an M′ return without silently rotating the cube.',
    ],
  },
  'practice-compare': {
    title: 'Compare two routes, then trust the evidence.',
    shortTitle: 'Practice and compare',
    overview:
      'Use a fixed input to compare routes fairly. Inspect and rehearse freely, then time execution of both complete blocks before CMLL. The Lab keeps A and B pinned while background ranking changes. Its model is a starting hypothesis about handling, not a measurement of your solve time.',
    observe:
      'Check that both routes share the same input and that you know each starting hold. Compare first-block, second-block and combined turns; keep later CMLL/LSE outside this two-block subtotal.',
    prepare:
      'Rehearse A and B before measured attempts. Alternate A–B then B–A, use the same timer method and mark deviations or interruptions honestly. The app cannot detect your physical turns.',
    check:
      'Stop the trial only when both blocks are complete, immediately before CMLL. Keep incomplete or interrupted records out of matched summaries without deleting their history. Five complete matched blocks are required before a descriptive paired median.',
    tip: 'Write one specific observation, such as a hidden rear pair or a difficult M′ transition. A smaller move count does not prove a faster or more comfortable route for everyone.',
    mistake: [
      'I compare a familiar route with a first-ever attempt at another.',
      'Familiarity and recognition can dominate the timing difference.',
      'Add familiarization attempts, then compare matched measured trials on the same state and endpoint.',
    ],
    checks: [
      'State the two-block stopping point before starting.',
      'Describe one physical transition rather than giving an unsupported fastest-route claim.',
    ],
  },
} as const;
