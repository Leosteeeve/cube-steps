import type { Color, CubeEngine, CubeState, FaceMove } from '../core/types';
import {
  CROSS_GOAL,
  CROSS_MOVES,
  CROSS_STATE_COUNT,
  extractCross,
  rankCross,
  transitionCross,
} from '../methods/advanced/cross/coordinates';
import type { CrossCoordinate } from '../methods/advanced/cross/coordinates';
import type { CrossTable } from '../methods/advanced/cross/table';
import { observeF2LPairs } from '../methods/cfop/f2l-cases';
import type { LabFrame } from './frames';
import type { LabHold, LabInput } from './types';
import { LAB_WORK, LabStopped, meterLabEngine, type LabBudget, type LabWork } from './budget';

export interface CrossCandidate {
  frame: LabFrame;
  hold: LabHold;
  moves: readonly FaceMove[];
  after: CubeState;
  canonicalAfter: CubeState;
  minimum: number;
  length: number;
  solvedPairIds: readonly string[];
}
export interface CrossQuota {
  claim(color: Color): boolean;
  used(color: Color): number;
}
export function createCrossQuota(limit = 96): CrossQuota {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 96)
    throw Error('Invalid per-color cross quota.');
  const counts = new Map<Color, number>();
  return {
    claim(color) {
      const n = counts.get(color) ?? 0;
      if (n >= limit) return false;
      counts.set(color, n + 1);
      return true;
    },
    used: (color) => counts.get(color) ?? 0,
  };
}
const defaultQuotas = new WeakMap<LabBudget, CrossQuota>();
interface CrossOptions {
  extraLengths?: readonly (0 | 1 | 2)[];
  maxCompletions?: number;
  quota?: CrossQuota;
}

function distance(table: CrossTable, coordinate: CrossCoordinate): number {
  const result = table.distances[rankCross(coordinate)];
  if (!Number.isInteger(result) || result < 0 || result > 8)
    throw Error('Cross coordinate is absent from the verified table.');
  return result;
}
function checkTable(table: CrossTable) {
  if (
    table.version !== 1 ||
    table.distances.length !== CROSS_STATE_COUNT ||
    table.goalIndex !== rankCross(CROSS_GOAL) ||
    table.distances[table.goalIndex] !== 0
  )
    throw Error('Invalid shortest-cross table.');
}
export function crossMinimum(
  engine: CubeEngine,
  input: LabInput,
  frame: LabFrame,
  table: CrossTable,
): number {
  checkTable(table);
  return distance(
    table,
    extractCross(engine, frame.toCanonical(engine.apply(input.initial, frame.positioningMoves))),
  );
}

export function* exploreCross(
  base: CubeEngine,
  input: LabInput,
  frame: LabFrame,
  table: CrossTable,
  budget: LabBudget,
  options: CrossOptions = {},
): Generator<LabWork | { kind: 'cross'; candidate: CrossCandidate }> {
  checkTable(table);
  const lengths = options.extraLengths ?? [0, 1, 2];
  if (
    lengths.some((n) => n !== 0 && n !== 1 && n !== 2) ||
    new Set(lengths).size !== lengths.length
  )
    throw Error('Cross allowance must be zero, one or two extra moves.');
  const max = options.maxCompletions ?? 96;
  if (!Number.isSafeInteger(max) || max < 0 || max > 96)
    throw Error('Invalid cross completion limit.');
  let quota = options.quota ?? defaultQuotas.get(budget);
  if (!quota) {
    quota = createCrossQuota();
    defaultQuotas.set(budget, quota);
  }
  const engine = meterLabEngine(base, budget);
  const held = frame.toCanonical(engine.apply(input.initial, frame.positioningMoves));
  const coordinate = extractCross(engine, held),
    minimum = distance(table, coordinate);
  let completed = 0;
  interface Node {
    state: CubeState;
    coordinate: CrossCoordinate;
    moves: FaceMove[];
    next: number;
    key: symbol;
  }
  const retained = new Set<symbol>();
  function node(state: CubeState, c: CrossCoordinate, moves: FaceMove[]): Node {
    const key = Symbol('cross frontier');
    if (!budget.retain(key)) throw new LabStopped('frontier-limit');
    retained.add(key);
    return { state, coordinate: c, moves, next: 0, key };
  }
  function release(n: Node) {
    budget.release(n.key);
    retained.delete(n.key);
  }
  try {
    for (const extra of [...lengths].sort()) {
      if (completed >= max) return;
      const depth = minimum + extra,
        stack = [node(held, coordinate, [])];
      while (stack.length) {
        budget.charge('expand');
        yield LAB_WORK;
        const current = stack.at(-1)!;
        if (current.moves.length === depth) {
          stack.pop();
          release(current);
          if (rankCross(current.coordinate) === table.goalIndex) {
            if (!quota.claim(frame.hold.bottom)) return;
            completed++;
            const solvedPairIds = observeF2LPairs(engine, current.state)
              .filter((p) => p.solved)
              .map((p) => frame.physicalPieceId(p.cornerId));
            yield {
              kind: 'cross',
              candidate: {
                frame,
                hold: frame.hold,
                moves: current.moves,
                after: frame.toPhysical(current.state),
                canonicalAfter: current.state,
                minimum,
                length: depth,
                solvedPairIds,
              },
            };
            if (completed >= max) return;
          }
          continue;
        }
        if (current.next >= CROSS_MOVES.length) {
          stack.pop();
          release(current);
          continue;
        }
        const move = CROSS_MOVES[current.next++];
        const next = transitionCross(current.coordinate, move);
        if (distance(table, next) > depth - current.moves.length - 1) continue;
        // No cross-coordinate-only deduplication: U moves can preserve the
        // entire cross while changing all future pair choices and grip history.
        stack.push(node(engine.apply(current.state, [move]), next, [...current.moves, move]));
      }
    }
  } finally {
    for (const key of retained) budget.release(key);
  }
}
