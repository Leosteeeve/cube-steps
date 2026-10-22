import type { CubeEngine, CubeState } from '../../../core/types';
import type { RouxBudget } from '../budget';
import type { RouxBlockPolicies } from './types';
import { planSideBlock } from './build-block';
export const planSecondBlock = (
  engine: CubeEngine,
  initial: CubeState,
  policies: RouxBlockPolicies,
  budget: RouxBudget,
) => planSideBlock(engine, initial, 'right', policies, budget);
