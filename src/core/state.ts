import type { CubeState } from './types';
export function copyCubeState(data: CubeState['data']): CubeState {
  // Cube orbits contain only number arrays. Copy them directly instead of
  // invoking the generic serializer on every simulated teaching maneuver.
  const copy: CubeState['data'] = Object.fromEntries(
    Object.entries(data).map(([id, orbit]) => [
      id,
      {
        ...orbit,
        pieces: [...orbit.pieces],
        orientation: [...orbit.orientation],
        ...(orbit.orientationMod ? { orientationMod: [...orbit.orientationMod] } : {}),
      },
    ]),
  );
  for (const orbit of Object.values(copy)) {
    Object.freeze(orbit.pieces);
    Object.freeze(orbit.orientation);
    if (orbit.orientationMod) Object.freeze(orbit.orientationMod);
    Object.freeze(orbit);
  }
  return Object.freeze({ data: Object.freeze(copy) });
}
