import { expect, it } from 'vitest';
import { generateCrossTable } from '../src/methods/advanced/cross/generate';
import {
  CROSS_GOAL,
  CROSS_MOVES,
  CROSS_STATE_COUNT,
  rankCross,
  unrankCross,
  transitionCross,
  extractCross,
} from '../src/methods/advanced/cross/coordinates';
import { createCubeEngine } from '../src/core/cube';
it('proves_every_cross_distance', () => {
  const table = generateCrossTable();
  expect(table.distances.length).toBe(190080);
  expect([...table.distances].filter((d) => d === 0)).toHaveLength(1);
  expect(table.goalIndex).toBe(rankCross(CROSS_GOAL));
  let visited = 0;
  for (let i = 0; i < CROSS_STATE_COUNT; i++) {
    const c = unrankCross(i),
      d = table.distances[i];
    if (rankCross(c) !== i || d === 255) throw new Error(`Bad coordinate or uncovered state ${i}`);
    let descent = d === 0;
    for (const move of CROSS_MOVES) {
      const next = table.distances[rankCross(transitionCross(c, move))];
      if (Math.abs(d - next) > 1) throw new Error(`Nonmetric transition ${i} ${move}`);
      if (next === d - 1) descent = true;
    }
    if (!descent) throw new Error(`No shortest successor from ${i}`);
    visited++;
  }
  expect(visited).toBe(190080);
}, 120000);
it('agrees_with_independent_shallow_cube_bfs', async () => {
  const engine = await createCubeEngine(),
    goal = engine.apply(engine.solved(), ['z2']),
    table = generateCrossTable();
  const key = (s: typeof goal) =>
    engine
      .observe(s)
      .edges.filter((p) => ['UF', 'UL', 'UB', 'UR'].includes(p.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(
        (p) => `${p.id}:${p.slot}:${Object.entries(p.stickers).find(([, c]) => c === 'white')![0]}`,
      )
      .join('|');
  const queue = [{ state: goal, depth: 0 }],
    seen = new Set([key(goal)]);
  for (let head = 0; head < queue.length; head++) {
    const { state, depth } = queue[head];
    expect(table.distances[rankCross(extractCross(engine, state))]).toBe(depth);
    if (depth === 3) continue;
    for (const move of CROSS_MOVES) {
      const next = engine.apply(state, [move]),
        k = key(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({ state: next, depth: depth + 1 });
      }
    }
  }
  expect(seen.size).toBeGreaterThan(500);
}, 120000);
