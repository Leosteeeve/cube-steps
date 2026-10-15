import type { Color } from '../core/types';
import { createLabFrameSteps } from './frames';
import { exploreCross, createCrossQuota, crossMinimum } from './cross';
import { planLabF2L, type CompletedF2L } from './f2l/planner';
import { finalizeLabRouteSteps, type LabContext } from './finalize';
import { validateLabRouteSteps } from './validate';
import { rankLabRoutes } from './execution/score';
import { LabStopped, meterLabEngine, type LabBudget, type LabWork } from './budget';
import type { LabCoverage, LabHold, LabInput, LabRoute, LabSettings, LabStopReason } from './types';

export const LAB_COLOR_ORDER: readonly Color[] = [
  'white',
  'yellow',
  'red',
  'orange',
  'green',
  'blue',
];
const FRONTS: Record<Color, readonly Color[]> = {
  white: ['green', 'red', 'blue', 'orange'],
  yellow: ['green', 'red', 'blue', 'orange'],
  red: ['green', 'white', 'blue', 'yellow'],
  orange: ['green', 'white', 'blue', 'yellow'],
  green: ['white', 'red', 'yellow', 'orange'],
  blue: ['white', 'red', 'yellow', 'orange'],
};
export type LabSearchEvent =
  | LabWork
  | { kind: 'progress'; coverage: LabCoverage }
  | { kind: 'candidate'; route: LabRoute }
  | { kind: 'done'; reason: LabStopReason; coverage: LabCoverage };
const identity = (r: LabRoute) =>
  r.boundaries.f2lEnd === r.boundaries.crossStart
    ? r.inputFingerprint + '|objective-already-complete'
    : r.startHold.bottom +
      '|' +
      r.startHold.front +
      '|' +
      r.actions
        .map(
          (a) =>
            `${a.section}:${a.algorithmId ?? a.ruleId}:${a.targets.join(',')}:${a.moves.join(' ')}`,
        )
        .join(';');
function dominates(a: LabRoute, b: LabRoute) {
  if (!a.score.rated || !b.score.rated) return false;
  const av = [a.score.T, a.score.R, a.score.G, a.score.V, a.score.A],
    bv = [b.score.T, b.score.R, b.score.G, b.score.V, b.score.A];
  return av.every((v, i) => v <= bv[i]) && av.some((v, i) => v < bv[i]);
}
/** Recommendation plus up to three meaningful, physically distinct alternatives. */
export function selectLabRoutes(routes: readonly LabRoute[]): LabRoute[] {
  const unique = new Map<string, LabRoute>();
  for (const r of routes) {
    if (
      !r.score.rated ||
      r.modelVersion !== 'lab-execution-v1' ||
      r.score.modelVersion !== r.modelVersion
    )
      continue;
    const key = identity(r),
      old = unique.get(key);
    if (!old || rankLabRoutes(r, old) < 0) unique.set(key, r);
  }
  const sorted = [...unique.values()].sort(rankLabRoutes);
  if (!sorted.length) return [];
  const selected = [sorted[0]];
  for (const r of sorted.slice(1)) {
    if (selected.length === 4) break;
    const distinctHold = selected.every(
      (s) => s.startHold.bottom !== r.startHold.bottom || s.startHold.front !== r.startHold.front,
    );
    const nonDominated = !sorted.some((s) => s !== r && dominates(s, r));
    if (distinctHold || nonDominated) selected.push(r);
  }
  return selected;
}
/** Keeps operational capacity for replay and score verification; never resets work. */
function reserveBudget(budget: LabBudget): LabBudget {
  const reserve = Math.min(25_000, Math.floor(budget.remaining() / 4));
  return {
    ...budget,
    charge(kind, count = 1) {
      if (budget.remaining() - count < reserve) throw new LabStopped('work-limit');
      budget.charge(kind, count);
    },
  };
}
export function* searchLab(
  context: LabContext,
  input: LabInput,
  settings: LabSettings,
  budget: LabBudget,
): Generator<LabSearchEvent> {
  const colors = [...new Set(settings.allowedColors)];
  if (
    !colors.length ||
    colors.length > 6 ||
    colors.some((c) => !LAB_COLOR_ORDER.includes(c)) ||
    settings.modelVersion !== context.profiles.version
  )
    throw Error('Invalid Lab settings.');
  const work = reserveBudget(budget),
    quota = createCrossQuota();
  const colorsCoverage: LabCoverage['colors'] = Object.fromEntries(
    colors.map((c) => [c, { status: 'unvisited', holds: [], lengths: [], crosses: 0, f2l: 0 }]),
  );
  let crossCompletions = 0,
    f2lCompletions = 0,
    rejected = 0;
  const snapshot = (reason?: LabStopReason): LabCoverage => {
    const s = budget.snapshot();
    return {
      elapsedMs: s.elapsedMs,
      operations: s.operations,
      colors: structuredClone(colorsCoverage),
      crossCompletions,
      f2lCompletions,
      rejectedCandidates: rejected,
      entryHighWater: s.entryHighWater,
      ...(reason ? { reason } : {}),
    };
  };
  type Job = Generator<LabWork | CompletedF2L>;
  const jobs: Job[] = [],
    retained = new Set<unknown>();
  const keep = (key: unknown) => {
    if (!budget.retain(key)) throw new LabStopped('frontier-limit');
    retained.add(key);
  };
  function* job(hold: LabHold, extra: 0 | 1 | 2): Job {
    const coverage = colorsCoverage[hold.bottom]!;
    coverage.status = coverage.status === 'seeded' ? 'seeded' : 'exploring';
    const frame = yield* createLabFrameSteps(context.engine, input, hold, work);
    const minimum = crossMinimum(meterLabEngine(context.engine, work), input, frame, context.table);
    coverage.minimum = minimum;
    if (!coverage.holds.some((h) => h.front === hold.front))
      coverage.holds = [...coverage.holds, hold];
    if (!coverage.lengths.includes(minimum + extra))
      coverage.lengths = [...coverage.lengths, minimum + extra].sort((a, b) => a - b);
    for (const event of exploreCross(context.engine, input, frame, context.table, work, {
      extraLengths: [extra],
      maxCompletions: 8,
      quota,
    })) {
      if (event.kind === 'work') {
        yield event;
        continue;
      }
      coverage.crosses++;
      crossCompletions++;
      for (const endpoint of planLabF2L(context.engine, event.candidate, context.profiles, work)) {
        if (endpoint.kind === 'f2l') {
          coverage.f2l++;
          f2lCompletions++;
        }
        yield endpoint;
      }
    }
  }
  let finalists: LabRoute[] = [],
    published = 0;
  const finalistEntries = new Map<string, symbol>();
  function* admit(endpoint: CompletedF2L, seed = false): Generator<LabSearchEvent> {
    try {
      const route = yield* finalizeLabRouteSteps(context, input, endpoint, budget);
      const checked = yield* validateLabRouteSteps(context, input, route, 'current', budget);
      const next = selectLabRoutes([...finalists, checked.route]);
      const added =
        next.some((r) => r.id === route.id) &&
        !finalists.some((r) => identity(r) === identity(route));
      for (const [id, key] of finalistEntries)
        if (!next.some((r) => r.id === id)) {
          budget.release(key);
          retained.delete(key);
          finalistEntries.delete(id);
        }
      for (const r of next)
        if (!finalistEntries.has(r.id)) {
          const key = Symbol('validated finalist');
          keep(key);
          finalistEntries.set(r.id, key);
        }
      finalists = next;
      if (added || seed) {
        published++;
        yield { kind: 'candidate', route: checked.route };
      }
    } catch (error) {
      if (error instanceof LabStopped) throw error;
      // A failed endpoint cannot erase physically replayed incumbents.
      rejected++;
      return;
    }
  }
  let reason: LabStopReason = 'complete';
  try {
    budget.checkpoint();
    // Seed jobs remain resumable; later scheduling continues their F2L beams.
    for (const color of colors) {
      const iterator = job({ bottom: color, front: FRONTS[color][0] }, 0);
      jobs.push(iterator);
      keep(iterator);
      let seeded = false;
      for (;;) {
        const next = iterator.next();
        if (next.done) break;
        if (next.value.kind === 'work') {
          yield next.value;
          continue;
        }
        const before = published;
        yield* admit(next.value, true);
        if (published > before) {
          colorsCoverage[color]!.status = 'seeded';
          seeded = true;
          break;
        }
      }
      if (!seeded) colorsCoverage[color]!.status = 'exhausted';
      yield { kind: 'progress', coverage: snapshot() };
    }
    for (const extra of [0, 1, 2] as const)
      for (let front = 0; front < 4; front++)
        for (const color of colors) {
          if (front === 0 && extra === 0) continue;
          const iterator = job({ bottom: color, front: FRONTS[color][front] }, extra);
          jobs.push(iterator);
          keep(iterator);
        }
    while (jobs.length) {
      for (let i = 0; i < jobs.length;) {
        const iterator = jobs[i],
          start = budget.snapshot().operations;
        let done = false;
        do {
          const next = iterator.next();
          if (next.done) {
            done = true;
            break;
          }
          if (next.value.kind === 'work') yield next.value;
          else {
            yield* admit(next.value);
            break;
          }
        } while (budget.snapshot().operations - start < 2048);
        if (done) {
          jobs.splice(i, 1);
          budget.release(iterator);
          retained.delete(iterator);
        } else i++;
      }
      yield { kind: 'progress', coverage: snapshot() };
    }
    if (!published) reason = rejected ? 'error' : 'no-route';
  } catch (error) {
    if (error instanceof LabStopped) reason = error.reason;
    else throw error;
  } finally {
    for (const iterator of jobs) iterator.return(undefined);
    for (const key of retained) budget.release(key);
  }
  yield { kind: 'done', reason, coverage: snapshot(reason) };
}
