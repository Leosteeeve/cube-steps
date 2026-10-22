import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { observeRouxFrame, rouxReferenceState } from './frame';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('connects the canonical input hold to white-down blue-left with actual x2 y turns', () => {
  const held = rouxReferenceState(engine);
  expect(engine.equals(held, engine.apply(engine.solved(), ['x2', 'y']))).toBe(true);
  expect(engine.observe(held).centers).toEqual({
    U: 'yellow',
    D: 'white',
    L: 'blue',
    R: 'green',
    F: 'red',
    B: 'orange',
  });
  expect(observeRouxFrame(engine, engine.solved())).toEqual({
    sideFrameValid: false,
    centerPhase: null,
    eoReferenceValid: false,
  });
});
it('tracks all middle-slice center phases without changing the block frame', () => {
  const held = rouxReferenceState(engine);
  const cases: [TeachingMove[], number, boolean, string, string][] = [
    [[], 0, true, 'yellow', 'red'],
    [['M'], 1, false, 'orange', 'yellow'],
    [['M2'], 2, true, 'white', 'orange'],
    [["M'"], 3, false, 'red', 'white'],
  ];
  for (const [moves, phase, reference, up, front] of cases) {
    const state = engine.apply(held, moves);
    expect(observeRouxFrame(engine, state)).toEqual({
      sideFrameValid: true,
      centerPhase: phase,
      eoReferenceValid: reference,
    });
    expect(engine.observe(state).centers).toMatchObject({ U: up, F: front, L: 'blue', R: 'green' });
  }
  expect(engine.equals(engine.apply(held, ['M', "M'"]), held)).toBe(true);
  expect(engine.equals(engine.apply(held, ['M2', 'M2']), held)).toBe(true);
});
it('rejects a corrupt center permutation instead of inventing a slice phase', () => {
  const corrupt = structuredClone(rouxReferenceState(engine));
  [corrupt.data.CENTERS.pieces[0], corrupt.data.CENTERS.pieces[2]] = [
    corrupt.data.CENTERS.pieces[2],
    corrupt.data.CENTERS.pieces[0],
  ];
  expect(() => observeRouxFrame(engine, corrupt)).toThrow(/center/i);
});
