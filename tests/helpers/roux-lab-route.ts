import { createCubeEngine } from '../../src/core/cube';
import type { CubeEngine, FaceMove } from '../../src/core/types';
import { loadTestAdvancedRouxAssets } from './roux-advanced-assets';
import type { AdvancedRouxAssets } from '../../src/methods/roux-advanced/assets';
import { prepareRouxInput } from '../../src/methods/roux-advanced/input';
import { ROUX_FRAMES } from '../../src/methods/roux-advanced/frames';
import type { RouxFrameId } from '../../src/methods/roux-advanced/types';
import { createRouxSearchBudget } from '../../src/methods/roux-advanced/budget';
import { planBaselineBlocks } from '../../src/methods/roux-advanced/blocks/baseline';
import { completeRouxCandidate } from '../../src/methods/roux-advanced/complete';
import { validateRouxRoute } from '../../src/methods/roux-advanced/validate';
export async function rouxLabContext() {
  return { engine: await createCubeEngine(), assets: await loadTestAdvancedRouxAssets() };
}
export function fixtureRouxRoute(
  e: CubeEngine,
  assets: AdvancedRouxAssets,
  id: RouxFrameId = 'white-blue',
  moves: readonly FaceMove[] = ['R', 'F', 'U'],
) {
  const input = prepareRouxInput(e, { kind: 'scramble', moves }),
    frame = ROUX_FRAMES.find((f) => f.id === id)!,
    budget = createRouxSearchBudget('lab', { now: () => 0 });
  const g = planBaselineBlocks(e, input, frame, assets.beginner, budget);
  let v = g.next();
  while (!v.done) v = g.next();
  return validateRouxRoute(
    e,
    completeRouxCandidate(e, input, frame, v.value, assets, budget),
    assets,
  );
}
