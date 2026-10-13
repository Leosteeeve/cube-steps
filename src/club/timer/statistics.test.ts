import { expect, it } from 'vitest';
import { averageOf, effectiveResult, summarizeHistory } from './statistics';
import type { TimerAttempt } from './types';
let serial = 0;
function attempt(rawMs: number, overrides: Partial<TimerAttempt> = {}): TimerAttempt {
  const index = ++serial;
  return {
    version: 1,
    id: String(index),
    createdAt: new Date(index * 1000).toISOString(),
    rawMs,
    scramble: "R U R'",
    inspectionMs: null,
    inspectionPenalty: 'none',
    manualPenalty: 'none',
    interruption: null,
    revision: 0,
    deletedAt: null,
    ...overrides,
  };
}
it('uses unrounded chronological trimmed windows and never mutates records', () => {
  const five = [10000, 11000, 12000, 13000, 14000].map((ms) => attempt(ms)),
    before = structuredClone(five);
  expect(averageOf([...five].reverse(), 5)).toEqual({ kind: 'time', ms: 12000 });
  expect(five).toEqual(before);
  expect(
    averageOf(
      Array.from({ length: 12 }, (_, i) => attempt(10000 + i * 1000)),
      12,
    ),
  ).toEqual({ kind: 'time', ms: 15500 });
  expect(
    averageOf(
      [10000, 10000, 10000, 10000, 10000].map((ms) => attempt(ms)),
      5,
    ),
  ).toEqual({ kind: 'time', ms: 10000 });
  expect(
    averageOf(
      [1, 2.1, 3.2, 4.3, 10].map((ms) => attempt(ms)),
      5,
    ),
  ).toEqual({ kind: 'time', ms: (2.1 + 3.2 + 4.3) / 3 });
});
it('discards exactly one DNF and rejects windows with two DNFs', () => {
  const five = [10000, 11000, 12000, 13000, 14000].map((ms) => attempt(ms));
  five[4].manualPenalty = 'dnf';
  expect(averageOf(five, 5)).toEqual({ kind: 'time', ms: 12000 });
  five[0].inspectionPenalty = 'dnf';
  expect(averageOf(five, 5)).toEqual({ kind: 'dnf' });
  const twelve = Array.from({ length: 12 }, (_, i) => attempt(10000 + i * 1000));
  twelve[11].manualPenalty = 'dnf';
  expect(averageOf(twelve, 12)).toEqual({ kind: 'time', ms: 15500 });
  twelve[10].manualPenalty = 'dnf';
  expect(averageOf(twelve, 12)).toEqual({ kind: 'dnf' });
});
it('adds independent penalties and never clears automatic or interruption DNF', () => {
  expect(
    effectiveResult(attempt(10000, { inspectionPenalty: 'plus2', manualPenalty: 'plus2' })),
  ).toEqual({ kind: 'time', ms: 14000 });
  expect(effectiveResult(attempt(10000, { inspectionPenalty: 'plus2' }))).toEqual({
    kind: 'time',
    ms: 12000,
  });
  for (const fields of [
    { inspectionPenalty: 'dnf' },
    { manualPenalty: 'dnf' },
    { interruption: 'blur' },
  ] as const)
    expect(effectiveResult(attempt(10000, fields))).toEqual({ kind: 'dnf' });
});
it('excludes deleted attempts, reports insufficient windows and handles no valid best', () => {
  const rows = [10000, 11000, 12000, 13000, 14000, 15000].map((ms) => attempt(ms));
  rows[5].deletedAt = new Date().toISOString();
  expect(summarizeHistory(rows)).toEqual({
    count: 5,
    best: { kind: 'time', ms: 10000 },
    ao5: { kind: 'time', ms: 12000 },
    ao12: { kind: 'insufficient' },
  });
  expect(averageOf(rows.slice(0, 4), 5)).toEqual({ kind: 'insufficient' });
  expect(summarizeHistory([]).best).toEqual({ kind: 'insufficient' });
  expect(summarizeHistory([attempt(10, { manualPenalty: 'dnf' })]).best).toEqual({ kind: 'dnf' });
  expect(effectiveResult(rows[5])).toEqual({ kind: 'insufficient' });
});
