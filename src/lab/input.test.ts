import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { stateToFacelets } from '../core/facelets';
import type { Color, Face, CubeEngine, SolveInput } from '../core/types';
import { fingerprintLabState, prepareLabInput } from './input';

let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});

it('identifies equivalent scramble and facelet input without aliasing the caller', () => {
  const input: SolveInput = { kind: 'scramble', moves: ['R', 'U2', "F'"] };
  const result = prepareLabInput(engine, input);
  const colors = prepareLabInput(engine, {
    kind: 'facelets',
    facelets: stateToFacelets(result.initial),
  });
  expect(colors.fingerprint).toBe(result.fingerprint);
  expect(result.inputHold).toEqual({ bottom: 'yellow', front: 'green' });
  (input.moves as string[])[0] = 'D';
  expect(result.input).toEqual({ kind: 'scramble', moves: ['R', 'U2', "F'"] });
  expect(Object.isFrozen(result.input)).toBe(true);
  expect(Object.isFrozen(result.initial.data.EDGES.pieces)).toBe(true);
  expect(engine.equals(result.initial, colors.initial)).toBe(true);
});

it.each(['Rw', 'x', 'R3', 'U′', '', '<script>'])(
  'rejects unsupported raw scramble token %s',
  (token) => {
    expect(() =>
      prepareLabInput(engine, { kind: 'scramble', moves: [token] } as SolveInput),
    ).toThrow();
  },
);

it('rejects incomplete and impossible facelet inputs without publishing a Lab snapshot', () => {
  const faces = structuredClone(stateToFacelets(engine.solved())) as Record<Face, Color[]>;
  expect(() =>
    prepareLabInput(engine, { kind: 'facelets', facelets: { ...faces, U: [] } }),
  ).toThrow();
  const flipped = structuredClone(faces);
  [flipped.U[7], flipped.F[1]] = [flipped.F[1], flipped.U[7]];
  expect(() => prepareLabInput(engine, { kind: 'facelets', facelets: flipped })).toThrow(
    /orientation/i,
  );
  const parity = structuredClone(faces);
  [parity.F[1], parity.R[1]] = [parity.R[1], parity.F[1]];
  expect(() => prepareLabInput(engine, { kind: 'facelets', facelets: parity })).toThrow(
    /arrangement|parity/i,
  );
});

it('fingerprints the whole physical state and center hold, not just cross edges', () => {
  const state = engine.solved();
  expect(fingerprintLabState(state)).not.toBe(fingerprintLabState(engine.apply(state, ['U'])));
  expect(fingerprintLabState(state)).not.toBe(fingerprintLabState(engine.apply(state, ['x'])));
  const reordered = { data: Object.fromEntries(Object.entries(state.data).reverse()) };
  expect(fingerprintLabState(reordered)).toBe(fingerprintLabState(state));
});
