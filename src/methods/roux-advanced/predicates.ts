import type { CubeEngine, CubeState } from '../../core/types';
import { blockComplete, cornerOffset, rouxSolved } from '../roux/predicates';
import { observeRouxFrame } from '../roux/frame';
import { createRouxFrameMap } from './frames';
import { RouxBudgetStop } from './budget';
import type { RouxFrame, Quarter } from './types';
export function observeAdvancedFrame(
  engine: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
): { sideFrameValid: boolean; centerPhase: Quarter | null; cornerOffset: Quarter | null } {
  try {
    const canonical = createRouxFrameMap(engine, frame.id).toCanonical(state);
    const observed = observeRouxFrame(engine, canonical);
    if (!observed.sideFrameValid || observed.centerPhase === null)
      return { sideFrameValid: false, centerPhase: null, cornerOffset: null };
    return {
      sideFrameValid: true,
      centerPhase: observed.centerPhase,
      cornerOffset: cornerOffset(engine, canonical),
    };
  } catch (error) {
    if (error instanceof RouxBudgetStop) throw error;
    return { sideFrameValid: false, centerPhase: null, cornerOffset: null };
  }
}
export function blockCompleteInFrame(
  engine: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
  side: 'left' | 'right',
): boolean {
  if (!observeAdvancedFrame(engine, state, frame).sideFrameValid) return false;
  return blockComplete(engine, createRouxFrameMap(engine, frame.id).toCanonical(state), side);
}
export function advancedRouxSolved(
  engine: CubeEngine,
  state: CubeState,
  frame: RouxFrame,
): boolean {
  const observed = observeAdvancedFrame(engine, state, frame);
  return (
    observed.sideFrameValid &&
    observed.centerPhase === 0 &&
    observed.cornerOffset === 0 &&
    rouxSolved(engine, createRouxFrameMap(engine, frame.id).toCanonical(state))
  );
}
