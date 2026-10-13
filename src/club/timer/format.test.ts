import { expect, it } from 'vitest';
import { formatResult } from './format';
it('rounds only final hundredths including a carried minute', () => {
  expect(formatResult({ kind: 'time', ms: 59999 })).toBe('1:00.00');
  expect(formatResult({ kind: 'time', ms: 12345.67 })).toBe('12.35');
  expect(formatResult({ kind: 'time', ms: 0 })).toBe('0.00');
  expect(formatResult({ kind: 'time', ms: 3600123 })).toBe('60:00.12');
  expect(formatResult({ kind: 'dnf' })).toBe('DNF');
  expect(formatResult({ kind: 'insufficient' })).toBe('—');
});
