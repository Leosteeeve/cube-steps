import type { FaceMove } from './types';
export type ParseResult =
  { ok: true; moves: FaceMove[] } | { ok: false; offset: number; message: string };
export function parseScramble(text: string): ParseResult {
  const normalized = text.replace(/[’′]/g, "'");
  const moves: FaceMove[] = [];
  for (let i = 0; i < normalized.length;) {
    if (/\s/.test(normalized[i])) {
      i++;
      continue;
    }
    if (!/[UDLRFB]/.test(normalized[i]))
      return {
        ok: false,
        offset: i,
        message: "Use U, D, L, R, F or B, optionally followed by ' or 2.",
      };
    let move = normalized[i++];
    if (normalized[i] === "'" || normalized[i] === '2') move += normalized[i++];
    moves.push(move as FaceMove);
  }
  return { ok: true, moves };
}
