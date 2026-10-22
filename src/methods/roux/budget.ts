import type { SolveFailure, TeachingMove } from '../../core/types';
import type { RouxStageId } from './types';
export interface RouxLimits {
  maxNodes: number;
  maxMs: number;
  maxActions: number;
  maxMoves: number;
}
export const ROUX_LIMITS: Readonly<RouxLimits> = Object.freeze({
  maxNodes: 1000000,
  maxMs: 15000,
  maxActions: 160,
  maxMoves: 400,
});
export class RouxPlanningError extends Error {
  constructor(
    public code: SolveFailure['code'],
    public stageId: RouxStageId,
    message: string,
  ) {
    super(message);
  }
}
export interface RouxBudget {
  node(stage: RouxStageId): void;
  action(stage: RouxStageId, moves: readonly TeachingMove[]): void;
}
export function createRouxBudget(
  overrides: Partial<RouxLimits> = {},
  now: () => number = () => performance.now(),
): RouxBudget {
  const limits = { ...ROUX_LIMITS, ...overrides };
  if (Object.values(limits).some((n) => !Number.isSafeInteger(n) || n < 0))
    throw new Error('Roux limits must be finite non-negative integers.');
  const started = now();
  let nodes = 0,
    actions = 0,
    moves = 0;
  const checkTime = (stage: RouxStageId) => {
    if (now() - started >= limits.maxMs)
      throw new RouxPlanningError('budget', stage, 'Roux time budget exhausted.');
  };
  return {
    node(stage) {
      checkTime(stage);
      if (++nodes > limits.maxNodes)
        throw new RouxPlanningError('budget', stage, 'Roux search node budget exhausted.');
    },
    action(stage, tokens) {
      checkTime(stage);
      if (++actions > limits.maxActions)
        throw new RouxPlanningError('budget', stage, 'Roux action budget exhausted.');
      if ((moves += tokens.length) > limits.maxMoves)
        throw new RouxPlanningError('budget', stage, 'Roux move budget exhausted.');
    },
  };
}
