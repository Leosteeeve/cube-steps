import { expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { handlePracticeRequest } from './practice-request';
it('echoes all identities for checked exercises and failures', async () => {
  const engine = await createCubeEngine(),
    request = { requestId: 4, caseId: 'oll-20', fixtureId: 'oll-20/u0', variantId: 'oll-20/main' };
  expect(handlePracticeRequest(engine, request)).toMatchObject({
    ...request,
    result: { ok: true, exercise: { caseId: request.caseId } },
  });
  expect(handlePracticeRequest(engine, { ...request, variantId: 'pll-z/main' })).toMatchObject({
    ...request,
    variantId: 'pll-z/main',
    result: { ok: false, message: expect.any(String) },
  });
  for (const raw of [null, {}, { ...request, requestId: NaN }, { ...request, fixtureId: 12 }])
    expect(handlePracticeRequest(engine, raw)).toBeNull();
});
