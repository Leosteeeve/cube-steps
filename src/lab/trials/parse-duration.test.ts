import { expect, it } from 'vitest';
import { parseTrialDuration } from './parse-duration';
it('accepts decimal seconds and minute time without implicit rounding', () => {
  for (const [text, ms] of [
    ['12.34', 12340],
    ['1:02.345', 62345],
    [' 0.001 ', 1],
    ['60', 60000],
  ] as const)
    expect(parseTrialDuration(text)).toEqual({ ok: true, ms });
});
it.each([
  '',
  '0',
  '-1',
  '1:60',
  '1:99.1',
  'NaN',
  'Infinity',
  '1e3',
  '1:2:3',
  '12 seconds',
  '0:00',
  '1.1234',
])('rejects ambiguous or invalid duration %s', (text) =>
  expect(parseTrialDuration(text).ok).toBe(false),
);
