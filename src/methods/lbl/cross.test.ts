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
it('solves the cross from all 24 locations/orientations of each white edge', () => {
  const coverage = new Map<string, Set<string>>(
    ['UF', 'UR', 'UB', 'UL'].map((id) => [id, new Set()]),
  );
  for (let seed = 1; seed <= 200; seed++) {
    const initial = engine.apply(engine.solved(), seededScramble(seed));
    for (const p of engine.observe(initial).edges)
      coverage
        .get(p.id)
        ?.add(`${p.slot}/${Object.entries(p.stickers).find(([, c]) => c === 'white')?.[0]}`);
    const trace = firstStages(engine, initial, 1);
    expect(checkStage(engine, trace.final, 'white-cross'), `seed ${seed}`).toBe(true);
    expect(replayMatchesRecordedStates(engine, trace)).toBe(true);
  }
  for (const cases of coverage.values()) expect(cases.size).toBe(24);
  expect(firstStages(engine, engine.solved(), 1).stages[0].actions).toHaveLength(0);
});
