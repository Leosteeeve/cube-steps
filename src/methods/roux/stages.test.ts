import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { rouxReferenceState } from './frame';
import { checkRouxStage } from './stages';
import { ROUX_PRESENTATION } from './presentation';
it('keeps block, reference, relative and final stage checkpoints distinct', async () => {
  const e = await createCubeEngine(),
    r = rouxReferenceState(e),
    middle = e.apply(r, ['M']),
    shifted = e.apply(r, ['U']);
  expect(checkRouxStage(e, middle, 'roux-second-block')).toBe(true);
  expect(checkRouxStage(e, middle, 'roux-corner-permutation')).toBe(true);
  expect(checkRouxStage(e, middle, 'roux-edge-orientation')).toBe(false);
  expect(checkRouxStage(e, shifted, 'roux-corner-permutation')).toBe(false);
  expect(checkRouxStage(e, shifted, 'roux-left-right-edges')).toBe(true);
  expect(checkRouxStage(e, shifted, 'roux-last-four-edges')).toBe(false);
  expect(checkRouxStage(e, e.apply(r, ['R']), 'roux-first-block')).toBe(true);
  expect(checkRouxStage(e, e.apply(r, ['R']), 'roux-second-block')).toBe(false);
  expect(ROUX_PRESENTATION.teachingStatus).toBe('preview');
});
