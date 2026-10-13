import type { Lesson } from './course-types';
import type { AdvancedStageId } from '../core/types';
import { ADVANCED_GUIDED_SCRAMBLE, ADVANCED_EXAMPLES } from './advanced-examples';
import { ADVANCED_PRESENTATION } from '../methods/advanced/presentation';
const lesson = (
  id: AdvancedStageId,
  title: string,
  goal: string,
  observe: string,
  prepare: string,
  check: string,
  tip: string,
  algorithmIds: string[],
): Lesson => ({
  id,
  stageId: id,
  title,
  shortTitle: ADVANCED_PRESENTATION.stages.find((s) => s.id === id)!.label,
  goal,
  observe,
  prepare,
  check,
  tip,
  algorithmIds,
  exampleScramble: id === 'advanced-auf' ? 'D' : ADVANCED_GUIDED_SCRAMBLE,
  examples: ADVANCED_EXAMPLES.filter((e) => e.stageId === id),
});
export const ADVANCED_COURSE: readonly Lesson[] = [
  {
    id: 'intro',
    title: 'Plan fewer moves. Recognize the whole case.',
    shortTitle: 'Meet Advanced CFOP',
    goal: 'Build a shortest white cross, choose efficient F2L pairs, then finish with one-look OLL and one-look PLL.',
    observe:
      'The four phases stay familiar. This course adds 41 F2L cases, all 57 unsolved OLL cases and all 21 PLL cases. Start with Beginner CFOP if recognizing a pair or reading a grip still feels unfamiliar.',
    prepare:
      'Start a physical scramble with white up and green front. Follow each explicit regrip, and learn wide and slice turns before trying the full last-layer formulas.',
    check:
      'Finish the complete formula before checking its result. A formula may temporarily disturb earlier layers; the checkpoint tells you what must be restored.',
    tip: 'Advanced CFOP is a preview with physical acceptance pending. You can keep using the accepted LBL and Beginner CFOP courses while learning these cases.',
    algorithmIds: [],
    exampleScramble: ADVANCED_GUIDED_SCRAMBLE,
  },
  lesson(
    'advanced-cross',
    'See all four edges. Plan one cross.',
    'Use the shortest possible white cross in outer-face turns. A half turn counts as one; physical regrips are recorded separately.',
    'Locate all four white edges and read their side colors. Each belongs between the white center and its matching side center. Plan their order together rather than committing to the first edge you notice.',
    'Hold white down and green front. Follow the minimum-turn path directly on the bottom. Read each edge movement in the player; an edge can temporarily leave a matched position when that helps the complete cross.',
    'All four white edge stickers face down, and their side stickers match their centers. The remaining minimum distance reaches zero.',
    'Minimum turns describes the cross only. The rest of this method balances practical formulas, fewer regrips and the next pair; it does not claim a globally shortest complete solve.',
    [],
  ),
  lesson(
    'advanced-f2l',
    'Choose a pair that sets up the next.',
    'Recognize one of 41 F2L cases and insert its corner-edge pair while protecting the cross and completed pairs.',
    'Find a white corner and the edge with the same two side colors. Read their positions and sticker directions, then identify the slot between the matching centers. A trapped piece must leave an unsolved slot before its insertion case applies.',
    'Follow any separate U alignment or complete extraction maneuver. The solver compares practical registered formulas in all four slots and considers the next available pair. Keep the displayed grip; a back-slot formula is already written for that slot.',
    'The selected pair matches its centers, the white cross remains matched, and every earlier completed pair is restored. The pair count increases at the insertion checkpoint.',
    'The best next pair can change after every insertion. Choose a case below to isolate it, and use the library to compare its registered alternatives without changing the solver preferences.',
    ['f2l-01/main/fr', 'f2l-17/main/fr', 'f2l-41/main/fr'],
  ),
  lesson(
    'advanced-oll',
    'Read every yellow sticker in one look.',
    'Recognize all 57 unsolved OLL cases and orient the entire last layer with one registered formula.',
    'Look at the four yellow edges and four yellow corners together. Include yellow stickers on the side faces: two patterns that look similar from above can require different formulas. Piece permutation does not define an OLL case.',
    'Keep the first two layers complete. Follow the shown U preparation, then execute one full OLL formula in its displayed grip. Wide turns move two layers together; slice turns move the middle layer and its centers.',
    'Every last-layer sticker faces yellow up, and the first two layers are restored. Side colors can still be in the wrong order because PLL comes next.',
    'Use the case selector to compare all 57 patterns. If yellow already faces up everywhere, OLL is skipped; do not apply a formula to a completed orientation.',
    ['oll-45/main', 'oll-20/main', 'oll-57/main'],
  ),
  lesson(
    'advanced-pll',
    'Read the side colors as one pattern.',
    'Recognize all 21 PLL cases and put the last-layer pieces in order with one registered formula.',
    'Keep yellow up. Compare corner headlights, matching side-color blocks and the order of the edges. Evaluate corners and edges together; a whole upper-layer color offset can be fixed afterward.',
    'Follow the separate U preparation and then the named full PLL formula. Perform any x or y rotation inside that formula physically. H and Z use M slice turns; follow the current centers as they move.',
    'The yellow layer and first two layers are restored, and the top pieces are in the correct cyclic order. A final U, U prime or U2 may still be needed to align the sides.',
    'An AUF-only state needs no PLL formula. Complete the recognized formula before checking the permutation, even if a side briefly looks solved halfway through.',
    ['pll-t/main', 'pll-z/main', 'pll-aa/main'],
  ),
  lesson(
    'advanced-auf',
    'Finish with one clear alignment.',
    'Align the last layer with its side centers and verify the whole cube is solved.',
    'After PLL, the upper layer is correctly ordered. Compare any upper edge with the center below it to see the remaining offset.',
    'AUF means adjust the upper face. Keep the lower layers still and follow the displayed U, U prime or U2. No turn is needed when the sides already match.',
    'All six faces match their centers, and the complete teaching trace replays from the original input to this solved state.',
    'Advanced CFOP has five recorded stages. Already-complete stages are skipped; a solved cube has five skips and no teaching moves.',
    [],
  ),
];
