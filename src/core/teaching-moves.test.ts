import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from './cube';
import type { CubeEngine, TeachingMove } from './types';
import { invertTeachingMoves, isTeachingMove, normalizeTeachingAlgorithm } from './teaching-moves';
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
  for (const move of ['M3', 'm', 'M2\n', '', null]) expect(isTeachingMove(move)).toBe(false);
});
it('normalizes_catalog_aliases_without_broadening_scrambles', () => {
  expect(normalizeTeachingAlgorithm('r U M2')).toEqual(['Rw', 'U', 'M2']);
  expect(parseScramble('r U').ok).toBe(false);
  for (const move of ['Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw', 'M', 'E', 'S', 'x', 'y', 'z']) {
    for (const suffix of ['', "'", '2']) expect(isTeachingMove(move + suffix)).toBe(true);
  }
  expect(isTeachingMove('r')).toBe(false);
  for (const bad of ['R3', "R2'", '3Rw', '(R)', 'm', 'R\ninvalid']) {
    expect(() => normalizeTeachingAlgorithm(bad)).toThrow(/token [12]/i);
  }
});
it('preserves_frame_and_inversion_for_every_teaching_family', () => {
  for (const family of ['Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw', 'M', 'E', 'S']) {
    for (const suffix of ['', "'", '2']) {
      const moves = [family + suffix] as TeachingMove[];
      const after = engine.apply(engine.solved(), moves);
      expect(engine.observe(after).centers).not.toEqual(engine.observe(engine.solved()).centers);
      expect(engine.equals(engine.apply(after, invertTeachingMoves(moves)), engine.solved())).toBe(
        true,
      );
    }
  }
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
