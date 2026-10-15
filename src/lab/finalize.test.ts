import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, Color } from '../core/types';
import { stateToFacelets } from '../core/facelets';
import { prepareLabInput } from './input';
import { fixtureLabRoute } from '../../tests/fixtures/lab-context';
import { createLabFrame } from './frames';
import { ALGORITHM_REGISTRY } from '../algorithms/registry';
import { invertTeachingMoves } from '../core/teaching-moves';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});

it('explains OLL using the actual top color for a non-white bottom', () => {
  const solvedInput = prepareLabInput(engine, { kind: 'scramble', moves: [] });
  const frame = createLabFrame(engine, solvedInput, { bottom: 'red', front: 'green' });
  const canonical = engine.apply(engine.solved(), [
    'z2',
    ...invertTeachingMoves(ALGORITHM_REGISTRY.variants['oll-26/main'].moves),
  ]);
  const physical = engine.apply(
    frame.toPhysical(canonical),
    invertTeachingMoves(frame.positioningMoves),
  );
  const input = prepareLabInput(engine, { kind: 'facelets', facelets: stateToFacelets(physical) });
  const route = fixtureLabRoute(engine, input, 'red');
  const oll = route.actions.find((a) => a.section === 'lab-oll' && a.kind === 'algorithm')!;
  expect(oll).toBeDefined();
  expect(oll.explanation).toContain(engine.observe(oll.before).centers.U);
  expect(oll.explanation).not.toContain('yellow');
});
it('finishes all six physical colors and reconstructs exact original setups', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: ['R', 'U', 'F'] });
  for (const color of ['white', 'yellow', 'red', 'orange', 'green', 'blue'] as Color[]) {
    const route = fixtureLabRoute(engine, input, color);
    expect(
      engine.isSolved(
        engine.apply(
          input.initial,
          route.actions.flatMap((a) => a.moves),
        ),
      ),
    ).toBe(true);
    expect(engine.equals(engine.apply(engine.solved(), route.setupMoves), input.initial)).toBe(
      true,
    );
    expect(route.startHold.bottom).toBe(color);
    expect(route.boundaries.f2lEnd).toBeLessThanOrEqual(
      route.actions.flatMap((a) => a.moves).length,
    );
  }
});
it('handles face-entry input, solved stages and zero-length boundaries without phantom moves', () => {
  for (const moves of [[], ['R', 'U', 'F']] as const) {
    const input = prepareLabInput(engine, {
      kind: 'facelets',
      facelets: stateToFacelets(engine.apply(engine.solved(), moves)),
    });
    const route = fixtureLabRoute(engine, input, 'yellow');
    expect(engine.equals(engine.apply(engine.solved(), route.setupMoves), input.initial)).toBe(
      true,
    );
    if (!moves.length) {
      expect(route.actions).toEqual([]);
      expect(route.boundaries).toEqual({ crossStart: 0, crossEnd: 0, f2lEnd: 0 });
      expect(route.skips.map((s) => s.section)).toEqual([
        'lab-position',
        'lab-cross',
        'lab-f2l',
        'lab-oll',
        'lab-pll',
        'lab-auf',
      ]);
      expect(route.score).toMatchObject({ rated: true, cost: 0 });
    }
  }
});
