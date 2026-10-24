import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import { ROUX_FRAMES } from '../frames';
import { validateBlockSearchBytes, firstBlockLowerBound } from './distance';
import { readFirstBlockCoordinate, stepFirstBlockCoordinate } from './coordinates';
import { blockCompleteInFrame } from '../predicates';
import manifest from '../data/manifest.json';
let bytes: Uint8Array;
beforeAll(async () => {
  bytes = new Uint8Array(await readFile('src/methods/roux-advanced/data/block-distance.bin'));
});
it('admits only the expected bytes, digest and coordinate version', async () => {
  expect((await validateBlockSearchBytes(bytes)).distances.length).toBe(5322240);
  await expect(validateBlockSearchBytes(bytes.slice(1))).rejects.toThrow(/length/);
  const corrupt = bytes.slice();
  corrupt[0] ^= 1;
  await expect(validateBlockSearchBytes(corrupt)).rejects.toThrow(/integrity/);
  await expect(
    validateBlockSearchBytes(bytes, { ...manifest, coordinateVersion: 2 }),
  ).rejects.toThrow(/version/);
});
it('does not confuse a solved cubie projection with the side-center goal', async () => {
  const engine = await createCubeEngine(),
    frame = ROUX_FRAMES[0],
    assets = await validateBlockSearchBytes(bytes);
  const goal = engine.apply(engine.solved(), frame.positioningMoves),
    wrong = structuredClone(goal);
  // Isolate exactly the distinction checked by the proof goal; not a user input.
  [wrong.data.CENTERS.pieces[1], wrong.data.CENTERS.pieces[3]] = [
    wrong.data.CENTERS.pieces[3],
    wrong.data.CENTERS.pieces[1],
  ];
  expect(readFirstBlockCoordinate(engine, wrong, frame)).toBe(
    readFirstBlockCoordinate(engine, goal, frame),
  );
  expect(firstBlockLowerBound(engine, wrong, frame, assets)).toBe(0);
  expect(blockCompleteInFrame(engine, wrong, frame, 'left')).toBe(false);
});
it('projected steps agree with physical replay for every primitive in every frame', async () => {
  const e = await createCubeEngine();
  const moves = [
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
  ].flatMap((b) =>
    ['', "'", '2'].map((s) => (b + s) as import('../../../core/types').TeachingMove),
  );
  for (const f of ROUX_FRAMES) {
    const s = e.apply(e.apply(e.solved(), ['R', 'U2', "F'", 'L', 'B2']), f.positioningMoves);
    for (const m of moves)
      expect(stepFirstBlockCoordinate(readFirstBlockCoordinate(e, s, f), m)).toBe(
        readFirstBlockCoordinate(e, e.apply(s, [m]), f),
      );
  }
});
