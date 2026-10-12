import type { FaceMove } from '../../src/core/types';
export function seededScramble(seed: number, length = 25): FaceMove[] {
  let value = seed >>> 0,
    previous = '';
  const result: FaceMove[] = [];
  const next = () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return value >>> 0;
  };
  for (let i = 0; i < length; i++) {
    let face: string;
    do {
      face = 'URFDLB'[next() % 6];
    } while (face === previous);
    result.push(`${face}${['', "'", '2'][next() % 3]}` as FaceMove);
    previous = face;
  }
  return result;
}
