// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CubeEngine } from '../../core/types';
import { MoveExplorerPage } from './MoveExplorerPage';
import { notationToken, type NotationSelection } from './catalog';
vi.mock('./NotationPlayer', () => ({
  NotationPlayer: ({ selection }: { selection: NotationSelection }) => (
    <output aria-label="Demo token">{notationToken(selection)}</output>
  ),
}));
afterEach(cleanup);
it('starts at U and preserves the turn amount across all families without storage writes', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem');
  render(<MoveExplorerPage engine={{} as CubeEngine} />);
  expect(screen.getByLabelText('Demo token')).toHaveTextContent(/^U$/);
  expect(
    within(screen.getByRole('group', { name: 'Face turns' })).getAllByRole('button'),
  ).toHaveLength(6);
  fireEvent.click(screen.getByRole('button', { name: /U prime/ }));
  fireEvent.click(screen.getByRole('button', { name: 'B, Back face' }));
  expect(screen.getByLabelText('Demo token')).toHaveTextContent("B'");
  fireEvent.click(screen.getByText('Explore more moves'));
  fireEvent.click(screen.getByRole('button', { name: 'M, Middle slice' }));
  expect(screen.getByLabelText('Demo token')).toHaveTextContent("M'");
  expect(screen.getByRole('button', { name: /M prime/ })).toHaveAttribute('aria-pressed', 'true');
  expect(write).not.toHaveBeenCalled();
  write.mockRestore();
});
