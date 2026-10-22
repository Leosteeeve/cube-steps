import { expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import { rouxReferenceState } from '../frame';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { ROUX_LSE_MANEUVERS } from './catalog';
import { blockComplete } from '../predicates';
it('recognizes prepared arrows and reports every moved physical target', async () => {
  const e = await createCubeEngine();
  for (const m of ROUX_LSE_MANEUVERS.filter((m) => m.family === 'arrow')) {
    const state = e.apply(rouxReferenceState(e), invertTeachingMoves(m.moves)),
      match = m.match(e, state, 'orientation');
    expect(match?.caseId).toContain('prepared-arrow');
    expect(match?.targets.length).toBeGreaterThan(2);
    expect(match?.explanation).toContain('0 edges');
    const after = e.apply(state, m.moves);
    expect(m.check(e, state, after, 'orientation')).toBe(true);
    expect(blockComplete(e, after, 'left') && blockComplete(e, after, 'right')).toBe(true);
  }
});
