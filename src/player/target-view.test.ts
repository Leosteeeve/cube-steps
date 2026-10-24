import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { targetFacelets } from './target-view';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('follows the original UF edge through M and a physical y rotation', () => {
  const solved = engine.solved();
  expect(targetFacelets(engine, solved, ['UF'])).toEqual([
    { face: 'F', index: 1 },
    { face: 'U', index: 7 },
  ]);
  // M moves UF to DF; y then carries the front sticker to the left face.
  const moved = engine.apply(solved, ['M', 'y']);
  expect(targetFacelets(engine, moved, ['UF'])).toEqual([
    { face: 'L', index: 7 },
    { face: 'D', index: 3 },
  ]);
  expect(engine.observe(moved).edges.find((p) => p.id === 'UF')?.slot).toBe('DL');
});
it('marks every sticker of a corner once, without selecting unrelated centers or unknown ids', () => {
  const state = engine.apply(engine.solved(), ['y']);
  expect(targetFacelets(engine, state, ['UFR', 'UFR', 'unknown', 'U'])).toEqual([
    { face: 'F', index: 0 },
    { face: 'L', index: 2 },
    { face: 'U', index: 6 },
  ]);
});
