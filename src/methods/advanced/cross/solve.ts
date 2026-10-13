import type { CubeEngine, CubeState, FaceMove, TeachingMove } from '../../../core/types';
import type { CrossTable } from './table';
import { canonicalHoldingMoves } from '../../../core/holding-frame';
import { pieceSolved } from '../../shared/pieces';
import {
  CROSS_GOAL,
  CROSS_MOVES,
  CROSS_STATE_COUNT,
  extractCross,
  rankCross,
  transitionCross,
} from './coordinates';
const opposites: Record<string, string> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
export function planShortestCross(
  engine: CubeEngine,
  state: CubeState,
  table: CrossTable,
): { holdingMoves: TeachingMove[]; moves: FaceMove[]; distances: number[] } {
  if (
    table.version !== 1 ||
    table.distances.length !== CROSS_STATE_COUNT ||
    table.goalIndex !== rankCross(CROSS_GOAL) ||
    table.distances[table.goalIndex] !== 0
  )
    throw new Error('Invalid shortest-cross table.');
  const holdingMoves = canonicalHoldingMoves(engine, state),
    held = engine.apply(state, holdingMoves);
  let c = extractCross(engine, held),
    distance = table.distances[rankCross(c)];
  if (distance > 8) throw new Error('Shortest-cross coordinate is absent from the verified table.');
  const moves: FaceMove[] = [],
    distances = [distance];
  while (distance > 0) {
    const previous = moves.at(-1)?.[0];
    const candidates = CROSS_MOVES.filter(
      (m) => table.distances[rankCross(transitionCross(c, m))] === distance - 1,
    );
    const penalty = (m: FaceMove) =>
      !previous || m[0] === previous ? 0 : opposites[previous] === m[0] ? 1 : 2;
    candidates.sort(
      (a, b) => penalty(a) - penalty(b) || CROSS_MOVES.indexOf(a) - CROSS_MOVES.indexOf(b),
    );
    if (!candidates.length)
      throw new Error('Shortest-cross table has no distance-decreasing successor.');
    const move = candidates[0];
    moves.push(move);
    c = transitionCross(c, move);
    distances.push(--distance);
  }
  if (rankCross(c) !== table.goalIndex)
    throw new Error('Shortest-cross descent did not reach the matched cross.');
  return { holdingMoves, moves, distances };
}
export function crossMoveEvidence(
  engine: CubeEngine,
  before: CubeState,
  after: CubeState,
): { targets: string[]; recognition: string; explanation: string } {
  const a = engine.observe(before),
    b = engine.observe(after),
    targets: string[] = [],
    recognition: string[] = [],
    effects: string[] = [];
  for (const p of a.edges.filter((p) => Object.values(p.stickers).includes('white'))) {
    const next = b.edges.find((n) => n.id === p.id)!;
    if (p.slot === next.slot && JSON.stringify(p.stickers) === JSON.stringify(next.stickers))
      continue;
    targets.push(p.id);
    const side = Object.values(p.stickers).find((c) => c !== 'white');
    recognition.push(
      `White-${side} edge at ${p.slot}, white facing ${Object.entries(p.stickers).find(([, c]) => c === 'white')![0]}.`,
    );
    effects.push(
      `White-${side}: ${p.slot} → ${next.slot}; ${pieceSolved(next, b) ? 'both stickers match their centers' : pieceSolved(p, a) ? 'temporarily leaves its matched position' : 'not yet aligned with both centers'}.`,
    );
  }
  return { targets, recognition: recognition.join(' '), explanation: effects.join(' ') };
}
