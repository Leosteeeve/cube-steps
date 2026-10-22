import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine, CubeState } from '../src/core/types';
import { EDGE_SLOTS, CORNER_SLOTS } from '../src/core/observations';
import { rouxReferenceState } from '../src/methods/roux/frame';
import { generateBlockPolicies, admittedManeuvers } from '../src/methods/roux/blocks/policies';
import {
  admissibleIndices,
  blockTransition,
  coordinateAt,
  coordinateIndex,
  readBlockCoordinate,
  stepCoordinate,
  type BlockCoordinate,
} from '../src/methods/roux/blocks/coordinates';
import type { BlockGoal } from '../src/methods/roux/blocks/types';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
const parity = (p: number[]) =>
  p.reduce((n, v, i) => n + p.slice(i + 1).filter((w) => v > w).length, 0) % 2;
function fixture(goal: BlockGoal, c: BlockCoordinate): CubeState {
  const state = structuredClone(engine.apply(rouxReferenceState(engine), Array(c.phase).fill('M')));
  const originalParity = parity(state.data.EDGES.pieces) ^ parity(state.data.CORNERS.pieces);
  const excluded = [...goal.targetIds, ...goal.lockedIds];
  for (const [orbit, slots, base, value] of [
    ['EDGES', EDGE_SLOTS, 2, c.edge],
    ['CORNERS', CORNER_SLOTS, 3, c.corner],
  ] as const) {
    const target = goal.targetIds.find((id) => id.length === (orbit === 'EDGES' ? 2 : 3));
    if (!target) continue;
    const data = state.data[orbit],
      source = data.pieces.indexOf(slots.indexOf(target)),
      dest = Math.floor(value / base);
    [data.pieces[source], data.pieces[dest]] = [data.pieces[dest], data.pieces[source]];
    data.orientation[dest] = value % base;
    const free = data.pieces.findIndex((id) => !excluded.includes(slots[id]));
    const sum = data.orientation.reduce((a, b) => a + b, 0) % base;
    data.orientation[free] = (data.orientation[free] + base - sum) % base;
  }
  if ((parity(state.data.EDGES.pieces) ^ parity(state.data.CORNERS.pieces)) !== originalParity) {
    const free = state.data.EDGES.pieces
      .map((id, i) => ({ id, i }))
      .filter((p) => !excluded.includes(EDGE_SLOTS[p.id]));
    const [a, b] = free.map((p) => p.i);
    [state.data.EDGES.pieces[a], state.data.EDGES.pieces[b]] = [
      state.data.EDGES.pieces[b],
      state.data.EDGES.pieces[a],
    ];
  }
  return state;
}
it('admits every legal block subproblem and independently replays every maneuver transition', () => {
  const policies = generateBlockPolicies(engine);
  let covered = 0,
    transitions = 0;
  for (const table of policies.tables) {
    const goal = table.goal,
      maneuvers = admittedManeuvers(engine, goal),
      maps = maneuvers.map((m) => blockTransition(engine, m.moves));
    const domain = admissibleIndices(engine, goal);
    expect(table.covered).toBe(domain.length);
    for (const code of domain) {
      const coordinate = coordinateAt(code, goal),
        state = fixture(goal, coordinate);
      expect(readBlockCoordinate(engine, state, goal)).toEqual(coordinate);
      let descends = table.rank[code] === 0;
      for (let i = 0; i < maneuvers.length; i++) {
        const actual = readBlockCoordinate(engine, engine.apply(state, maneuvers[i].moves), goal);
        expect(stepCoordinate(coordinate, maps[i], goal)).toEqual(actual);
        if (table.rank[coordinateIndex(actual, goal)] === table.rank[code] - 1) descends = true;
        transitions++;
      }
      expect(descends).toBe(true);
      covered++;
    }
  }
  // Base edges: 12 and 9 free edge slots. Pairs: (11,8), (10,7),
  // (8,6), (7,5) free edge/corner slots; two pair orders and four M phases.
  expect(covered).toBe(12 * 2 * 4 + 9 * 2 * 4 + 2 * 4 * 2 * 3 * (11 * 8 + 10 * 7 + 8 * 6 + 7 * 5));
  expect(transitions).toBeGreaterThan(100000);
}, 120000);
