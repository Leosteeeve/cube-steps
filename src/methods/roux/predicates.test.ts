import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { rouxReferenceState } from './frame';
import { blockComplete, cornerOffset, topCornersOriented, rouxSolved } from './predicates';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('recognizes complete blocks independently of the four moving centers', () => {
  const held = rouxReferenceState(engine);
  for (const moves of [[], ['M'], ["M'"], ['M2'], ['U'], ['M', 'U2', "M'"]] as TeachingMove[][]) {
    const state = engine.apply(held, moves);
    expect(blockComplete(engine, state, 'left')).toBe(true);
    expect(blockComplete(engine, state, 'right')).toBe(true);
  }
  expect(blockComplete(engine, engine.apply(held, ['R']), 'left')).toBe(true);
  expect(blockComplete(engine, engine.apply(held, ['R']), 'right')).toBe(false);
  expect(blockComplete(engine, engine.apply(held, ['L']), 'left')).toBe(false);
});
it('does not confuse a twisted or misplaced target with a solved block', () => {
  const held = rouxReferenceState(engine),
    twisted = structuredClone(held),
    swapped = structuredClone(held);
  twisted.data.CORNERS.orientation[5] = (twisted.data.CORNERS.orientation[5] + 1) % 3;
  [swapped.data.EDGES.pieces[7], swapped.data.EDGES.pieces[5]] = [
    swapped.data.EDGES.pieces[5],
    swapped.data.EDGES.pieces[7],
  ];
  expect(blockComplete(engine, twisted, 'left')).toBe(false);
  expect(blockComplete(engine, swapped, 'left')).toBe(false);
});
it('separates oriented corners and cyclic order from absolute U alignment', () => {
  const held = rouxReferenceState(engine);
  for (const [moves, offset] of [
    [[], 0],
    [['U'], 1],
    [['U2'], 2],
    [["U'"], 3],
  ] as [TeachingMove[], number][]) {
    const state = engine.apply(held, moves);
    expect(topCornersOriented(engine, state)).toBe(true);
    expect(cornerOffset(engine, state)).toBe(offset);
    expect(rouxSolved(engine, state)).toBe(offset === 0);
  }
  const t = engine.apply(held, [
    'R',
    'U',
    "R'",
    "U'",
    "R'",
    'F',
    'R2',
    "U'",
    "R'",
    "U'",
    'R',
    'U',
    "R'",
    "F'",
  ]);
  expect(topCornersOriented(engine, t)).toBe(true);
  expect(cornerOffset(engine, t)).toBeNull();
  expect(topCornersOriented(engine, engine.apply(held, ['R']))).toBe(false);
});
it('requires complete piece identity and final reference centers', () => {
  const held = rouxReferenceState(engine);
  expect(rouxSolved(engine, held)).toBe(true);
  expect(rouxSolved(engine, engine.apply(held, ['M2']))).toBe(false);
  expect(rouxSolved(engine, engine.solved())).toBe(false);
  expect(rouxSolved(engine, engine.apply(held, ['U2', 'M2', 'U2', 'M2']))).toBe(false);
});
