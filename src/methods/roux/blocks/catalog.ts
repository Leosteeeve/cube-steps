import type { CubeEngine, CubeState, PieceObservation, TeachingMove } from '../../../core/types';
import type { TeachingAlgorithm } from '../../contracts';
import { rouxReferenceObservation } from '../frame';
import { sameRouxPiece } from '../predicates';
import type { BlockGoal, BlockManeuver } from './types';
export const pieces = (engine: CubeEngine, state: CubeState) => {
  const o = engine.observe(state);
  return [...o.edges, ...o.corners];
};
export function locksCorrect(engine: CubeEngine, state: CubeState, goal: BlockGoal): boolean {
  const reference = rouxReferenceObservation(engine),
    want = [...reference.edges, ...reference.corners],
    actual = pieces(engine, state);
  return goal.lockedIds.every((id) =>
    actual.some((p) =>
      sameRouxPiece(
        p,
        want.find((p) => p.id === id)!,
      ),
    ),
  );
}
export function blockGoalReached(engine: CubeEngine, state: CubeState, goal: BlockGoal): boolean {
  return locksCorrect(engine, state, {
    ...goal,
    lockedIds: [...goal.lockedIds, ...goal.targetIds],
  });
}
const label = (p: PieceObservation) =>
  Object.values(p.stickers).sort().join('-') + ' ' + (p.id.length === 2 ? 'edge' : 'corner');
const position = (p: PieceObservation) =>
  p.slot +
  ' (' +
  Object.entries(p.stickers)
    .map(([face, color]) => `${color} ${face}`)
    .join(', ') +
  ')';
const inverse = (m: TeachingMove): TeachingMove =>
  m.endsWith('2')
    ? m
    : m.endsWith("'")
      ? (m.slice(0, -1) as TeachingMove)
      : (`${m}'` as TeachingMove);
const sequences: TeachingMove[][] = [];
for (const face of ['U', 'R', 'L', 'F', 'B', 'D', 'M'])
  for (const amount of ['', "'", '2']) sequences.push([`${face}${amount}` as TeachingMove]);
for (const face of ['R', 'L', 'F', 'B'])
  for (const amount of ['', "'", '2'])
    for (const upper of ['U', "U'", 'U2'] as const) {
      const open = `${face}${amount}` as TeachingMove;
      sequences.push([open, upper, inverse(open)]);
    }
function definition(moves: TeachingMove[]): BlockManeuver {
  const id = 'roux-block-' + moves.map((m) => m.replace("'", 'p').toLowerCase()).join('-');
  const kind = moves.length === 1 ? 'setup' : 'algorithm';
  const check = (engine: CubeEngine, before: CubeState, after: CubeState, goal: BlockGoal) =>
    locksCorrect(engine, before, goal) &&
    locksCorrect(engine, after, goal) &&
    engine.equals(engine.apply(before, moves), after);
  return {
    id,
    kind,
    moves,
    algorithmId: kind === 'algorithm' ? id : undefined,
    protection: kind === 'setup' ? 'always' : 'endpoint',
    check,
    match(engine, state, goal) {
      if (!locksCorrect(engine, state, goal)) return null;
      const after = engine.apply(state, moves);
      if (!locksCorrect(engine, after, goal)) return null;
      const beforePieces = pieces(engine, state),
        afterPieces = pieces(engine, after);
      const moved = goal.targetIds.filter(
        (id) =>
          !sameRouxPiece(
            beforePieces.find((p) => p.id === id)!,
            afterPieces.find((p) => p.id === id)!,
          ),
      );
      if (!moved.length) return null;
      const effect = moved
        .map((id) => {
          const p = beforePieces.find((p) => p.id === id)!,
            q = afterPieces.find((p) => p.id === id)!;
          return `${label(p)}: ${position(p)} → ${position(q)}`;
        })
        .join('; ');
      const slice = moves[0][0] === 'M';
      const reason = blockGoalReached(engine, after, goal)
        ? 'This completes the target in its block.'
        : 'This prepares the target for the next block maneuver.';
      return {
        caseId: id + ':' + moved.map((id) => beforePieces.find((p) => p.id === id)!.slot).join('-'),
        targets: [...goal.targetIds],
        recognition: goal.targetIds
          .map((id) => {
            const p = beforePieces.find((p) => p.id === id)!;
            return `${label(p)} is at ${position(p)}.`;
          })
          .join(' '),
        explanation: `${slice ? 'Turn only the middle slice; keep the blue and green sides still. ' : kind === 'algorithm' ? `Open with ${moves[0]}, adjust the upper layer with ${moves[1]}, then close with ${moves[2]}. ` : `Use ${moves[0]} to reposition the target. `}${effect}. ${reason}${goal.lockedIds.length ? ' The completed pieces are restored at this checkpoint.' : ''}`,
      };
    },
  };
}
export const ROUX_BLOCK_MANEUVERS: readonly BlockManeuver[] = sequences.map(definition);
export const ROUX_BLOCK_ALGORITHMS: Readonly<Record<string, TeachingAlgorithm>> =
  Object.fromEntries(
    ROUX_BLOCK_MANEUVERS.filter((m) => m.kind === 'algorithm').map((m) => [
      m.id,
      {
        name: `Open, adjust, close: ${m.moves.join(' ')}`,
        moves: m.moves,
        precondition: 'Follow the highlighted corner-edge target and the displayed block setup.',
        effect:
          'Adjust the target while restoring the protected pieces at the end of the maneuver.',
        segments: [
          { label: 'Open', start: 0, end: 1 },
          { label: 'Adjust', start: 1, end: 2 },
          { label: 'Close', start: 2, end: 3 },
        ],
      },
    ]),
  );
export function blockCatalogDigest(): string {
  const text = JSON.stringify(ROUX_BLOCK_MANEUVERS.map((m) => [m.id, m.moves, m.protection]));
  let hash = 2166136261;
  for (const c of text) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
