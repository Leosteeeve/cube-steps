import type { CrossTable } from './table.ts';
import {
  CROSS_GOAL,
  CROSS_MOVES,
  CROSS_STATE_COUNT,
  rankCross,
  unrankCross,
  transitionCross,
} from './coordinates.ts';
export function generateCrossTable(): CrossTable {
  const distances = new Uint8Array(CROSS_STATE_COUNT).fill(255),
    queue = new Uint32Array(CROSS_STATE_COUNT),
    goalIndex = rankCross(CROSS_GOAL);
  distances[goalIndex] = 0;
  queue[0] = goalIndex;
  let tail = 1;
  for (let head = 0; head < tail; head++) {
    const index = queue[head],
      c = unrankCross(index),
      d = distances[index];
    for (const move of CROSS_MOVES) {
      const next = rankCross(transitionCross(c, move));
      if (distances[next] === 255) {
        distances[next] = d + 1;
        queue[tail++] = next;
      }
    }
  }
  if (tail !== CROSS_STATE_COUNT) throw new Error(`Cross generator reached only ${tail} states.`);
  return { version: 1, distances, goalIndex };
}
