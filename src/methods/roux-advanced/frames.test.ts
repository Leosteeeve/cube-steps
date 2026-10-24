import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { CORNER_SLOTS, EDGE_SLOTS } from '../../core/observations';
import type { CubeEngine, TeachingMove } from '../../core/types';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { ROUX_FRAMES, createRouxFrameMap } from './frames';
import { advancedRouxSolved, blockCompleteInFrame, observeAdvancedFrame } from './predicates';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
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
].flatMap((base) => ['', "'", '2'].map((s) => (base + s) as TeachingMove));
it('defines exactly the eight handed white/yellow bottom frames', () => {
  expect(ROUX_FRAMES).toHaveLength(8);
  expect(new Set(ROUX_FRAMES.map((f) => f.id)).size).toBe(8);
  for (const frame of ROUX_FRAMES) {
    const hold = engine.apply(engine.solved(), frame.positioningMoves);
    expect(engine.observe(hold).centers).toEqual(frame.centers);
    expect(frame.centers.D).toBe(frame.bottom);
    expect(frame.centers.L).toBe(frame.left);
    expect(advancedRouxSolved(engine, hold, frame)).toBe(true);
  }
});
it('all frame maps round-trip, commute with 45 STM moves, and preserve target identity', () => {
  for (const frame of ROUX_FRAMES) {
    const map = createRouxFrameMap(engine, frame.id);
    const held = engine.apply(
      engine.apply(engine.solved(), seededScramble(37)),
      frame.positioningMoves,
    );
    const canonical = map.toCanonical(held);
    expect(engine.observe(canonical).centers).toEqual(
      engine.observe(engine.apply(engine.solved(), ['x2', 'y'])).centers,
    );
    expect(engine.equals(map.fromCanonical(canonical), held)).toBe(true);
    for (const move of moves) {
      expect(
        engine.equals(
          map.fromCanonical(engine.apply(canonical, map.toCanonicalMoves([move]))),
          engine.apply(held, [move]),
        ),
        `${frame.id} ${move}`,
      ).toBe(true);
      expect(map.toPhysicalMoves([move])).toEqual([move]);
    }
    const ids = [...EDGE_SLOTS, ...CORNER_SLOTS].map((id) => map.toPhysicalId(id));
    expect(new Set(ids).size).toBe(20);
    for (const piece of [
      ...engine.observe(canonical).edges,
      ...engine.observe(canonical).corners,
    ]) {
      expect(
        [...engine.observe(held).edges, ...engine.observe(held).corners].find(
          (p) => p.id === map.toPhysicalId(piece.id),
        )?.slot,
      ).toBe(piece.slot);
    }
  }
});
it('checks slice phases and U offsets in every frame without accepting corrupt centers', () => {
  for (const frame of ROUX_FRAMES) {
    const start = engine.apply(engine.solved(), frame.positioningMoves);
    for (let m = 0; m < 4; m++)
      for (let u = 0; u < 4; u++) {
        const state = engine.apply(start, [...Array(m).fill('M'), ...Array(u).fill('U')]);
        expect(observeAdvancedFrame(engine, state, frame)).toEqual({
          sideFrameValid: true,
          centerPhase: m,
          cornerOffset: u,
        });
        expect(blockCompleteInFrame(engine, state, frame, 'left')).toBe(true);
        expect(blockCompleteInFrame(engine, state, frame, 'right')).toBe(true);
        expect(advancedRouxSolved(engine, state, frame)).toBe(m === 0 && u === 0);
      }
    const corrupt = structuredClone(start);
    [corrupt.data.CENTERS.pieces[0], corrupt.data.CENTERS.pieces[1]] = [
      corrupt.data.CENTERS.pieces[1],
      corrupt.data.CENTERS.pieces[0],
    ];
    expect(observeAdvancedFrame(engine, corrupt, frame).centerPhase).toBeNull();
    expect(blockCompleteInFrame(engine, corrupt, frame, 'left')).toBe(false);
    expect(advancedRouxSolved(engine, corrupt, frame)).toBe(false);
  }
});
