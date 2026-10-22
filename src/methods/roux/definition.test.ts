import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, SolveTrace } from '../../core/types';
import { solveRoux } from './solve';
import { loadTestRouxAssets } from '../../../tests/helpers/roux';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
import { verifyTrace } from '../shared/verification';
import { ROUX_RUNTIME } from './definition';
let e: CubeEngine, trace: SolveTrace;
beforeAll(async () => {
  e = await createCubeEngine();
  const r = solveRoux(e, e.apply(e.solved(), seededScramble(17)), await loadTestRouxAssets());
  if (!r.ok) throw Error(r.message);
  trace = r.trace;
});
it.each([
  'targets',
  'phase',
  'formula',
  'source',
  'order',
  'centers',
  'explanation',
  'protection',
] as const)('rejects forged %s in an otherwise complete trace', (field) => {
  const t = structuredClone(trace),
    a = t.stages
      .flatMap((s) => s.actions)
      .find((a) => a.kind === 'algorithm' && a.roux!.protectedIds.length > 0)!;
  if (field === 'targets') a.targets = ['UF'];
  if (field === 'phase')
    a.roux!.centerPhaseAfter = ((a.roux!.centerPhaseAfter + 1) % 4) as 0 | 1 | 2 | 3;
  if (field === 'formula') a.moves.pop();
  if (field === 'source') a.before = e.solved();
  if (field === 'order') t.stages.reverse();
  if (field === 'centers') t.final = e.apply(t.final, ['M2']);
  if (field === 'explanation') a.explanation = 'A made-up case.';
  if (field === 'protection') a.roux!.protectedIds = [];
  expect(() => verifyTrace(e, t, ROUX_RUNTIME)).toThrow();
});
