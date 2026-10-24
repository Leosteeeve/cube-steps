import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import type { CubeEngine, CubeState, TeachingMove } from '../src/core/types';
import { ROUX_FRAMES } from '../src/methods/roux-advanced/frames';
import { prepareRouxInput } from '../src/methods/roux-advanced/input';
import { blockCompleteInFrame } from '../src/methods/roux-advanced/predicates';
import { createRouxSearchBudget } from '../src/methods/roux-advanced/budget';
import { searchFirstBlockReference } from '../src/methods/roux-advanced/blocks/reference';
import {
  validateBlockSearchBytes,
  type BlockSearchAssets,
} from '../src/methods/roux-advanced/blocks/distance';
let engine: CubeEngine, assets: BlockSearchAssets;
beforeAll(async () => {
  engine = await createCubeEngine();
  assets = await validateBlockSearchBytes(
    new Uint8Array(await readFile('src/methods/roux-advanced/data/block-distance.bin')),
  );
});
// Independent physical-state BFS: no projection, distance table or IDA pruning.
const alphabet = [
  'U',
  'D',
  'L',
  'R',
  'F',
  'B',
  'M',
  'E',
  'S',
  'Uw',
  'Dw',
  'Lw',
  'Rw',
  'Fw',
  'Bw',
].flatMap((b) => ['', "'", '2'].map((s) => (b + s) as TeachingMove));
function oracle(
  state: CubeState,
  frame: (typeof ROUX_FRAMES)[number],
  depth: number,
): number | undefined {
  const q = [{ s: state, d: 0 }],
    seen = new Set<string>();
  for (let h = 0; h < q.length; h++) {
    const { s, d } = q[h];
    if (blockCompleteInFrame(engine, s, frame, 'left')) return d;
    if (d === depth) continue;
    for (const m of alphabet) {
      const next = engine.apply(s, [m]),
        key = JSON.stringify(next.data);
      if (!seen.has(key)) {
        seen.add(key);
        q.push({ s: next, d: d + 1 });
      }
    }
  }
}
it.each([{ moves: [] }, { moves: ['F'] }, { moves: ['L', 'B'] }, { moves: ['D2', 'F'] }])(
  'matches a full-alphabet shallow oracle for $moves',
  ({ moves }) => {
    const input = prepareRouxInput(engine, { kind: 'scramble', moves: moves as never });
    for (const frame of [ROUX_FRAMES[0], ROUX_FRAMES[5]]) {
      const held = engine.apply(input.initial, frame.positioningMoves),
        d = oracle(held, frame, 2);
      const run = searchFirstBlockReference(
        engine,
        input,
        frame,
        assets,
        createRouxSearchBudget('normal', { now: () => 0 }),
      );
      let next = run.next();
      while (!next.done) next = run.next();
      expect(next.value.status).toBe('proven-minimum');
      if (next.value.status !== 'proven-minimum') throw Error('No proof');
      expect(next.value.minimum).toBe(d);
      expect(
        blockCompleteInFrame(engine, engine.apply(held, next.value.witness), frame, 'left'),
      ).toBe(true);
    }
  },
);
it('never calls an interrupted bound proven', () => {
  const input = prepareRouxInput(engine, { kind: 'scramble', moves: ['F', 'L', 'B', 'D'] });
  const run = searchFirstBlockReference(
    engine,
    input,
    ROUX_FRAMES[0],
    assets,
    createRouxSearchBudget('normal', { now: () => 0, maxOperations: 8 }),
  );
  let next = run.next();
  while (!next.done) next = run.next();
  expect(next.value.status).not.toBe('proven-minimum');
});
it('keeps a replay-verified upper witness when cancellation interrupts proof', () => {
  const input = prepareRouxInput(engine, { kind: 'scramble', moves: ['F', 'L', 'B'] });
  const frame = ROUX_FRAMES.find((f) => f.id === 'yellow-orange')!;
  let cancelled = false;
  const run = searchFirstBlockReference(
    engine,
    input,
    frame,
    assets,
    createRouxSearchBudget('normal', { now: () => 0, cancelled: () => cancelled }),
    ["B'", "L'", "F'"],
  );
  let event = run.next();
  while (!event.done && event.value.kind !== 'evidence') event = run.next();
  expect(event.done).toBe(false);
  if (event.done || event.value.kind !== 'evidence') throw Error('Missing witness evidence');
  expect(event.value.evidence.status).toBe('best-found');
  cancelled = true;
  let final = run.next();
  while (!final.done) final = run.next();
  expect(final.value).toEqual(event.value.evidence);
});
