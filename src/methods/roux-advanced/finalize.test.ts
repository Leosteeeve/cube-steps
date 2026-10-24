import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { stateToFacelets } from '../../core/facelets';
import { loadTestAdvancedRouxAssets } from '../../../tests/helpers/roux-advanced-assets';
import { ROUX_FRAMES } from './frames';
import { prepareRouxInput } from './input';
import { createRouxSearchBudget } from './budget';
import { planBaselineBlocks } from './blocks/baseline';
import { completeRouxCandidate, withBasicLse } from './complete';
import { validateRouxRoute } from './validate';
import { verifyTrace } from '../shared/verification';
import { createAdvancedRouxRuntime } from './definition';
import type { AdvancedRouxAssets } from './assets';
import { invertTeachingMoves } from '../../core/teaching-moves';
import { describeBlockCandidate } from './blocks/candidates';
import { firstBlockDraft, makeSecondBlockAction } from './blocks/continuation';
import { checkedFirstBlockEvidence } from './validate';
import { planAdvancedLse } from './lse/plan';
import { createMethodTrace } from '../shared/trace';
import { rouxPositionAction } from './definition';
import { finalizeRouxRoute } from './finalize';
let e: CubeEngine, assets: AdvancedRouxAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await loadTestAdvancedRouxAssets();
});
const frame = ROUX_FRAMES.find((f) => f.id === 'yellow-green')!;
function route(facelets = false) {
  const source = { kind: 'scramble' as const, moves: ['R', 'U', "F'", 'L2', 'B'] as const };
  const input = prepareRouxInput(
      e,
      facelets
        ? { kind: 'facelets', facelets: stateToFacelets(e.apply(e.solved(), source.moves)) }
        : source,
    ),
    budget = createRouxSearchBudget('normal', { now: () => 0 });
  const g = planBaselineBlocks(e, input, frame, assets.beginner, budget);
  let step = g.next();
  while (!step.done) step = g.next();
  return completeRouxCandidate(e, input, frame, step.value, assets, budget);
}
it('finalizes six verified stages, physical counts and a legal facelet setup witness', () => {
  const r = route(true);
  expect(r.input.setupMoves).not.toBeNull();
  expect(e.equals(e.apply(e.solved(), r.input.setupMoves!), r.trace.initial)).toBe(true);
  verifyTrace(e, r.trace, createAdvancedRouxRuntime(assets, frame.id));
  expect(validateRouxRoute(e, structuredClone(r), assets).id).toBe(r.id);
  expect(r.counts.combined).toBe(r.counts.first + r.counts.second);
  expect(r.boundaries.cmllEnd).toBeGreaterThanOrEqual(r.boundaries.secondEnd);
});
it('basic LSE creates a new immutable route without changing the block subtotal', () => {
  const original = route(),
    before = JSON.stringify(original);
  const basic = withBasicLse(
    e,
    original,
    assets,
    createRouxSearchBudget('normal', { now: () => 0 }),
  );
  expect(basic).not.toBe(original);
  expect(basic.lseMode).toBe('basic');
  expect(basic.counts).toEqual(original.counts);
  expect(basic.score).toEqual(original.score);
  expect(JSON.stringify(original)).toBe(before);
  expect(Object.isFrozen(basic)).toBe(true);
  validateRouxRoute(e, basic, assets);
});
it('rejects late physical, center, count, input and formula corruption', () => {
  const r = route();
  const mutations = [
    (x: typeof r) => {
      x.trace.final.data.EDGES.orientation[0] ^= 1;
    },
    (x: typeof r) => {
      x.counts.first++;
    },
    (x: typeof r) => {
      x.input = { ...x.input, fingerprint: 'wrong' };
    },
    (x: typeof r) => {
      x.trace.stages[1].actions[0].rouxAdvanced!.centerPhaseAfter = 3;
    },
    (x: typeof r) => {
      const id = Object.keys(x.formulas)[0];
      if (id) x.formulas[id].moves.push('R');
      else x.trace.stages[1].actions[0].moves.push('R');
    },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(r);
    mutate(bad);
    expect(() => validateRouxRoute(e, bad, assets)).toThrow();
  }
});
it('removes a closed block detour and moves the checkpoint to a real first-block endpoint', () => {
  const held = e.apply(e.apply(e.solved(), frame.positioningMoves), ["R'", "F'"]),
    input = prepareRouxInput(e, {
      kind: 'facelets',
      facelets: stateToFacelets(e.apply(held, invertTeachingMoves(frame.positioningMoves))),
    }),
    first = describeBlockCandidate(e, held, frame, ['F', 'R']),
    secondMoves = ["R'", 'R'] as const;
  const r = completeRouxCandidate(
    e,
    input,
    frame,
    {
      first,
      secondMoves,
      state: first.state,
      secondTurns: 2,
      actions: [
        ...firstBlockDraft(e, first, frame),
        makeSecondBlockAction(e, first.state, secondMoves, frame),
      ],
    },
    assets,
    createRouxSearchBudget('normal', { now: () => 0 }),
  );
  expect(r.counts).toMatchObject({ first: 1, second: 1, combined: 2 });
  validateRouxRoute(e, r, assets);
});
it('uses a beneficial actual hold change in a complete route and keeps its endpoint', () => {
  const moves = ['B', 'U', "B'", 'U', 'B', 'U', "B'"] as const,
    held = e.apply(e.apply(e.solved(), frame.positioningMoves), invertTeachingMoves(moves)),
    input = prepareRouxInput(e, {
      kind: 'facelets',
      facelets: stateToFacelets(e.apply(held, invertTeachingMoves(frame.positioningMoves))),
    }),
    first = describeBlockCandidate(e, held, frame, moves);
  const r = completeRouxCandidate(
    e,
    input,
    frame,
    {
      first,
      secondMoves: [],
      state: first.state,
      secondTurns: 0,
      actions: firstBlockDraft(e, first, frame),
    },
    assets,
    createRouxSearchBudget('normal', { now: () => 0 }),
  );
  expect(r.counts.rotations).toBe(2);
  expect(r.score.rated && r.score.R).toBe(2);
  expect(r.trace.stages[1].actions.some((a) => a.moves.some((m) => /^y/.test(m)))).toBe(true);
  validateRouxRoute(e, r, assets);
});
it('bounds inert input, rejects missing formulas and does not execute accessors', () => {
  const r = route(),
    getter = structuredClone(r);
  let read = false;
  Object.defineProperty(getter, 'id', {
    get() {
      read = true;
      return r.id;
    },
  });
  expect(() => validateRouxRoute(e, getter, assets)).toThrow(/accessors/);
  expect(read).toBe(false);
  const cycle = structuredClone(r) as typeof r & { cycle?: unknown };
  cycle.cycle = cycle;
  expect(() => validateRouxRoute(e, cycle, assets)).toThrow(/container/);
  const tooMany = structuredClone(r);
  tooMany.trace.stages[1].actions = Array(1025).fill(tooMany.trace.stages[1].actions[0]);
  expect(() => validateRouxRoute(e, tooMany, assets)).toThrow();
  const missing = structuredClone(r);
  missing.formulas = {};
  expect(() => validateRouxRoute(e, missing, assets)).toThrow();
});
it('does not promote a replayable but longer witness to a proven minimum from claimed depth', () => {
  const input = prepareRouxInput(e, { kind: 'scramble', moves: [] });
  const forged = {
    status: 'proven-minimum' as const,
    minimum: 2,
    witness: ['U', "U'"] as const,
    proof: {
      coordinateVersion: 1 as const,
      moveSetVersion: 'roux-stm-v1' as const,
      completedDepth: 1,
      assetDigest: assets.blocks.digest,
    },
  };
  const checked = checkedFirstBlockEvidence(e, input, frame, forged, assets);
  expect(checked).toMatchObject({
    status: 'best-found',
    lowerBound: 0,
    upperBound: 2,
    completedDepth: -1,
  });
});
it('preserves real source checkpoints when same-layer reference actions combine', () => {
  const input = prepareRouxInput(e, { kind: 'scramble', moves: [] }),
    b = createRouxSearchBudget('normal', { now: () => 0 }),
    runtime = createAdvancedRouxRuntime(assets, frame.id),
    builder = createMethodTrace(e, input.initial, runtime);
  builder.beginStage('ar-position');
  const hold = rouxPositionAction(e, input.initial, frame);
  if (hold) builder.append(hold);
  builder.endStage();
  builder.beginStage('ar-first-block');
  builder.endStage();
  builder.beginStage('ar-second-block');
  builder.append(makeSecondBlockAction(e, builder.current, ['U'], frame));
  builder.append(makeSecondBlockAction(e, builder.current, ['U'], frame));
  builder.endStage();
  builder.beginStage('ar-cmll');
  builder.endStage();
  const lse = planAdvancedLse(
    e,
    builder.current,
    frame,
    assets.lse,
    assets.execution,
    b,
    'combined',
  );
  builder.beginStage('ar-eolr');
  let count = 0;
  for (const a of lse.actions) {
    if (count >= lse.eolrBoundary) break;
    builder.append(a);
    count += a.moves.length;
  }
  builder.endStage();
  builder.beginStage('ar-last-four');
  count = 0;
  for (const a of lse.actions) {
    if (count >= lse.eolrBoundary) builder.append(a);
    count += a.moves.length;
  }
  builder.endStage();
  const route = finalizeRouxRoute(e, input, frame, builder.finish(), assets, b, 'combined', {
      status: 'not-explored',
    }),
    joined = route.trace.stages[2].actions[0];
  expect(joined.moves).toEqual(['U2']);
  expect(joined.joined?.sources).toHaveLength(2);
  expect(joined.rouxAdvanced?.frameId).toBe(frame.id);
  validateRouxRoute(e, route, assets);
  const forged = structuredClone(route);
  forged.trace.stages[2].actions[0].rouxAdvanced!.goal = 'Made-up checkpoint';
  expect(() => validateRouxRoute(e, forged, assets)).toThrow(/metadata/);
});
it('admits inert archival CMLL snapshots independently of current display prose', () => {
  const r = structuredClone(route()),
    v = Object.values(r.formulas).find((a) => 'caseId' in a);
  expect(v).toBeDefined();
  v!.name = 'Archived teaching name';
  v!.effect = 'The original formula still solves this same corner class.';
  expect(validateRouxRoute(e, r, assets).id).toBe(r.id);
  const basic = withBasicLse(e, r, assets, createRouxSearchBudget('normal', { now: () => 0 }));
  expect(Object.values(basic.formulas).find((a) => 'caseId' in a)?.name).toBe(
    'Archived teaching name',
  );
  const bad = structuredClone(r);
  bad.trace.final.data.EDGES.orientation[0] ^= 1;
  expect(() =>
    withBasicLse(e, bad, assets, createRouxSearchBudget('normal', { now: () => 0 })),
  ).toThrow();
});
