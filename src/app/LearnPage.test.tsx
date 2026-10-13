// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LearnPage } from './LearnPage';
import { createCubeEngine } from '../core/cube';
import { solveCFOP } from '../methods/cfop/solve';
import { CFOP_EXAMPLES } from '../content/cfop-examples';
import { parseScramble } from '../core/notation';
import type { SessionResult } from './solve-client';
const mocked = vi.hoisted(() => ({ solve: vi.fn(), cancel: vi.fn() }));
vi.mock('./solve-client', () => ({
  createSolveClient: () => ({ solveScramble: mocked.solve, cancel: mocked.cancel }),
}));
vi.mock('../player/CubePlayer', () => ({
  CubePlayer: ({ caseId }: { caseId?: string }) => (
    <div data-testid="current-case">{caseId ?? 'guided'}</div>
  ),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('links to animated notation only from the club introduction', async () => {
  const engine = await createCubeEngine();
  const { rerender } = render(
    <LearnPage engine={engine} lessonId="notation" presentation="club" />,
  );
  expect(screen.getByRole('link', { name: 'Explore moves in 3D' })).toHaveAttribute(
    'href',
    '#/moves',
  );
  rerender(<LearnPage engine={engine} lessonId="notation" />);
  expect(screen.queryByRole('link', { name: 'Explore moves in 3D' })).not.toBeInTheDocument();
});
it('changes case content together and ignores late cancelled examples', async () => {
  const pending: ((value: SessionResult) => void)[] = [];
  mocked.solve.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
  const engine = await createCubeEngine();
  render(<LearnPage engine={engine} method="cfop-beginner" lessonId="cfop-f2l" />);
  fireEvent.change(screen.getByLabelText('Practice case'), { target: { value: 'f2l-white-up' } });
  fireEvent.change(screen.getByLabelText('Practice case'), { target: { value: 'f2l-connected' } });
  expect(pending).toHaveLength(3);
  expect(mocked.cancel).toHaveBeenCalled();
  const example = CFOP_EXAMPLES.find((e) => e.id === 'f2l-connected')!,
    parsed = parseScramble(example.scramble);
  if (!parsed.ok) throw new Error(parsed.message);
  const result = solveCFOP(engine, engine.apply(engine.solved(), parsed.moves));
  if (!result.ok) throw new Error(result.message);
  const answer: SessionResult = {
    ok: true,
    session: { input: { kind: 'scramble', moves: parsed.moves }, trace: result.trace },
  };
  await act(async () => pending[1](answer));
  expect(screen.queryByTestId('current-case')).not.toBeInTheDocument();
  await act(async () => pending[2](answer));
  expect(screen.getByTestId('current-case')).toHaveTextContent('f2l-connected');
  await act(async () =>
    pending[0]({ ok: false, error: { kind: 'worker', message: 'Old example failed' } }),
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(mocked.solve).toHaveBeenLastCalledWith(example.scramble, 'cfop-beginner');
});
