import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { ROUX_FRAMES, createRouxFrameMap } from '../frames';
import { createRouxSearchBudget, RouxBudgetStop } from '../budget';
import { ROUX_EXECUTION_CATALOG } from '../execution/catalog';
import { assertAdvancedDrafts } from '../../../../tests/helpers/advanced-roux';
import { createLseModel } from '../../roux/lse/model';
import { encodeLse } from '../../roux/lse/coordinates';
import { validateAdvancedLseBytes, type AdvancedLseAssets } from './assets';
import { planAdvancedLse } from './plan';
import { combineAdjacentTurns } from '../../shared/connected-actions';
import { readLsePolicy } from './assets';
import { lsePolicyMoves } from './model';
import { lseIndex } from '../../roux/lse/coordinates';
let e: CubeEngine, assets: AdvancedLseAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await validateAdvancedLseBytes(
    new Uint8Array(await readFile('src/methods/roux-advanced/data/lse-advanced.bin')),
  );
});
const moves: TeachingMove[] = ['M', 'U2', "M'", 'U', 'M2', "U'", 'M', 'U'];
it('solves with exact center phase and corner offset in all frames', () => {
  for (const frame of ROUX_FRAMES)
    for (const mode of ['combined', 'basic'] as const) {
      const start = e.apply(e.solved(), [...frame.positioningMoves, ...moves]);
      const result = planAdvancedLse(
        e,
        start,
        frame,
        assets,
        ROUX_EXECUTION_CATALOG,
        createRouxSearchBudget('normal', { now: () => 0 }),
        mode,
      );
      expect(result.mode).toBe(mode);
      expect(e.isSolved(result.state)).toBe(true);
      expect(e.equals(assertAdvancedDrafts(e, start, result.actions, frame), result.state)).toBe(
        true,
      );
      const endpoint = e.apply(
        start,
        result.actions.flatMap((a) => a.moves).slice(0, result.eolrBoundary),
      );
      expect(
        createLseModel(e).goal(
          encodeLse(e, createRouxFrameMap(e, frame.id).toCanonical(endpoint))!,
          'left-right',
        ),
      ).toBe(true);
    }
});
it('basic guidance reaches its own real EO checkpoint', () => {
  const frame = ROUX_FRAMES[0],
    start = e.apply(e.solved(), [...frame.positioningMoves, ...moves]);
  const result = planAdvancedLse(
    e,
    start,
    frame,
    assets,
    ROUX_EXECUTION_CATALOG,
    createRouxSearchBudget('normal', { now: () => 0 }),
    'basic',
  );
  let state = start,
    found = false;
  for (const action of result.actions) {
    state = e.apply(state, action.moves);
    if (action.rouxAdvanced.goal === 'Orient all six remaining edges') {
      found = true;
      expect(
        createLseModel(e).goal(
          encodeLse(e, createRouxFrameMap(e, frame.id).toCanonical(state))!,
          'orientation',
        ),
      ).toBe(true);
    }
  }
  expect(found).toBe(true);
});
it('skips last four when the selected EOLR endpoint is already solved', () => {
  const frame = ROUX_FRAMES[0],
    start = e.apply(e.solved(), [...frame.positioningMoves, 'M']);
  const result = planAdvancedLse(
    e,
    start,
    frame,
    assets,
    ROUX_EXECUTION_CATALOG,
    createRouxSearchBudget('normal', { now: () => 0 }),
    'combined',
  );
  expect(result.eolrBoundary).toBe(result.actions.flatMap((a) => a.moves).length);
  expect(e.isSolved(result.state)).toBe(true);
});
it('rejects damaged table bytes and a non-LSE input', async () => {
  const bytes = assets.tables.slice();
  bytes[100] ^= 1;
  await expect(validateAdvancedLseBytes(bytes)).rejects.toThrow(/integrity/);
  const frame = ROUX_FRAMES[0];
  expect(() =>
    planAdvancedLse(
      e,
      e.apply(e.solved(), [...frame.positioningMoves, 'R']),
      frame,
      assets,
      ROUX_EXECUTION_CATALOG,
      createRouxSearchBudget('normal', { now: () => 0 }),
      'combined',
    ),
  ).toThrow(/domain|block/);
});
it('does not overcount adjacent M turns at last-four maneuver boundaries', () => {
  const frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
  const setup: TeachingMove[] = ['M2', 'U2', 'M2', "U'", "M'", 'U2', 'M2', 'U2', 'M', 'U'];
  const nearest: TeachingMove[] = ['U', 'M2', 'U2', 'M2'];
  const start = e.apply(e.solved(), [...frame.positioningMoves, ...setup, ...nearest]);
  const result = planAdvancedLse(
    e,
    start,
    frame,
    assets,
    ROUX_EXECUTION_CATALOG,
    createRouxSearchBudget('normal', { now: () => 0 }),
    'basic',
  );
  const turns = result.actions.flatMap((a) => a.moves);
  expect(turns).toEqual(combineAdjacentTurns(turns));
});
it('a two-turn-longer EOLR prefix saves two turns over the nearest endpoint continuation', () => {
  const frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
  const setup: TeachingMove[] = [
    'M2',
    'U',
    "M'",
    "U'",
    "M'",
    "U'",
    'M',
    'U2',
    "M'",
    'U',
    'M',
    'U',
    'M',
    "U'",
  ];
  const start = e.apply(e.solved(), [...frame.positioningMoves, ...setup]);
  const combined = planAdvancedLse(
    e,
    start,
    frame,
    assets,
    ROUX_EXECUTION_CATALOG,
    createRouxSearchBudget('normal', { now: () => 0 }),
    'combined',
  );
  let c = encodeLse(e, start)!;
  const comparison: TeachingMove[] = [];
  const model = createLseModel(e);
  for (const goal of ['nearest', 'last'] as const)
    for (;;) {
      const p = readLsePolicy(assets, goal, lseIndex(c));
      if (!p.next) break;
      const moves = lsePolicyMoves(goal, p.next);
      comparison.push(...moves);
      c = model.step(c, moves);
    }
  expect(readLsePolicy(assets, 'nearest', lseIndex(encodeLse(e, start)!)).cost).toBe(10);
  expect(combined.eolrBoundary).toBe(12);
  expect(combined.actions.flatMap((a) => a.moves)).toHaveLength(14);
  expect(comparison).toEqual(combineAdjacentTurns(comparison));
  expect(comparison).toHaveLength(16);
  expect(e.isSolved(e.apply(start, comparison))).toBe(true);
});
it('reports shared-budget exhaustion even inside reused coordinate helpers', () => {
  const frame = ROUX_FRAMES[0],
    start = e.apply(e.solved(), [...frame.positioningMoves, ...moves]);
  const full = createRouxSearchBudget('normal', { now: () => 0 });
  planAdvancedLse(e, start, frame, assets, ROUX_EXECUTION_CATALOG, full, 'combined');
  const used = full.snapshot().operations;
  const caps = [
    ...Array.from({ length: 120 }, (_, i) => i + 1),
    ...Array.from({ length: 24 }, (_, i) => Math.max(1, Math.floor((used * (i + 1)) / 25))),
    used - 1,
  ];
  for (const maxOperations of caps)
    expect(() =>
      planAdvancedLse(
        e,
        start,
        frame,
        assets,
        ROUX_EXECUTION_CATALOG,
        createRouxSearchBudget('normal', { now: () => 0, maxOperations }),
        'combined',
      ),
    ).toThrow(RouxBudgetStop);
});
