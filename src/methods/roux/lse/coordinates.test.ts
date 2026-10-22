import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { encodeLse, decodeLse, lseIndex, lseAt, validLseCoordinate } from './coordinates';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
it('round-trips every center phase and corner offset with physical edge identities', () => {
  for (let phase = 0; phase < 4; phase++)
    for (let offset = 0; offset < 4; offset++) {
      const state = e.apply(rouxReferenceState(e), [
        'M',
        'U2',
        "M'",
        'U',
        ...Array(phase).fill('M'),
        ...Array(offset).fill('U'),
      ]);
      const c = encodeLse(e, state);
      expect(c).not.toBeNull();
      if (!c) throw Error('No coordinate');
      expect(e.equals(decodeLse(e, c), state)).toBe(true);
      expect(lseAt(lseIndex(c))).toEqual(c);
    }
});
it('rejects incomplete blocks, twisted corners, odd edge flip and impossible parity', () => {
  for (const moves of [['L'], ['R', 'U', "R'"]] as TeachingMove[][])
    expect(encodeLse(e, e.apply(rouxReferenceState(e), moves))).toBeNull();
  const c = encodeLse(e, rouxReferenceState(e))!;
  expect(validLseCoordinate({ ...c, flips: [1, 0, 0, 0, 0, 0] })).toBe(false);
  expect(validLseCoordinate({ ...c, offset: 1 })).toBe(false);
  expect(() => decodeLse(e, { ...c, phase: 4 })).toThrow();
  const broken = structuredClone(rouxReferenceState(e));
  broken.data.CORNERS.orientation[0] = 1;
  broken.data.CORNERS.orientation[1] = 2;
  expect(encodeLse(e, broken)).toBeNull();
});
