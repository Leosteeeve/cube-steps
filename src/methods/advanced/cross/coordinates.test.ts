import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { canonicalHoldingMoves } from '../../../core/holding-frame';
import { CROSS_MOVES, extractCross, transitionCross, rankCross, unrankCross } from './coordinates';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('matches_engine_transitions_in_all_frames', () => {
  const scrambled = engine.apply(engine.solved(), ['R', 'U2', 'F', "L'", 'B2', 'D']);
  for (const tilt of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][]) {
    for (const spin of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
      const held = engine.apply(scrambled, [...tilt, ...spin]);
      const state = engine.apply(held, canonicalHoldingMoves(engine, held)),
        c = extractCross(engine, state);
      // Compare directly to cubing's physical edges, independently of transition tables.
      for (const [i, id] of [0, 3, 2, 1].entries()) {
        expect(c.positions[i]).toBe(state.data.EDGES.pieces.indexOf(id));
        expect(c.orientations[i]).toBe(state.data.EDGES.orientation[c.positions[i]]);
      }
      for (const move of CROSS_MOVES)
        expect(transitionCross(c, move)).toEqual(extractCross(engine, engine.apply(state, [move])));
    }
  }
});
it('rejects_malformed_cross_coordinates_and_noncanonical_frames', () => {
  for (const index of [-1, 190080, 1.2, NaN]) expect(() => unrankCross(index)).toThrow();
  expect(() => rankCross({ positions: [1, 1, 2, 3], orientations: [0, 0, 0, 0] })).toThrow();
  expect(() => rankCross({ positions: [0, 1, 2, 3], orientations: [0, 0, 0, 2] })).toThrow();
  expect(() => extractCross(engine, engine.solved())).toThrow(/frame/i);
});
