import type { CubeObservation, TeachingMove } from '../../core/types';
import { checkStage, piecePositioned, pieceSolved } from './stages';
import { RuleError, type LBLContext, type StageResult } from './trace';
import { algorithm, chooseTurn, hold, observation, runRule, setup } from './rule-helpers';
const yellowEdges = (o: CubeObservation) =>
  o.edges.filter((p) => p.stickers.U === 'yellow').map((p) => p.slot);
const matchedEdges = (o: CubeObservation) =>
  o.edges.filter((p) => p.slot.includes('U') && pieceSolved(p, o)).map((p) => p.slot);
const positionedCorners = (o: CubeObservation) =>
  o.corners.filter((p) => p.slot.includes('U') && piecePositioned(p, o));
export function solveTopCross(c: LBLContext): StageResult {
  return runRule(c, () => {
    if (checkStage(c.engine, c.trace.current, 'top-cross')) return;
    hold(c, 'yellow', 'U');
    for (
      let attempt = 0;
      !checkStage(c.engine, c.trace.current, 'top-cross') && attempt < 4;
      attempt++
    ) {
      const slots = yellowEdges(observation(c));
      let name = 'dot';
      if (slots.length === 2) {
        const opposite =
          (slots.includes('UF') && slots.includes('UB')) ||
          (slots.includes('UR') && slots.includes('UL'));
        name = opposite ? 'line' : 'L';
        setup(
          c,
          chooseTurn(c, 'y', (o) => {
            const s = yellowEdges(o);
            return opposite
              ? s.includes('UL') && s.includes('UR')
              : s.includes('UL') && s.includes('UB');
          }),
          'yellow-pattern-frame',
          opposite ? 'Hold the yellow line left to right.' : 'Hold the yellow L at back and left.',
        );
      } else if (slots.length !== 0)
        throw new RuleError(
          'unsupported-case',
          'top-cross',
          'An edge-orientation pattern is not reachable from a legal scramble.',
        );
      algorithm(
        c,
        'top-cross',
        `yellow-${name}`,
        `Recognize the ${name} pattern. Complete the six moves, then inspect the yellow edges again.`,
      );
    }
  });
}
export function solveTopEdges(c: LBLContext): StageResult {
  return runRule(c, () => {
    if (checkStage(c.engine, c.trace.current, 'top-edges')) return;
    hold(c, 'yellow', 'U');
    for (
      let attempt = 0;
      !checkStage(c.engine, c.trace.current, 'top-edges') && attempt < 4;
      attempt++
    ) {
      const candidates: TeachingMove[][] = [[], ['U'], ['U2'], ["U'"]];
      const scored = candidates.map((moves) => ({
        moves,
        count: matchedEdges(c.engine.observe(c.engine.apply(c.trace.current, moves))).length,
      }));
      const best = scored.reduce((a, b) => (b.count > a.count ? b : a));
      setup(
        c,
        best.moves,
        'top-edge-align',
        `Align the top layer to match ${best.count} side stickers with their centers.`,
      );
      if (checkStage(c.engine, c.trace.current, 'top-edges')) break;
      const matched = matchedEdges(observation(c));
      const opposite =
        (matched.includes('UF') && matched.includes('UB')) ||
        (matched.includes('UR') && matched.includes('UL'));
      setup(
        c,
        chooseTurn(c, 'y', (o) => {
          const s = matchedEdges(o);
          return opposite
            ? s.includes('UF') && s.includes('UB')
            : s.includes('UB') && s.includes('UR');
        }),
        'top-edge-pair-frame',
        opposite
          ? 'Hold the two matched edges at front and back.'
          : 'Hold the adjacent matched edges at back and right.',
      );
      algorithm(
        c,
        'top-edge-cycle',
        opposite ? 'edges-opposite' : 'edges-adjacent',
        opposite
          ? 'Cycle once to turn the opposite pair into an adjacent-pair case.'
          : 'Cycle the remaining edges, then align the top layer with the centers.',
      );
    }
  });
}
export function solveTopCorners(c: LBLContext): StageResult {
  return runRule(c, () => {
    if (checkStage(c.engine, c.trace.current, 'top-corners')) return;
    hold(c, 'yellow', 'U');
    for (
      let attempt = 0;
      !checkStage(c.engine, c.trace.current, 'top-corners') && attempt < 4;
      attempt++
    ) {
      const correct = positionedCorners(observation(c));
      if (correct.length)
        setup(
          c,
          chooseTurn(c, 'y', (o) => positionedCorners(o).some((p) => p.slot === 'UFR')),
          'top-corner-frame',
          'Keep the correctly positioned corner at top front-right. Its twist does not matter yet.',
          correct[0].id,
        );
      algorithm(
        c,
        'top-corner-cycle',
        correct.length ? 'corners-one-correct' : 'corners-none-correct',
        correct.length
          ? 'Keep the front-right corner in place and cycle the other three corners.'
          : 'No corner is in its matching slot. Cycle once, then look again.',
      );
    }
  });
}
export function solveCornerOrientation(c: LBLContext): StageResult {
  return runRule(c, () => {
    if (c.engine.isSolved(c.trace.current)) return;
    hold(c, 'yellow', 'D');
    for (let corner = 0; corner < 4; corner++) {
      const id = observation(c).corners.find((p) => p.slot === 'DRF')!.id;
      for (
        let index = 1;
        observation(c).corners.find((p) => p.slot === 'DRF')!.stickers.D !== 'yellow' && index <= 6;
        index++
      ) {
        algorithm(
          c,
          'right-trigger',
          'final-corner-twist',
          'Finish all four moves, even when yellow appears down partway through. Other pieces may look disturbed until all corners are finished. Keep holding the cube this way.',
          id,
          { group: `final-${id}`, index },
        );
      }
      if (observation(c).corners.find((p) => p.slot === 'DRF')!.stickers.D !== 'yellow')
        throw new RuleError(
          'verification',
          'corner-orientation',
          'The working corner did not orient.',
        );
      setup(
        c,
        ['D'],
        'next-final-corner',
        corner === 3
          ? 'Restore the last layer alignment. All corners have now been checked.'
          : 'Turn only the bottom layer to bring the next corner to front-right. Do not rotate the whole cube.',
        id,
      );
    }
  });
}
