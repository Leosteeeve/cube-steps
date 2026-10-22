import type { Lesson } from './course-types';
import type { RouxStageId } from '../core/types';
import { ROUX_INFO } from '../methods/info';
import { ROUX_WORKED_EXAMPLES, type RouxWorkedExample } from './roux/examples';
import { ROUX_REFERENCE } from './roux/reference';
export interface RouxLessonDetail {
  lessonId: string;
  overview: string;
  workedExamples: readonly RouxWorkedExample[];
  mistakes: { symptom: string; explanation: string; recovery: string }[];
  physicalChecks: string[];
  referenceIds: string[];
}
type Text = {
  title: string;
  goal: string;
  overview: string;
  look: string;
  prepare: string;
  do: string;
  check: string;
  tip: string;
  mistakes: RouxLessonDetail['mistakes'];
  checks: string[];
};
export const ROUX_LESSON_TEXT: Record<string, Text> = {
  intro: {
    title: 'Two blocks. Four corners. Six edges.',
    goal: 'Learn the fixed Roux hold and the slice that joins the two sides.',
    overview:
      'A block is a small solved group of pieces. A pair is one corner joined to its matching edge. Roux builds a white-blue block on the left and a white-green block on the right, solves the four top corners, then finishes the last six edges (LSE). We solve the corner task, often called CMLL, in two looks: turn the yellow stickers up, then arrange the corners. You do not need the full CMLL formula set.',
    look: 'Begin with white up and green front for every scramble or color input. Centers name the colors; read the colors on a piece to find its home. Watch the initial x2 y action in the solution.',
    prepare:
      'Turn the whole cube x2, then y, exactly as shown. You should now have yellow up, white down, blue left, green right and red front. These are physical regrips. Dragging the camera only changes what you see.',
    do: 'Try the M, M′ and M2 demonstrations below. The middle slice moves four edges and four centers while leaving the side blocks and corners in place. During solving, keep the blue-left and green-right frame. White bottom describes the block pieces, not a promise that the white center never moves.',
    check:
      'Point to both side centers and the middle slice. After M then M′, every sticker should return. After M2 twice, it should return again. Say the current up and front center colors before continuing.',
    tip: 'Learn one small group at a time. Orientation means which way a sticker faces; permutation means which piece occupies a position. A piece can be oriented correctly and still be in the wrong place.',
    mistakes: [
      {
        symptom: 'The screen turns but my cube does not match.',
        explanation: 'A camera orbit is not an instruction to rotate the cube.',
        recovery:
          'Return to Holding view. Follow only the printed physical moves, including the initial x2 y.',
      },
      {
        symptom: 'The white center has left the bottom.',
        explanation: 'M moves centers through the middle slice. This is expected.',
        recovery:
          'Keep blue left and green right. Follow the current-center label instead of undoing the slice.',
      },
    ],
    checks: [
      'Hold blue left and green right without looking at the screen.',
      'Show which layer M turns; demonstrate its inverse.',
      'Explain the difference between turning the cube and moving the camera.',
    ],
  },
  'roux-first-block': {
    title: 'Build the white-blue block.',
    goal: 'Place one base edge and two matching pairs around the blue center.',
    overview:
      'The left block is a 1 × 2 × 3 piece of the solved cube: the white-blue base edge, two white-blue corners and the blue-red and blue-orange side edges. We build it from small recognizable jobs. A joined pair must agree on both shared colors; two pieces touching is not enough.',
    look: 'Find the white-blue edge. Read both stickers: a white sticker pointing down is insufficient if blue does not face left. Next locate the white-blue-red corner and blue-red edge for the front pair, or the white-blue-orange corner and blue-orange edge for the rear pair.',
    prepare:
      'Use the displayed setup to bring the chosen target into a useful working position. A trapped or flipped piece may need to leave its slot first. Inspect behind with the camera for a rear pair; keep the same physical hold. The solver compares both pair orders, so it may build the easier rear pair first.',
    do: 'Move the base into its correct pose. For a pair, open the working area, use the upper layer to connect matching stickers, then close or insert it. M and M′ can carry a real target through the middle slice without moving an already completed side pair. Read the highlighted target and reason for that direction before each move.',
    check:
      'At each full maneuver endpoint, verify the base and every piece marked protected. At the stage end, blue faces left on all five block pieces and both white corner stickers plus the base white sticker face down. Check red at the front and orange at the back.',
    tip: 'Keep a correct pair together where possible. If a target is already right, leave it alone. A temporary opening during a three-move insertion is checked when the maneuver ends.',
    mistakes: [
      {
        symptom: 'The white-blue edge is in the right slot but looks wrong.',
        explanation: 'Its orientation may be flipped.',
        recovery:
          'Compare both sticker faces with the goal, then follow the extraction and placement; do not count the slot alone.',
      },
      {
        symptom: 'My pair has two different side colors beside each other.',
        explanation: 'The corner and edge are adjacent but not correctly joined.',
        recovery:
          'Identify all three corner colors and the two edge colors again. Replay the separation and pairing maneuver slowly.',
      },
    ],
    checks: [
      'Identify the base, front pair and rear pair by color.',
      'Try the displaced, flipped, front, rear and trapped examples.',
      'Explain one useful M and one useful M′ setup without losing completed work.',
    ],
  },
  'roux-second-block': {
    title: 'Build the right side. Keep the left.',
    goal: 'Complete the white-green block with the left block protected.',
    overview:
      'The second block mirrors the first: white-green base, white-green-red and white-green-orange corners, with green-red and green-orange edges. The complete left block limits what you may freely turn. R, U and M provide a useful working area without breaking it.',
    look: 'Find the white-green base and both green pairs. Check whether a front or rear pair is already joined, available above, or trapped. A ready rear pair can be easier than rebuilding the front first.',
    prepare:
      'Keep blue left. Use U to bring a target toward the right working area, R to open it, and M or M′ when the middle slice offers a clearer route. The displayed protected pieces include the entire left block.',
    do: 'Follow the short base placement, extraction, pairing and insertion maneuvers. Before a slice turn, say where the highlighted target is going. Both directions are useful; choose by the actual target position, not by always repeating M. After each right-side maneuver, restore the completed right pieces too.',
    check:
      'The left block remains intact at every physical turn in this course’s normal R/U/M work. At completion, both five-piece side blocks match. The middle centers may be displaced; leave them for the later reference setup.',
    tip: 'The left block is your anchor. Keep your thumbs and the side centers in the same frame while inspecting the rear pair with the camera.',
    mistakes: [
      {
        symptom: 'My left block broke during second-block work.',
        explanation:
          'You may have turned L instead of the middle slice or changed the physical hold.',
        recovery:
          'Pause and step backward to the last matched position. Restore blue left, then replay the exact displayed turn.',
      },
      {
        symptom: 'I am fixing the middle centers after every move.',
        explanation:
          'Centers in the M slice are allowed to move and may be useful in the next setup.',
        recovery:
          'Check the two side blocks instead. Wait for the explicit reference correction in LSE.',
      },
    ],
    checks: [
      'Try both front and rear pair examples.',
      'Track the left block through the M and M′ examples.',
      'Identify all five pieces in the completed right block.',
    ],
  },
  'roux-corner-orientation': {
    title: 'Turn the yellow corners upward.',
    goal: 'Recognize seven corner-only cases and restore both blocks after each formula.',
    overview:
      'The first corner look changes orientation: which way the yellow corner stickers face. It does not need a yellow cross. There are seven unsolved OCLL patterns, plus the already-oriented skip. Gray edges in the diagrams are irrelevant to this choice.',
    look: 'Look at the four top corners and their side stickers. Count the yellow stickers already on top, then compare the remaining side stickers with the execution-hold diagram. Ignore all four top edges.',
    prepare:
      'Use only the displayed U setup to bring the pattern into the formula’s hold. Keep blue left and green right. Preparation is a separate action; it is not part of the formula you memorize.',
    do: 'Execute the selected OCLL formula in full. The player keeps its boundary visible even if neighboring moves could cancel. The two blocks can look disturbed halfway through; the formula restores them at its endpoint.',
    check:
      'All four yellow corner stickers face up, and both side blocks are restored. Yellow edge stickers do not all have to face up. If the four corners were already oriented, the stage explains the skip.',
    tip: 'Learn recognition before speed. Try all seven diagrams with deliberately unoriented top edges so a missing yellow cross does not distract you.',
    mistakes: [
      {
        symptom: 'I cannot find a yellow cross like the picture I remember.',
        explanation: 'That CFOP prerequisite is absent here; these are corner-only patterns.',
        recovery: 'Cover the four top edges mentally and compare only the corners.',
      },
      {
        symptom: 'The blocks look scrambled halfway through.',
        explanation: 'The full formula temporarily moves block pieces.',
        recovery:
          'Finish the formula from the correct starting hold before checking restoration. Use replay if you lost your place.',
      },
    ],
    checks: [
      'Try all seven OCLL cases and the solved skip.',
      'Separate U preparation from the formula.',
      'Check yellow corners and restored blocks, without imposing an edge condition.',
    ],
  },
  'roux-corner-permutation': {
    title: 'Put the corners in order.',
    goal: 'Use corner headlights to choose T, Y or a simple alignment.',
    overview:
      'The second corner look changes permutation: where the oriented corners belong. Headlights are the two matching side stickers of adjacent top corners. The edge between them does not matter. This completes our two-look alternative to full CMLL.',
    look: 'Inspect the corner stickers on all four sides. If the corners are already in the correct cyclic order, only a U alignment may remain. One matching pair of headlights indicates the adjacent-exchange case; no headlights indicates the diagonal case.',
    prepare:
      'For T-perm, use the shown U setup to put the matching headlights on the left. For Y-perm, follow its verified execution hold. Do not twist the whole cube to make the picture match.',
    do: 'Apply T-perm or Y-perm once in full, then follow any separate U alignment. Both blocks may move temporarily inside the formula. You are solving the corners, not trying to permute the remaining edges yet.',
    check:
      'Every top corner matches its neighboring side colors in the blue-left and green-right block frame. Both blocks are restored. The remaining six edges may still be flipped or misplaced.',
    tip: 'Matching headlights are a pair of corners, not a solid side face. A correctly colored edge between the corners is unnecessary.',
    mistakes: [
      {
        symptom: 'I see a matching edge and choose T.',
        explanation: 'Headlights recognition reads only the two corner stickers.',
        recovery: 'Ignore the middle edge and inspect the corners on every side.',
      },
      {
        symptom: 'The corners are in order but the whole ring is shifted.',
        explanation: 'An upper-layer alignment can remain after the formula.',
        recovery: 'Follow the separate U move until all four corners match the side frame.',
      },
    ],
    checks: [
      'Try T with headlights left and Y with no headlights.',
      'Try the cyclic-order alignment and complete skip.',
      'Check all four corners, not only the face in front.',
    ],
  },
  'roux-edge-orientation': {
    title: 'Read the last six edges.',
    goal: 'Establish a center reference, then orient every remaining edge with M and U.',
    overview:
      'LSE means last six edges: the four upper edges plus the two bottom edges in the middle slice. The blocks and corner ring are complete. We first orient these edges; we will put them in the correct positions afterward.',
    look: 'First look at the up center. If it is red or orange, follow the visible M setup to bring a white or yellow center to U. Under this reference, an edge is oriented when its white or yellow sticker faces U or D. Count 0, 2, 4 or 6 bad edges.',
    prepare:
      'Use the shown U setup to arrange a prepared arrow. The front and rear forms use different slice directions. During a quarter-M position the center reference changes: read “Middle-slice setup in progress” and wait until the declared checkpoint before recounting bad edges.',
    do: 'Follow the conditional arrow maneuver, such as M′ U M or M U′ M′, in the recognized hold. Some setups temporarily increase the number of bad edges to produce a useful arrow. The explanation identifies that purpose; do not repeat an arrow blindly from an unmatched position.',
    check:
      'At the complete reference checkpoint, the up center is white or yellow and all six white/yellow edge stickers face U or D. Both blocks remain intact and the corners retain their cyclic order, even if U has shifted the ring.',
    tip: 'Orientation is not position. A yellow-blue edge can be correctly oriented on top and still be on the wrong side. A red top center during a move does not mean the cube is invalid.',
    mistakes: [
      {
        symptom: 'All my edges suddenly seem bad after M.',
        explanation: 'You are judging orientation at an intermediate red/orange-up center state.',
        recovery:
          'Finish the reference setup and use the displayed checkpoint before classifying again.',
      },
      {
        symptom: 'The bad-edge count went up.',
        explanation:
          'A deliberate setup can create an easier arrow rather than reduce the count immediately.',
        recovery:
          'Read the next-case explanation and finish the named maneuver. Do not undo it just because the count increased.',
      },
    ],
    checks: [
      'Try 0, 2, 4 and 6 bad-edge examples.',
      'Try front and rear arrows and the reference correction.',
      'Pause after a quarter M and identify why EO judgment must wait.',
    ],
  },
  'roux-left-right-edges': {
    title: 'Connect the top edges to their corners.',
    goal: 'Place yellow-blue and yellow-green relative to the corner ring.',
    overview:
      'The two targets belong between the blue corner neighbors and the green corner neighbors. U can rotate the whole top corner ring during preparation. We compare each edge with its correct neighboring corners, not only with its absolute left or right screen position.',
    look: 'Find yellow-blue and yellow-green. Either can be above or in the bottom middle slice. Read their neighboring corner colors. One or both targets may already be correct relative to the ring.',
    prepare:
      'Use the displayed U move to align a target with the middle working area. Keep all edges oriented. A safe M/U transport carries a target through the middle while preserving the two blocks.',
    do: 'Follow the entire front or rear transport, such as M′ U2 M or M U2 M′. Watch the full highlighted affected set: these maneuvers move several edges and the corner ring, not just two pieces. Restore the reference and protected relationships at the endpoint.',
    check:
      'The yellow-blue edge sits between the blue corner neighbors, and yellow-green between the green neighbors, up to a shared U offset. All six edges remain oriented. Do not force a final U alignment before its planned turn.',
    tip: 'An edge and its neighbors can move together and remain correctly related. The player tells you how far the corner ring is from its final alignment.',
    mistakes: [
      {
        symptom: 'The target is on the left, but its neighbors do not match.',
        explanation:
          'A screen position is not the same as the correct position in the shifted corner ring.',
        recovery: 'Read the two adjacent corner side colors and follow the U setup.',
      },
      {
        symptom: 'More than two edges moved during transport.',
        explanation: 'The maneuver is not a pure two-edge swap.',
        recovery: 'Track the highlighted set through the complete sequence and judge its endpoint.',
      },
    ],
    checks: [
      'Try a bottom target and a top target.',
      'Try the one-already-complete and both-complete cases.',
      'Explain why a shared U offset can be valid.',
    ],
  },
  'roux-last-four-edges': {
    title: 'Bring the whole cube home.',
    goal: 'Finish the middle edges, centers and upper alignment.',
    overview:
      'The last four edges are the white-red, white-orange, yellow-red and yellow-orange pieces. Their white/yellow stickers are already oriented. The final M/U maneuvers finish their placement while preserving the achieved left/right relationships at checkpoints.',
    look: 'Find white-red and white-orange and compare their positions with the current middle centers. Read the corner-ring offset. A cube with two solved blocks can still need edge cycling, a center half turn or a final U alignment.',
    prepare:
      'Use the displayed setup to put the residual cycle in the working middle slice. Keep the fixed blue-left and green-right frame; do not turn the whole cube to hide a mismatch.',
    do: 'Follow the remaining half turns and full transport maneuvers. The left/right targets may move together with the corner ring during an action, but their relationship returns at its declared endpoint. Finish the shown U alignment and restore all middle centers.',
    check:
      'All six faces are solved. In this hold: yellow up, white down, blue left, green right, red front and orange back. Check the back and bottom too. The all-solved case needs no solving moves beyond the explained starting hold.',
    tip: 'Two blocks plus a white bottom are not the finish line. The final checkpoint includes every edge, corner, center and the upper alignment.',
    mistakes: [
      {
        symptom: 'The blocks look solved, but red and orange centers disagree.',
        explanation: 'The middle slice has not reached its final phase.',
        recovery:
          'Continue through the final M alignment rather than declaring the solve finished.',
      },
      {
        symptom: 'The top colors are solved but the sides are shifted.',
        explanation: 'The upper layer still needs alignment with the block frame.',
        recovery: 'Follow the final U move, then inspect all six faces.',
      },
    ],
    checks: [
      'Try a residual cycle, a displaced-center case and the all-solved skip.',
      'Complete one six-face input solve on a real cube.',
      'Check every face and repeat any maneuver that you could not explain.',
    ],
  },
};
const guided = "R U2 F' L D2 B R2 U' F2 D L2 B' U2 R' F D'";
export const ROUX_COURSE: readonly Lesson[] = ROUX_INFO.stages.map((stage, i) => {
  const id = i === 0 ? 'intro' : stage.id,
    text = ROUX_LESSON_TEXT[id];
  return {
    id,
    stageId: stage.id,
    title: text.title,
    shortTitle: stage.label,
    goal: text.goal,
    observe: text.look,
    prepare: text.prepare,
    check: text.check,
    tip: text.tip,
    algorithmIds: [],
    exampleScramble: guided,
    examples: ROUX_WORKED_EXAMPLES.filter((e) => e.lessonId === id).map((e) => ({
      id: e.id,
      title: e.caption,
      scramble: '',
      input: e.input,
      stageId: e.expectedStage,
      expectedCaseId: '',
    })),
  };
});
export const ROUX_LESSON_DETAILS: Readonly<Record<string, RouxLessonDetail>> = Object.fromEntries(
  ROUX_COURSE.map((l) => {
    const t = ROUX_LESSON_TEXT[l.id],
      stage = l.stageId as RouxStageId;
    const referenceIds = ROUX_REFERENCE.filter((r) =>
      stage === 'roux-corner-orientation'
        ? r.id.includes('ocll')
        : stage === 'roux-corner-permutation'
          ? r.id === 'roux-t' || r.id === 'roux-y'
          : stage.includes('edge')
            ? r.id.includes('lse')
            : false,
    ).map((r) => r.id);
    return [
      l.id,
      {
        lessonId: l.id,
        overview: t.overview,
        workedExamples: ROUX_WORKED_EXAMPLES.filter((e) => e.lessonId === l.id),
        mistakes: t.mistakes,
        physicalChecks: t.checks,
        referenceIds,
      },
    ];
  }),
);
