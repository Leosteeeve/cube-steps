import { expect, it } from 'vitest';
import { countTeachingMoves } from './move-metrics';
import type { TeachingMove } from './types';
it('counts_outer_block_equivalents', () => {
  expect(countTeachingMoves(['R2', 'Rw', "M'", 'y2'] as TeachingMove[])).toEqual({
    faceTurnEquivalents: 4,
    rotations: 1,
  });
  expect(countTeachingMoves(['E2', 'S', 'Bw2', 'x', "z'"] as TeachingMove[])).toEqual({
    faceTurnEquivalents: 5,
    rotations: 2,
  });
  expect(countTeachingMoves([])).toEqual({ faceTurnEquivalents: 0, rotations: 0 });
});
