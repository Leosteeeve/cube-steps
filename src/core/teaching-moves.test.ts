import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from './cube';
import type { CubeEngine, TeachingMove } from './types';
import { invertTeachingMoves, isTeachingMove } from './teaching-moves';
import { parseScramble } from './notation';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('supports slice teaching moves but keeps the scramble contract restricted', () => {
  for (const move of ['M', "M'", 'M2']) {
    expect(isTeachingMove(move)).toBe(true);
    expect(parseScramble(move).ok).toBe(false);
  }
  for (const move of ['M3', 'm', 'Rw', 'M2\n', '', null]) expect(isTeachingMove(move)).toBe(false);
});
it('inverts slice moves and restores the exact state including centers', () => {
  const moves = ['M', 'U2', "M'"] as TeachingMove[];
  expect(invertTeachingMoves(moves)).toEqual(['M', 'U2', "M'"]);
  expect(
    engine.equals(
      engine.apply(engine.solved(), [...moves, ...invertTeachingMoves(moves)]),
      engine.solved(),
    ),
  ).toBe(true);
  expect(
    engine.equals(
      engine.apply(engine.solved(), ['M', 'M', 'M', 'M'] as TeachingMove[]),
      engine.solved(),
    ),
  ).toBe(true);
  expect(
    engine.observe(engine.apply(engine.solved(), ['M'] as TeachingMove[])).centers,
  ).not.toEqual(engine.observe(engine.solved()).centers);
});
