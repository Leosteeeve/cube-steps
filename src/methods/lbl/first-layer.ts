import { checkStage } from './stages';
import { type LBLContext, type StageResult } from './trace';
import {
  algorithm,
  chooseTurn,
  findPiece,
  hold,
  requireTarget,
  runRule,
  setup,
  solvedTarget,
  target,
} from './rule-helpers';
export function solveFirstLayer(c: LBLContext): StageResult {
  return runRule(c, () => {
    if (checkStage(c.engine, c.trace.current, 'first-layer')) return;
    hold(c, 'white', 'D');
    for (const id of ['UFR', 'URB', 'UBL', 'ULF']) {
      if (solvedTarget(c, id)) continue;
      if (target(c, id).slot.includes('D')) {
        setup(
          c,
          chooseTurn(c, 'y', (o) => findPiece(o, id).slot === 'DRF'),
          'corner-extract-frame',
          'Bring the trapped corner to the bottom front-right slot.',
          id,
        );
        algorithm(
          c,
          'right-trigger',
          'corner-eject',
          'Take the incorrectly placed corner into the top working layer, then look for its matching centers.',
          id,
        );
      }
      const colors = Object.values(target(c, id).stickers);
      setup(
        c,
        chooseTurn(c, 'y', (o) => colors.includes(o.centers.F) && colors.includes(o.centers.R)),
        'corner-slot',
        'Hold the two matching side centers at front and right.',
        id,
      );
      setup(
        c,
        chooseTurn(c, 'U', (o) => findPiece(o, id).slot === 'UFR'),
        'corner-align',
        'Move the corner directly above its front-right destination.',
        id,
      );
      for (let index = 1; !solvedTarget(c, id) && index <= 6; index++)
        algorithm(
          c,
          'right-trigger',
          'corner-insert',
          'Finish all four moves, then inspect the white corner again. Repeat until all three stickers match their centers.',
          id,
          { group: `corner-${id}`, index },
        );
      requireTarget(c, id);
    }
  });
}
