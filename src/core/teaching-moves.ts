import type { TeachingMove } from './types';
export function normalizeTeachingAlgorithm(text: string): TeachingMove[] {
  if (!text.trim()) return [];
  return text
    .trim()
    .split(/\s+/)
    .map((token, index) => {
      const canonical = token.replace(/^[udlrfb]/, (face) => `${face.toUpperCase()}w`);
      if (!isTeachingMove(canonical))
        throw new Error(
          `Unsupported teaching token ${index + 1}: ${token}. Use a face, wide, slice or rotation move with an optional prime or 2.`,
        );
      return canonical;
    });
}
export function isTeachingMove(value: unknown): value is TeachingMove {
  return (
    typeof value === 'string' &&
    value === value.trim() &&
    /^(?:[UDLRFB]w?|[xyzMES])(?:'|2)?$/.test(value)
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
