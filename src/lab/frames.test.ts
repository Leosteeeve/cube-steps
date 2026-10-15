import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { COLORS, CORNER_SLOTS, EDGE_SLOTS } from '../core/observations';
import type { Color, CubeEngine, TeachingMove } from '../core/types';
import { createLabFrame } from './frames';
import { prepareLabInput } from './input';
import { seededScramble } from '../../tests/fixtures/lbl-cases';

let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
const colors = Object.values(COLORS);
const opposite: Record<Color, Color> = {
  white: 'yellow',
  yellow: 'white',
  red: 'orange',
  orange: 'red',
  green: 'blue',
  blue: 'green',
};
const holds = colors.flatMap((bottom) =>
  colors
    .filter((front) => front !== bottom && front !== opposite[bottom])
    .map((front) => ({ bottom, front })),
);
const moves = [
  'U',
  'D',
  'R',
  'L',
  'F',
  'B',
  'Uw',
  'Dw',
  'Rw',
  'Lw',
  'Fw',
  'Bw',
  'M',
  'E',
  'S',
  'x',
  'y',
  'z',
].flatMap((face) => ['', "'", '2'].map((suffix) => (face + suffix) as TeachingMove));

it.each(holds)(
  'preserves physical colors and all move effects for $bottom bottom / $front front',
  (hold) => {
    const input = prepareLabInput(engine, { kind: 'scramble', moves: seededScramble(117) });
    const frame = createLabFrame(engine, input, hold);
    const positioned = engine.apply(input.initial, frame.positioningMoves);
    expect(engine.observe(positioned).centers.D).toBe(hold.bottom);
    expect(engine.observe(positioned).centers.F).toBe(hold.front);
    const virtual = frame.toCanonical(positioned);
    expect(engine.observe(virtual).centers.D).toBe('white');
    expect(engine.observe(virtual).centers.F).toBe('green');
    expect(engine.equals(frame.toPhysical(virtual), positioned)).toBe(true);
    for (const move of moves) {
      const physicalAfter = engine.apply(positioned, [move]);
      const mappedAfter = frame.toPhysical(engine.apply(virtual, [move]));
      expect(engine.equals(mappedAfter, physicalAfter), move).toBe(true);
      expect(frame.toPhysicalMoves([move])).toEqual([move]);
    }
    for (const id of [...EDGE_SLOTS, ...CORNER_SLOTS]) {
      expect(frame.physicalPieceId(frame.canonicalPieceId(id))).toBe(id);
    }
    const physicalById = [
      ...engine.observe(positioned).edges,
      ...engine.observe(positioned).corners,
    ];
    for (const piece of [...engine.observe(virtual).edges, ...engine.observe(virtual).corners]) {
      expect(physicalById.find((p) => p.id === frame.physicalPieceId(piece.id))?.slot).toBe(
        piece.slot,
      );
    }
  },
);

it.each(holds)('maps a solved cube to a solved canonical cube with $bottom / $front', (hold) => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] });
  const frame = createLabFrame(engine, input, hold);
  const positioned = engine.apply(input.initial, frame.positioningMoves);
  expect(engine.isSolved(frame.toCanonical(positioned))).toBe(true);
  expect(engine.equals(frame.toPhysical(frame.toCanonical(positioned)), positioned)).toBe(true);
});

it('rejects impossible holds and unknown physical identities', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] });
  expect(() => createLabFrame(engine, input, { bottom: 'white', front: 'white' })).toThrow();
  expect(() => createLabFrame(engine, input, { bottom: 'white', front: 'yellow' })).toThrow();
  expect(() =>
    createLabFrame(engine, input, { bottom: 'white', front: 'green' }).physicalPieceId('XX'),
  ).toThrow();
});
