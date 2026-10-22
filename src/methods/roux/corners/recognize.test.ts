import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { rouxReferenceState } from '../frame';
import { ROUX_CORNER_ALGORITHMS } from './catalog';
import { recognizeRouxCorners, headlights, cornerOrientationSignature } from './recognize';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('ignores top-edge orientation when recognizing each corner case', () => {
  for (const id of Object.keys(ROUX_CORNER_ALGORITHMS).filter((id) => id.includes('ocll'))) {
    const a = engine.apply(
        rouxReferenceState(engine),
        invertTeachingMoves(ROUX_CORNER_ALGORITHMS[id].moves),
      ),
      b = structuredClone(a);
    b.data.EDGES.orientation[0] ^= 1;
    b.data.EDGES.orientation[1] ^= 1;
    expect(cornerOrientationSignature(engine, a)).toBe(cornerOrientationSignature(engine, b));
    expect(recognizeRouxCorners(engine, a, 'orientation')).toEqual(
      recognizeRouxCorners(engine, b, 'orientation'),
    );
    expect(recognizeRouxCorners(engine, a, 'orientation').algorithmId).toBe(id);
  }
});
it('uses T with headlights left and Y with no headlights', () => {
  for (const id of ['roux-t', 'roux-y'])
    for (const u of [[], ['U'], ['U2'], ["U'"]] as TeachingMove[][]) {
      const state = engine.apply(rouxReferenceState(engine), [
        ...invertTeachingMoves(ROUX_CORNER_ALGORITHMS[id].moves),
        ...u,
      ]);
      const match = recognizeRouxCorners(engine, state, 'permutation');
      expect(match.algorithmId).toBe(id);
      expect(headlights(engine, engine.apply(state, match.setup))).toEqual(
        id === 'roux-t' ? ['L'] : [],
      );
    }
});
it('recognizes solved-up-to-U corners without a formula', () => {
  for (const u of [[], ['U'], ['U2'], ["U'"]] as TeachingMove[][]) {
    const state = engine.apply(rouxReferenceState(engine), u);
    expect(recognizeRouxCorners(engine, state, 'orientation').algorithmId).toBeUndefined();
    const match = recognizeRouxCorners(engine, state, 'permutation');
    expect(match.algorithmId).toBeUndefined();
    expect(engine.equals(engine.apply(state, match.alignment), rouxReferenceState(engine))).toBe(
      true,
    );
  }
});
