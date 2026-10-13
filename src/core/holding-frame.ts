import type { CubeEngine, CubeState, TeachingMove } from './types';
const ROTATIONS: readonly TeachingMove[] = ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2'];
const pathsByEngine = new WeakMap<CubeEngine, Map<string, TeachingMove[]>>();
const centerKey = (engine: CubeEngine, state: CubeState) =>
  JSON.stringify(engine.observe(state).centers);
/** Only rotations are returned. View/camera changes never enter the move trace. */
export function canonicalHoldingMoves(engine: CubeEngine, state: CubeState): TeachingMove[] {
  let cache = pathsByEngine.get(engine);
  if (!cache) {
    cache = new Map();
    pathsByEngine.set(engine, cache);
  }
  const key = centerKey(engine, state),
    cached = cache.get(key);
  if (cached) return [...cached];
  const queue = [{ state, moves: [] as TeachingMove[] }],
    seen = new Set([key]);
  for (let head = 0; head < queue.length; head++) {
    const entry = queue[head],
      centers = engine.observe(entry.state).centers;
    if (centers.D === 'white' && centers.F === 'green') {
      cache.set(key, entry.moves);
      return [...entry.moves];
    }
    for (const move of ROTATIONS) {
      const next = engine.apply(entry.state, [move]),
        nextKey = centerKey(engine, next);
      if (!seen.has(nextKey)) {
        seen.add(nextKey);
        queue.push({ state: next, moves: [...entry.moves, move] });
      }
    }
  }
  throw new Error('Cannot place white down and green front in a valid holding frame.');
}
