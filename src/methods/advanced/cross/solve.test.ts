import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { whiteCrossSolved, pieceSolved } from '../../shared/pieces';
import { generateCrossTable } from './generate';
import { extractCross, rankCross } from './coordinates';
import { planShortestCross, crossMoveEvidence } from './solve';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('explains_each_distance_decrease', () => {
  const table = generateCrossTable();
  for (const holding of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][]) {
    for (const spin of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
      const initial = engine.apply(engine.solved(), [
          'R',
          'U',
          'F2',
          "L'",
          'B',
          'D2',
          ...holding,
          ...spin,
        ]),
        copy = JSON.stringify(initial);
      const plan = planShortestCross(engine, initial, table);
      let state = engine.apply(initial, plan.holdingMoves);
      expect(plan.moves.length).toBeGreaterThan(0);
      expect(plan.moves.length).toBe(table.distances[rankCross(extractCross(engine, state))]);
      expect(plan.distances).toEqual(
        Array.from({ length: plan.moves.length + 1 }, (_, i) => plan.moves.length - i),
      );
      for (const move of plan.moves) {
        const after = engine.apply(state, [move]),
          evidence = crossMoveEvidence(engine, state, after);
        const beforeO = engine.observe(state),
          afterO = engine.observe(after);
        for (const p of beforeO.edges.filter((p) => Object.values(p.stickers).includes('white'))) {
          const next = afterO.edges.find((n) => n.id === p.id)!;
          if (p.slot !== next.slot || pieceSolved(p, beforeO) !== pieceSolved(next, afterO)) {
            expect(evidence.targets).toContain(p.id);
            expect(evidence.explanation).toContain(p.slot);
            expect(evidence.explanation).toContain(next.slot);
          }
        }
        state = after;
      }
      expect(whiteCrossSolved(engine, state)).toBe(true);
      expect(JSON.stringify(initial)).toBe(copy);
      expect(planShortestCross(engine, initial, table)).toEqual(plan);
    }
  }
});
it('skips_an_already_satisfied_cross_in_any_frame', () => {
  const table = generateCrossTable();
  for (const moves of [[], ['x'], ['y'], ['z2']] as TeachingMove[][])
    expect(planShortestCross(engine, engine.apply(engine.solved(), moves), table).moves).toEqual(
      [],
    );
});
