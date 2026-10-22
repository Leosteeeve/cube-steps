import { expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { rouxReferenceState } from '../methods/roux/frame';
import { describeRouxPlayback } from './roux-guidance';
import { solveRoux } from '../methods/roux/solve';
import { loadTestRouxAssets } from '../../tests/helpers/roux';
import { ROUX_WORKED_EXAMPLES } from '../content/roux/examples';
import { resolveSolveInput } from '../core/solve-input';
it('distinguishes actual center phases and the initial hold', async () => {
  const e = await createCubeEngine(),
    ref = rouxReferenceState(e);
  expect(describeRouxPlayback(e, e.solved(), undefined, 0)).toMatchObject({
    reference: 'setup-required',
    frameLabel: expect.stringContaining('starting hold'),
  });
  expect(describeRouxPlayback(e, ref, undefined, 0)).toMatchObject({
    reference: 'ready',
    centerLabel: expect.stringMatching(/yellow.*red/i),
  });
  for (const token of ['M', "M'"] as const)
    expect(describeRouxPlayback(e, e.apply(ref, [token]), undefined, 1)).toMatchObject({
      reference: 'setup-required',
      note: expect.stringContaining('Middle-slice setup in progress'),
      frameLabel: expect.stringMatching(/blue left.*green right/i),
    });
});
it('retains temporary restoration guidance only inside the complete formula', async () => {
  const e = await createCubeEngine(),
    input = ROUX_WORKED_EXAMPLES.find((x) => x.id === 'roux-ocll-27')!.input;
  const r = solveRoux(e, resolveSolveInput(e, input), await loadTestRouxAssets());
  if (!r.ok) throw Error(r.message);
  const a = r.trace.stages.flatMap((s) => s.actions).find((a) => a.algorithmId === 'roux-ocll-27')!;
  expect(describeRouxPlayback(e, e.apply(a.before, a.moves.slice(0, 1)), a, 1).note).toMatch(
    /whole corner formula/i,
  );
  expect(describeRouxPlayback(e, a.after, a, a.moves.length).note ?? '').not.toMatch(
    /whole corner formula/i,
  );
  expect(describeRouxPlayback(e, a.before, a, 0).protectedIds).toEqual(a.roux!.protectedIds);
});
