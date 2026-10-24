import { summarizeComparisonFor } from '../../lab/trials/summary';
import type {
  RouxAttempt,
  RouxComparison,
  RouxTrialBlock,
  TimingMethod,
} from '../experiments/types';
export const summarizeRouxComparison = (
  c: RouxComparison,
  testerId: string,
  method: TimingMethod,
  blocks: readonly RouxTrialBlock[],
  attempts: readonly RouxAttempt[],
) => summarizeComparisonFor(c, testerId, method, blocks, attempts, 'roux-blocks');
export type RouxComparisonSummary = ReturnType<typeof summarizeRouxComparison>;
