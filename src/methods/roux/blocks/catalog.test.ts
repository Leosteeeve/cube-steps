import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import { ROUX_BLOCK_MANEUVERS } from './catalog';
import { blockGoals } from './policies';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('returns no recognition for a maneuver that moves a locked piece', () => {
  const goal = blockGoals(engine).find((g) => g.side === 'right' && g.phase === 'base')!;
  const turn = ROUX_BLOCK_MANEUVERS.find((m) => m.moves.join(' ') === 'L')!;
  expect(turn.match(engine, rouxReferenceState(engine), goal)).toBeNull();
});
it('reports the actual moving target and explains the middle slice direction', () => {
  const goal = blockGoals(engine).find((g) => g.side === 'right' && g.phase === 'base')!;
  const state = engine.apply(rouxReferenceState(engine), ['R2', 'U']);
  const m = ROUX_BLOCK_MANEUVERS.find((m) => m.moves.join(' ') === "M'")!;
  const matched = m.match(engine, state, goal)!;
  expect(matched.targets.length).toBeGreaterThan(0);
  expect(matched.explanation).toMatch(/middle slice/i);
  expect(m.check(engine, state, engine.apply(state, m.moves), goal)).toBe(true);
});
it('restores the right base edge after an open-adjust-close maneuver', () => {
  const held = rouxReferenceState(engine),
    goal = blockGoals(engine).find((g) => g.side === 'right' && g.phase === 'pair')!;
  const m = ROUX_BLOCK_MANEUVERS.find((m) => m.moves.join(' ') === "R U R'")!;
  const base = engine.observe(held).edges.find((p) => p.slot === 'DR')!;
  expect(engine.observe(engine.apply(held, ['R'])).edges.find((p) => p.id === base.id)).not.toEqual(
    base,
  );
  expect(engine.observe(engine.apply(held, m.moves)).edges.find((p) => p.id === base.id)).toEqual(
    base,
  );
  expect(m.check(engine, held, engine.apply(held, m.moves), goal)).toBe(true);
});
