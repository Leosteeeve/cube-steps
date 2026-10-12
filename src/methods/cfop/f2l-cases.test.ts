import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { observeF2LPairs, recognizeF2L } from './f2l-cases';
import { upperPairFixtures } from '../../../tests/fixtures/cfop-cases';
let engine: CubeEngine;
beforeAll(async () => { engine = await createCubeEngine(); });
it('matches every normalized upper arrangement without a generic solve', () => {
  for (const state of upperPairFixtures(engine)) {
    const pairs = observeF2LPairs(engine, state);
    expect(pairs).toHaveLength(4); expect(pairs.filter(p => p.solved)).toHaveLength(3);
    expect(recognizeF2L(engine, state, pairs.find(p => !p.solved)!)).not.toBeNull();
  }
});
it('does not re-extract a solved pair or admit a broken cross', () => {
  const pairs = observeF2LPairs(engine, engine.solved());
  expect(pairs).toHaveLength(4);
  expect(recognizeF2L(engine, engine.solved(), pairs[0])).toBeNull();
  expect(recognizeF2L(engine, engine.apply(engine.solved(), ['R']), pairs[0])).toBeNull();
});
