// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ResultSummary } from './ResultSummary';
import { initialRouxLabSession } from './session';
afterEach(cleanup);
it('shows isolated reference evidence without offering a full-solve action', () => {
  const state = initialRouxLabSession(['white-blue', 'yellow-red']);
  state.coverage = {
    elapsedMs: 1300,
    operations: 42,
    entries: 1,
    retainedBytes: 20,
    verifiedRoutes: 0,
    frames: {
      'white-blue': {
        status: 'best-found',
        completedDepth: 1,
        upperBound: 3,
        lowerBound: 2,
        witness: ['R', 'U', 'F'],
      },
    },
  };
  render(<ResultSummary state={state} onStop={() => {}} />);
  expect(screen.getByText(/Best found: 3 STM/)).toBeInTheDocument();
  expect(screen.getByText(/Not explored/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play full solve' })).not.toBeInTheDocument();
  expect(screen.getByText(/1.3 s observed/)).toBeVisible();
});
