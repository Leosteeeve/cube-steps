// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { SolvePage } from './SolvePage';
import { EditionProvider } from './edition';
import { type SessionResult } from './solve-client';
import type { CubeEngine, SolveInput, SolveSession, MethodId } from '../core/types';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';

const mocked = vi.hoisted(() => ({ factory: vi.fn() }));
vi.mock('./solve-client', () => ({ createSolveClient: mocked.factory }));
vi.mock('../player/CubePlayer', () => ({
  CubePlayer: ({ session }: { session: SolveSession }) => (
    <output>Playback for {session.trace.method}</output>
  ),
}));
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
beforeEach(() => {
  sessionStorage.clear();
  mocked.factory.mockReset();
});
afterEach(cleanup);
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
function session(input: SolveInput, method: MethodId): SessionResult {
  return {
    ok: true,
    session: {
      input,
      trace: { method, initial: engine.solved(), stages: [], final: engine.solved() },
    },
  };
}
const saved: SolveInput = { kind: 'scramble', moves: ['R', 'U'] };
function worker() {
  let finish!: (result: SessionResult) => void;
  const response = new Promise<SessionResult>((resolve) => {
    finish = resolve;
  });
  return {
    solveScramble: vi.fn(() => response),
    solveFacelets: vi.fn(() => response),
    cancel: vi.fn(),
    finish,
  };
}
function workers() {
  const original = worker(),
    cfop = worker(),
    roux = worker();
  mocked.factory.mockReturnValueOnce(original).mockReturnValueOnce(cfop).mockReturnValueOnce(roux);
  return { original, cfop, roux };
}
async function originalSolve(
  original: ReturnType<typeof worker>,
  edition: 'club' | 'global' = 'club',
) {
  const view = render(
    <EditionProvider edition={edition}>
      <SolvePage engine={engine} />
    </EditionProvider>,
  );
  fireEvent.change(screen.getByLabelText('Scramble sequence'), { target: { value: 'RU' } });
  click('Explain with LBL');
  await act(async () => original.finish(session(saved, 'lbl')));
  return view;
}
it('keeps keyboard focus on each route action as it settles or retries', async () => {
  const { original, cfop, roux } = workers();
  await originalSolve(original);
  click('Compare CFOP and Roux');
  button('Cancel Advanced Roux').focus();
  await act(async () => cfop.finish(session(saved, 'cfop-advanced')));
  expect(button('Cancel Advanced Roux')).toHaveFocus();
  await act(async () =>
    roux.finish({ ok: false, error: { kind: 'worker', message: 'Timed out.' } }),
  );
  expect(button('Retry Advanced Roux')).toHaveFocus();
  const retry = worker();
  mocked.factory.mockReturnValueOnce(retry);
  click('Retry Advanced Roux');
  expect(button('Cancel Advanced Roux')).toHaveFocus();
  await act(async () => retry.finish(session(saved, 'roux-advanced')));
  expect(button('View Advanced Roux steps')).toHaveFocus();
  expect(cfop.solveScramble).toHaveBeenCalledTimes(1);
});
it('uses one saved scramble for both workers and leaves the original solution available after a method fails', async () => {
  const { original, cfop, roux } = workers();
  await originalSolve(original);
  expect(mocked.factory).toHaveBeenCalledTimes(1);
  click('Compare CFOP and Roux');
  expect(cfop.solveScramble).toHaveBeenCalledWith('R U', 'cfop-advanced', undefined);
  expect(roux.solveScramble).toHaveBeenCalledWith('R U', 'roux-advanced', {
    allowedFrames: ['white-blue'],
  });
  await act(async () => {
    cfop.finish(session(saved, 'cfop-advanced'));
    roux.finish({ ok: false, error: { kind: 'worker', message: 'Search timed out.' } });
  });
  expect(screen.getByText(/Search timed out/)).toBeVisible();
  click('View Advanced CFOP steps');
  expect(screen.getByText('Playback for cfop-advanced')).toBeVisible();
  expect(screen.getByText('Verified LBL solution')).toBeVisible();
  click('Back to my solution');
  expect(screen.getByText('Playback for lbl')).toBeVisible();
  expect(screen.getByLabelText('Scramble sequence')).toHaveValue('RU');
});
it('cancels independent searches, discards late completions after editing, retrying and leaving', async () => {
  const { original, cfop, roux } = workers();
  const view = await originalSolve(original);
  click('Compare CFOP and Roux');
  click('Cancel Advanced CFOP');
  expect(cfop.cancel).toHaveBeenCalled();
  expect(roux.cancel).not.toHaveBeenCalled();
  click('Edit cube input');
  fireEvent.change(screen.getByLabelText('Scramble sequence'), { target: { value: 'D' } });
  expect(roux.cancel).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Compare CFOP and Roux' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Scramble sequence'), { target: { value: 'RU' } });
  const nextCfop = worker(),
    nextRoux = worker();
  mocked.factory.mockReturnValueOnce(nextCfop).mockReturnValueOnce(nextRoux);
  click('Compare CFOP and Roux');
  await act(async () => {
    cfop.finish(session(saved, 'cfop-advanced'));
    roux.finish(session(saved, 'roux-advanced'));
  });
  expect(screen.queryByRole('button', { name: /View Advanced .* steps/ })).toBeNull();
  view.unmount();
  expect(nextCfop.cancel).toHaveBeenCalled();
  expect(nextRoux.cancel).toHaveBeenCalled();
});
it('passes the verified colors and the selected Roux frames without manufacturing a scramble', async () => {
  const { original, cfop, roux } = workers();
  const facelets = GOLDEN_CASES[1].facelets;
  sessionStorage.setItem(
    'cubesteps.club.color-draft.v1',
    JSON.stringify({ version: 1, draft: { facelets, face: 'F', selection: 'white' } }),
  );
  render(
    <EditionProvider edition="club">
      <SolvePage
        engine={engine}
        method="roux-advanced"
        rouxOptions={{ allowedFrames: ['yellow-red'], onAllowedFramesChange: vi.fn() }}
      />
    </EditionProvider>,
  );
  click('Enter colors');
  click('Check colors');
  click('Explain with Advanced Roux');
  await act(async () => original.finish(session({ kind: 'facelets', facelets }, 'roux-advanced')));
  click('Compare CFOP and Roux');
  expect(cfop.solveFacelets).toHaveBeenCalledWith(facelets, 'cfop-advanced', undefined);
  expect(roux.solveFacelets).toHaveBeenCalledWith(facelets, 'roux-advanced', {
    allowedFrames: ['yellow-red'],
  });
  expect(cfop.solveScramble).not.toHaveBeenCalled();
});
it('keeps the two-method comparison exclusive to the club edition', async () => {
  const { original } = workers();
  await originalSolve(original, 'global');
  expect(screen.getByText('Playback for lbl')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Compare CFOP and Roux' })).toBeNull();
});
it('reports equal move counts and removes the previous results on a second comparison', async () => {
  const { original, cfop, roux } = workers();
  await originalSolve(original);
  click('Compare CFOP and Roux');
  await act(async () => {
    cfop.finish(session(saved, 'cfop-advanced'));
    roux.finish(session(saved, 'roux-advanced'));
  });
  expect(screen.getByText('Both routes use the same number of turns.')).toBeVisible();
  click('View Advanced Roux steps');
  const nextCfop = worker(),
    nextRoux = worker();
  mocked.factory.mockReturnValueOnce(nextCfop).mockReturnValueOnce(nextRoux);
  click('Compare again');
  expect(screen.getByText('Playback for lbl')).toBeVisible();
  expect(screen.queryByRole('button', { name: /View Advanced .* steps/ })).toBeNull();
  click('Cancel comparison');
  expect(nextCfop.cancel).toHaveBeenCalled();
  expect(nextRoux.cancel).toHaveBeenCalled();
  expect(button('Compare CFOP and Roux')).toHaveFocus();
});
