import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { LBL_ALGORITHMS } from './catalog';
import { checkStage } from './stages';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('keeps the promised earlier structure at each algorithm boundary', () => {
  const down = engine.apply(engine.solved(), ['z2']);
  for (const id of ['right-trigger', 'left-trigger'] as const)
    expect(checkStage(engine, engine.apply(down, LBL_ALGORITHMS[id].moves), 'white-cross')).toBe(
      true,
    );
  for (const id of ['middle-left', 'middle-right'] as const)
    expect(checkStage(engine, engine.apply(down, LBL_ALGORITHMS[id].moves), 'first-layer')).toBe(
      true,
    );
  for (const id of ['top-cross', 'top-edge-cycle', 'top-corner-cycle'] as const)
    expect(checkStage(engine, engine.apply(down, LBL_ALGORITHMS[id].moves), 'middle-layer')).toBe(
      true,
    );
  expect(
    checkStage(engine, engine.apply(down, LBL_ALGORITHMS['top-corner-cycle'].moves), 'top-edges'),
  ).toBe(true);
});
it('repeats complete triggers and preserves visible algorithm boundaries', () => {
  const trigger = LBL_ALGORITHMS['right-trigger'];
  expect(trigger.moves).toEqual(['R', 'U', "R'", "U'"]);
  expect(engine.isSolved(engine.apply(engine.solved(), Array(6).fill(trigger.moves).flat()))).toBe(
    true,
  );
  for (const alg of Object.values(LBL_ALGORITHMS)) {
    expect(alg.name.length > 0 && alg.precondition.length > 0 && alg.effect.length > 0).toBe(true);
    expect(engine.isSolved(engine.apply(engine.solved(), alg.moves))).toBe(false);
  }
});
