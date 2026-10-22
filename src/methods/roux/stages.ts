import type { CubeEngine, CubeState, StageId } from '../../core/types';
import { ROUX_INFO } from '../info';
import type { RouxStageId } from './types';
import { observeRouxFrame } from './frame';
import { blockComplete, topCornersOriented, cornerOffset, rouxSolved } from './predicates';
import { lseGoalReached } from './lse/model';
export const ROUX_STAGES = ROUX_INFO.stages;
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
