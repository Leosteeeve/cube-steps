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
const mocked = vi.hoisted(() => ({ solve: vi.fn(), facelets: vi.fn(), cancel: vi.fn() }));
vi.mock('./solve-client', () => ({
  createSolveClient: () => ({
    solveScramble: mocked.solve,
    solveFacelets: mocked.facelets,
    cancel: mocked.cancel,
  }),
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
it('dispatches a legal Roux color example without treating it as a scramble', async () => {
  const { ROUX_COURSE } = await import('../content/roux-course');
  const { registerRouxCourse } = await import('../content/courses');
  const { registerMethodRuntime } = await import('../methods/registry');
  const { ROUX_RUNTIME } = await import('../methods/roux/definition');
  registerRouxCourse(ROUX_COURSE);
  registerMethodRuntime(ROUX_RUNTIME);
  mocked.solve.mockImplementation(() => new Promise(() => {}));
  mocked.facelets.mockImplementation(() => new Promise(() => {}));
  render(
    <LearnPage
      engine={await createCubeEngine()}
      method="roux-beginner"
      lessonId="roux-corner-orientation"
    />,
  );
  fireEvent.change(screen.getByLabelText('Practice case'), { target: { value: 'roux-ocll-21' } });
  const selected = ROUX_COURSE.find((l) => l.id === 'roux-corner-orientation')!.examples!.find(
    (e) => e.id === 'roux-ocll-21',
  )!;
  expect(mocked.facelets).toHaveBeenCalledWith(
    selected.input!.kind === 'facelets' ? selected.input!.facelets : null,
    'roux-beginner',
  );
  expect(screen.getByText('LESSON 4 / 8')).toBeVisible();
  expect(screen.queryByText('Start with the white cross')).toBeNull();
  await screen.findByRole('heading', { name: 'Look' });
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
