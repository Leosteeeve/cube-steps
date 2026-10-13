import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from './cube';
import type { CubeEngine, TeachingMove } from './types';
import { canonicalHoldingMoves } from './holding-frame';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('preserves_frame_and_inversion', () => {
  const frames = new Set<string>();
  const scrambled = engine.apply(engine.solved(), ['R', 'F2', "B'", 'L', 'U']);
  for (const tilt of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][]) {
    for (const spin of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
      const state = engine.apply(scrambled, [...tilt, ...spin]);
      frames.add(JSON.stringify(engine.observe(state).centers));
      const moves = canonicalHoldingMoves(engine, state);
      expect(moves.every((m) => /^[xyz]/.test(m))).toBe(true);
      expect(moves.length).toBeLessThanOrEqual(2);
      const after = engine.apply(state, moves);
      expect(engine.observe(after).centers).toMatchObject({ D: 'white', F: 'green' });
      expect(canonicalHoldingMoves(engine, after)).toEqual([]);
      expect(canonicalHoldingMoves(engine, state)).toEqual(moves);
      if (moves.length === 2) {
        for (const m of ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2'] as TeachingMove[]) {
          const c = engine.observe(engine.apply(state, [m])).centers;
          expect(c.D === 'white' && c.F === 'green').toBe(false);
        }
      }
    }
  }
  expect(frames.size).toBe(24);
  expect(canonicalHoldingMoves(engine, engine.solved())).toEqual(['z2']);
});
