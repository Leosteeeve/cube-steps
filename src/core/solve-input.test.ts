import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from './cube';
import type { CubeEngine, SolveSession } from './types';
import { assertSessionInput, resolveSolveInput } from './solve-input';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';
import { solveLBL } from '../methods/lbl/solve';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('decodes both provenance kinds into the exact initial state', () => {
  const example = GOLDEN_CASES[7],
    initial = engine.apply(engine.solved(), example.moves);
  for (const input of [
    { kind: 'scramble', moves: example.moves },
    { kind: 'facelets', facelets: example.facelets },
  ] as const) {
    expect(engine.equals(resolveSolveInput(engine, input), initial)).toBe(true);
    const result = solveLBL(engine, initial);
    if (!result.ok) throw new Error(result.message);
    const session: SolveSession = { input, trace: result.trace };
    expect(() => assertSessionInput(engine, session)).not.toThrow();
    expect(() =>
      assertSessionInput(engine, {
        ...session,
        trace: { ...session.trace, initial: engine.solved() },
      }),
    ).toThrow(/initial/i);
  }
});
it('rejects illegal provenance rather than accepting its trace', () => {
  expect(() => resolveSolveInput(engine, { kind: 'facelets', facelets: {} } as never)).toThrow();
  expect(() => resolveSolveInput(engine, { kind: 'scramble', moves: ['R U'] } as never)).toThrow();
});
