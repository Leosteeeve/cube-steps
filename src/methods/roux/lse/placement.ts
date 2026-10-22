import type { CubeEngine, CubeState } from '../../../core/types';
import type { RouxBudget } from '../budget';
import type { LseTables } from './policies';
import { lseGoalReached } from './model';
import { traverseLse } from './traverse';
export const leftRightEdgesPlaced = (engine: CubeEngine, state: CubeState) =>
  lseGoalReached(engine, state, 'left-right');
export const planLeftRightEdges = (
  engine: CubeEngine,
  initial: CubeState,
  tables: LseTables,
  budget: RouxBudget,
) => traverseLse(engine, initial, tables, budget, 'left-right');
export const planLastFourEdges = (
  engine: CubeEngine,
  initial: CubeState,
  tables: LseTables,
  budget: RouxBudget,
) => traverseLse(engine, initial, tables, budget, 'solved');
