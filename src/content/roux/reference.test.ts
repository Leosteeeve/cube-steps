import { expect, it } from 'vitest';
import { ROUX_REFERENCE } from './reference';
import { ROUX_CORNER_ALGORITHMS } from '../../methods/roux/corners/catalog';
import { ROUX_BLOCK_MANEUVERS, ROUX_BLOCK_ALGORITHMS } from '../../methods/roux/blocks/catalog';
import { ROUX_LESSON_DETAILS } from '../roux-course';
it('gives both block chapters their actual catalog moves and protection boundaries', () => {
  for (const maneuver of ROUX_BLOCK_MANEUVERS) {
    const item = ROUX_REFERENCE.find((r) => r.id === maneuver.id);
    expect(item?.algorithm.moves).toBe(maneuver.moves);
    expect(item?.protection).toBe(maneuver.protection);
    if (maneuver.kind === 'algorithm')
      expect(item?.algorithm).toBe(ROUX_BLOCK_ALGORITHMS[maneuver.id]);
    expect(ROUX_LESSON_DETAILS['roux-first-block'].referenceIds).toContain(maneuver.id);
    expect(ROUX_LESSON_DETAILS['roux-second-block'].referenceIds.includes(maneuver.id)).toBe(
      maneuver.moves.every((move) => /^[RUM]/.test(move)),
    );
  }
});
it('shares all nine exact corner algorithms and conditional M/U maneuvers', () => {
  for (const [id, algorithm] of Object.entries(ROUX_CORNER_ALGORITHMS))
    expect(ROUX_REFERENCE.find((r) => r.id === id)?.algorithm).toBe(algorithm);
  expect(ROUX_REFERENCE.some((r) => r.algorithm.moves.join(' ') === "M' U M")).toBe(true);
  expect(ROUX_REFERENCE.some((r) => r.algorithm.moves.join(' ') === "M U2 M'")).toBe(true);
});
