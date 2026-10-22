import { expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { decodeLse, lseAt, lseIndex } from '../src/methods/roux/lse/coordinates';
import { createLseModel, LSE_GENERATORS } from '../src/methods/roux/lse/model';
import {
  generateLsePolicies,
  independentLseDomain,
  reachableLseDomain,
  lookupLseStep,
  lseRank,
  LSE_GOALS,
} from '../src/methods/roux/lse/policies';
import { ROUX_LSE_MANEUVERS, admitLseManeuver } from '../src/methods/roux/lse/catalog';
it('matches the independent full domain and physically replays every primitive and selected policy edge', async () => {
  const e = await createCubeEngine(),
    model = createLseModel(e),
    tables = generateLsePolicies(e),
    domain = independentLseDomain();
  expect(reachableLseDomain(e)).toEqual(domain);
  expect(domain).toHaveLength(184320);
  let primitives = 0,
    policyEdges = 0;
  for (const code of domain) {
    const c = lseAt(code),
      state = decodeLse(e, c);
    for (const move of LSE_GENERATORS) {
      const expected = decodeLse(e, model.step(c, [move]));
      if (!e.equals(e.apply(state, [move]), expected)) throw Error(`LSE primitive ${code} ${move}`);
      primitives++;
    }
    for (const goal of LSE_GOALS) {
      if (lseRank(tables, c, goal) === 255) continue;
      const step = lookupLseStep(tables, c, goal);
      if (!step) {
        if (!model.goal(c, goal)) throw Error(`False goal ${code}/${goal}`);
        continue;
      }
      const m = ROUX_LSE_MANEUVERS.find((m) => m.id === step.maneuverId)!,
        after = model.step(c, m.moves);
      if (
        !admitLseManeuver(model, c, after, m, goal) ||
        lseRank(tables, after, goal) !== step.rankAfter ||
        step.rankAfter !== step.rankBefore - 1
      )
        throw Error(`Broken policy ${code}/${goal}`);
      if (!e.equals(e.apply(state, m.moves), decodeLse(e, after)))
        throw Error(`LSE maneuver ${code}/${m.id}`);
      policyEdges++;
    }
    let cursor = c,
      actions = 0;
    for (const goal of LSE_GOALS)
      for (;;) {
        const step = lookupLseStep(tables, cursor, goal);
        if (!step) break;
        if (++actions > 160) throw Error('LSE termination bound');
        cursor = model.step(
          cursor,
          ROUX_LSE_MANEUVERS.find((m) => m.id === step.maneuverId)!.moves,
        );
      }
    if (lseIndex(cursor) !== 0) throw Error(`Incomplete LSE route ${code}`);
  }
  expect(primitives).toBe(1105920);
  // Each policy has one outgoing edge for every non-goal state in its partition.
  expect(policyEdges).toBe((184320 - 2880) + (2880 - 96) + (96 - 1));
}, 240000);
