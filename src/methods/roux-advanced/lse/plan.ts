import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { encodeLse, lseIndex } from '../../roux/lse/coordinates';
import { createLseModelSteps } from '../../roux/lse/model';
import { createRouxFrameMap } from '../frames';
import { meterRouxEngine } from '../budget';
import type { AdvancedRouxActionDraft, RouxFrame, RouxSearchBudget } from '../types';
import type {
  RouxExecutionCatalog,
  RouxExecutionScore,
  RouxExecutionSegment,
} from '../execution/types';
import { scoreRouxExecutionSteps } from '../execution/score';
import { TEACHING_WORK, drainTeachingSteps, type TeachingWork } from '../../shared/work';
import { assertPieceCoordinates } from '../cmll/recognize';
import { readLsePolicy, type AdvancedLseAssets, type AdvancedLseGoal } from './assets';
import { lsePolicyMoves } from './model';
import { explainLseAction } from './explain';
export interface AdvancedLsePlan {
  mode: 'combined' | 'basic';
  actions: AdvancedRouxActionDraft[];
  state: CubeState;
  eolrBoundary: number;
  score: RouxExecutionScore;
}
function* computeAdvancedLse(
  engine: CubeEngine,
  initial: CubeState,
  frame: RouxFrame,
  assets: AdvancedLseAssets,
  execution: RouxExecutionCatalog,
  budget: RouxSearchBudget,
  mode: 'combined' | 'basic',
): Generator<TeachingWork, AdvancedLsePlan> {
  if (mode !== 'combined' && mode !== 'basic') throw Error('Unknown advanced LSE mode.');
  assertPieceCoordinates(initial);
  const e = meterRouxEngine(engine, budget),
    map = createRouxFrameMap(e, frame.id),
    model = yield* createLseModelSteps(e);
  let c = encodeLse(e, map.toCanonical(initial));
  budget.checkpoint();
  if (!c) throw Error('Complete both blocks and the corner ring before the LSE domain.');
  let state = initial,
    eolrBoundary = 0,
    total = 0;
  const actions: AdvancedRouxActionDraft[] = [],
    segments: RouxExecutionSegment[] = [];
  const walk = function* (goal: AdvancedLseGoal): Generator<TeachingWork, void> {
    const seen = new Set<number>();
    for (;;) {
      budget.charge('score');
      yield TEACHING_WORK;
      const code = lseIndex(c!),
        p = readLsePolicy(assets, goal, code);
      if (p.cost === 255) throw Error(`LSE policy hole ${goal}/${code}.`);
      if (!p.next) {
        const target = goal === 'eo' ? 'orientation' : goal === 'last' ? 'solved' : 'left-right';
        if (!model.goal(c!, target)) throw Error('False LSE endpoint.');
        break;
      }
      if (seen.has(code) || total > 100) throw Error('LSE policy repeated a state.');
      seen.add(code);
      const moves = [...lsePolicyMoves(goal, p.next)] as TeachingMove[],
        next = model.step(c!, moves),
        q = readLsePolicy(assets, goal, lseIndex(next));
      budget.charge('expand');
      if (q.cost + moves.length !== p.cost) throw Error('LSE policy is not strictly decreasing.');
      const before = state;
      state = e.apply(before, moves);
      c = next;
      total += moves.length;
      const actual = encodeLse(e, map.toCanonical(state));
      budget.checkpoint();
      if (!actual || lseIndex(actual) !== lseIndex(c!))
        throw Error('LSE coordinate disagrees with physical replay.');
      actions.push(explainLseAction(e, before, moves, state, frame, goal, !q.next));
      segments.push({ before, moves, targets: [], phase: 'blocks' });
    }
  };
  if (mode === 'basic') {
    yield* walk('eo');
    yield* walk('lr');
  } else yield* walk('combined');
  eolrBoundary = total;
  yield* walk('last');
  if (!e.equals(state, e.apply(e.solved(), frame.positioningMoves)))
    throw Error('LSE did not restore the full state and hold.');
  const score = yield* scoreRouxExecutionSteps(e, segments, frame, execution, budget);
  return { mode, actions, state, eolrBoundary, score };
}
export function* planAdvancedLseSteps(
  ...args: Parameters<typeof computeAdvancedLse>
): Generator<TeachingWork, AdvancedLsePlan> {
  try {
    return yield* computeAdvancedLse(...args);
  } catch (error) {
    // Reused beginner coordinate helpers intentionally return null on malformed
    // states. A sticky outer stop must not become a misleading domain failure.
    args[5].checkpoint();
    throw error;
  }
}
export function planAdvancedLse(...args: Parameters<typeof computeAdvancedLse>): AdvancedLsePlan {
  return drainTeachingSteps(planAdvancedLseSteps(...args));
}
