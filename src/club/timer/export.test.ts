import { expect, it } from 'vitest';
import { exportTimerCsv, exportTimerJson } from './export';
import type { TimerAttempt } from './types';
const a: TimerAttempt = {
  version: 1,
  id: 'one',
  createdAt: '2026-10-13T00:00:00.000Z',
  rawMs: 10000.125,
  scramble: "R U R'",
  inspectionMs: 15500,
  inspectionPenalty: 'plus2',
  manualPenalty: 'plus2',
  interruption: null,
  revision: 2,
  deletedAt: null,
};
it('exports full precision, penalties and save status with quoted CRLF CSV', () => {
  const csv = exportTimerCsv([a, { ...a, id: 'gone', deletedAt: a.createdAt }], ['one']);
  const lines = csv.split('\r\n');
  expect(lines).toHaveLength(3);
  expect(lines[0]).toContain('"inspectionPenalty"');
  expect(lines[0]).toContain('"interruption"');
  expect(lines[0]).toContain('"saveStatus"');
  expect(lines[1]).toContain('"10000.125"');
  expect(lines[1]).toContain('"14000.125"');
  expect(lines[1]).toContain('"not-saved"');
  expect(lines[1]).toContain('"R U R\'"');
  expect(exportTimerCsv([{ ...a, scramble: 'R "quoted"\nU' }])).toContain('"R ""quoted""\nU"');
});
it('JSON roundtrips active raw records once and only lists active pending IDs', () => {
  const data = JSON.parse(
    exportTimerJson([a, a, { ...a, id: 'gone', deletedAt: a.createdAt }], a.createdAt, [
      'one',
      'gone',
      'missing',
    ]),
  );
  expect(data).toEqual({ version: 1, exportedAt: a.createdAt, attempts: [a], unsavedIds: ['one'] });
});
