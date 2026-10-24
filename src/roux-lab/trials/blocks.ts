import { createComparisonBlocks, selectEligibleAttemptsFor } from '../../lab/trials/blocks';
import type { RouxAttempt, RouxComparison, RouxTrialBlock } from '../experiments/types';
export const createRouxComparisonBlocks = (c: RouxComparison, count = 5) =>
  createComparisonBlocks(c, count);
export const selectEligibleRouxAttempts = (
  attempts: readonly RouxAttempt[],
  blocks: readonly RouxTrialBlock[],
) => selectEligibleAttemptsFor(attempts, blocks, 'roux-blocks');
