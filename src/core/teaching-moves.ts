import type { TeachingMove } from './types';
export function isTeachingMove(value: unknown): value is TeachingMove {
  return (
    typeof value === 'string' && value === value.trim() && /^[UDLRFBxyzM](?:'|2)?$/.test(value)
  );
}
export function invertTeachingMoves(moves: readonly TeachingMove[]): TeachingMove[] {
  return [...moves]
    .reverse()
    .map(
      (move) =>
        (move.endsWith('2')
          ? move
          : move.endsWith("'")
            ? move.slice(0, -1)
            : `${move}'`) as TeachingMove,
    );
}
