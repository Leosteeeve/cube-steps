import type { CubeEngine, CubeState, StageId } from '../../core/types';
import type { StageDefinition } from '../contracts';
import type { RouxStageId } from './types';
import { observeRouxFrame } from './frame';
import { blockComplete, topCornersOriented, cornerOffset, rouxSolved } from './predicates';
import { lseGoalReached } from './lse/model';
export const ROUX_STAGES: readonly StageDefinition[] = [
  { id: 'roux-frame', label: 'Holding and the middle slice', group: 'Foundation' },
  { id: 'roux-first-block', label: 'Build the left block', group: 'Blocks' },
  { id: 'roux-second-block', label: 'Build the right block', group: 'Blocks' },
  { id: 'roux-corner-orientation', label: 'Orient the yellow corners', group: 'Corners' },
  { id: 'roux-corner-permutation', label: 'Position the corners', group: 'Corners' },
  { id: 'roux-edge-orientation', label: 'Orient the last six edges', group: 'LSE' },
  { id: 'roux-left-right-edges', label: 'Place the left and right edges', group: 'LSE' },
  { id: 'roux-last-four-edges', label: 'Finish the last four edges', group: 'Finish' },
];
export const ROUX_STAGE_IDS = ROUX_STAGES.map((s) => s.id) as RouxStageId[];
export function checkRouxStage(engine: CubeEngine, state: CubeState, id: StageId): boolean {
  try {
    if (id === 'roux-frame') return observeRouxFrame(engine, state).sideFrameValid;
    if (id === 'roux-first-block') return blockComplete(engine, state, 'left');
    if (id === 'roux-second-block')
      return blockComplete(engine, state, 'left') && blockComplete(engine, state, 'right');
    if (id === 'roux-corner-orientation' || id === 'roux-corner-permutation')
      return (
        blockComplete(engine, state, 'left') &&
        blockComplete(engine, state, 'right') &&
        (id === 'roux-corner-orientation'
          ? topCornersOriented(engine, state)
          : cornerOffset(engine, state) === 0)
      );
    if (id === 'roux-edge-orientation') return lseGoalReached(engine, state, 'orientation');
    if (id === 'roux-left-right-edges') return lseGoalReached(engine, state, 'left-right');
    return id === 'roux-last-four-edges' && rouxSolved(engine, state);
  } catch {
    return false;
  }
}
