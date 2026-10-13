import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import * as solver from '../methods/lbl/solve';
import { handleSolveRequest, handleSolveMessage } from './solve-request';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(() => vi.restoreAllMocks());
it('loads_assets_only_for_a_valid_advanced_request_and_reports_load_failure', async () => {
  const loader = vi.fn(async () => {
    throw new Error('checksum mismatch');
  });
  for (const request of [
    { requestId: 1, method: 'lbl', input: { kind: 'scramble', moves: [] } },
    { requestId: 2, method: 'cfop-beginner', input: { kind: 'scramble', moves: [] } },
    { requestId: 3, method: 'cfop-advanced', input: { kind: 'scramble', moves: ['M'] } },
    { requestId: 4, method: 'cfop-advanced', input: { kind: 'facelets', facelets: {} } },
    { requestId: -1, method: 'cfop-advanced', input: { kind: 'scramble', moves: [] } },
  ])
    await handleSolveMessage(engine, request, loader);
  expect(loader).not.toHaveBeenCalled();
  const reply = await handleSolveMessage(
    engine,
    { requestId: 5, method: 'cfop-advanced', input: { kind: 'scramble', moves: ['R'] } },
    loader,
  );
  expect(loader).toHaveBeenCalledTimes(1);
  expect(reply).toMatchObject({
    requestId: 5,
    result: {
      ok: false,
      error: { kind: 'solver', message: expect.stringContaining('checksum mismatch') },
    },
  });
});
it.each([undefined, 'roux', null, 1])('rejects an invalid or missing method: %s', (method) => {
  expect(
    handleSolveRequest(engine, { requestId: 5, method, input: { kind: 'scramble', moves: [] } }),
  ).toMatchObject({
    result: { ok: false, error: { kind: 'input', message: expect.stringContaining('method') } },
  });
});
it('dispatches CFOP for scramble and color inputs with exact provenance', () => {
  const example = GOLDEN_CASES[7];
  for (const input of [
    { kind: 'scramble', moves: example.moves },
    { kind: 'facelets', facelets: example.facelets },
  ]) {
    const reply = handleSolveRequest(engine, { requestId: 12, method: 'cfop-beginner', input });
    expect(reply?.result).toMatchObject({
      ok: true,
      session: { input, trace: { method: 'cfop-beginner' } },
    });
    if (!reply?.result.ok) throw new Error('Missing CFOP session');
    expect(
      engine.equals(
        reply.result.session.trace.initial,
        engine.apply(engine.solved(), example.moves),
      ),
    ).toBe(true);
  }
});
it('returns complete sessions for both input kinds with copied provenance', () => {
  const example = GOLDEN_CASES[7];
  for (const input of [
    { kind: 'scramble', moves: [...example.moves] },
    { kind: 'facelets', facelets: structuredClone(example.facelets) },
  ] as const) {
    const reply = handleSolveRequest(engine, { requestId: 3, method: 'lbl', input });
    expect(reply?.result.ok).toBe(true);
    if (!reply?.result.ok) throw new Error('Missing solution');
    expect(reply.result.session.input).toEqual(input);
    expect(reply.result.session.input).not.toBe(input);
    expect(
      engine.equals(
        reply.result.session.trace.initial,
        engine.apply(engine.solved(), example.moves),
      ),
    ).toBe(true);
  }
});
it.each([null, {}, { requestId: -1 }, { requestId: 1.5 }, { requestId: '1' }])(
  'ignores messages without a usable request id: %j',
  (value) => {
    expect(handleSolveRequest(engine, value)).toBeNull();
  },
);
it.each([
  null,
  {},
  { kind: 'unknown' },
  { kind: 'scramble', moves: ['R U'] },
  { kind: 'scramble', moves: ['x'] },
  { kind: 'scramble', moves: 'R' },
  { kind: 'facelets', facelets: {} },
])('rejects invalid input before invoking LBL: %j', (input) => {
  const solve = vi.spyOn(solver, 'solveLBL');
  expect(handleSolveRequest(engine, { requestId: 2, method: 'lbl', input })).toMatchObject({
    requestId: 2,
    result: { ok: false, error: { kind: 'input' } },
  });
  expect(solve).not.toHaveBeenCalled();
});
it('returns facelet issues and preserves the invalid payload', () => {
  const facelets = structuredClone(GOLDEN_CASES[0].facelets) as any;
  facelets.F[0] = null;
  const before = structuredClone(facelets);
  expect(
    handleSolveRequest(engine, {
      requestId: 4,
      method: 'lbl',
      input: { kind: 'facelets', facelets },
    }),
  ).toMatchObject({
    result: { ok: false, error: { kind: 'input', issues: [{ code: 'unfilled' }] } },
  });
  expect(facelets).toEqual(before);
});
it('reports a bounded solver failure without claiming a verified session', () => {
  vi.spyOn(solver, 'solveLBL').mockReturnValue({
    ok: false,
    code: 'budget',
    stageId: 'white-cross',
    message: 'Bound reached',
  });
  expect(
    handleSolveRequest(engine, {
      requestId: 8,
      method: 'lbl',
      input: { kind: 'scramble', moves: [] },
    }),
  ).toMatchObject({
    result: {
      ok: false,
      error: { kind: 'solver', message: expect.stringContaining('No verified solution') },
    },
  });
});
