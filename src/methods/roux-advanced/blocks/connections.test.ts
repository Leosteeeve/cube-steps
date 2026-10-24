import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { ROUX_FRAMES } from '../frames';
import { advancedRouxFixture } from '../../../../tests/fixtures/advanced-roux';
import { observeConnections } from './connections';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
const f = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
it('recognizes an off-slot pair beside a preserved square', () => {
  const connections = observeConnections(e, advancedRouxFixture(e, 'square-pair'), f);
  expect(connections.filter((c) => c.kind === 'pair').length).toBeGreaterThanOrEqual(2);
  expect(connections.some((c) => c.kind === 'square')).toBe(true);
});
it('recognizes both lines of a rigid rotated block', () => {
  expect(
    observeConnections(e, advancedRouxFixture(e, 'line-line'), f).filter((c) => c.kind === 'line'),
  ).toHaveLength(2);
});
it('sees two pairs even while the base edge remains unsolved', () => {
  const state = advancedRouxFixture(e, 'late-base');
  const connections = observeConnections(e, state, f);
  expect(connections.filter((c) => c.kind === 'pair').length).toBeGreaterThanOrEqual(2);
  expect(connections.filter((c) => c.kind === 'square')).toHaveLength(0);
  expect(e.observe(state).edges.find((p) => p.slot === 'DL')?.stickers.D).not.toBe('white');
});
