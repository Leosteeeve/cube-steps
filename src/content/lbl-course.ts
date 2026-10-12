import type { StageId } from '../core/types';
import type { AlgorithmId } from '../methods/lbl/catalog';
export const GUIDED_SCRAMBLE =
  "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'";
export interface Lesson {
  id: 'notation' | StageId;
  stageId?: StageId;
  title: string;
  shortTitle: string;
  goal: string;
  observe: string;
  prepare: string;
  check: string;
  tip: string;
  algorithmIds: AlgorithmId[];
  exampleScramble: string;
}
const stage = (
  id: StageId,
  title: string,
  shortTitle: string,
  goal: string,
  observe: string,
  prepare: string,
  check: string,
  tip: string,
  algorithmIds: AlgorithmId[],
): Lesson => ({
  id,
  stageId: id,
  title,
  shortTitle,
  goal,
  observe,
  prepare,
  check,
  tip,
  algorithmIds,
  exampleScramble: GUIDED_SCRAMBLE,
});
export const LBL_COURSE: Lesson[] = [
  {
    id: 'notation',
    title: 'Meet your cube',
    shortTitle: 'Notation & holding',
    goal: 'Learn the language of the cube before making your first move.',
    observe: 'Find the centers, edges and corners.',
    prepare: 'Hold white up and green front.',
    check: 'You can identify each face without changing your grip.',
    tip: 'You only need a standard 3×3 cube and a little curiosity.',
    algorithmIds: [],
    exampleScramble: '',
  },
  stage(
    'white-cross',
    'Build the white cross',
    'White cross',
    'Build a white daisy around yellow, then turn its petals into a matched white cross.',
    'Hold yellow up and find the four edges with white stickers. These will be the petals around the yellow center. Ignore the corners and side-color alignment while building the flower.',
    "First collect all four white petals on top. If a petal blocks the next lift, turn U to move it away first. A sideways white sticker needs a middle-layer position before it can face up. Once the daisy is complete, match one petal's side color with its center, hold that match at the front, and turn F2 to send it down. Repeat for all four petals.",
    'First checkpoint: four white petals surround the yellow center. Final checkpoint: white is down, and every white-cross side sticker matches its adjacent center.',
    'Daisy first. Then match a side color and turn that face 180°. Keep yellow up and white down for the next lesson.',
    ['daisy-to-cross'],
  ),
  stage(
    'first-layer',
    'Finish the first layer',
    'First-layer corners',
    'Place the four white corners without losing your cross.',
    'Choose a white corner and locate the two centers matching its other colors. Those three colors identify its home.',
    'Keep white down after the daisy-to-cross step. Bring the destination to bottom front-right and the corner directly above it. If the corner is trapped below, use a right-hand trigger to take it out first.',
    'White forms one complete face, and the bottom row of every side matches its center. Finish the full trigger before checking.',
    'Repeat the same four-move trigger until the corner is solved. Different starting twists need different numbers of repetitions.',
    ['right-trigger'],
  ),
  stage(
    'middle-layer',
    'Solve the middle edges',
    'Second-layer edges',
    'Use two insertions to complete the first two layers.',
    'Look in the top layer for an edge without yellow. Its two colors belong between two side centers.',
    'Keep white down. Match the side-facing sticker to its center, then bring that match to the front. The top sticker tells you whether the edge belongs on the left or right. A misplaced middle edge must be ejected before reinserting it.',
    'The bottom two rows of all four sides match their centers, and the white face is intact.',
    'Read the full formula as one unit. The first layer may move during it, but comes back at the end.',
    ['middle-left', 'middle-right'],
  ),
  stage(
    'top-cross',
    'Make the yellow cross',
    'Yellow cross',
    'Turn the yellow edges upward; side colors can wait.',
    'With yellow up, look only at the four edge stickers. You will see a dot, an L, a line, or a cross.',
    'Hold a line left-to-right, or an L at back-left. For a dot, start from any side. Apply the yellow-cross formula and recognize the new pattern before repeating.',
    'All four yellow edge stickers face up. The first two layers are restored after each complete formula.',
    'The yellow corners do not need to face up yet. Judge this stage by the edges.',
    ['top-cross'],
  ),
  stage(
    'top-edges',
    'Match the top edges',
    'Top-edge positions',
    'Line up the cross with all four side centers.',
    'Turn U to find the best alignment. If the edges are not all matched, two matches form an adjacent or opposite pair.',
    'Hold adjacent matches at back and right. Hold opposite matches at front and back, cycle once, then recognize the adjacent case. After cycling, turn U to align the side stickers.',
    'Every yellow-cross side sticker matches its center. Corner positions and twists still do not matter.',
    'A preparation turn is separate from the formula. The player shows both, in the order you should follow.',
    ['top-edge-cycle'],
  ),
  stage(
    'top-corners',
    'Put the corners in place',
    'Top-corner positions',
    'Give every yellow corner its home, even if it is twisted.',
    'Compare a corner’s three colors with its surrounding centers. It is positioned correctly when the color set matches, regardless of which way yellow points.',
    'Hold a correctly positioned corner at top front-right. Cycle the other three corners. If none is positioned correctly, cycle once and check again.',
    'All four corners sit between their matching centers, and the edges remain solved.',
    'Position comes before orientation. A twisted corner can already be in the correct place.',
    ['top-corner-cycle'],
  ),
  stage(
    'corner-orientation',
    'Finish the yellow corners',
    'Final corner twists',
    'One familiar trigger, a steady grip, and your first complete solve.',
    'Turn the whole cube so yellow faces down. Work on the bottom front-right corner and inspect its yellow sticker.',
    'Repeat the complete right-hand trigger until yellow faces down at that corner. Then turn only D to bring the next corner into the same working slot. Check all four corners without changing the whole-cube grip.',
    'After the final bottom-layer alignment, every face matches its center. Always finish all four moves of a trigger, including the last U′.',
    'The cube may look more scrambled during this stage. Keep the grip and finish the sequence: the disturbed pieces return after the corners are done.',
    ['right-trigger'],
  ),
];
