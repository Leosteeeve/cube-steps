import type { CubeEngine, TeachingMove } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { LSE_DENSE_SIZE, lseAt, lseIndex, decodeLse } from '../../roux/lse/coordinates';
import {
  createLseModel,
  applyLseTransform,
  LSE_GENERATORS,
  type LseGoal,
  type LseModel,
} from '../../roux/lse/model';
import { independentLseDomain, reachableLseDomain } from '../../roux/lse/policies';
import { ROUX_LSE_MANEUVERS, admitLseManeuver } from '../../roux/lse/catalog';
import {
  ADVANCED_LSE_BYTES,
  ADVANCED_LSE_GOALS,
  readLsePolicy,
  type AdvancedLseAssets,
  type AdvancedLseGoal,
} from './assets';
const basicGoal: Record<'eo' | 'lr' | 'last', LseGoal> = {
  eo: 'orientation',
  lr: 'left-right',
  last: 'solved',
};
export function lsePolicyMoves(goal: AdvancedLseGoal, next: number): readonly TeachingMove[] {
  if (!next || next === 255) throw Error('No LSE policy move.');
  const moves =
    goal === 'nearest' || goal === 'combined' || goal === 'last'
      ? [LSE_GENERATORS[next - 1]]
      : ROUX_LSE_MANEUVERS[next - 1]?.moves;
  if (!moves || moves.some((m) => !m)) throw Error('Invalid LSE policy move.');
  return moves;
}
const lastDomains = new WeakMap<LseModel, ReadonlySet<number>>();
export function lastFourDomain(model: LseModel): ReadonlySet<number> {
  const prior = lastDomains.get(model);
  if (prior) return prior;
  const reference = lseAt(0),
    targets = [0, 1, 2, 3].map((n) => model.step(reference, Array(n).fill('U')).edges);
  const lateral = (code: number) => {
    const c = lseAt(code);
    return [1, 3].every((id) => c.edges.indexOf(id) === targets[c.offset].indexOf(id));
  };
  const queue = [0],
    seen = new Set(queue);
  for (let head = 0; head < queue.length; head++)
    for (const move of LSE_GENERATORS) {
      const next = lseIndex(model.step(lseAt(queue[head]), [move]));
      if (!seen.has(next) && lateral(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  lastDomains.set(model, seen);
  return seen;
}
const inDomain = (model: LseModel, code: number, goal: AdvancedLseGoal) =>
  goal === 'lr'
    ? model.goal(lseAt(code), 'orientation')
    : goal === 'last'
      ? lastFourDomain(model).has(code)
      : true;
const isGoal = (model: LseModel, code: number, goal: AdvancedLseGoal) =>
  model.goal(
    lseAt(code),
    goal === 'nearest' || goal === 'combined' ? 'left-right' : basicGoal[goal],
  );
export function buildAdvancedLseTables(e: CubeEngine): {
  bytes: Uint8Array;
  reachable: number;
  maximums: Record<string, number>;
} {
  const model = createLseModel(e),
    domain = independentLseDomain(),
    reachable = reachableLseDomain(e);
  if (domain.length !== 184320 || JSON.stringify(domain) !== JSON.stringify(reachable))
    throw Error('Advanced LSE legal/reachable domains disagree.');
  const policies = new Map<AdvancedLseGoal, { cost: Uint8Array; next: Uint8Array }>();
  for (const goal of ADVANCED_LSE_GOALS) {
    const primitives = goal === 'nearest' || goal === 'combined' || goal === 'last';
    const moves = primitives
      ? LSE_GENERATORS.map((m) => [m])
      : ROUX_LSE_MANEUVERS.map((m) => m.moves);
    const reverse = moves.map((m) => model.transform(invertTeachingMoves(m)));
    const allowed = new Uint8Array(LSE_DENSE_SIZE),
      cost = new Uint8Array(LSE_DENSE_SIZE).fill(255),
      next = new Uint8Array(LSE_DENSE_SIZE).fill(255),
      prefix = new Uint8Array(LSE_DENSE_SIZE).fill(255);
    const buckets: number[][] = Array.from({ length: 255 }, () => []);
    for (const code of domain)
      if (inDomain(model, code, goal)) {
        allowed[code] = 1;
        if (isGoal(model, code, goal)) {
          const terminal = goal === 'combined' ? policies.get('last')!.cost[code] : 0;
          if (terminal === 255) throw Error('Missing last-four terminal.');
          cost[code] = terminal;
          prefix[code] = 0;
          next[code] = 0;
          buckets[terminal].push(code);
        }
      }
    for (let distance = 0; distance < 255; distance++)
      for (let cursor = 0; cursor < buckets[distance].length; cursor++) {
        const code = buckets[distance][cursor];
        if (cost[code] !== distance) continue;
        const after = lseAt(code);
        for (let i = 0; i < reverse.length; i++) {
          const before = applyLseTransform(after, reverse[i]),
            index = lseIndex(before);
          if (
            !allowed[index] ||
            (!primitives &&
              !admitLseManeuver(
                model,
                before,
                after,
                ROUX_LSE_MANEUVERS[i],
                basicGoal[goal as 'eo' | 'lr' | 'last'],
              ))
          )
            continue;
          const d = distance + moves[i].length,
            p = prefix[code] + moves[i].length;
          if (d >= 255) throw Error('LSE cost overflows a byte.');
          if (d < cost[index] || (d === cost[index] && p < prefix[index])) {
            cost[index] = d;
            prefix[index] = p;
            next[index] = i + 1;
            buckets[d].push(index);
          }
        }
      }
    for (const code of domain)
      if (allowed[code] && cost[code] === 255) throw Error(`Advanced LSE hole ${goal}/${code}.`);
    if (goal === 'last')
      for (const code of domain)
        if (model.goal(lseAt(code), 'left-right') && cost[code] === 255)
          throw Error(`EOLR endpoint outside last-four domain ${code}.`);
    policies.set(goal, { cost, next });
  }
  const bytes = new Uint8Array(ADVANCED_LSE_BYTES),
    view = new DataView(bytes.buffer),
    maximums: Record<string, number> = {};
  [0x414c5352, 1, LSE_DENSE_SIZE, domain.length].forEach((v, i) => view.setUint32(i * 4, v, true));
  let offset = 16;
  for (const goal of ADVANCED_LSE_GOALS) {
    const p = policies.get(goal)!;
    bytes.set(p.cost, offset);
    offset += LSE_DENSE_SIZE;
    bytes.set(p.next, offset);
    offset += LSE_DENSE_SIZE;
    maximums[goal] = p.cost.reduce((a, b) => (b === 255 ? a : Math.max(a, b)), 0);
  }
  return { bytes, reachable: domain.length, maximums };
}
export function verifyAdvancedLseDomain(
  e: CubeEngine,
  assets: AdvancedLseAssets,
): { reachable: number; verified: number; failures: readonly string[] } {
  const model = createLseModel(e),
    domain = independentLseDomain(),
    reachable = reachableLseDomain(e),
    failures: string[] = [];
  let verified = 0;
  if (JSON.stringify(domain) !== JSON.stringify(reachable))
    failures.push('Legal/reachable domain mismatch.');
  for (const code of domain) {
    const c = lseAt(code),
      state = decodeLse(e, c);
    let valid = true;
    const fail = (why: string) => {
      valid = false;
      if (failures.length < 100) failures.push(`${code}: ${why}`);
    };
    for (const move of LSE_GENERATORS)
      if (!e.equals(e.apply(state, [move]), decodeLse(e, model.step(c, [move]))))
        fail(`physical ${move}`);
    for (const goal of ADVANCED_LSE_GOALS) {
      const p = readLsePolicy(assets, goal, code);
      if (!inDomain(model, code, goal)) {
        if (p.cost !== 255) fail(`unexpected domain ${goal}`);
        continue;
      }
      if (p.cost === 255) {
        fail(`hole ${goal}`);
        continue;
      }
      if (!p.next) {
        if (
          !isGoal(model, code, goal) ||
          p.cost !== (goal === 'combined' ? readLsePolicy(assets, 'last', code).cost : 0)
        )
          fail(`false goal ${goal}`);
      } else {
        const moves = lsePolicyMoves(goal, p.next),
          after = model.step(c, moves),
          q = readLsePolicy(assets, goal, lseIndex(after));
        if (q.cost + moves.length !== p.cost) fail(`non-decreasing cost ${goal}`);
        if (
          (goal === 'eo' || goal === 'lr') &&
          !admitLseManeuver(model, c, after, ROUX_LSE_MANEUVERS[p.next - 1], basicGoal[goal])
        )
          fail(`inadmissible ${goal}`);
        if (!e.equals(e.apply(state, moves), decodeLse(e, after))) fail(`physical policy ${goal}`);
      }
    }
    if (valid) verified++;
  }
  return { reachable: reachable.length, verified, failures };
}
