import type { Face } from '../../core/types';
import { checkStage } from './stages';
import { RuleError, type LBLContext, type StageResult } from './trace';
import {
  algorithm,
  chooseTurn,
  findPiece,
  hold,
  observation,
  requireTarget,
  runRule,
  setup,
  solvedTarget,
  target,
} from './rule-helpers';
export function solveMiddleLayer(c: LBLContext): StageResult {
  return runRule(c, () => {
    if (checkStage(c.engine, c.trace.current, 'middle-layer')) return;
    hold(c, 'white', 'D');
    for (const id of ['FR', 'FL', 'BR', 'BL']) {
      if (solvedTarget(c, id)) continue;
      if (!target(c, id).slot.includes('U')) {
        setup(
          c,
          chooseTurn(c, 'y', (o) => findPiece(o, id).slot === 'FR'),
          'middle-extract-frame',
          'Bring the trapped middle edge to the front-right slot.',
          id,
        );
        algorithm(
          c,
          'middle-right',
          'middle-eject',
          'Insert the upper edge to lift this misplaced edge out. The first layer is restored after the full formula.',
          id,
        );
      }
      setup(
        c,
        chooseTurn(c, 'U', (o) => {
          const p = findPiece(o, id);
          const face = p.slot[1] as Face;
          return p.stickers[face] === o.centers[face];
        }),
        'middle-align',
        'Turn U until the side-facing sticker matches the center below it.',
        id,
      );
      setup(
        c,
        chooseTurn(c, 'y', (o) => findPiece(o, id).slot === 'UF'),
        'middle-face',
        'Bring the matched sticker and center to the front.',
        id,
      );
      const top = target(c, id).stickers.U,
        o = observation(c);
      if (top === o.centers.R)
        algorithm(
          c,
          'middle-right',
          'middle-insert',
          'The upper sticker matches the right center. Insert the edge to the right.',
          id,
        );
      else if (top === o.centers.L)
        algorithm(
          c,
          'middle-left',
          'middle-insert',
          'The upper sticker matches the left center. Insert the edge to the left.',
          id,
        );
      else
        throw new RuleError(
          'unsupported-case',
          'middle-layer',
          'The middle edge does not match either adjacent center.',
        );
      requireTarget(c, id);
    }
  });
}
