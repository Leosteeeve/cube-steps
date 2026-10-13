import { beforeAll, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine, TraceStage, SolveTrace } from '../src/core/types';
import { canonicalHoldingMoves } from '../src/core/holding-frame';
import { countTeachingMoves } from '../src/core/move-metrics';
import { solveAdvancedCFOP } from '../src/methods/advanced/solve';
import { extractCross, rankCross } from '../src/methods/advanced/cross/coordinates';
import { solveCFOP } from '../src/methods/cfop/solve';
import { solveCFOPF2L } from '../src/methods/cfop/f2l';
import { CFOP_RUNTIME } from '../src/methods/cfop/definition';
import { createMethodTrace, flattenTrace } from '../src/methods/shared/trace';
import { seededScramble } from './fixtures/lbl-cases';
import { getCaseFixture } from '../src/algorithms/fixtures';
import { chooseF2LCandidate } from '../src/methods/advanced/f2l/select';
let engine: CubeEngine;
const assets = {
  crossTable: {
    version: 1 as const,
    goalIndex: 69760,
    distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
  },
};
beforeAll(async () => {
  engine = await createCubeEngine();
});
const stageMetrics = (stage: TraceStage) =>
  countTeachingMoves(stage.actions.flatMap((a) => a.moves));
const wholeMetrics = (trace: SolveTrace) => countTeachingMoves(flattenTrace(trace).moves);
function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b),
    percentile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1];
  return {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    median: percentile(0.5),
    p95: percentile(0.95),
  };
}
it('reports comfort-first tradeoffs while preserving every shortest cross', () => {
  const qualityCategories = { visibleComfortable: 0, otherQuality: 0 };
  const rows: {
    seed: number;
    crossMinimum: number;
    advancedF2L: ReturnType<typeof countTeachingMoves>;
    beginnerF2L: ReturnType<typeof countTeachingMoves>;
    advancedFull: ReturnType<typeof countTeachingMoves>;
    beginnerFull: ReturnType<typeof countTeachingMoves>;
  }[] = [];
  const start = performance.now();
  for (let seed = 1; seed <= 1000; seed++) {
    const input = engine.apply(engine.solved(), seededScramble(seed)),
      advanced = solveAdvancedCFOP(engine, input, assets),
      beginner = solveCFOP(engine, input);
    if (!advanced.ok || !beginner.ok)
      throw Error('Seed ' + seed + ': ' + JSON.stringify({ advanced, beginner }));
    const cross = advanced.trace.stages[0],
      aF2L = advanced.trace.stages[1];
    for (const action of aF2L.actions)
      if (action.selection?.policyVersion === 'f2l-human-v2') {
        qualityCategories[
          action.selection.current.quality === 0 ? 'visibleComfortable' : 'otherQuality'
        ]++;
      }
    const held = engine.apply(input, canonicalHoldingMoves(engine, input)),
      minimum = assets.crossTable.distances[rankCross(extractCross(engine, held))];
    expect(stageMetrics(cross).faceTurnEquivalents, 'Shortest cross seed ' + seed).toBe(minimum);
    // Advanced has already run its F2L from this exact cross state in the full solve.
    expect(engine.equals(aF2L.before, cross.after)).toBe(true);
    const trace = createMethodTrace(engine, cross.after, CFOP_RUNTIME);
    trace.beginStage('cfop-f2l');
    const f2l = solveCFOPF2L({ engine, trace });
    if (!f2l.ok) throw Error('Beginner F2L seed ' + seed + ': ' + f2l.message);
    trace.endStage();
    const bF2L = trace.finish().stages[0];
    expect(engine.equals(aF2L.before, bF2L.before)).toBe(true);
    expect(CFOP_RUNTIME.checkStage(engine, aF2L.after, 'cfop-f2l')).toBe(true);
    rows.push({
      seed,
      crossMinimum: minimum,
      advancedF2L: stageMetrics(aF2L),
      beginnerF2L: stageMetrics(bF2L),
      advancedFull: wholeMetrics(advanced.trace),
      beginnerFull: wholeMetrics(beginner.trace),
    });
  }
  const metrics = (key: 'advancedF2L' | 'beginnerF2L' | 'advancedFull' | 'beginnerFull') => ({
    turns: summarize(rows.map((r) => r[key].faceTurnEquivalents)),
    rotations: summarize(rows.map((r) => r[key].rotations)),
  });
  const report = {
    policyVersion: 'f2l-human-v2',
    qualityCategories,
    baseline: JSON.parse(readFileSync('docs/validation/data/f2l-human-baseline.json', 'utf8')),
    seeds: { from: 1, to: 1000, source: 'seededScramble in tests/fixtures/lbl-cases.ts' },
    percentile: 'nearest rank',
    environment: { node: process.version, platform: platform(), cpu: cpus()[0]?.model },
    elapsedMs: performance.now() - start,
    advancedF2L: metrics('advancedF2L'),
    beginnerF2L: metrics('beginnerF2L'),
    advancedFull: metrics('advancedFull'),
    beginnerFull: metrics('beginnerFull'),
    rows,
  };
  const awkward = getCaseFixture('f2l-20/br/u0')!,
    easy = getCaseFixture('f2l-02/br/u0')!;
  const rotated = chooseF2LCandidate(engine, awkward.initial),
    retained = chooseF2LCandidate(engine, easy.initial);
  expect(rotated.metrics.quality).toBe(0);
  expect(rotated.actions.some((a) => a.ruleId === 'advanced-f2l-regrip')).toBe(true);
  expect(retained.metrics.rotations).toBe(0);
  expect(retained.actions.flatMap((a) => a.moves)).toEqual(["R'", "U'", 'R']);
  const diagnostics = {
    meanAtMost90PercentBeginner:
      report.advancedF2L.turns.mean <= report.beginnerF2L.turns.mean * 0.9,
    medianNoGreaterThanBeginner: report.advancedF2L.turns.median <= report.beginnerF2L.turns.median,
    rotationsNoGreaterThanBeginner:
      report.advancedF2L.rotations.mean <= report.beginnerF2L.rotations.mean,
  };
  const ergonomics = {
    usefulRegrip: { fixture: awkward.id, metrics: rotated.metrics },
    easyRear: { fixture: easy.id, metrics: retained.metrics },
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    'test-results/advanced-efficiency.json',
    JSON.stringify({ ...report, diagnostics, ergonomics }, null, 2) + '\n',
  );
  console.log(JSON.stringify({ ...report, diagnostics, ergonomics, rows: undefined }));
}, 600000);
