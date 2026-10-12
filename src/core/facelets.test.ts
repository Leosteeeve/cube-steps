import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from './cube';
import type { Color, CubeEngine, CubeState, Face, FaceletSnapshot } from './types';
import { stateToFacelets, validateFacelets } from './facelets';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';
import { seededScramble } from '../../tests/fixtures/lbl-cases';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
const mutable = (value: FaceletSnapshot) =>
  structuredClone(value) as Record<Face, (Color | null)[]>;
function codes(value: unknown) {
  const result = validateFacelets(value, engine.solved());
  if (result.ok) throw new Error('Expected invalid colors');
  return result.issues.map((issue) => issue.code);
}
it.each(GOLDEN_CASES)('matches independently derived outside-view grids: $name', (example) => {
  const state = engine.apply(engine.solved(), example.moves);
  expect(stateToFacelets(state)).toEqual(example.facelets);
  const decoded = validateFacelets(example.facelets, engine.solved());
  expect(decoded.ok).toBe(true);
  if (!decoded.ok) throw new Error(example.name);
  expect(engine.equals(decoded.state, state)).toBe(true);
});
it('round-trips face moves and their inverses without changing ordinary centers', () => {
  for (const face of ['U', 'D', 'F', 'B', 'R', 'L'] as const) {
    for (const moves of [[face], [`${face}'`], [face, `${face}'`]] as const) {
      const state = engine.apply(engine.solved(), moves);
      const result = validateFacelets(stateToFacelets(state), engine.solved());
      expect(result.ok).toBe(true);
      if (result.ok) expect(engine.equals(state, result.state)).toBe(true);
    }
  }
  for (let seed = 1; seed <= 100; seed++) {
    const state = engine.apply(engine.solved(), seededScramble(seed));
    const result = validateFacelets(stateToFacelets(state), engine.solved());
    if (!result.ok) throw new Error(`Seed ${seed}: ${JSON.stringify(result.issues)}`);
    expect(engine.equals(state, result.state)).toBe(true);
  }
});
it('copies input snapshots and freezes nested state and facelet arrays', () => {
  const input = mutable(GOLDEN_CASES[0].facelets),
    before = structuredClone(input);
  const result = validateFacelets(input, engine.solved());
  expect(input).toEqual(before);
  if (!result.ok) throw new Error('Solved input rejected');
  input.F[0] = 'red';
  expect(result.facelets.F[0]).toBe('green');
  expect(Object.isFrozen(result.facelets.F)).toBe(true);
  expect(Object.isFrozen(result.state.data.EDGES.pieces)).toBe(true);
  expect(Object.isFrozen(stateToFacelets(result.state).U)).toBe(true);
});
it.each([null, [], {}, { U: [] }])(
  'rejects malformed shapes without downstream errors: %j',
  (value) => {
    expect(codes(value)).toEqual(['shape']);
  },
);
it('rejects extra faces, missing cells, unknown colors and wrong centers before counting', () => {
  expect(codes({ ...GOLDEN_CASES[0].facelets, X: [] })).toEqual(['shape']);
  const missing = mutable(GOLDEN_CASES[0].facelets);
  missing.F.pop();
  expect(codes(missing)).toEqual(['shape']);
  const unknown = mutable(GOLDEN_CASES[0].facelets);
  (unknown.F as unknown[])[0] = 'purple';
  expect(codes(unknown)).toEqual(['unknown-color']);
  const center = mutable(GOLDEN_CASES[0].facelets);
  center.F[4] = 'red';
  expect(codes(center)).toEqual(['center']);
});
it('locates unfilled/count errors without claiming an orientation defect', () => {
  const unfilled = mutable(GOLDEN_CASES[0].facelets);
  unfilled.F[0] = null;
  const result = validateFacelets(unfilled, engine.solved());
  expect(result).toMatchObject({
    ok: false,
    issues: [{ code: 'unfilled', cells: [{ face: 'F', index: 0 }] }],
  });
  const wrongCount = mutable(GOLDEN_CASES[0].facelets);
  wrongCount.F[0] = 'red';
  expect(codes(wrongCount)).toEqual(['color-count', 'color-count']);
});
it('rejects impossible, duplicated, and mirrored pieces even with nine of each color', () => {
  const impossible = mutable(GOLDEN_CASES[0].facelets);
  [impossible.F[1], impossible.D[7]] = [impossible.D[7], impossible.F[1]];
  expect(codes(impossible)).toContain('piece-colors');
  const duplicate = mutable(GOLDEN_CASES[0].facelets);
  // Swap F stickers of UF and DF with R stickers of UR and DR: duplicate FR/DR-type pieces.
  [duplicate.F[1], duplicate.R[7]] = [duplicate.R[7], duplicate.F[1]];
  expect(codes(duplicate)).toContain('duplicate-piece');
  const mirrored = mutable(GOLDEN_CASES[0].facelets);
  [mirrored.F[2], mirrored.R[0]] = [mirrored.R[0], mirrored.F[2]];
  expect(codes(mirrored)).toEqual(['mirrored-corner']);
});
it.each([
  ['single edge flip', 'EDGES', 'orientation', [1, 0], 'edge-orientation'],
  ['single corner twist', 'CORNERS', 'orientation', [1, 0], 'corner-orientation'],
  ['edge swap', 'EDGES', 'pieces', [1, 0], 'permutation-parity'],
  ['corner swap', 'CORNERS', 'pieces', [1, 0], 'permutation-parity'],
] as const)('rejects %s with a global explanation', (_name, orbit, field, values, code) => {
  const state = structuredClone(engine.solved());
  state.data[orbit][field].splice(0, 2, ...values);
  const result = validateFacelets(stateToFacelets(state), engine.solved());
  expect(result).toMatchObject({ ok: false, issues: [{ code, cells: [] }] });
});
it('accepts paired flips, balanced twists, and matching odd permutations', () => {
  const variants: CubeState[] = Array.from({ length: 3 }, () => structuredClone(engine.solved()));
  variants[0].data.EDGES.orientation.splice(0, 2, 1, 1);
  variants[1].data.CORNERS.orientation.splice(0, 2, 1, 2);
  variants[2].data.EDGES.pieces.splice(0, 2, 1, 0);
  variants[2].data.CORNERS.pieces.splice(0, 2, 1, 0);
  for (const state of variants) {
    const result = validateFacelets(stateToFacelets(state), engine.solved());
    expect(result.ok).toBe(true);
    if (result.ok) expect(engine.equals(result.state, state)).toBe(true);
  }
});
it('detects a directly entered single flipped edge and preserves all entered colors', () => {
  const value = mutable(GOLDEN_CASES[0].facelets);
  [value.U[7], value.F[1]] = [value.F[1], value.U[7]];
  const before = structuredClone(value);
  expect(codes(value)).toEqual(['edge-orientation']);
  expect(value).toEqual(before);
});
