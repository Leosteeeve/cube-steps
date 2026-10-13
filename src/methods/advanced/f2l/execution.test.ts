import { expect, it, beforeAll } from 'vitest';
import { compareExecution, rankWithNext, measureF2LExecution } from './execution';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, ExecutionMetrics } from '../../../core/types';
import { getCaseFixture } from '../../../algorithms/fixtures';
import { ALGORITHM_REGISTRY } from '../../../algorithms/registry';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
const metric = (quality: number, effort: number, rotations = 0): ExecutionMetrics => ({
  quality,
  effort,
  rotations,
  faceTurns: effort - rotations,
  reasons: [],
});
it('prefers visible comfortable work to a shorter awkward maneuver', () => {
  expect(compareExecution(metric(0, 9, 1), metric(2, 7))).toBeLessThan(0);
  expect(compareExecution(metric(0, 8), metric(0, 8, 1))).toBeLessThan(0);
  expect(rankWithNext(metric(1, 8), metric(2, 5)).slice(0, 2)).toEqual([4, 21]);
});
it('keeps an observable easy rear insertion comfortable', () => {
  const fixture = getCaseFixture('f2l-02/br/u0')!;
  const algorithm = ALGORITHM_REGISTRY.variants['f2l-02/no-regrip/br'];
  const metrics = measureF2LExecution(engine, fixture.initial, fixture.target!, [
    {
      kind: 'algorithm',
      ruleId: 'advanced-f2l-insert',
      caseId: fixture.caseId,
      algorithmId: algorithm.id,
      targets: [fixture.target!.cornerId, fixture.target!.edgeId],
      moves: [...algorithm.moves],
      recognition: '',
      explanation: '',
    },
  ]);
  expect(metrics).toMatchObject({ quality: 0, faceTurns: 3, rotations: 0, effort: 3 });
});
