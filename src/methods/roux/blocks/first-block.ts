import type { CubeEngine, CubeState } from '../../../core/types';
import type { RouxBudget } from '../budget';
import type { RouxBlockPolicies } from './types';
import { planSideBlock } from './build-block';
export const planFirstBlock = (
  engine: CubeEngine,
  initial: CubeState,
  policies: RouxBlockPolicies,
  budget: RouxBudget,
) => planSideBlock(engine, initial, 'left', policies, budget);
