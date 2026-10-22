import type { CubeEngine } from '../../../core/types';
import { rouxReferenceState, rouxReferenceObservation } from '../frame';
import { blockTargets, blockComplete } from '../predicates';
import { ROUX_BLOCK_MANEUVERS, blockCatalogDigest, locksCorrect } from './catalog';
import {
  admissibleIndices,
  blockTransition,
  coordinateAt,
  coordinateIndex,
  goalKey,
  readBlockCoordinate,
  reverseTransition,
  stepCoordinate,
} from './coordinates';
import type { BlockGoal, BlockPolicy, RouxBlockPolicies } from './types';
export type { RouxBlockPolicies } from './types';
export function blockGoals(engine: CubeEngine): BlockGoal[] {
  const observation = rouxReferenceObservation(engine),
    all = [...observation.edges, ...observation.corners];
  const at = (slot: string) =>
    all.find((p) => [...p.slot].sort().join('') === [...slot].sort().join(''))!.id;
  const goals: BlockGoal[] = [];
  for (const side of ['left', 'right'] as const) {
    const sideLetter = side === 'left' ? 'L' : 'R',
      base = at('D' + sideLetter),
      left = side === 'right' ? blockTargets(engine, 'left').map((p) => p.id) : [];
    goals.push({ side, phase: 'base', targetIds: [base], lockedIds: left });
    const front = [at('DF' + sideLetter), at('F' + sideLetter)],
      back = [at('DB' + sideLetter), at('B' + sideLetter)];
    for (const [target, other] of [
      [front, back],
      [back, front],
    ])
      for (const completed of [false, true])
        goals.push({
          side,
          phase: 'pair',
          targetIds: target,
          lockedIds: [...left, base, ...(completed ? other : [])],
        });
  }
  return goals;
}
export function admittedManeuvers(engine: CubeEngine, goal: BlockGoal) {
  const reference = rouxReferenceState(engine);
  return ROUX_BLOCK_MANEUVERS.filter((m) => {
    let state = reference;
    for (const move of m.moves) {
      state = engine.apply(state, [move]);
      if (goal.side === 'right' && !blockComplete(engine, state, 'left')) return false;
    }
    return locksCorrect(engine, state, goal);
  });
}
export function generateBlockPolicies(engine: CubeEngine): RouxBlockPolicies {
  const tables: BlockPolicy[] = blockGoals(engine).map((goal) => {
    const allowed = admittedManeuvers(engine, goal),
      transitions = allowed.map((m) => blockTransition(engine, m.moves)),
      reverse = transitions.map(reverseTransition);
    const size = goal.phase === 'pair' ? 2304 : 96,
      rank = Array(size).fill(-1),
      cost = Array(size).fill(-1);
    const valid = admissibleIndices(engine, goal),
      set = new Set(valid),
      queue: number[] = [];
    const target = readBlockCoordinate(engine, rouxReferenceState(engine), goal);
    for (let phase = 0; phase < 4; phase++) {
      const code = coordinateIndex({ ...target, phase }, goal);
      rank[code] = 0;
      cost[code] = 0;
      queue.push(code);
    }
    for (let head = 0; head < queue.length; head++) {
      const code = queue[head],
        c = coordinateAt(code, goal);
      for (const t of reverse) {
        const next = coordinateIndex(stepCoordinate(c, t, goal), goal);
        if (set.has(next) && rank[next] < 0) {
          rank[next] = rank[code] + 1;
          queue.push(next);
        }
      }
    }
    if (queue.length !== valid.length)
      throw new Error(`Incomplete block policy ${goalKey(goal)}: ${queue.length}/${valid.length}`);
    for (const code of queue)
      if (rank[code] > 0) {
        const c = coordinateAt(code, goal);
        cost[code] = Math.min(
          ...transitions.map((t, i) => {
            const next = coordinateIndex(stepCoordinate(c, t, goal), goal);
            return rank[next] === rank[code] - 1 ? allowed[i].moves.length + cost[next] : Infinity;
          }),
        );
      }
    return {
      key: goalKey(goal),
      goal,
      rank,
      cost,
      allowed: allowed.map((m) => m.id),
      expected: valid.length,
      covered: queue.length,
    };
  });
  return { version: 1, catalogDigest: blockCatalogDigest(), tables };
}
export function validateBlockPolicies(raw: unknown): RouxBlockPolicies {
  const r = raw as RouxBlockPolicies;
  if (!r || r.version !== 1 || !Array.isArray(r.tables) || r.tables.length !== 10)
    throw new Error('Invalid Roux block policy.');
  if (r.catalogDigest !== blockCatalogDigest())
    throw new Error('Roux block catalog does not match its policies.');
  const keys = new Set<string>();
  for (const t of r.tables) {
    if (
      !t ||
      !t.goal ||
      t.key !== goalKey(t.goal) ||
      keys.has(t.key) ||
      !Array.isArray(t.rank) ||
      !Array.isArray(t.cost) ||
      t.rank.length !== (t.goal.phase === 'pair' ? 2304 : 96) ||
      t.cost.length !== t.rank.length ||
      !Array.isArray(t.allowed) ||
      !t.allowed.length ||
      t.allowed.some((id) => !ROUX_BLOCK_MANEUVERS.some((m) => m.id === id))
    )
      throw new Error('Invalid Roux block policy structure.');
    keys.add(t.key);
    if (
      t.covered !== t.expected ||
      t.expected <= 0 ||
      t.rank.filter((n) => Number.isInteger(n) && n >= 0).length !== t.expected ||
      t.rank.some((n) => !Number.isInteger(n) || n < -1) ||
      t.cost.some((n, i) => !Number.isInteger(n) || n < -1 || (t.rank[i] >= 0 && n < 0))
    )
      throw new Error('Roux block coverage is incomplete.');
  }
  return r;
}
