import { isTeachingMove } from '../../core/teaching-moves';
import { assertLabRouteShape } from '../validate';
import type {
  LabAttempt,
  LabComparison,
  LabData,
  LabExperiment,
  LabTester,
  TrialBlock,
} from './types';
export function demand(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}
export const sameLabValue = (a: unknown, b: unknown): boolean => stable(a) === stable(b);
function stable(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object')
    return (
      '{' +
      Object.keys(v)
        .filter((k) => (v as any)[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + stable((v as any)[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(v);
}
export const emptyLabData = (): LabData => ({
  experiments: [],
  comparisons: [],
  trialBlocks: [],
  testers: [],
  attempts: [],
  attemptRevisions: [],
});
export const id = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_:/.-]{1,160}$/.test(v);
export const text = (v: unknown, max: number, min = 0): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max;
export const date = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
export const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number =>
  Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
export function keys(
  v: unknown,
  required: string[],
  optional: string[] = [],
): asserts v is Record<string, any> {
  demand(v && typeof v === 'object' && !Array.isArray(v), 'Expected an object.');
  demand(
    Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null,
    'Unsupported object.',
  );
  demand(
    required.every((k) => Object.hasOwn(v, k)) &&
      Object.keys(v).every((k) => required.includes(k) || optional.includes(k)),
    'Missing or unexpected fields.',
  );
}
export function boundedLabValue(value: unknown) {
  const stack: [unknown, number][] = [[value, 0]];
  let nodes = 0;
  while (stack.length) {
    const [v, depth] = stack.pop()!;
    demand(++nodes <= 500000 && depth <= 24, 'Data nesting or size exceeds limits.');
    if (typeof v === 'string') demand(v.length <= 8000, 'Text exceeds limits.');
    else if (typeof v === 'number') demand(Number.isFinite(v), 'Non-finite value.');
    else if (v && typeof v === 'object') {
      demand(
        Array.isArray(v) ? v.length <= 5000 : Object.keys(v).length <= 128,
        'Collection exceeds limits.',
      );
      for (const [k, c] of Object.entries(v)) {
        demand(
          k.length <= 160 && !['__proto__', 'prototype', 'constructor'].includes(k),
          'Invalid field name.',
        );
        stack.push([c, depth + 1]);
      }
    } else demand(v === null || v === undefined || typeof v === 'boolean', 'Unsupported value.');
  }
}
const colors = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];
const opposite: Record<string, string> = {
  white: 'yellow',
  yellow: 'white',
  red: 'orange',
  orange: 'red',
  green: 'blue',
  blue: 'green',
};
function hold(v: unknown) {
  keys(v, ['bottom', 'front']);
  demand(
    colors.includes(v.bottom) &&
      colors.includes(v.front) &&
      v.bottom !== v.front &&
      opposite[v.bottom] !== v.front,
    'Invalid physical hold.',
  );
}
function moves(v: unknown) {
  demand(Array.isArray(v) && v.length <= 512 && v.every(isTeachingMove), 'Invalid move sequence.');
}
function inputShape(v: unknown) {
  demand(v && typeof v === 'object', 'Missing cube input.');
  if ((v as any).kind === 'scramble') {
    keys(v, ['kind', 'moves']);
    moves(v.moves);
    demand(
      v.moves.every((m: string) => /^[UDLRFB](?:'|2)?$/.test(m)),
      'Invalid scramble notation.',
    );
  } else {
    keys(v, ['kind', 'facelets']);
    demand(v.kind === 'facelets', 'Unknown cube input.');
    keys(v.facelets, ['U', 'D', 'L', 'R', 'F', 'B']);
    for (const side of Object.values(v.facelets) as unknown[])
      demand(
        Array.isArray(side) && side.length === 9 && side.every((c) => colors.includes(c)),
        'Invalid face colors.',
      );
  }
}
function stateShape(v: unknown) {
  keys(v, ['data']);
  keys(v.data, ['EDGES', 'CORNERS', 'CENTERS']);
  for (const [name, size, mod] of [
    ['EDGES', 12, 2],
    ['CORNERS', 8, 3],
    ['CENTERS', 6, 4],
  ] as const) {
    const orbit = v.data[name];
    keys(orbit, ['pieces', 'orientation'], ['orientationMod']);
    demand(
      Array.isArray(orbit.pieces) &&
        orbit.pieces.length === size &&
        new Set(orbit.pieces).size === size &&
        orbit.pieces.every((n: unknown) => integer(n, size - 1)),
      'Invalid piece permutation.',
    );
    demand(
      Array.isArray(orbit.orientation) &&
        orbit.orientation.length === size &&
        orbit.orientation.every((n: unknown) => integer(n, mod - 1)),
      'Invalid piece orientation.',
    );
    demand(
      orbit.orientationMod === undefined ||
        (Array.isArray(orbit.orientationMod) &&
          orbit.orientationMod.length === size &&
          orbit.orientationMod.every((n: unknown) => integer(n, mod))),
      'Invalid orientation modulus.',
    );
  }
}
function strictRoute(raw: unknown) {
  keys(raw, [
    'kind',
    'schemaVersion',
    'id',
    'inputFingerprint',
    'input',
    'initial',
    'startHold',
    'endHold',
    'positioningMoves',
    'neutralGrip',
    'crossMinimum',
    'crossLength',
    'actions',
    'skips',
    'boundaries',
    'final',
    'setupMoves',
    'score',
    'searchVersion',
    'modelVersion',
    'catalogVersion',
    'formulas',
  ]);
  assertLabRouteShape(raw);
  inputShape(raw.input);
  stateShape(raw.initial);
  stateShape(raw.final);
  keys(raw.boundaries, ['crossStart', 'crossEnd', 'f2lEnd']);
  for (const a of raw.actions) {
    keys(
      a,
      [
        'id',
        'section',
        'kind',
        'ruleId',
        'caseId',
        'targets',
        'recognition',
        'explanation',
        'moves',
        'before',
        'after',
        'checkpoint',
      ],
      ['algorithmId', 'repetition', 'pair'],
    );
    stateShape(a.before);
    stateShape(a.after);
    keys(a.checkpoint, ['predicate', 'description', 'protectedIds', 'targets'], ['hold']);
    demand(
      ['position', 'cross-progress', 'cross', 'pair', 'f2l', 'oll', 'pll', 'solved'].includes(
        a.checkpoint.predicate,
      ),
      'Unknown checkpoint.',
    );
    demand(
      [...a.checkpoint.targets, ...a.checkpoint.protectedIds].every((x) => text(x, 20, 1)),
      'Invalid checkpoint IDs.',
    );
    if (a.checkpoint.hold) hold(a.checkpoint.hold);
    if (a.repetition) {
      keys(a.repetition, ['group', 'index']);
      demand(
        text(a.repetition.group, 120, 1) && integer(a.repetition.index, 512),
        'Invalid repetition.',
      );
    }
    if (a.pair) {
      keys(a.pair, [
        'cornerId',
        'edgeId',
        'slot',
        'phase',
        'ordinal',
        'solvedBefore',
        'solvedAfter',
      ]);
      demand(
        [a.pair.cornerId, a.pair.edgeId, a.pair.slot].every((x) => text(x, 20, 1)) &&
          ['prepare', 'pair', 'insert'].includes(a.pair.phase) &&
          [a.pair.ordinal, a.pair.solvedBefore, a.pair.solvedAfter].every((n) => integer(n, 4)),
        'Invalid pair metadata.',
      );
    }
  }
  for (const s of raw.skips) keys(s, ['section', 'reason']);
  for (const f of Object.values(raw.formulas)) {
    keys(
      f,
      ['id', 'caseId', 'name', 'moves', 'precondition', 'effect', 'sourceRefs'],
      ['segments'],
    );
    f.sourceRefs.forEach((ref) => keys(ref, ['title', 'url', 'reference']));
    f.segments?.forEach((s) => keys(s, ['label', 'start', 'end']));
  }
  if (raw.score.rated) {
    keys(raw.score, ['rated', 'modelVersion', 'T', 'R', 'G', 'V', 'A', 'cost', 'events']);
    raw.score.events.forEach((e) =>
      keys(e, ['boundary', 'kind', 'profileId', 'fromGrip', 'toGrip', 'count', 'rationale']),
    );
  } else keys(raw.score, ['rated', 'reason']);
}
export function assertExperiment(raw: unknown): asserts raw is LabExperiment {
  boundedLabValue(raw);
  keys(
    raw,
    [
      'schemaVersion',
      'id',
      'createdAt',
      'input',
      'inputFingerprint',
      'setupMoves',
      'diagramHold',
      'settings',
      'limits',
      'coverage',
      'appVersion',
      'modelVersion',
      'catalogVersion',
      'searchVersion',
      'routes',
    ],
    ['label', 'provenance'],
  );
  demand(
    raw.schemaVersion === 1 && id(raw.id) && date(raw.createdAt),
    'Invalid experiment identity.',
  );
  demand(raw.label === undefined || text(raw.label, 60), 'Label exceeds 60 characters.');
  demand(raw.provenance === undefined || text(raw.provenance, 160), 'Invalid provenance.');
  demand(text(raw.inputFingerprint, 4096, 1), 'Missing input or settings.');
  keys(raw.settings, ['allowedColors', 'modelVersion']);
  demand(
    Array.isArray(raw.settings.allowedColors) &&
      raw.settings.allowedColors.length >= 1 &&
      raw.settings.allowedColors.length <= 6 &&
      new Set(raw.settings.allowedColors).size === raw.settings.allowedColors.length &&
      raw.settings.allowedColors.every((c: string) => colors.includes(c)) &&
      text(raw.settings.modelVersion, 120, 1) &&
      raw.settings.modelVersion === raw.modelVersion,
    'Invalid saved settings.',
  );
  inputShape(raw.input);
  hold(raw.diagramHold);
  moves(raw.setupMoves);
  for (const k of ['appVersion', 'modelVersion', 'catalogVersion', 'searchVersion'])
    demand(text(raw[k], 120, 1), 'Missing version.');
  keys(raw.limits, ['deadlineMs', 'operations', 'entries', 'crossPerColor', 'beam', 'shortlist']);
  for (const [k, max] of Object.entries({
    deadlineMs: 30000,
    operations: 2000000,
    entries: 25000,
    crossPerColor: 96,
    beam: 32,
    shortlist: 12,
  }))
    demand(integer(raw.limits[k], max) && raw.limits[k] > 0, 'Invalid search limit.');
  keys(
    raw.coverage,
    [
      'elapsedMs',
      'operations',
      'colors',
      'crossCompletions',
      'f2lCompletions',
      'rejectedCandidates',
      'entryHighWater',
    ],
    ['reason'],
  );
  demand(
    typeof raw.coverage.elapsedMs === 'number' &&
      raw.coverage.elapsedMs >= 0 &&
      raw.coverage.elapsedMs <= 60000,
    'Invalid elapsed coverage.',
  );
  for (const k of [
    'operations',
    'crossCompletions',
    'f2lCompletions',
    'rejectedCandidates',
    'entryHighWater',
  ])
    demand(integer(raw.coverage[k]), 'Invalid coverage count.');
  demand(
    raw.coverage.operations <= raw.limits.operations &&
      raw.coverage.entryHighWater <= raw.limits.entries,
    'Coverage exceeds limits.',
  );
  demand(
    raw.coverage.reason === undefined ||
      [
        'complete',
        'time-limit',
        'work-limit',
        'frontier-limit',
        'cancelled',
        'no-route',
        'error',
      ].includes(raw.coverage.reason),
    'Invalid stop reason.',
  );
  keys(raw.coverage.colors, [], colors);
  for (const c of Object.values(raw.coverage.colors) as any[]) {
    keys(c, ['status', 'holds', 'lengths', 'crosses', 'f2l'], ['minimum']);
    demand(
      ['unvisited', 'exploring', 'seeded', 'exhausted'].includes(c.status) &&
        Array.isArray(c.holds) &&
        c.holds.length <= 4 &&
        Array.isArray(c.lengths) &&
        c.lengths.length <= 3 &&
        c.lengths.every((n: unknown) => integer(n, 10)) &&
        integer(c.crosses) &&
        integer(c.f2l) &&
        (c.minimum === undefined || integer(c.minimum, 8)),
      'Invalid color coverage.',
    );
    c.holds.forEach(hold);
  }
  demand(
    Array.isArray(raw.routes) && raw.routes.length >= 1 && raw.routes.length <= 4,
    'Select one to four routes.',
  );
  const ids = new Set<string>();
  for (const r of raw.routes) {
    strictRoute(r);
    assertLabRouteShape(r);
    demand(!ids.has(r.id), 'Duplicate route.');
    ids.add(r.id);
    demand(
      r.inputFingerprint === raw.inputFingerprint &&
        sameLabValue(r.input, raw.input) &&
        sameLabValue(r.setupMoves, raw.setupMoves),
      'Cross-input snapshot mismatch.',
    );
    demand(
      r.modelVersion === raw.modelVersion &&
        r.catalogVersion === raw.catalogVersion &&
        r.searchVersion === raw.searchVersion,
      'Mixed route versions.',
    );
    hold(r.startHold);
    hold(r.endHold);
    const refs = new Set(r.actions.flatMap((a) => (a.algorithmId ? [a.algorithmId] : [])));
    demand(
      Object.keys(r.formulas).length === refs.size &&
        Object.keys(r.formulas).every((k) => refs.has(k)),
      'Missing or surplus formula definitions.',
    );
  }
}
export function assertComparison(raw: unknown): asserts raw is LabComparison {
  keys(raw, ['schemaVersion', 'id', 'experimentId', 'routeAId', 'routeBId', 'createdAt']);
  demand(
    raw.schemaVersion === 1 &&
      [raw.id, raw.experimentId, raw.routeAId, raw.routeBId].every(id) &&
      raw.routeAId !== raw.routeBId &&
      date(raw.createdAt),
    'Invalid comparison.',
  );
}
export function assertBlock(raw: unknown): asserts raw is TrialBlock {
  keys(raw, ['id', 'ordinal', 'comparisonId', 'createdAt', 'intendedOrder', 'slots']);
  demand(
    id(raw.id) &&
      Number.isSafeInteger(raw.ordinal) &&
      raw.ordinal >= 1 &&
      raw.ordinal <= 1000000 &&
      id(raw.comparisonId) &&
      date(raw.createdAt) &&
      ['AB', 'BA'].includes(raw.intendedOrder) &&
      Array.isArray(raw.slots) &&
      raw.slots.length === 2,
    'Invalid block.',
  );
  raw.slots.forEach((s: any, i: number) => {
    keys(s, ['id', 'label', 'routeId']);
    demand(id(s.id) && id(s.routeId) && s.label === ['A', 'B'][i], 'Invalid block slot.');
  });
  demand(
    raw.slots[0].id !== raw.slots[1].id && raw.slots[0].routeId !== raw.slots[1].routeId,
    'Duplicate block slot.',
  );
}
export function assertTester(raw: unknown): asserts raw is LabTester {
  keys(raw, ['id'], ['label']);
  demand(id(raw.id) && (raw.label === undefined || text(raw.label, 60)), 'Invalid tester.');
}
export function assertAttempt(raw: unknown): asserts raw is LabAttempt {
  keys(
    raw,
    [
      'schemaVersion',
      'id',
      'revision',
      'previousRevision',
      'createdAt',
      'updatedAt',
      'experimentId',
      'routeId',
      'testerId',
      'timingMethod',
      'endpoint',
      'kind',
      'outcome',
      'rawMs',
      'setupConfirmed',
      'holdConfirmed',
      'interruption',
      'deletedAt',
    ],
    [
      'comparisonId',
      'blockId',
      'slot',
      'retryOf',
      'intendedOrder',
      'actualOrder',
      'flow',
      'recognition',
      'note',
    ],
  );
  demand(
    raw.schemaVersion === 1 &&
      [raw.id, raw.experimentId, raw.routeId, raw.testerId].every(id) &&
      integer(raw.revision) &&
      raw.previousRevision === (raw.revision ? raw.revision - 1 : null) &&
      date(raw.createdAt) &&
      date(raw.updatedAt) &&
      raw.updatedAt >= raw.createdAt,
    'Invalid attempt revision.',
  );
  demand(
    ['keyboard', 'touch', 'external-manual'].includes(raw.timingMethod) &&
      raw.endpoint === 'cross-f2l' &&
      ['warmup', 'measured'].includes(raw.kind) &&
      ['followed', 'deviated', 'incomplete', 'interrupted'].includes(raw.outcome),
    'Invalid attempt conditions.',
  );
  demand(
    typeof raw.setupConfirmed === 'boolean' && typeof raw.holdConfirmed === 'boolean',
    'Setup confirmations are required.',
  );
  demand(
    raw.rawMs === null ||
      (typeof raw.rawMs === 'number' && Number.isFinite(raw.rawMs) && raw.rawMs > 0),
    'Duration must be positive and finite.',
  );
  demand(
    raw.interruption === null ||
      ['blur', 'hidden', 'escape', 'leave', 'pointer-cancel', 'help'].includes(raw.interruption),
    'Invalid interruption.',
  );
  demand(
    (raw.outcome === 'interrupted') === (raw.interruption !== null),
    'Interruption cannot be a followed result.',
  );
  if (raw.kind === 'measured' && raw.outcome === 'followed')
    demand(
      raw.rawMs !== null && raw.setupConfirmed && raw.holdConfirmed,
      'Measured followed attempts require confirmed setup and a duration.',
    );
  if (raw.rawMs === null)
    demand(
      raw.kind === 'warmup' || raw.outcome === 'interrupted',
      'Only warmups or interruptions may be untimed.',
    );
  for (const k of ['comparisonId', 'blockId', 'slot', 'retryOf'])
    demand(raw[k] === undefined || id(raw[k]), 'Invalid reference.');
  const linked = ['comparisonId', 'blockId', 'slot', 'intendedOrder', 'actualOrder'].map(
    (k) => raw[k] !== undefined,
  );
  demand(linked.every(Boolean) || linked.every((x) => !x), 'Incomplete block conditions.');
  demand(
    raw.intendedOrder === undefined || ['AB', 'BA'].includes(raw.intendedOrder),
    'Invalid intended order.',
  );
  demand(
    raw.actualOrder === undefined || (integer(raw.actualOrder) && raw.actualOrder > 0),
    'Invalid actual order.',
  );
  for (const k of ['flow', 'recognition'])
    demand(raw[k] === undefined || (integer(raw[k], 5) && raw[k] >= 1), 'Ratings must be 1–5.');
  demand(raw.note === undefined || text(raw.note, 2000), 'Notes exceed 2000 characters.');
  demand(raw.deletedAt === null || date(raw.deletedAt), 'Invalid deletion time.');
}
export function assertGraph(data: LabData) {
  const exp = new Map(data.experiments.map((x) => [x.id, x])),
    comp = new Map(data.comparisons.map((x) => [x.id, x])),
    blocks = new Map(data.trialBlocks.map((x) => [x.id, x])),
    testers = new Set(data.testers.map((x) => x.id));
  for (const table of ['experiments', 'comparisons', 'trialBlocks', 'testers', 'attempts'] as const)
    demand(
      new Set(data[table].map((x) => x.id)).size === data[table].length,
      'Duplicate identity.',
    );
  data.experiments.forEach(assertExperiment);
  data.testers.forEach(assertTester);
  data.comparisons.forEach((c) => {
    assertComparison(c);
    const e = exp.get(c.experimentId);
    demand(
      e && [c.routeAId, c.routeBId].every((id) => e.routes.some((r) => r.id === id)),
      'Comparison references an absent route.',
    );
  });
  for (const e of exp.values())
    demand(
      data.comparisons.filter((c) => c.experimentId === e.id).length <= 6,
      'At most six comparisons per experiment.',
    );
  const slotIds = new Set<string>();
  const ordinals = new Set<string>();
  data.trialBlocks.forEach((b) => {
    assertBlock(b);
    const ordinalKey = `${b.comparisonId}:${b.ordinal}`;
    demand(!ordinals.has(ordinalKey), 'Duplicate block order.');
    ordinals.add(ordinalKey);
    const c = comp.get(b.comparisonId);
    demand(
      c && b.slots[0].routeId === c.routeAId && b.slots[1].routeId === c.routeBId,
      'Block route mismatch.',
    );
    for (const s of b.slots) {
      demand(!slotIds.has(s.id), 'Duplicate slot identity.');
      slotIds.add(s.id);
    }
  });
  const heads = new Map(data.attempts.map((a) => [a.id, a]));
  for (const a of [...data.attempts, ...data.attemptRevisions]) {
    assertAttempt(a);
    const e = exp.get(a.experimentId);
    demand(
      e?.routes.some((r) => r.id === a.routeId) && testers.has(a.testerId),
      'Attempt references an absent route/tester.',
    );
    if (a.blockId) {
      const b = blocks.get(a.blockId),
        c = comp.get(a.comparisonId!);
      demand(
        b &&
          c &&
          b.comparisonId === c.id &&
          c.experimentId === a.experimentId &&
          b.intendedOrder === a.intendedOrder &&
          b.slots.some((s) => s.id === a.slot && s.routeId === a.routeId),
        'Attempt block/slot mismatch.',
      );
    }
    if (a.retryOf) {
      const prev = heads.get(a.retryOf);
      demand(
        prev &&
          prev.id !== a.id &&
          prev.createdAt <= a.createdAt &&
          prev.experimentId === a.experimentId &&
          prev.routeId === a.routeId &&
          prev.testerId === a.testerId &&
          prev.timingMethod === a.timingMethod &&
          prev.blockId === a.blockId &&
          prev.slot === a.slot,
        'Invalid retry reference.',
      );
      let p: LabAttempt | undefined = prev;
      const seen = new Set([a.id]);
      while (p) {
        demand(!seen.has(p.id), 'Cyclic retry.');
        seen.add(p.id);
        p = p.retryOf ? heads.get(p.retryOf) : undefined;
      }
    }
  }
}
export const IMMUTABLE_ATTEMPT_FIELDS = [
  'createdAt',
  'experimentId',
  'routeId',
  'testerId',
  'timingMethod',
  'endpoint',
  'kind',
  'comparisonId',
  'blockId',
  'slot',
  'retryOf',
  'intendedOrder',
  'actualOrder',
  'setupConfirmed',
  'holdConfirmed',
  'interruption',
] as const;
export function assertRevisionHistory(data: Pick<LabData, 'attempts' | 'attemptRevisions'>) {
  const heads = new Map(data.attempts.map((a) => [a.id, a]));
  demand(
    data.attemptRevisions.every((a) => heads.has(a.id)),
    'Orphan attempt revision.',
  );
  for (const head of heads.values()) {
    const rows = data.attemptRevisions
      .filter((a) => a.id === head.id)
      .sort((a, b) => a.revision - b.revision);
    demand(
      rows.length === head.revision + 1 && sameLabValue(rows.at(-1), head),
      'Incomplete revision history or mismatched head.',
    );
    rows.forEach((a, i) => {
      demand(
        a.revision === i && a.previousRevision === (i ? i - 1 : null),
        'Broken revision chain.',
      );
      demand(
        IMMUTABLE_ATTEMPT_FIELDS.every((k) => a[k] === head[k]),
        'Recorded revision conditions changed.',
      );
      demand(!i || a.updatedAt >= rows[i - 1].updatedAt, 'Revision timestamps go backwards.');
    });
  }
}
