import type { CubeState } from './types';
export function copyCubeState(data: CubeState['data']): CubeState {
  const copy = structuredClone(data);
  for (const orbit of Object.values(copy)) {
    Object.freeze(orbit.pieces);
    Object.freeze(orbit.orientation);
    if (orbit.orientationMod) Object.freeze(orbit.orientationMod);
    Object.freeze(orbit);
  }
  return Object.freeze({ data: Object.freeze(copy) });
}
