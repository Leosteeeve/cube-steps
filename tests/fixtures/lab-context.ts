import { readFileSync } from 'node:fs';
import type { CubeEngine, Color } from '../../src/core/types';
import type { LabInput } from '../../src/lab/types';
import { createLabFrame } from '../../src/lab/frames';
import { createLabBudget } from '../../src/lab/budget';
import { exploreCross } from '../../src/lab/cross';
import { planLabF2L } from '../../src/lab/f2l/planner';
import { EXECUTION_CATALOG } from '../../src/lab/execution/profiles';
import { finalizeLabRoute } from '../../src/lab/finalize';
export function labContext(engine: CubeEngine) {
  return {
    engine,
    profiles: EXECUTION_CATALOG,
    table: {
      version: 1 as const,
      goalIndex: 69760,
      distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
    },
  };
}
export function fixtureLabRoute(engine: CubeEngine, input: LabInput, bottom: Color = 'white') {
  const context = labContext(engine),
    budget = createLabBudget({ now: () => 0 });
  const frame = createLabFrame(engine, input, {
    bottom,
    front: bottom === 'green' || bottom === 'blue' ? 'white' : 'green',
  });
  for (const e of exploreCross(engine, input, frame, context.table, budget, {
    extraLengths: [0],
    maxCompletions: 1,
  })) {
    if (e.kind !== 'cross') continue;
    for (const end of planLabF2L(engine, e.candidate, context.profiles, budget))
      if (end.kind === 'f2l') return finalizeLabRoute(context, input, end);
  }
  throw Error('Fixture produced no Lab route');
}
