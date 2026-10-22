import { expect, it } from 'vitest';
import { ROUX_REFERENCE } from './reference';
import { ROUX_CORNER_ALGORITHMS } from '../../methods/roux/corners/catalog';
it('shares all nine exact corner algorithms and conditional M/U maneuvers',()=>{
  for(const [id,algorithm] of Object.entries(ROUX_CORNER_ALGORITHMS))
    expect(ROUX_REFERENCE.find(r=>r.id===id)?.algorithm).toBe(algorithm);
  expect(ROUX_REFERENCE.some(r=>r.algorithm.moves.join(' ')==="M' U M")).toBe(true);
  expect(ROUX_REFERENCE.some(r=>r.algorithm.moves.join(' ')==="M U2 M'")).toBe(true);
});
