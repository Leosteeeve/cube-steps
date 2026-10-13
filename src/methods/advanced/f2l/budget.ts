import type { CubeEngine, CubeState, CubeObservation } from '../../../core/types';
import { RuleError } from '../../shared/trace';
export function createF2LBudget(
  engine: CubeEngine,
  limit: number,
): { engine: CubeEngine; used(): number } {
  let used = 0;
  // Search states are immutable for this synchronous selection. Caches die
  // with the selection and are bounded by the same simulation budget.
  const stateKeys = new WeakMap<CubeState, string>(),
    results = new Map<string, CubeState>();
  const observations = new WeakMap<CubeState, CubeObservation>();
  function key(state: CubeState) {
    let k = stateKeys.get(state);
    if (!k) {
      k = JSON.stringify(state.data);
      stateKeys.set(state, k);
    }
    return k;
  }
  return {
    used: () => used,
    engine: {
      ...engine,
      observe(state) {
        let o = observations.get(state);
        if (!o) {
          o = engine.observe(state);
          observations.set(state, o);
        }
        return o;
      },
      apply(state, moves) {
        if (used >= limit)
          throw new RuleError('budget', 'advanced-f2l', 'F2L shared simulation budget exceeded.');
        used++;
        const k = key(state) + '|' + moves.join(' ');
        let result = results.get(k);
        if (!result) {
          result = engine.apply(state, moves);
          results.set(k, result);
        }
        return result;
      },
    },
  };
}
