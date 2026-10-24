// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TestTour } from '../club/tutorial/TestTour';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { SolvePage } from './SolvePage';
import { App } from './App';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, Facelets, MethodId } from '../core/types';
import type { SessionResult } from './solve-client';
import { handleSolveRequest } from '../workers/solve-request';
import { parseScramble } from '../core/notation';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';
const mocked = vi.hoisted(() => ({ factory: vi.fn(), random: vi.fn() }));
vi.mock('./solve-client', () => ({ createSolveClient: mocked.factory }));
vi.mock('../core/scramble', () => ({ generateScramble: mocked.random }));
// Real worker protocol and real rendering are covered separately; this suite controls race timing.
vi.mock('../player/CubePlayer', () => ({ CubePlayer: () => null }));
let engine: CubeEngine;
let client: {
  cancel: ReturnType<typeof vi.fn>;
  solveFacelets: ReturnType<typeof vi.fn>;
  solveScramble: ReturnType<typeof vi.fn>;
};
beforeAll(async () => {
  engine = await createCubeEngine();
});
beforeEach(() => {
  sessionStorage.clear();
  history.replaceState({}, '', '#/solve');
  client = {
    cancel: vi.fn(),
    solveFacelets: vi.fn(async (facelets: Facelets) => colorResult(facelets)),
    solveScramble: vi.fn(async (text: string, method: MethodId = 'lbl'): Promise<SessionResult> => {
      const parsed = parseScramble(text);
      if (!parsed.ok)
        return {
          ok: false,
          error: { kind: 'parse', offset: parsed.offset, message: parsed.message },
        };
      return handleSolveRequest(engine, {
        requestId: 1,
        method,
        input: { kind: 'scramble', moves: parsed.moves },
      })!.result;
    }),
  };
  mocked.factory.mockReturnValue(client);
  mocked.random.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function colorResult(facelets: Facelets = GOLDEN_CASES[7].facelets): SessionResult {
  return handleSolveRequest(engine, {
    requestId: 1,
    method: 'lbl',
    input: { kind: 'facelets', facelets },
  })!.result;
}
function seed() {
  sessionStorage.setItem(
    'cubesteps.color-draft.v1',
    JSON.stringify({
      version: 1,
      draft: { facelets: GOLDEN_CASES[7].facelets, face: 'F', selection: 'white' },
    }),
  );
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
it('collapses a successful input without losing the draft and lets the member reopen it', async () => {
  const user = userEvent.setup();
  render(<SolvePage engine={engine} />);
  const input = screen.getByLabelText('Scramble sequence');
  await user.type(input, 'R U');
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  expect(await screen.findByText('Verified LBL solution')).toBeVisible();
  expect(input).not.toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Edit cube input' }));
  expect(input).toBeVisible();
  expect(input).toHaveValue('R U');
});
it('preserves_input_across_three_methods', async () => {
  seed();
  render(<App />);
  const user = userEvent.setup(),
    textarea = await screen.findByLabelText('Scramble sequence');
  await user.type(textarea, 'R U');
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  expect(await screen.findByText('Verified LBL solution')).toBeVisible();
  await showColors();
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  for (const [path, label] of [
    ['cfop', 'Beginner CFOP'],
    ['advanced-cfop', 'Advanced CFOP'],
  ]) {
    act(() => {
      location.hash = '#/solve/' + path;
      window.dispatchEvent(new Event('hashchange'));
    });
    expect(screen.getByRole('button', { name: 'Explain with ' + label })).toBeEnabled();
    expect(screen.queryByText('Verified LBL solution')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Front face' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  }
  await user.click(screen.getByRole('button', { name: 'Eraser' }));
  await user.click(screen.getByRole('button', { name: /^Front, row 1, column 1,/ }));
  act(() => {
    location.hash = '#/solve';
    window.dispatchEvent(new Event('hashchange'));
  });
  expect(screen.getByText('47 / 48 stickers entered')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('48 / 48 stickers entered')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Scramble' }));
  expect(screen.getByLabelText('Scramble sequence')).toHaveValue('R U');
});
it.each(['partial colors', 'invalid colors', 'pending solve'])(
  'read-only tour preserves %s',
  async (scenario) => {
    localStorage.setItem(
      'cubesteps.club.tutorial.v1',
      JSON.stringify({ version: 1, welcome: 'never', dismissed: {}, tours: {} }),
    );
    render(
      <TestTour id="solve">
        <SolvePage engine={engine} />
      </TestTour>,
    );
    expect(document.querySelector('[data-guidance="solve.input"]')).not.toBeNull();
    if (scenario === 'pending solve') {
      client.solveScramble.mockReturnValue(new Promise(() => {}));
      fireEvent.change(screen.getByLabelText('Scramble sequence'), { target: { value: 'R U' } });
      fireEvent.click(screen.getByRole('button', { name: 'Explain with LBL' }));
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Enter colors' }));
      fireEvent.click(screen.getByRole('button', { name: /^Front, row 1, column 1,/ }));
      if (scenario === 'invalid colors')
        fireEvent.click(screen.getByRole('button', { name: 'Check colors' }));
    }
    const draft = sessionStorage.getItem('cubesteps.color-draft.v1'),
      calls = client.solveScramble.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Page tour' }));
    const reset = screen.queryByRole('button', { name: 'Reset colors' });
    if (reset) fireEvent.click(reset);
    const solve = screen.queryByRole('button', { name: 'Explain with LBL' });
    if (solve) fireEvent.click(solve);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Next' }));
    expect(document.querySelector('[data-guidance="solve.validation"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Exit tour' }));
    expect(sessionStorage.getItem('cubesteps.color-draft.v1')).toBe(draft);
    expect(client.solveFacelets).not.toHaveBeenCalled();
    expect(client.solveScramble).toHaveBeenCalledTimes(calls);
    if (scenario === 'invalid colors') expect(screen.getByRole('alert')).toBeVisible();
  },
);
it('discards pending solves and random scrambles through all three history routes', async () => {
  const pending = deferred<SessionResult>(),
    random = deferred<string>();
  client.solveScramble.mockImplementationOnce(() => pending.promise);
  mocked.random.mockImplementationOnce(() => random.promise);
  render(<App />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Scramble sequence'), 'R U');
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  const navigate = (hash: string) =>
    act(() => {
      history.pushState({}, '', hash);
      window.dispatchEvent(new Event('hashchange'));
    });
  navigate('#/solve/cfop');
  await user.click(screen.getByRole('button', { name: 'Random scramble' }));
  navigate('#/solve/advanced-cfop');
  await act(async () => {
    pending.resolve(colorResult());
    random.resolve('B2 L2');
  });
  expect(screen.getByLabelText('Scramble sequence')).toHaveValue('R U');
  expect(screen.queryByText('Verified LBL solution')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Explain with Advanced CFOP' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Random scramble' })).toBeEnabled();
  expect(client.solveScramble).toHaveBeenCalledTimes(1);
  expect(client.cancel).toHaveBeenCalled();
});
it('preserves input and clears the result on a history-driven method change', async () => {
  render(<App />);
  const user = userEvent.setup();
  const textarea = await screen.findByLabelText('Scramble sequence');
  await user.type(textarea, 'R U');
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  expect(await screen.findByText('Verified LBL solution')).toBeVisible();
  const calls = client.solveScramble.mock.calls.length;
  act(() => {
    location.hash = '#/solve/cfop';
    window.dispatchEvent(new Event('hashchange'));
  });
  expect(textarea).toHaveValue('R U');
  expect(screen.queryByText('Verified LBL solution')).not.toBeInTheDocument();
  expect(client.solveScramble).toHaveBeenCalledTimes(calls);
  await user.click(screen.getByRole('button', { name: 'Explain with Beginner CFOP' }));
  expect(client.solveScramble).toHaveBeenLastCalledWith('R U', 'cfop-beginner');
  expect(await screen.findByText('Verified Beginner CFOP solution')).toBeVisible();
});
it('preserves checked colors, selected face and an incomplete draft when switching methods', async () => {
  seed();
  const view = render(<SolvePage engine={engine} method="lbl" />),
    user = await showColors();
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  view.rerender(<SolvePage engine={engine} method="cfop-beginner" />);
  expect(screen.getByRole('button', { name: 'Explain with Beginner CFOP' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Front face' })).toHaveAttribute(
    'aria-current',
    'step',
  );
  expect(client.solveFacelets).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Eraser' }));
  await user.click(screen.getByRole('button', { name: /^Front, row 1, column 1,/ }));
  view.rerender(<SolvePage engine={engine} method="lbl" />);
  expect(screen.getByText('47 / 48 stickers entered')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
});
it('cancels late work across methods without changing the new draft or busy state', async () => {
  const old = deferred<SessionResult>(),
    current = deferred<SessionResult>(),
    random = deferred<string>();
  client.solveScramble
    .mockImplementationOnce(() => old.promise)
    .mockImplementationOnce(() => current.promise);
  const view = render(<SolvePage engine={engine} method="lbl" />),
    user = userEvent.setup();
  await user.type(screen.getByLabelText('Scramble sequence'), 'R');
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  view.rerender(<SolvePage engine={engine} method="cfop-beginner" />);
  await user.click(screen.getByRole('button', { name: 'Explain with Beginner CFOP' }));
  await act(async () => old.resolve(colorResult()));
  expect(screen.getByRole('button', { name: 'Finding your steps…' })).toBeDisabled();
  expect(screen.queryByText('Verified LBL solution')).not.toBeInTheDocument();
  await act(async () =>
    current.resolve({ ok: false, error: { kind: 'cancelled', message: 'Test cleanup' } }),
  );
  mocked.random.mockImplementationOnce(() => random.promise);
  await user.click(screen.getByRole('button', { name: 'Random scramble' }));
  view.rerender(<SolvePage engine={engine} method="lbl" />);
  await act(async () => random.resolve('F2 L2'));
  expect(screen.getByLabelText('Scramble sequence')).toHaveValue('R');
  expect(screen.getByRole('button', { name: 'Random scramble' })).toBeEnabled();
});
async function showColors() {
  const user = userEvent.setup();
  const edit = screen.queryByRole('button', { name: 'Edit cube input' });
  if (edit) await user.click(edit);
  await user.click(screen.getByRole('button', { name: 'Enter colors' }));
  return user;
}
it('checks invalid drafts and enables only a verified snapshot, retaining the prior solution on edits/errors', async () => {
  seed();
  render(<SolvePage engine={engine} />);
  const user = await showColors();
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  await user.click(await screen.findByText('Colors used for this solution'));
  const summary = screen.getByText('Colors used for this solution').closest('details')!;
  const old = summary.innerHTML;
  await user.click(screen.getByRole('button', { name: 'Edit cube input' }));
  await user.click(screen.getByRole('button', { name: 'Eraser' }));
  await user.click(screen.getByRole('button', { name: /^Front, row 1, column 1,/ }));
  expect(summary.innerHTML).toBe(old);
  expect(
    screen.getByText('The draft has changed. The solution below still uses its saved input.'),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  expect(screen.getByRole('alert')).toHaveTextContent('remaining 1 stickers');
  expect(screen.getByText('Verified LBL solution')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Scramble' }));
  await user.type(screen.getByLabelText('Scramble sequence'), 'R M');
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  expect(screen.getByRole('alert')).toHaveTextContent('At character 3');
  expect(summary.innerHTML).toBe(old);
});
it.each(['paint', 'erase', 'undo', 'reset', 'mode', 'unmount'])(
  'cancels a pending color solve and discards late results after %s',
  async (change) => {
    seed();
    const pending = deferred<SessionResult>();
    client.solveFacelets.mockImplementation(() => pending.promise);
    const view = render(<SolvePage engine={engine} />),
      user = await showColors();
    if (change === 'undo') {
      await user.click(screen.getByRole('button', { name: 'Eraser' }));
      await user.click(screen.getByRole('button', { name: /^Front, row 1, column 1,/ }));
      const original = GOLDEN_CASES[7].facelets.F[0];
      await user.click(
        screen.getByRole('button', { name: original[0].toUpperCase() + original.slice(1) }),
      );
      await user.click(screen.getByRole('button', { name: /^Front, row 1, column 1,/ }));
    }
    await user.click(screen.getByRole('button', { name: 'Check colors' }));
    await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
    if (change === 'unmount') view.unmount();
    else if (change === 'mode') await user.click(screen.getByRole('button', { name: 'Scramble' }));
    else if (change === 'reset')
      await user.click(screen.getByRole('button', { name: 'Reset colors' }));
    else if (change === 'undo') await user.click(screen.getByRole('button', { name: 'Undo' }));
    else {
      await user.click(
        screen.getByRole('button', { name: change === 'erase' ? 'Eraser' : 'Yellow' }),
      );
      // Pick a sticker different from yellow for the paint branch.
      const index = GOLDEN_CASES[7].facelets.F.findIndex((c, i) => i !== 4 && c !== 'yellow');
      await user.click(
        screen.getByRole('button', {
          name: new RegExp(`^Front, row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1},`),
        }),
      );
    }
    expect(client.cancel).toHaveBeenCalled();
    await act(async () => pending.resolve(colorResult()));
    expect(screen.queryByText('Verified LBL solution')).not.toBeInTheDocument();
  },
);
it('keeps separate drafts and ignores obsolete random and scramble results', async () => {
  seed();
  const pending = deferred<SessionResult>(),
    random = deferred<string>();
  client.solveScramble.mockImplementation(() => pending.promise);
  mocked.random.mockImplementation(() => random.promise);
  render(<SolvePage engine={engine} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Scramble sequence'), 'R');
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  await user.type(screen.getByLabelText('Scramble sequence'), ' U');
  await act(async () => pending.resolve(colorResult()));
  expect(screen.queryByText('Verified LBL solution')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Random scramble' }));
  await user.click(screen.getByRole('button', { name: 'Enter colors' }));
  await act(async () => random.resolve('L F2'));
  expect(screen.getByText('48 / 48 stickers entered')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Scramble' }));
  expect(screen.getByLabelText('Scramble sequence')).toHaveValue('R U');
});
it('recovers draft and selected face after returning from a lesson without persisting validation', async () => {
  seed();
  const first = render(<SolvePage engine={engine} />),
    user = await showColors();
  await user.click(screen.getByRole('button', { name: 'Back face' }));
  await user.click(screen.getByRole('button', { name: 'Orange' }));
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  first.unmount();
  render(<SolvePage engine={engine} />);
  await showColors();
  expect(screen.getByRole('heading', { name: 'Back face' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Orange' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
});
it('keeps editing and solving available when saving is blocked', async () => {
  seed();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota denied');
  });
  render(<SolvePage engine={engine} />);
  const user = await showColors();
  expect(screen.getByText(/cannot be restored after refresh/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  await user.click(screen.getByRole('button', { name: 'Explain with LBL' }));
  expect(await screen.findByText('Verified LBL solution')).toBeVisible();
});
