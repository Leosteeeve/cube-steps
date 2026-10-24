import type { CubeEngine } from '../../../core/types';
import type { RouxBudget } from '../../roux/budget';
import { validateRouxAssets } from '../../roux/assets';
import { planSideBlockSteps } from '../../roux/blocks/build-block';
import { createRouxFrameMap } from '../frames';
import { meterRouxEngine } from '../budget';
import type {
  RouxAssets,
  RouxFrame,
  RouxInput,
  RouxSearchBudget,
  TwoBlockCandidate,
} from '../types';
import { describeBlockCandidate } from './candidates';
import { compactBlockMoves, explainBlockRoute } from './explain';
const admitted = new WeakMap<RouxSearchBudget, WeakSet<RouxAssets>>();

export function* planBaselineBlocks(
  raw: CubeEngine,
  input: RouxInput,
  frame: RouxFrame,
  assets: RouxAssets,
  budget: RouxSearchBudget,
): Generator<{ kind: 'work' }, TwoBlockCandidate> {
  budget.checkpoint();
  let cache = admitted.get(budget);
  if (!cache) {
    cache = new WeakSet();
    admitted.set(budget, cache);
  }
  if (!cache.has(assets)) {
    // Account for the bounded static-policy scan once per outer request, with
    // cancellation points before validation. Loaded assets are deeply frozen.
    for (const table of assets.blockPolicies.tables) {
      let remaining = table.rank.length + table.cost.length + table.allowed.length;
      while (remaining > 0) {
        const chunk = Math.min(256, remaining);
        budget.charge('score', chunk);
        remaining -= chunk;
        yield { kind: 'work' };
      }
    }
    validateRouxAssets(assets);
    cache.add(assets);
  } else budget.charge('score');
  const e = meterRouxEngine(raw, budget),
    map = createRouxFrameMap(e, frame.id),
    held = e.apply(input.initial, frame.positioningMoves);
  const bridge: RouxBudget = {
    validateBlocks: (policies) => {
      budget.charge('score');
      if (policies !== assets.blockPolicies) throw Error('The baseline policy identity changed.');
    },
    check: () => budget.checkpoint(),
    node: () => budget.charge('expand'),
    action: (_stage, moves) => budget.charge('simulate', Math.max(1, moves.length)),
  };
  const left = yield* planSideBlockSteps(
    e,
    map.toCanonical(held),
    'left',
    assets.blockPolicies,
    bridge,
  );
  budget.checkpoint();
  if (!left.ok) throw Error(`Baseline first block failed: ${left.message}`);
  const firstMoves = compactBlockMoves(
    e,
    held,
    map.toPhysicalMoves(left.actions.flatMap((a) => a.moves)),
  );
  const first = describeBlockCandidate(e, held, frame, firstMoves);
  yield { kind: 'work' };
  const right = yield* planSideBlockSteps(
    e,
    map.toCanonical(first.state),
    'right',
    assets.blockPolicies,
    bridge,
  );
  budget.checkpoint();
  if (!right.ok) throw Error(`Baseline second block failed: ${right.message}`);
  const secondMoves = compactBlockMoves(
    e,
    first.state,
    map.toPhysicalMoves(right.actions.flatMap((a) => a.moves)),
  );
  const state = e.apply(first.state, secondMoves),
    actions = explainBlockRoute(e, input, frame, first.moves, secondMoves);
  if (!e.equals(state, map.fromCanonical(right.state)))
    throw Error('Baseline color mapping changed the physical endpoint.');
  return { first, secondMoves, state, secondTurns: secondMoves.length, actions };
}
