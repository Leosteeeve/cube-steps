// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { ClubLearnPage } from './ClubLearnPage';
import { ClubProgressProvider, useClubProgress } from './use-club-progress';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import type { SessionResult } from '../../app/solve-client';
const mocked = vi.hoisted(() => ({ solve: vi.fn(), cancel: vi.fn() }));
vi.mock('../../app/solve-client', () => ({
  createSolveClient: () => ({ solveScramble: mocked.solve, cancel: mocked.cancel }),
}));
vi.mock('../../player/CubePlayer', () => ({ CubePlayer: () => <div data-testid="player" /> }));
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
function Probe() {
  const { progress } = useClubProgress();
  return <output>{JSON.stringify(progress)}</output>;
}
it('visits and self-reports practice without losing another method progress', () => {
  const view = render(
    <ClubProgressProvider>
      <ClubLearnPage engine={engine} method="lbl" lessonId="notation" />
      <Probe />
    </ClubProgressProvider>,
  );
  expect(screen.getByText(/self-reported/)).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark as practiced' }));
  expect(JSON.parse(screen.getByRole('status').textContent!).practiced.lbl).toEqual(['notation']);
  view.rerender(
    <ClubProgressProvider>
      <ClubLearnPage engine={engine} method="cfop-beginner" lessonId="intro" />
      <Probe />
    </ClubProgressProvider>,
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark as practiced' }));
  expect(JSON.parse(screen.getByRole('status').textContent!).practiced).toEqual({
    lbl: ['notation'],
    'cfop-beginner': ['intro'],
  });
  view.rerender(
    <ClubProgressProvider>
      <ClubLearnPage engine={engine} method="lbl" lessonId="notation" />
      <Probe />
    </ClubProgressProvider>,
  );
  expect(screen.getByRole('checkbox', { name: 'Mark as practiced' })).toBeChecked();
  expect(JSON.parse(localStorage.getItem('cubesteps.club.progress.v1')!).lastLesson).toEqual({
    method: 'lbl',
    lessonId: 'notation',
  });
});
it('ignores a delayed example after navigating to another route', async () => {
  let finish!: (result: SessionResult) => void;
  mocked.solve.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(
    <ClubProgressProvider>
      <ClubLearnPage engine={engine} method="lbl" lessonId="white-cross" />
    </ClubProgressProvider>,
  );
  view.rerender(
    <ClubProgressProvider>
      <ClubLearnPage engine={engine} method="cfop-beginner" lessonId="intro" />
    </ClubProgressProvider>,
  );
  await act(async () =>
    finish({ ok: false, error: { kind: 'worker', message: 'Late old lesson error' } }),
  );
  expect(screen.queryByText('Late old lesson error')).not.toBeInTheDocument();
  expect(screen.queryByTestId('player')).not.toBeInTheDocument();
  expect(
    screen
      .getByRole('navigation', { name: 'Learning path' })
      .querySelector('[aria-current="page"]'),
  ).toHaveAttribute('href', '#/learn/cfop/intro');
  expect(mocked.cancel).toHaveBeenCalled();
});
