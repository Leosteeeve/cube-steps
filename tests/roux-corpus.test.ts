import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine } from '../src/core/types';
import { solveRoux } from '../src/methods/roux/solve';
import type { RouxAssets } from '../src/methods/roux/assets';
import * as budgets from '../src/methods/roux/budget';
import { seededScramble } from './fixtures/lbl-cases';
import { assertCompleteRouxTrace, loadTestRouxAssets } from './helpers/roux';
let e: CubeEngine,
  assets: RouxAssets,
  loadMs = 0,
  nodes = 0;
const clock = () => performance.now();
const rows: { seed: number; ms: number; nodes: number; actions: number; moves: number }[] = [];
beforeAll(async () => {
  e = await createCubeEngine();
  const t = performance.now();
  assets = await loadTestRouxAssets();
  loadMs = performance.now() - t;
  const original = budgets.createRouxBudget;
  vi.spyOn(budgets, 'createRouxBudget').mockImplementation((limits, now) => {
    const budget = original(limits, now);
    if (now !== clock) return budget;
    return {
      ...budget,
      node(stage) {
        nodes++;
        budget.node(stage);
      },
    };
  });
});
for (let batch = 0; batch < 10; batch++)
  it(`replays fixed scramble seeds ${batch * 100 + 1}-${batch * 100 + 100}`, () => {
    for (let seed = batch * 100 + 1; seed <= batch * 100 + 100; seed++) {
      const moves = seededScramble(seed),
        initial = e.apply(e.solved(), moves);
      nodes = 0;
      const start = performance.now(),
        r = solveRoux(e, initial, assets, {}, clock),
        ms = performance.now() - start;
      if (!r.ok) throw Error(`seed ${seed}; ${moves.join(' ')}; ${r.stageId}: ${r.message}`);
      assertCompleteRouxTrace(e, initial, r.trace);
      const actions = r.trace.stages.flatMap((s) => s.actions);
      rows.push({
        seed,
        ms,
        nodes,
        actions: actions.length,
        moves: actions.reduce((n, a) => n + a.moves.length, 0),
      });
    }
  }, 180000);
it('repeats the first 50 fixed seeds deterministically', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const initial = e.apply(e.solved(), seededScramble(seed)),
      a = solveRoux(e, initial, assets),
      b = solveRoux(e, initial, assets);
    expect(a.ok).toBe(true);
    expect(b).toEqual(a);
  }
}, 180000);
afterAll(() => {
  const times = rows.map((r) => r.ms).sort((a, b) => a - b),
    max = (key: 'ms' | 'nodes' | 'actions' | 'moves') => Math.max(...rows.map((r) => r[key]));
  const report = {
    seeds: rows.length,
    node: process.version,
    platform: process.platform,
    localAssetLoadMs: loadMs,
    p50Ms: times[Math.floor(times.length * 0.5)],
    p95Ms: times[Math.floor(times.length * 0.95)],
    maxMs: max('ms'),
    maxNodes: max('nodes'),
    maxActions: max('actions'),
    maxMoves: max('moves'),
  };
  console.info('ROUX_CORPUS_METRICS', JSON.stringify(report));
  if (process.env.CUBESTEPS_ROUX_METRICS)
    writeFileSync(process.env.CUBESTEPS_ROUX_METRICS, JSON.stringify(report, null, 2) + '\n');
  if (rows.length === 1000) expect(max('nodes')).toBeGreaterThan(0);
  vi.restoreAllMocks();
});
