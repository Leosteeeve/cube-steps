import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { fingerprintLabState, freezeLabValue } from '../../../lab/input';
import { blockTargets, sameRouxPiece } from '../../roux/predicates';
import { createRouxFrameMap } from '../frames';
import { blockCompleteInFrame } from '../predicates';
import { RouxBudgetStop, meterRouxEngine } from '../budget';
import type { BlockCandidate, RouxFrame, RouxInput, RouxSearchBudget } from '../types';
import { STM_MOVES, readFirstBlockCoordinate } from './coordinates';
import { assertBlockSearchAssets, type BlockSearchAssets } from './distance';
import { observeConnections, type RouxConnection } from './connections';
function construction(connections: readonly RouxConnection[]): BlockCandidate['construction'] {
  const pairs = connections.filter((c) => c.kind === 'pair'),
    squares = connections.filter((c) => c.kind === 'square'),
    lines = connections.filter((c) => c.kind === 'line');
  if (lines.length === 2) return 'line-line';
  if (squares.some((s) => pairs.some((p) => p.pieceIds.every((id) => !s.pieceIds.includes(id)))))
    return 'square-pair';
  if (pairs.length === 2 && !squares.length) return 'pairs-base';
  return 'free';
}
export function describeBlockCandidate(
  e: CubeEngine,
  held: CubeState,
  frame: RouxFrame,
  moves: readonly TeachingMove[],
): BlockCandidate {
  if (moves.some((move) => !STM_MOVES.includes(move)))
    throw Error('First-block constructions require STM primitive turns.');
  let state = held,
    label: BlockCandidate['construction'] = 'free';
  const milestones: { index: number; kind: string; pieceIds: readonly string[] }[] = [],
    seen = new Set<string>();
  for (let index = 0; index <= moves.length; index++) {
    if (index) state = e.apply(state, [moves[index - 1]]);
    const connections = observeConnections(e, state, frame);
    if (index < moves.length && label === 'free') label = construction(connections);
    for (const c of connections) {
      const key = c.kind + ':' + c.pieceIds.join('/');
      if (!seen.has(key)) {
        seen.add(key);
        milestones.push({ index, ...c });
      }
    }
  }
  if (!blockCompleteInFrame(e, state, frame, 'left'))
    throw Error('A first-block candidate must complete the block and side frame.');
  return freezeLabValue({
    id: `fb:${frame.id}:${fingerprintLabState(state)}`,
    frameId: frame.id,
    moves: [...moves],
    state,
    turns: moves.length,
    construction: label,
    milestones,
  });
}
export function retainDiverseBlocks(
  e: CubeEngine,
  candidates: readonly BlockCandidate[],
  frame: RouxFrame,
  cap: number,
): BlockCandidate[] {
  if (cap !== 16 && cap !== 64) throw Error('Unsupported first-block capacity.');
  const unique = new Map<string, BlockCandidate>();
  for (const c of candidates) {
    const prior = unique.get(c.id);
    if (!prior || c.turns < prior.turns) unique.set(c.id, c);
  }
  const buckets = new Map<string, BlockCandidate[]>(),
    map = createRouxFrameMap(e, frame.id),
    targets = blockTargets(e, 'right');
  for (const c of [...unique.values()].sort(
    (a, b) => a.turns - b.turns || a.id.localeCompare(b.id),
  )) {
    const o = e.observe(map.toCanonical(c.state)),
      pieces = [...o.edges, ...o.corners];
    const ready = targets.filter((t) => pieces.some((p) => sameRouxPiece(p, t))).length;
    const key = `${c.turns}/${c.construction}/${ready}`,
      bucket = buckets.get(key) ?? [];
    bucket.push(c);
    buckets.set(key, bucket);
  }
  const result: BlockCandidate[] = [];
  for (let round = 0; result.length < cap; round++) {
    let added = false;
    for (const bucket of buckets.values())
      if (bucket[round] && result.length < cap) {
        result.push(bucket[round]);
        added = true;
      }
    if (!added) break;
  }
  return result;
}
export type FirstBlockEvent =
  { kind: 'work' } | { kind: 'block'; candidate: BlockCandidate; removedIds: readonly string[] };
export function* generateFirstBlocks(
  raw: CubeEngine,
  input: RouxInput,
  frame: RouxFrame,
  assets: BlockSearchAssets,
  budget: RouxSearchBudget,
  maxLength: number,
): Generator<FirstBlockEvent, void> {
  if (!Number.isInteger(maxLength) || maxLength < 0 || maxLength > 30)
    throw Error('Invalid first-block search length.');
  assertBlockSearchAssets(assets);
  const e = meterRouxEngine(raw, budget),
    cap = budget.mode === 'normal' ? 16 : 64,
    path: TeachingMove[] = [],
    onPath = new Set<string>();
  let held: CubeState,
    retained: BlockCandidate[] = [];
  const allocated = new Set<string>();
  function* visit(
    state: CubeState,
    left: number,
    previous: string,
  ): Generator<FirstBlockEvent, void> {
    budget.charge('expand');
    budget.charge('score');
    const coordinate = readFirstBlockCoordinate(e, state, frame);
    yield { kind: 'work' };
    if (assets.distances[coordinate] > left) return;
    if (assets.distances[coordinate] === 0 && blockCompleteInFrame(e, state, frame, 'left')) {
      const candidate = describeBlockCandidate(e, held, frame, path);
      if (retained.some((c) => c.id === candidate.id && c.turns <= candidate.turns)) return;
      const next = retainDiverseBlocks(e, [...retained, candidate], frame, cap);
      const keys = new Set(next.map((c) => c.id));
      const removedIds = retained.filter((c) => !keys.has(c.id)).map((c) => c.id);
      for (const old of retained)
        if (!keys.has(old.id)) {
          budget.release('fb-pool/' + old.id);
          allocated.delete('fb-pool/' + old.id);
        }
      if (keys.has(candidate.id)) {
        budget.retain('fb-pool/' + candidate.id, 2400 + JSON.stringify(candidate).length * 2);
        allocated.add('fb-pool/' + candidate.id);
      }
      retained = next;
      if (keys.has(candidate.id)) yield { kind: 'block', candidate, removedIds };
      return;
    }
    if (!left) return;
    const identity = fingerprintLabState(state);
    if (onPath.has(identity)) return;
    onPath.add(identity);
    const entry = `fb-path/${path.length}/${identity}`;
    budget.retain(entry, 1600 + identity.length * 2);
    try {
      for (const move of STM_MOVES) {
        if (move.replace(/['2]$/, '') === previous) continue;
        const next = e.apply(state, [move]);
        path.push(move);
        try {
          yield* visit(next, left - 1, move.replace(/['2]$/, ''));
        } finally {
          path.pop();
        }
      }
    } finally {
      onPath.delete(identity);
      budget.release(entry);
    }
  }
  try {
    held = e.apply(input.initial, frame.positioningMoves);
    budget.charge('score');
    const lower = assets.distances[readFirstBlockCoordinate(e, held, frame)];
    for (let length = lower; length <= maxLength; length++) {
      yield* visit(held, length, '');
      if (retained.some((c) => c.turns === 0)) break;
    }
  } catch (error) {
    if (!(error instanceof RouxBudgetStop)) throw error;
  } finally {
    for (const id of allocated) budget.release(id);
  }
}
