import type { CubeEngine, CubeState, StageId, AdvancedStageId } from '../../core/types';
import { whiteCrossSolved, firstTwoLayersSolved } from '../shared/pieces';
import { canonicalHoldingMoves } from '../../core/holding-frame';
import { ollSignature } from './recognize-oll';
import { pllSignature } from './recognize-pll';
export const ADVANCED_STAGE_IDS: readonly AdvancedStageId[] = [
  'advanced-cross',
  'advanced-f2l',
  'advanced-oll',
  'advanced-pll',
  'advanced-auf',
];
export function checkAdvancedStage(engine: CubeEngine, state: CubeState, id: StageId): boolean {
  const index = ADVANCED_STAGE_IDS.indexOf(id as AdvancedStageId);
  if (index < 0 || !whiteCrossSolved(engine, state)) return false;
  if (index === 0) return true;
  if (!firstTwoLayersSolved(engine, state)) return false;
  if (index === 1) return true;
  const held = engine.apply(state, canonicalHoldingMoves(engine, state));
  if (ollSignature(engine, held) !== 'UUUUUUUU') return false;
  if (index === 2) return true;
  if (pllSignature(engine, held) !== '0123|0123') return false;
  return index === 3 || engine.isSolved(state);
}
