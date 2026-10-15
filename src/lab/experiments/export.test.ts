import { beforeAll, expect, it } from 'vitest';
import { experimentFixture, attemptFixture } from './fixtures.test-helper';
import { emptyLabData } from './schema';
import { buildLabExport, exportLabCsv } from './export';
import { stageLabImport } from './transfer';
import type { LabRepositorySnapshot } from './types';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
function snapshot(): LabRepositorySnapshot {
  const a = attemptFixture(f.experiment.id, f.experiment.routes[0].id);
  return {
    ...emptyLabData(),
    experiments: [structuredClone(f.experiment)],
    attempts: [a],
    attemptRevisions: [a],
    testers: [{ id: a.testerId, label: 'Private name' }],
    pending: [],
    error: '',
    conflicts: [],
    incompatibleCount: 0,
    incompatibleRecords: [],
  };
}
it('exports routes only by default; trials and tester labels require opt-in', () => {
  const s = snapshot(),
    selection = { experimentIds: [f.experiment.id] };
  const routes = buildLabExport(s, selection);
  expect(routes.attempts).toHaveLength(0);
  expect(routes.testers).toHaveLength(0);
  expect(routes.trialBlocks).toHaveLength(0);
  const trials = buildLabExport(s, { ...selection, includeAttempts: true });
  expect(trials.attemptRevisions).toHaveLength(1);
  expect(trials.testers[0].label).toBeUndefined();
  expect(
    buildLabExport(s, { ...selection, includeAttempts: true, includeTesterLabels: true }).testers[0]
      .label,
  ).toBe('Private name');
  expect(s.testers[0].label).toBe('Private name');
});
it('exports unsaved attempts with complete references and explicit pending markers', async () => {
  const s = snapshot(),
    a = { ...s.attempts[0], id: 'pending-attempt' };
  s.pending = [{ id: a.id, table: 'attempts', records: [a], error: 'Quota' }];
  const p = buildLabExport(s, { experimentIds: [f.experiment.id], includeAttempts: true });
  expect(p.attempts).toHaveLength(2);
  expect(p.pending.some((x) => x.id === a.id)).toBe(true);
  await expect(
    stageLabImport(new File([JSON.stringify(p)], 'pending.json'), f.context, {
      ...s,
      experiments: [],
      attempts: [],
      attemptRevisions: [],
      testers: [],
      pending: [],
    }),
  ).resolves.toBeDefined();
});
it('keeps an unsaved conflicting revision exportable without modifying the saved head', async () => {
  const s = snapshot(),
    a = s.attempts[0],
    saved = { ...a, revision: 1, previousRevision: 0, note: 'Stored correction' },
    pending = { ...saved, note: 'Unsaved correction' };
  s.attempts = [saved];
  s.attemptRevisions = [a, saved];
  s.pending = [
    { id: a.id, table: 'attempts', records: [pending], conflict: true, error: 'Conflict' },
  ];
  const p = buildLabExport(s, { experimentIds: [f.experiment.id], includeAttempts: true });
  expect(p.attempts[0].note).toBe('Unsaved correction');
  expect(p.attemptRevisions).toHaveLength(2);
  expect(s.attempts[0].note).toBe('Stored correction');
  const staged = await stageLabImport(new File([JSON.stringify(p)], 'pending.json'), f.context, s);
  expect(staged.conflicts).toHaveLength(1);
});
it('narrows over-limit exports rather than truncating and counts revision records', () => {
  const s = snapshot();
  s.experiments = Array.from({ length: 51 }, (_, i) => ({ ...f.experiment, id: `e${i}` }));
  s.attempts = [];
  s.attemptRevisions = [];
  expect(() => buildLabExport(s, { experimentIds: s.experiments.map((e) => e.id) })).toThrow(/50/);
  expect(buildLabExport(s, { experimentIds: ['e0'] }).experiments).toHaveLength(1);
  const large = snapshot();
  large.attempts = Array.from({ length: 2501 }, (_, i) => ({ ...large.attempts[0], id: `a${i}` }));
  large.attemptRevisions = [...large.attempts];
  expect(() =>
    buildLabExport(large, { experimentIds: [f.experiment.id], includeAttempts: true }),
  ).toThrow(/5,000/);
});
it('keeps CSV numeric fields numeric and escapes quotes, unicode, newlines and concealed formula prefixes', () => {
  const s = snapshot();
  s.testers[0].label = ' \t=SUM(1,2)';
  s.experiments[0].label = 'Club "练习"';
  s.attempts[0].note = 'line one\nline "two"';
  s.attemptRevisions = [structuredClone(s.attempts[0])];
  const selection = {
    experimentIds: [f.experiment.id],
    includeAttempts: true,
    includeTesterLabels: true,
  };
  const csv = exportLabCsv(s, selection);
  expect(csv).toContain('"setup_confirmed"');
  expect(csv).toContain('"hold_confirmed"');
  expect(csv).toContain('"interruption"');
  expect(csv).toContain('"app_version"');
  expect(csv).toContain('"Club ""练习"""');
  expect(csv).toContain('"\' \t=SUM(1,2)"');
  expect(csv).toContain('"line one\nline ""two"""');
  expect(csv).toContain(',12000,');
  for (const prefix of ['=', '+', '-', '@']) {
    s.attempts[0].note = ` \u0001${prefix}calc`;
    s.attemptRevisions = [structuredClone(s.attempts[0])];
    expect(exportLabCsv(s, selection)).toContain(`"' \u0001${prefix}calc"`);
  }
});
