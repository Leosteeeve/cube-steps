// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ColorEntry } from './ColorEntry';
import { FaceOverview } from './FaceOverview';
import { createDraftState, reduceDraft, type ColorDraft } from './draft';
import { createCubeEngine } from '../../core/cube';
import { validateFacelets, type FaceletValidation } from '../../core/facelets';
import type { CubeEngine } from '../../core/types';
import { GOLDEN_CASES } from '../../../tests/fixtures/facelet-cases';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(cleanup);
function Harness({
  initial,
  storageAvailable = true,
}: {
  initial?: ColorDraft;
  storageAvailable?: boolean;
}) {
  const [state, setState] = useState(() => createDraftState(initial));
  const [validation, setValidation] = useState<FaceletValidation | null>(null);
  return (
    <ColorEntry
      state={state}
      onAction={(action) => {
        const next = reduceDraft(state, action);
        if (next.revision !== state.revision) setValidation(null);
        setState(next);
      }}
      validation={validation}
      onCheck={() => setValidation(validateFacelets(state.draft.facelets, engine.solved()))}
      onSolve={() => {}}
      busy={false}
      storageAvailable={storageAvailable}
    />
  );
}
it('paints with a named stable palette, locks centers, and undoes erase/reset', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
  expect(screen.getByText('0 / 48 stickers entered')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'White' }));
  await user.click(screen.getByRole('button', { name: 'Front, row 1, column 1, unfilled' }));
  expect(screen.getByRole('button', { name: 'Front, row 1, column 1, white' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'White' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByLabelText('Front, row 2, column 2, green, fixed center')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Eraser' }));
  await user.click(screen.getByRole('button', { name: 'Front, row 1, column 1, white' }));
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('button', { name: 'Front, row 1, column 1, white' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Reset colors' }));
  expect(screen.getByText('0 / 48 stickers entered')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('1 / 48 stickers entered')).toBeVisible();
});
it('shows each holding direction, preserves entries while navigating, and supports review Edit', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const directions = [
    ['Front', 'green', 'white', 'red'],
    ['Right', 'red', 'white', 'blue'],
    ['Back', 'blue', 'white', 'orange'],
    ['Left', 'orange', 'white', 'green'],
    ['Up', 'white', 'blue', 'red'],
    ['Down', 'yellow', 'green', 'red'],
  ];
  for (const [face, front, top, right] of directions) {
    await user.click(screen.getByRole('button', { name: `${face} face` }));
    expect(screen.getByText(`${front} center facing you`, { exact: true })).toBeVisible();
    expect(screen.getByText(`${top} center above`, { exact: true })).toBeVisible();
    expect(screen.getByText(`${right} center to your right`, { exact: true })).toBeVisible();
    await user.click(screen.getByRole('button', { name: `${face}, row 1, column 1, unfilled` }));
  }
  await user.click(screen.getByRole('button', { name: 'Review all faces' }));
  expect(screen.getByRole('heading', { name: 'Review your cube' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Edit Back' }));
  expect(screen.getByRole('button', { name: 'Back, row 1, column 1, white' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { name: 'Right face' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Back face' })).toBeVisible();
});
it('requires a successful check before solving, then invalidates it on paint', async () => {
  const user = userEvent.setup();
  render(<Harness initial={{ facelets: GOLDEN_CASES[0].facelets, face: 'F', selection: 'red' }} />);
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Front, row 1, column 1, green' }));
  expect(screen.getByRole('button', { name: 'Explain with LBL' })).toBeDisabled();
  expect(screen.getByLabelText('red count')).toHaveTextContent('10 / 9');
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  expect(screen.getByRole('alert')).toHaveTextContent('exactly nine');
});
it('supports Enter and Space painting and exposes local validation issues', async () => {
  const user = userEvent.setup();
  render(<Harness storageAvailable={false} />);
  expect(screen.getByText(/cannot be restored after refresh/)).toBeVisible();
  const blue = screen.getByRole('button', { name: 'Blue' });
  blue.focus();
  await user.keyboard('{Enter}');
  const first = screen.getByRole('button', { name: 'Front, row 1, column 1, unfilled' });
  first.focus();
  await user.keyboard(' ');
  expect(first).toHaveAccessibleName('Front, row 1, column 1, blue');
  await user.click(screen.getByRole('button', { name: 'Check colors' }));
  expect(screen.getByRole('alert')).toHaveTextContent('remaining 47 stickers');
  expect(screen.getByRole('button', { name: 'Front, row 1, column 2, unfilled' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});
it('renders a read-only snapshot and global errors without selecting false culprit stickers', () => {
  const { container } = render(
    <FaceOverview
      facelets={GOLDEN_CASES[7].facelets}
      issues={[{ code: 'permutation-parity', message: 'Review all six faces.', cells: [] }]}
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(container.querySelectorAll('[data-facelet]')).toHaveLength(54);
  expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
});
