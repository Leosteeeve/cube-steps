import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { blockCompleteInFrame } from '../predicates';
import { meterRouxEngine, RouxBudgetStop } from '../budget';
import type { RouxFrame, RouxInput, RouxSearchBudget } from '../types';
import { STM_MOVES, readFirstBlockCoordinate } from './coordinates';
import { assertBlockSearchAssets, type BlockSearchAssets } from './distance';
export type FirstBlockEvidence =
  | { status: 'not-explored' }
  | {
      status: 'best-found';
      lowerBound: number;
      upperBound: number;
      witness: readonly TeachingMove[];
      completedDepth: number;
    }
  | {
      status: 'proven-minimum';
      minimum: number;
      witness: readonly TeachingMove[];
      proof: {
        coordinateVersion: 1;
        moveSetVersion: 'roux-stm-v1';
        completedDepth: number;
        assetDigest: string;
      };
    };
type Event = { kind: 'work' } | { kind: 'evidence'; evidence: FirstBlockEvidence };
export function* searchFirstBlockReference(
  raw: CubeEngine,
  input: RouxInput,
  frame: RouxFrame,
  assets: BlockSearchAssets,
  budget: RouxSearchBudget,
  upperWitness?: readonly TeachingMove[],
): Generator<Event, FirstBlockEvidence> {
  assertBlockSearchAssets(assets);
  const engine = meterRouxEngine(raw, budget);
  let evidence: FirstBlockEvidence = { status: 'not-explored' };
  const path: TeachingMove[] = [],
    seen = new Set<string>();
  const key = (state: CubeState, coordinate: number) =>
    `${coordinate}/${state.data.CENTERS.pieces.join(',')}`;
  function* visit(
    state: CubeState,
    remaining: number,
    previous: string,
  ): Generator<Event, TeachingMove[] | null> {
    budget.charge('expand');
    const coordinate = readFirstBlockCoordinate(engine, state, frame);
    budget.charge('score');
    yield { kind: 'work' };
    const distance = assets.distances[coordinate];
    if (distance > remaining) return null;
    if (distance === 0 && blockCompleteInFrame(engine, state, frame, 'left')) return [...path];
    if (remaining === 0) return null;
    const identity = key(state, coordinate);
    if (seen.has(identity)) return null;
    const entry = `proof/${path.length}/${identity}`;
    budget.retain(entry, 1400 + identity.length * 2);
    seen.add(identity);
    try {
      for (const move of STM_MOVES) {
        const base = move.replace(/['2]$/, '');
        // Repeated turns of the same slice/layer always combine to <=1 STM.
        if (base === previous) continue;
        const next = engine.apply(state, [move]);
        path.push(move);
        let found: TeachingMove[] | null;
        try {
          found = yield* visit(next, remaining - 1, base);
        } finally {
          path.pop();
        }
        if (found) return found;
      }
    } finally {
      seen.delete(identity);
      budget.release(entry);
    }
    return null;
  }
  try {
    const held = engine.apply(input.initial, frame.positioningMoves);
    budget.charge('score');
    let depth = assets.distances[readFirstBlockCoordinate(engine, held, frame)];
    if (upperWitness) {
      let checked = held;
      for (const move of upperWitness) {
        if (!STM_MOVES.includes(move))
          throw Error('Reference upper witness contains a non-STM move.');
        checked = engine.apply(checked, [move]);
        yield { kind: 'work' };
      }
      if (!blockCompleteInFrame(engine, checked, frame, 'left'))
        throw Error('Reference upper witness does not complete the first block.');
      evidence = {
        status: 'best-found',
        lowerBound: depth,
        upperBound: upperWitness.length,
        witness: Object.freeze([...upperWitness]),
        completedDepth: depth - 1,
      };
      yield { kind: 'evidence', evidence };
    }
    for (; ; depth++) {
      budget.checkpoint();
      const witness =
        evidence.status === 'best-found' && depth === evidence.upperBound
          ? [...evidence.witness]
          : yield* visit(held, depth, '');
      if (witness) {
        evidence = {
          status: 'proven-minimum',
          minimum: witness.length,
          witness: Object.freeze(witness),
          proof: {
            coordinateVersion: 1,
            moveSetVersion: 'roux-stm-v1',
            completedDepth: depth - 1,
            assetDigest: assets.digest,
          },
        };
        yield { kind: 'evidence', evidence };
        return evidence;
      }
      if (evidence.status === 'best-found') {
        evidence = { ...evidence, lowerBound: depth + 1, completedDepth: depth };
        yield { kind: 'evidence', evidence };
      }
    }
  } catch (error) {
    if (error instanceof RouxBudgetStop) return evidence;
    throw error;
  }
}
