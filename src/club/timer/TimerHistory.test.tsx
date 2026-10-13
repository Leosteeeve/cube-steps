// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { TimerHistory } from './TimerHistory';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import type { TimerAttempt } from './types';
import type { TimerRepository, RepositorySnapshot } from './repository';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(cleanup);
it('pages newest first, reveals the recorded net and forwards revision-safe edits and undo', async () => {
  const attempts: TimerAttempt[] = Array.from({ length: 26 }, (_, i) => ({
    version: 1,
    id: `row${i + 1}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    rawMs: 10000 + i,
    scramble: 'R U',
    inspectionMs: null,
    inspectionPenalty: 'none',
    manualPenalty: 'none',
    interruption: null,
    revision: 0,
    deletedAt: null,
  }));
  let listener: (s: RepositorySnapshot) => void = () => {};
  const snapshot = () => ({ attempts: [...attempts], pendingIds: [], error: '' });
  const repository: TimerRepository = {
    snapshot,
    subscribe: (f) => {
      listener = f;
      return () => {};
    },
    refresh: async () => {},
    record: vi.fn(),
    retry: vi.fn(),
    dispose: vi.fn(),
    updatePenalty: vi.fn(async (id, revision, penalty) => {
      const a = attempts.find((a) => a.id === id)!;
      a.manualPenalty = penalty;
      a.revision++;
      listener(snapshot());
      return { ...a };
    }),
    softDelete: vi.fn(async (id) => {
      const a = attempts.find((a) => a.id === id)!;
      a.deletedAt = a.createdAt;
      a.revision++;
      listener(snapshot());
      return { id, revision: a.revision };
    }),
    undoDelete: vi.fn(async (token) => {
      const a = attempts.find((a) => a.id === token.id)!;
      a.deletedAt = null;
      a.revision++;
      listener(snapshot());
      return true;
    }),
  };
  render(<TimerHistory repository={repository} engine={engine} />);
  expect(screen.getByRole('button', { name: /View solve 26:/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /View solve 1:/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Older solves' }));
  expect(screen.getByRole('button', { name: /View solve 1:/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /View solve 1:/ }));
  expect(screen.getByRole('img', { name: 'Historical scramble diagram' })).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Adjustment for solve 1' }), {
    target: { value: 'plus2' },
  });
  await waitFor(() => expect(repository.updatePenalty).toHaveBeenCalledWith('row1', 0, 'plus2'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete solve 1' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Undo deletion' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Undo deletion' }));
  await waitFor(() =>
    expect(repository.undoDelete).toHaveBeenCalledWith({ id: 'row1', revision: 2 }),
  );
});
