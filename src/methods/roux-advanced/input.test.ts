import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { stateToFacelets } from '../../core/facelets';
import { prepareRouxInput } from './input';
it('validates either input and preserves its immutable physical state and fingerprint', async () => {
  const e = await createCubeEngine();
  const source = { kind: 'scramble' as const, moves: ['R', 'U'] as const };
  const a = prepareRouxInput(e, source);
  expect(e.equals(e.apply(e.solved(), a.setupMoves!), a.initial)).toBe(true);
  const b = prepareRouxInput(e, { kind: 'facelets', facelets: stateToFacelets(a.initial) });
  expect(b.fingerprint).toBe(a.fingerprint);
  expect(b.setupMoves).toBeNull();
  expect(Object.isFrozen(a.initial.data.EDGES.pieces)).toBe(true);
  expect(() => prepareRouxInput(e, { kind: 'scramble', moves: ['M'] as never })).toThrow(
    /unsupported move/,
  );
  const invalid = stateToFacelets(a.initial);
  expect(() =>
    prepareRouxInput(e, { kind: 'facelets', facelets: { ...invalid, U: Array(9).fill('red') } }),
  ).toThrow(/invalid/);
});
