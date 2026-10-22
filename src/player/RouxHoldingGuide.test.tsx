// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { expect, it, afterEach } from 'vitest';
import { RouxHoldingGuide } from './RouxHoldingGuide';
afterEach(cleanup);
it('explains the slice reference without calling the cube invalid', () => {
  render(
    <RouxHoldingGuide
      model={{
        frameLabel: 'Blue left · green right',
        centerLabel: 'orange up · yellow front',
        reference: 'setup-required',
        note: 'Middle-slice setup in progress',
        protectedIds: ['UB'],
      }}
      moving
    />,
  );
  expect(screen.getByText(/blue left.*green right/i)).toBeVisible();
  expect(screen.getByText('Middle-slice setup in progress')).toBeVisible();
  expect(screen.queryByText(/invalid cube/i)).toBeNull();
  expect(screen.getByText(/last completed/i)).toBeVisible();
});
