import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { checkStage } from './stages';
import { firstStages } from '../../../tests/helpers/stages';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { replayMatchesRecordedStates } from '../../../tests/helpers/trace';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('handles left/right insertion and extraction without losing the first layer', () => {
  const rules = new Set<string>(),
    algorithms = new Set<string>();
  for (let seed = 1; seed <= 100; seed++) {
    const trace = firstStages(engine, engine.apply(engine.solved(), seededScramble(seed)), 3);
    expect(checkStage(engine, trace.final, 'middle-layer'), `seed ${seed}`).toBe(true);
    expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
    trace.stages[2].actions.forEach((a) => {
      rules.add(a.ruleId);
      if (a.algorithmId) algorithms.add(a.algorithmId);
    });
  }
  expect(rules.has('middle-eject')).toBe(true);
  expect(algorithms.has('middle-left') && algorithms.has('middle-right')).toBe(true);
});
