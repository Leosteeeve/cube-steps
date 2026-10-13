// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { TimerTrend } from './TimerTrend';
import { buildTrend } from './statistics';
import type { TimerAttempt } from './types';
afterEach(cleanup);
const rows: TimerAttempt[] = Array.from({ length: 51 }, (_, i) => ({
  version: 1,
  id: `n${i + 1}`,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
  rawMs: (i + 1) * 1000,
  scramble: 'R U',
  inspectionMs: null,
  inspectionPenalty: 'none',
  manualPenalty: 'none',
  interruption: null,
  revision: 0,
  deletedAt: null,
}));
it('computes averages before limiting to the last 50 solves', () => {
  const trend = buildTrend(rows);
  expect(trend).toHaveLength(50);
  expect(trend[0].index).toBe(2);
  expect(trend.at(-1)?.ao12).toEqual({ kind: 'time', ms: 45500 });
  expect(
    buildTrend(rows.map((a) => (a.id === 'n51' ? { ...a, manualPenalty: 'plus2' } : a))).at(-1)
      ?.single,
  ).toEqual({ kind: 'time', ms: 53000 });
});
it('provides keyboard-accessible point selection, series labels and DNF gaps', () => {
  const { container } = render(
    <TimerTrend
      attempts={rows.slice(0, 5).map((a, i) => (i === 2 ? { ...a, manualPenalty: 'dnf' } : a))}
    />,
  );
  expect(screen.getByRole('img', { name: /Solve time trend/ })).toBeTruthy();
  expect(container.querySelectorAll('circle[data-point]')).toHaveLength(4);
  const select = screen.getByRole('combobox', { name: 'Inspect a plotted solve' });
  select.focus();
  fireEvent.change(select, { target: { value: 'n3' } });
  expect(document.activeElement).toBe(select);
  expect(screen.getByText('Solve 3: DNF')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'ao5' }));
  expect(screen.getByRole('img', { name: /Average of 5 trend/ })).toBeTruthy();
  expect(screen.getByText(/leave gaps/)).toBeTruthy();
});
