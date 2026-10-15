import { beforeAll, expect, it, vi } from 'vitest';
import { experimentFixture, attemptFixture } from './fixtures.test-helper';
import { emptyLabData } from './schema';
import { buildLabExport } from './export';
import {
  stageLabImport,
  resolveLabImport,
  commitLabImport,
  assertRevisionHistory,
} from './transfer';
import { createComparison } from './snapshots';
import { createComparisonBlocks } from '../trials/blocks';
import type { LabRepositorySnapshot } from './types';
let f: Awaited<ReturnType<typeof experimentFixture>>;
beforeAll(async () => {
  f = await experimentFixture();
});
const empty = (): LabRepositorySnapshot => ({
  ...emptyLabData(),
  pending: [],
  conflicts: [],
  error: '',
  incompatibleCount: 0,
  incompatibleRecords: [],
});
const file = (value: unknown) =>
  new File([JSON.stringify(value)], 'experiment.json', { type: 'application/json' });
const source = () => ({ ...empty(), experiments: [structuredClone(f.experiment)] });
const pack = () => buildLabExport(source(), { experimentIds: [f.experiment.id] });
it('checks byte limits before reading and refuses unknown schema, keys, depth and collections', async () => {
  const read = vi.fn();
  await expect(
    stageLabImport(
      { size: 10 * 1024 * 1024 + 1, text: read } as unknown as File,
      f.context,
      empty(),
    ),
  ).rejects.toThrow(/10 MiB/);
  expect(read).not.toHaveBeenCalled();
  const bad: any[] = [];
  let p: any = pack();
  p.schemaVersion = 2;
  bad.push(p);
  p = pack();
  p.execute = 'https://example.org/x.js';
  bad.push(p);
  p = pack();
  p.experiments[0].label = 'x'.repeat(61);
  bad.push(p);
  p = pack();
  p.experiments = Array.from({ length: 51 }, () => p.experiments[0]);
  bad.push(p);
  p = pack();
  p.attemptRevisions = Array(5001).fill({});
  bad.push(p);
  p = pack();
  p.deep = Array.from({ length: 40 }).reduce((x) => ({ child: x }), {});
  bad.push(p);
  for (const b of bad) await expect(stageLabImport(file(b), f.context, empty())).rejects.toThrow();
});
it('rejects unexpected nested fields, malformed moves and physically false snapshots before admission', async () => {
  const mutations: ((e: any) => void)[] = [
    (e) => (e.routes[0].actions[0].callback = 'alert(1)'),
    (e) => (e.routes[0].initial.data.CENTERS.url = 'https://example.org/a'),
    (e) => (e.routes[0].score.script = 'x'),
    (e) => (e.routes[0].actions[0].moves = ['R3']),
    (e) => (e.setupMoves = ['R']),
    (e) => e.routes[0].actions[0].after.data.EDGES.pieces.reverse(),
    (e) => e.routes[0].initial.data.CENTERS.pieces.reverse(),
    (e) => {
      e.routes[0].actions = Array(129).fill(e.routes[0].actions[0]);
    },
    (e) => {
      e.routes[0].actions[0].moves = Array(513).fill('R');
    },
    (e) => e.routes[0].boundaries.f2lEnd++,
    (e) => e.routes[0].score.cost++,
    (e) => (e.routes[0].startHold.front = e.routes[0].startHold.bottom),
    (e) => {
      const k = Object.keys(e.routes[0].formulas)[0];
      delete e.routes[0].formulas[k];
    },
    (e) => {
      const k = Object.keys(e.routes[0].formulas)[0];
      e.routes[0].formulas.surplus = { ...e.routes[0].formulas[k], id: 'surplus' };
    },
    (e) => {
      const k = Object.keys(e.routes[0].formulas)[0];
      e.routes[0].formulas[k].sourceRefs[0].url = 'javascript:alert(1)';
    },
  ];
  for (const change of mutations) {
    const p = pack();
    change(p.experiments[0]);
    await expect(stageLabImport(file(p), f.context, empty())).rejects.toThrow();
  }
});
it('stages without writes, deduplicates exact content and explicitly copies or skips a conflict', async () => {
  const s = source(),
    p = pack();
  const identical = await stageLabImport(file(p), f.context, s);
  expect(identical.deduplicated).toBe(1);
  expect(identical.conflicts).toHaveLength(0);
  p.experiments[0].label = 'Changed label';
  const preview = await stageLabImport(file(p), f.context, s);
  expect(preview.conflicts).toHaveLength(1);
  expect(() => resolveLabImport(preview, {})).toThrow(/Choose/);
  expect(resolveLabImport(preview, { [f.experiment.id]: 'skip' }).experiments).toHaveLength(0);
  const copied = resolveLabImport(preview, { [f.experiment.id]: 'import-copy' });
  expect(copied.experiments[0].id).not.toBe(f.experiment.id);
  expect(copied.experiments[0].provenance).toBe(f.experiment.id);
  expect(copied.experiments[0].routes).toEqual(p.experiments[0].routes);
  expect(s.experiments[0].label).not.toBe('Changed label');
  const commitImport = vi.fn(async () => {
    throw Error('Changed in another tab');
  });
  await expect(
    commitLabImport(preview, { [f.experiment.id]: 'import-copy' }, { commitImport }),
  ).rejects.toThrow(/another tab/);
  expect(commitImport).toHaveBeenCalledTimes(1);
  await expect(commitLabImport({ ...preview }, {}, { commitImport })).rejects.toThrow(/staged/);
});
it('preserves archived model/settings and admits only physically valid archived routes', async () => {
  const p = pack(),
    e = p.experiments[0];
  e.modelVersion = 'older-model';
  e.settings.modelVersion = 'older-model';
  for (const r of e.routes) {
    r.modelVersion = 'older-model';
    if (r.score.rated) r.score.modelVersion = 'older-model';
  }
  const preview = await stageLabImport(file(p), f.context, empty());
  expect(preview.archives).toEqual([e.id]);
  expect(preview.data.experiments[0].modelVersion).toBe('older-model');
  e.routes[0].actions[0].after.data.EDGES.pieces.reverse();
  await expect(stageLabImport(file(p), f.context, empty())).rejects.toThrow();
});
it('remaps complete copies including blocks, slots, testers, retries and revision references', async () => {
  const s = source(),
    c = createComparison(f.experiment, f.experiment.routes[0].id, f.experiment.routes[1].id),
    b = createComparisonBlocks(c, 1)[0];
  const a = {
    ...attemptFixture(f.experiment.id, c.routeAId),
    comparisonId: c.id,
    blockId: b.id,
    slot: b.slots[0].id,
    intendedOrder: b.intendedOrder,
    actualOrder: 1,
  };
  const retry = { ...a, id: 'retry', retryOf: a.id, actualOrder: 2 };
  s.comparisons = [c];
  s.trialBlocks = [b];
  s.testers = [{ id: a.testerId }];
  s.attempts = [a, retry];
  s.attemptRevisions = [a, retry];
  const p = buildLabExport(s, { experimentIds: [f.experiment.id], includeAttempts: true });
  p.experiments[0].label = 'copy';
  const preview = await stageLabImport(file(p), f.context, s),
    copy = resolveLabImport(preview, { [f.experiment.id]: 'import-copy' });
  expect(copy.comparisons[0].experimentId).toBe(copy.experiments[0].id);
  expect(copy.trialBlocks[0].comparisonId).toBe(copy.comparisons[0].id);
  expect(copy.attempts[0].blockId).toBe(copy.trialBlocks[0].id);
  expect(copy.attempts[0].slot).toBe(copy.trialBlocks[0].slots[0].id);
  expect(copy.attempts[1].retryOf).toBe(copy.attempts[0].id);
  expect(copy.attempts[0].testerId).toBe(copy.testers[0].id);
  expect(copy.attemptRevisions[0]).toEqual(copy.attempts[0]);
  const broken = structuredClone(p);
  broken.attempts[0].retryOf = 'retry';
  broken.attemptRevisions[0].retryOf = 'retry';
  await expect(stageLabImport(file(broken), f.context, empty())).rejects.toThrow(/Cyclic/);
  broken.attempts[0].retryOf = 'absent';
  await expect(stageLabImport(file(broken), f.context, empty())).rejects.toThrow();
});
it('requires complete immutable revision chains matching the head', () => {
  const data = emptyLabData(),
    a = attemptFixture(f.experiment.id, f.experiment.routes[0].id),
    edit = { ...a, revision: 1, previousRevision: 0, note: 'edit' };
  data.attempts = [edit];
  data.attemptRevisions = [a, edit];
  expect(() => assertRevisionHistory(data)).not.toThrow();
  data.attemptRevisions = [edit];
  expect(() => assertRevisionHistory(data)).toThrow();
  data.attemptRevisions = [a, { ...edit, rawMs: 45 }];
  expect(() => assertRevisionHistory(data)).toThrow();
  data.attemptRevisions = [{ ...a, testerId: 'different' }, edit];
  expect(() => assertRevisionHistory(data)).toThrow();
});
