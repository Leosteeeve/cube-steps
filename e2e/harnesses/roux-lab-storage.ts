import { createCubeEngine } from '../../src/core/cube';
import { loadRouxLabAssets } from '../../src/roux-lab/browser-assets';
import { ROUX_FRAMES } from '../../src/methods/roux-advanced/frames';
import { createRouxSearchBudget } from '../../src/methods/roux-advanced/budget';
import { planBaselineBlocks } from '../../src/methods/roux-advanced/blocks/baseline';
import { completeRouxCandidate } from '../../src/methods/roux-advanced/complete';
import { validateRouxRoute } from '../../src/methods/roux-advanced/validate';
import { prepareRouxInput } from '../../src/methods/roux-advanced/input';
import {
  createRouxExperiment,
  verifyRouxExperiment,
} from '../../src/roux-lab/experiments/snapshots';
import type { RouxExperiment } from '../../src/roux-lab/experiments/types';
export async function storageFixture() {
  const engine = await createCubeEngine(),
    assets = await loadRouxLabAssets(),
    input = prepareRouxInput(engine, { kind: 'scramble', moves: ['R', 'F', 'U'] }),
    routes = [];
  for (const id of ['white-blue', 'yellow-red']) {
    const frame = ROUX_FRAMES.find((f) => f.id === id)!,
      budget = createRouxSearchBudget('lab', { now: () => 0 }),
      g = planBaselineBlocks(engine, input, frame, assets.beginner, budget);
    let v = g.next();
    while (!v.done) v = g.next();
    routes.push(
      validateRouxRoute(
        engine,
        completeRouxCandidate(engine, input, frame, v.value, assets, budget),
        assets,
      ),
    );
  }
  return createRouxExperiment(
    {
      input,
      settings: {
        mode: 'lab',
        allowedFrames: ['white-blue', 'yellow-red'],
        modelVersion: 'roux-execution-v1',
      },
      coverage: {
        elapsedMs: 1,
        operations: 1,
        entries: 1,
        retainedBytes: 100,
        frames: {},
        verifiedRoutes: 2,
      },
      routes,
    },
    routes.map((r) => r.id),
    'Stored pair',
  );
}
export async function verifyStored(e: RouxExperiment) {
  await verifyRouxExperiment(await createCubeEngine(), e, await loadRouxLabAssets());
}
