import { expect, it } from 'vitest';
import { ROUX_CORNER_ALGORITHMS } from './catalog';
const exact = {
  'roux-ocll-21': "R U2 R' U' R U R' U' R U' R'",
  'roux-ocll-22': "R U2 R2 U' R2 U' R2 U2 R",
  'roux-ocll-23': "R2 D R' U2 R D' R' U2 R'",
  'roux-ocll-24': "R U R D R' U' R D' R2",
  'roux-ocll-25': "R' F R B' R' F' R B",
  'roux-ocll-26': "R U2 R' U' R U' R'",
  'roux-ocll-27': "R U R' U R U2 R'",
  'roux-t': "R U R' U' R' F R2 U' R' U' R U R' F'",
  'roux-y': "F R U' R' U' R U R' F' R U R' U' R' F R F'",
};
it('retains the nine approved whole formulas and Roux-specific teaching copy', () => {
  expect(Object.keys(ROUX_CORNER_ALGORITHMS).sort()).toEqual(Object.keys(exact).sort());
  for (const [id, moves] of Object.entries(exact)) {
    expect(ROUX_CORNER_ALGORITHMS[id].moves.join(' ')).toBe(moves);
    expect(ROUX_CORNER_ALGORITHMS[id].precondition).not.toMatch(/F2L|yellow cross/i);
  }
});
