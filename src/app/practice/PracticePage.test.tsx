// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TestTour } from '../../club/tutorial/TestTour';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { generatePracticeExercise } from '../../practice/generate';
import type { PracticeReply } from '../../workers/practice-protocol';
import { practiceStore, PRACTICE_STORAGE_KEY } from '../../practice/storage';
import { PracticePage } from './PracticePage';
const mock = vi.hoisted(() => ({ generate: vi.fn(), cancel: vi.fn() }));
vi.mock('./practice-client', () => ({ createPracticeClient: () => mock }));
vi.mock('../../player/AlgorithmPlayer', () => ({
  AlgorithmPlayer: ({ demonstration }: any) => (
    <div data-testid="answer-player">{demonstration.caseId}</div>
  ),
}));
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
beforeEach(() => {
  localStorage.clear();
  practiceStore.save({ version: 1, caseIds: ['oll-20'], groupIds: [] });
  mock.cancel.mockReset();
  mock.generate
    .mockReset()
    .mockImplementation(async (caseId: string, fixtureId: string, variantId: string) => ({
      ok: true,
      exercise: generatePracticeExercise(engine, { requestId: 1, caseId, fixtureId, variantId }),
    }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  practiceStore.save({ version: 1, caseIds: [], groupIds: [] });
});
it('hides_answer_until_explicit_reveal', async () => {
  render(<PracticePage engine={engine} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Start practice' }));
  const exercise = await screen.findByRole('region', { name: 'Current exercise' });
  await within(exercise).findByRole('button', { name: 'Show solution' });
  expect(exercise.innerHTML).not.toMatch(/oll-20|OLL 20|answer-player|algorithm-card/);
  expect(within(exercise).getByText(/White up, green front/)).toBeVisible();
  await user.click(within(exercise).getByRole('button', { name: 'Show solution' }));
  expect(screen.getByTestId('answer-player')).toHaveTextContent('oll-20');
  await user.click(screen.getByRole('button', { name: 'Next case' }));
  await within(exercise).findByRole('button', { name: 'Show solution' });
  expect(screen.queryByTestId('answer-player')).not.toBeInTheDocument();
  expect(Object.keys(JSON.parse(localStorage.getItem(PRACTICE_STORAGE_KEY)!)).sort()).toEqual([
    'caseIds',
    'groupIds',
    'version',
  ]);
});
it('read-only practice tour preserves saved scope and never reveals or replaces a case', async () => {
  localStorage.setItem(
    'cubesteps.club.tutorial.v1',
    JSON.stringify({ version: 1, welcome: 'never', dismissed: {}, tours: {} }),
  );
  render(
    <TestTour id="practice">
      <PracticePage engine={engine} />
    </TestTour>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
  await screen.findByRole('button', { name: 'Show solution' });
  const before = localStorage.getItem(PRACTICE_STORAGE_KEY),
    calls = mock.generate.mock.calls.length;
  expect(document.querySelector('[data-guidance="practice.scope"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Page tour' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show solution' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next case' }));
  fireEvent.click(screen.getByRole('button', { name: 'Exit tour' }));
  expect(localStorage.getItem(PRACTICE_STORAGE_KEY)).toBe(before);
  expect(mock.generate).toHaveBeenCalledTimes(calls);
  expect(screen.queryByTestId('answer-player')).not.toBeInTheDocument();
});
it('reveals the actual rotated exercise recognition', async () => {
  practiceStore.save({ version: 1, caseIds: ['oll-26'], groupIds: [] });
  mock.generate.mockImplementationOnce(async () => ({
    ok: true,
    exercise: generatePracticeExercise(engine, {
      requestId: 1,
      caseId: 'oll-26',
      fixtureId: 'oll-26/u1',
      variantId: 'oll-26/main',
    }),
  }));
  render(<PracticePage engine={engine} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Start practice' }));
  await user.click(await screen.findByRole('button', { name: 'Show solution' }));
  const text = document.querySelector('.practice-answer')!.textContent!;
  expect(text).toContain('UFR: yellow on U');
  expect(text).toContain('URB: yellow on B');
  expect(text).not.toContain('Before setup');
});
it('cancels old work on selection changes and unmount', async () => {
  let resolve!: (r: PracticeReply['result']) => void;
  mock.generate.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = render(<PracticePage engine={engine} />),
    user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Start practice' }));
  await user.click(screen.getByText('Choose cases'));
  await user.click(screen.getByRole('checkbox', { name: 'OLL 20' }));
  await act(async () =>
    resolve({
      ok: true,
      exercise: generatePracticeExercise(engine, {
        requestId: 1,
        caseId: 'oll-20',
        fixtureId: 'oll-20/u0',
        variantId: 'oll-20/main',
      }),
    }),
  );
  expect(screen.queryByRole('button', { name: 'Show solution' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start practice' })).toBeDisabled();
  view.unmount();
  expect(mock.cancel).toHaveBeenCalled();
  render(<PracticePage engine={engine} />);
  expect(screen.queryByTestId('answer-player')).not.toBeInTheDocument();
});
it('keeps session practice usable when persistence is denied', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Error('Denied');
  });
  render(<PracticePage engine={engine} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('checkbox', { name: 'OLL 21' }));
  expect(screen.getByText(/cannot be saved/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Start practice' }));
  expect(await screen.findByRole('button', { name: 'Show solution' })).toBeEnabled();
});
