import type { CubeEngine } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import {
  LSE_DENSE_SIZE,
  lseAt,
  lseIndex,
  validLseCoordinate,
  type LseCoordinate,
} from './coordinates';
import { createLseModel, applyLseTransform, LSE_GENERATORS, type LseGoal } from './model';
import { admitLseManeuver, ROUX_LSE_MANEUVERS, lseCatalogDigest } from './catalog';
export const LSE_GOALS = ['orientation', 'left-right', 'solved'] as const;
interface Policy {
  rank: Uint8Array;
  next: Uint8Array;
}
export interface LseTables {
  readonly version: 1;
  readonly domainCount: number;
  readonly coverage: Readonly<Record<LseGoal, number>>;
  readonly catalogDigest: string;
}
const storage = new WeakMap<LseTables, Record<LseGoal, Policy>>();
export function independentLseDomain(): number[] {
  return Array.from({ length: LSE_DENSE_SIZE }, (_, i) => i).filter((i) =>
    validLseCoordinate(lseAt(i)),
  );
}
export function reachableLseDomain(engine: CubeEngine): number[] {
  const model = createLseModel(engine),
    moves = LSE_GENERATORS.map((m) => model.transform([m])),
    seen = new Uint8Array(LSE_DENSE_SIZE),
    queue = [0];
  seen[0] = 1;
  for (let head = 0; head < queue.length; head++) {
    const c = lseAt(queue[head]);
    for (const t of moves) {
      const next = lseIndex(applyLseTransform(c, t));
      if (!seen[next]) {
        seen[next] = 1;
        queue.push(next);
      }
    }
  }
  return queue.sort((a, b) => a - b);
}
function tableObject(data: Record<LseGoal, Policy>): LseTables {
  const coverage = Object.fromEntries(
    LSE_GOALS.map((goal) => [goal, data[goal].rank.reduce((n, r) => n + (r !== 255 ? 1 : 0), 0)]),
  ) as Record<LseGoal, number>;
  const table = Object.freeze({
    version: 1 as const,
    domainCount: coverage.orientation,
    coverage: Object.freeze(coverage),
    catalogDigest: lseCatalogDigest(),
  });
  storage.set(table, data);
  return table;
}
export function generateLsePolicies(engine: CubeEngine): LseTables {
  const model = createLseModel(engine),
    domain = independentLseDomain(),
    reached = reachableLseDomain(engine);
  if (domain.length !== 184320 || JSON.stringify(domain) !== JSON.stringify(reached))
    throw Error('LSE legal and reachable domains disagree.');
  const data = {} as Record<LseGoal, Policy>,
    reverse = ROUX_LSE_MANEUVERS.map((m) => model.transform(invertTeachingMoves(m.moves)));
  for (const goal of LSE_GOALS) {
    const rank = new Uint8Array(LSE_DENSE_SIZE).fill(255),
      next = new Uint8Array(LSE_DENSE_SIZE),
      queue: number[] = [];
    const admitted = domain.filter(
      (code) =>
        goal === 'orientation' ||
        model.goal(lseAt(code), goal === 'left-right' ? 'orientation' : 'left-right'),
    );
    const allowed = new Set(admitted);
    for (const code of admitted)
      if (model.goal(lseAt(code), goal)) {
        rank[code] = 0;
        queue.push(code);
      }
    for (let head = 0; head < queue.length; head++) {
      const code = queue[head],
        after = lseAt(code);
      for (let i = 0; i < reverse.length; i++) {
        const before = applyLseTransform(after, reverse[i]),
          index = lseIndex(before);
        if (
          rank[index] !== 255 ||
          !allowed.has(index) ||
          !admitLseManeuver(model, before, after, ROUX_LSE_MANEUVERS[i], goal)
        )
          continue;
        rank[index] = rank[code] + 1;
        next[index] = i + 1;
        queue.push(index);
      }
    }
    if (queue.length !== admitted.length)
      throw Error(`Incomplete LSE ${goal} policy: ${queue.length}/${admitted.length}`);
    data[goal] = { rank, next };
  }
  return tableObject(data);
}
export function lseRank(tables: LseTables, c: LseCoordinate, goal: LseGoal): number {
  if (!validLseCoordinate(c)) throw Error('Illegal LSE coordinate.');
  const data = storage.get(tables);
  if (!data) throw Error('Unvalidated LSE tables.');
  return data[goal].rank[lseIndex(c)];
}
export function lookupLseStep(tables: LseTables, c: LseCoordinate, goal: LseGoal) {
  const rank = lseRank(tables, c, goal);
  if (rank === 255) throw Error(`State is outside the admitted ${goal} domain.`);
  if (rank === 0) return null;
  const id = storage.get(tables)![goal].next[lseIndex(c)] - 1,
    m = ROUX_LSE_MANEUVERS[id];
  if (!m) throw Error('Missing LSE maneuver.');
  return { maneuverId: m.id, rankBefore: rank, rankAfter: rank - 1 };
}
export function serializeLseTables(tables: LseTables): Uint8Array {
  const data = storage.get(tables);
  if (!data) throw Error('Unvalidated LSE tables.');
  const bytes = new Uint8Array(32 + LSE_DENSE_SIZE * 6),
    view = new DataView(bytes.buffer);
  [
    0x58554f52,
    1,
    LSE_DENSE_SIZE,
    tables.domainCount,
    ...LSE_GOALS.map((g) => tables.coverage[g]),
    parseInt(tables.catalogDigest, 16),
  ].forEach((n, i) => view.setUint32(i * 4, n, true));
  let offset = 32;
  for (const goal of LSE_GOALS)
    for (const key of ['rank', 'next'] as const) {
      bytes.set(data[goal][key], offset);
      offset += LSE_DENSE_SIZE;
    }
  return bytes;
}
export function parseLseTables(source: Uint8Array): LseTables {
  if (source.byteLength !== 32 + LSE_DENSE_SIZE * 6)
    throw Error('Invalid or truncated LSE policy bytes.');
  const bytes = source.slice(),
    view = new DataView(bytes.buffer),
    expected = [
      0x58554f52,
      1,
      LSE_DENSE_SIZE,
      184320,
      184320,
      2880,
      96,
      parseInt(lseCatalogDigest(), 16),
    ];
  if (expected.some((n, i) => view.getUint32(i * 4, true) !== n))
    throw Error('LSE policy version, domain or catalog mismatch.');
  const data = {} as Record<LseGoal, Policy>;
  let offset = 32;
  for (const goal of LSE_GOALS) {
    const rank = bytes.slice(offset, offset + LSE_DENSE_SIZE);
    offset += LSE_DENSE_SIZE;
    const next = bytes.slice(offset, offset + LSE_DENSE_SIZE);
    offset += LSE_DENSE_SIZE;
    if (
      rank.some((r, i) =>
        r === 0
          ? next[i] !== 0
          : r === 255
            ? next[i] !== 0
            : next[i] < 1 || next[i] > ROUX_LSE_MANEUVERS.length,
      )
    )
      throw Error('Invalid LSE rank or maneuver data.');
    data[goal] = { rank, next };
  }
  const table = tableObject(data);
  if (LSE_GOALS.some((g, i) => table.coverage[g] !== expected[i + 4]))
    throw Error('Incomplete LSE coverage.');
  return table;
}
