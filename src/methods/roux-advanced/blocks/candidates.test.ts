import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import { stateToFacelets } from '../../../core/facelets';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import type { CubeEngine } from '../../../core/types';
import { ROUX_FRAMES } from '../frames';
import { prepareRouxInput } from '../input';
import { createRouxSearchBudget } from '../budget';
import type { BlockCandidate } from '../types';
import {
  ADVANCED_ROUX_SETUPS,
  advancedRouxFixture,
} from '../../../../tests/fixtures/advanced-roux';
import { validateBlockSearchBytes, type BlockSearchAssets } from './distance';
import { readFirstBlockCoordinate } from './coordinates';
import { blockCompleteInFrame } from '../predicates';
import { describeBlockCandidate, generateFirstBlocks, retainDiverseBlocks } from './candidates';
let e: CubeEngine, assets: BlockSearchAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await validateBlockSearchBytes(
    new Uint8Array(await readFile('src/methods/roux-advanced/data/block-distance.bin')),
  );
});
const f = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
it.each(['square-pair', 'line-line', 'late-base'] as const)(
  'describes actual %s milestones before the block endpoint',
  (id) => {
    const before = advancedRouxFixture(e, id);
    const result = describeBlockCandidate(
      e,
      before,
      f,
      invertTeachingMoves(ADVANCED_ROUX_SETUPS[id]),
    );
    expect(result.construction).toBe(id === 'late-base' ? 'pairs-base' : id);
    expect(result.milestones.some((m) => m.index === 0 && m.kind === 'pair')).toBe(true);
    expect(e.equals(e.apply(before, result.moves), result.state)).toBe(true);
  },
);
it('keeps identical first-block projections with different continuation pieces distinct', () => {
  const initial = advancedRouxFixture(e, 'solved'),
    other = e.apply(initial, ['R']);
  const a = describeBlockCandidate(e, initial, f, []),
    b = describeBlockCandidate(e, other, f, []);
  expect(readFirstBlockCoordinate(e, a.state, f)).toBe(readFirstBlockCoordinate(e, b.state, f));
  expect(a.id).not.toBe(b.id);
  expect(retainDiverseBlocks(e, [a, b], f, 16)).toHaveLength(2);
});
it('emits only verified complete candidates within the normal cap without a forced base-first rule', () => {
  const held = advancedRouxFixture(e, 'square-pair');
  const input = prepareRouxInput(e, {
    kind: 'facelets',
    facelets: stateToFacelets(e.apply(held, invertTeachingMoves(f.positioningMoves))),
  });
  const run = generateFirstBlocks(
    e,
    input,
    f,
    assets,
    createRouxSearchBudget('normal', { now: () => 0, maxOperations: 100000 }),
    3,
  );
  const results: BlockCandidate[] = [];
  const pool = new Map<string, (typeof results)[number]>();
  for (const event of run)
    if (event.kind === 'block') {
      for (const id of event.removedIds) pool.delete(id);
      pool.set(event.candidate.id, event.candidate);
      expect(pool.size).toBeLessThanOrEqual(16);
    }
  results.push(...pool.values());
  expect(results.length).toBeGreaterThan(0);
  expect(results.length).toBeLessThanOrEqual(16);
  for (const c of results) {
    expect(e.equals(e.apply(held, c.moves), c.state)).toBe(true);
    expect(blockCompleteInFrame(e, c.state, f, 'left')).toBe(true);
  }
  expect(results.some((c) => c.moves.length === 1 && c.moves[0] === "F'")).toBe(true);
});
it('yields a first candidate while work remains for its second-block continuation', () => {
  const held = advancedRouxFixture(e, 'square-pair');
  const input = prepareRouxInput(e, {
    kind: 'facelets',
    facelets: stateToFacelets(e.apply(held, invertTeachingMoves(f.positioningMoves))),
  });
  const budget = createRouxSearchBudget('normal', { now: () => 0, maxOperations: 10000 });
  const run = generateFirstBlocks(e, input, f, assets, budget, 10);
  let step = run.next();
  while (!step.done && step.value.kind !== 'block') step = run.next();
  expect(step.done).toBe(false);
  expect(budget.remaining().operations).toBeGreaterThan(5000);
  run.return();
});
it('returns an already complete block with no invented setup moves', () => {
  const input = prepareRouxInput(e, { kind: 'scramble', moves: [] });
  const results = [
    ...generateFirstBlocks(
      e,
      input,
      f,
      assets,
      createRouxSearchBudget('normal', { now: () => 0 }),
      2,
    ),
  ].filter((e) => e.kind === 'block');
  expect(results).toHaveLength(1);
  expect(results[0].candidate.moves).toEqual([]);
});
it('retains exactly the declared 16 and 64 route caps from a larger valid pool', () => {
  const root = advancedRouxFixture(e, 'solved'),
    pool = [];
  let state = root;
  for (let i = 0; i < 100; i++) {
    state = e.apply(
      state,
      i % 3 === 0 ? ['R', 'U', 'M2'] : i % 3 === 1 ? ["R'", 'U2', 'M'] : ['R2', "U'", "M'"],
    );
    pool.push(describeBlockCandidate(e, state, f, []));
  }
  expect(new Set(pool.map((c) => c.id)).size).toBeGreaterThan(64);
  for (const cap of [16, 64]) expect(retainDiverseBlocks(e, pool, f, cap)).toHaveLength(cap);
});
it('rejects a physical rotation masquerading as a primitive STM construction', () => {
  expect(() => describeBlockCandidate(e, advancedRouxFixture(e, 'solved'), f, ['y', "y'"])).toThrow(
    /STM/,
  );
});
