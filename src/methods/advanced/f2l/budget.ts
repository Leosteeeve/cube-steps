import type { CubeEngine } from '../../../core/types';
import { RuleError } from '../../shared/trace';
export function createF2LBudget(
  engine: CubeEngine,
  limit: number,
): { engine: CubeEngine; used(): number } {
  let used = 0;
  return {
    used: () => used,
    engine: {
      ...engine,
      apply(state, moves) {
        if (used >= limit)
          throw new RuleError('budget', 'advanced-f2l', 'F2L shared simulation budget exceeded.');
        used++;
        return engine.apply(state, moves);
      },
    },
  };
}
