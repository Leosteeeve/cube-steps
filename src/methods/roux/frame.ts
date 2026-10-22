import type { CubeEngine, CubeObservation, CubeState } from '../../core/types';
import type { Quarter } from './types';

export const ROUX_INITIAL_HOLD = ['x2', 'y'] as const;
const references = new WeakMap<
  CubeEngine,
  { state: CubeState; observation: CubeObservation; centerKeys: string[] }
>();
const centerKey = (o: CubeObservation) =>
  ['U', 'L', 'F', 'R', 'B', 'D'].map((f) => o.centers[f as keyof typeof o.centers]).join('/');
function reference(engine: CubeEngine) {
  let saved = references.get(engine);
  if (!saved) {
    const state = engine.apply(engine.solved(), ROUX_INITIAL_HOLD);
    let phase = state;
    const centerKeys: string[] = [];
    for (let i = 0; i < 4; i++) {
      centerKeys.push(centerKey(engine.observe(phase)));
      phase = engine.apply(phase, ['M']);
    }
    saved = { state, observation: engine.observe(state), centerKeys };
    references.set(engine, saved);
  }
  return saved;
}
export function rouxReferenceState(engine: CubeEngine): CubeState {
  return structuredClone(reference(engine).state);
}
export function rouxReferenceObservation(engine: CubeEngine): CubeObservation {
  return structuredClone(reference(engine).observation);
}
export function observeRouxFrame(
  engine: CubeEngine,
  state: CubeState,
): {
  sideFrameValid: boolean;
  centerPhase: Quarter | null;
  eoReferenceValid: boolean;
} {
  const observation = engine.observe(state);
  if (observation.centers.L !== 'blue' || observation.centers.R !== 'green')
    return { sideFrameValid: false, centerPhase: null, eoReferenceValid: false };
  const phase = reference(engine).centerKeys.indexOf(centerKey(observation));
  if (phase < 0) throw new Error('The centers do not belong to the fixed Roux middle-slice frame.');
  return { sideFrameValid: true, centerPhase: phase as Quarter, eoReferenceValid: phase % 2 === 0 };
}
