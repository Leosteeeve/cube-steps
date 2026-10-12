import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { checkStage, LBL_STAGE_IDS } from './stages';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('checks cumulative progress independently of whole-cube pose', () => {
  expect(LBL_STAGE_IDS).toHaveLength(7);
  for (const id of LBL_STAGE_IDS)
    expect(checkStage(engine, engine.apply(engine.solved(), ['x', 'y']), id)).toBe(true);
  const upperTurn = engine.apply(engine.solved(), ['D']);
  expect(checkStage(engine, upperTurn, 'middle-layer')).toBe(true);
  expect(checkStage(engine, upperTurn, 'top-cross')).toBe(true);
  expect(checkStage(engine, upperTurn, 'top-edges')).toBe(false);
  for (const id of LBL_STAGE_IDS)
    expect(checkStage(engine, engine.apply(engine.solved(), ['R']), id)).toBe(false);
});
