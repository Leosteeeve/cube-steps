import { beforeAll, expect, it } from 'vitest';
import { experimentFixture, attemptFixture } from './fixtures.test-helper';
import { emptyRouxNotebook } from './schema';
import { previewRouxImport, exportRouxExperiments, TRANSFER_BYTES } from './transfer';
import { exportRouxCsv } from './csv';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
const snapshot = () => ({
  ...emptyRouxNotebook(),
  experiments: [f.experiment],
  pending: [],
  error: '',
  conflicts: [],
  incompatibleCount: 0,
  incompatibleRecords: [],
});
it('round-trips verified archival routes without exporting private labels or trials by default', async () => {
  const s = snapshot(),
    a = attemptFixture(f.experiment.id, f.experiment.routes[0].id);
  Object.assign(s, {
    testers: [{ id: 'anonymous', label: 'Private name' }],
    attempts: [a],
    attemptRevisions: [a],
  });
  const text = exportRouxExperiments(s, {
    ids: [f.experiment.id],
    includeTrials: false,
    includeLabels: false,
  });
  expect(text).not.toContain('Private name');
  expect(JSON.parse(text).attempts).toEqual([]);
  const p = await previewRouxImport(f.engine, text, f.assets);
  expect(p.data.experiments[0].routes.map((r) => r.id)).toEqual(
    f.experiment.routes.map((r) => r.id),
  );
  expect(p.conflicts).toEqual([]);
  expect(Object.isFrozen(p.data)).toBe(true);
  const all = exportRouxExperiments(s, {
    ids: [f.experiment.id],
    includeTrials: true,
    includeLabels: true,
  });
  expect(all).toContain('Private name');
  expect((await previewRouxImport(f.engine, all, f.assets)).data.attempts).toHaveLength(1);
});
it('rejects foreign files, unsupported versions, orphans, formula and physical corruption', async () => {
  const text = exportRouxExperiments(snapshot(), {
    ids: [f.experiment.id],
    includeTrials: false,
    includeLabels: false,
  });
  for (const edit of [
    (v: any) => {
      v.method = 'cfop-advanced';
    },
    (v: any) => {
      v.schemaVersion = 2;
    },
    (v: any) => {
      v.experiments[0].input.fingerprint = 'wrong';
    },
    (v: any) => {
      v.experiments[0].routes[0].trace.final.data.CENTERS.pieces.reverse();
    },
    (v: any) => {
      v.experiments[0].routes[0].formulas.x = { moves: ['eval()'] };
    },
    (v: any) => {
      v.comparisons = [
        {
          schemaVersion: 1,
          id: 'orphan',
          experimentId: 'missing',
          routeAId: 'a',
          routeBId: 'b',
          createdAt: f.experiment.createdAt,
        },
      ];
    },
  ]) {
    const v = JSON.parse(text);
    edit(v);
    await expect(previewRouxImport(f.engine, JSON.stringify(v), f.assets)).rejects.toThrow();
  }
});
it('accepts exactly 10 MiB JSON and refuses the next byte before parse', async () => {
  const text = exportRouxExperiments(snapshot(), {
      ids: [f.experiment.id],
      includeTrials: false,
      includeLabels: false,
    }),
    bytes = new TextEncoder().encode(text).length,
    limit = text + ' '.repeat(TRANSFER_BYTES - bytes);
  await expect(previewRouxImport(f.engine, limit, f.assets)).resolves.toBeDefined();
  await expect(previewRouxImport(f.engine, limit + ' ', f.assets)).rejects.toThrow(/10 MiB/);
});
it('treats markup as inert notes and neutralizes spreadsheet prefixes', () => {
  const a = {
    ...attemptFixture(f.experiment.id, f.experiment.routes[0].id),
    note: '  =HYPERLINK("x")\n<script>alert(1)</script>',
  };
  const csv = exportRouxCsv([a]);
  expect(csv).toContain("'  =HYPERLINK");
  expect(csv).toContain('""x""');
});
