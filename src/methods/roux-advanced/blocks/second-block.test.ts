import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { ROUX_FRAMES, createRouxFrameMap } from '../frames';
import { createRouxSearchBudget } from '../budget';
import {
  advancedRouxFixture,
  ADVANCED_ROUX_TRADEOFF,
} from '../../../../tests/fixtures/advanced-roux';
import { prepareRouxInput } from '../input';
import { searchFirstBlockReference } from './reference';
import { assertAdvancedDrafts } from '../../../../tests/helpers/advanced-roux';
import { loadTestRouxAssets } from '../../../../tests/helpers/roux';
import { createRouxBudget } from '../../roux/budget';
import { planSecondBlock } from '../../roux/blocks/second-block';
import { describeBlockCandidate } from './candidates';
import { validateBlockSearchBytes, type BlockSearchAssets } from './distance';
import { continueSecondBlock, selectContinuationFrontier } from './second-block';
import { blockCompleteInFrame } from '../predicates';
import { makeSecondBlockAction, twoBlockKey } from './continuation';
import type { TwoBlockCandidate } from '../types';
let e: CubeEngine, assets: BlockSearchAssets;
beforeAll(async () => {
  e = await createCubeEngine();
  assets = await validateBlockSearchBytes(
    new Uint8Array(await readFile('src/methods/roux-advanced/data/block-distance.bin')),
  );
});
const frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
function collect(moves: readonly TeachingMove[], count = 2) {
  const state = e.apply(advancedRouxFixture(e, 'solved'), moves),
    first = describeBlockCandidate(e, state, frame, []);
  const run = continueSecondBlock(
    e,
    first,
    frame,
    assets,
    createRouxSearchBudget('normal', { now: () => 0, maxOperations: 100000 }),
  );
  const found: TwoBlockCandidate[] = [];
  for (const event of run)
    if (event.kind === 'blocks') {
      found.push(event.candidate);
      if (found.length === count) break;
    }
  return { state, found };
}
it('pair preparation beats a forced DR-first route on the R U fixture', async () => {
  const { state, found } = collect(['R', 'U']);
  expect(found.length).toBeGreaterThan(0);
  const old = planSecondBlock(
    e,
    state,
    (await loadTestRouxAssets()).blockPolicies,
    createRouxBudget(),
  );
  expect(old.ok).toBe(true);
  if (!old.ok) throw Error(old.message);
  const best = found.reduce((a, b) => (a.secondTurns < b.secondTurns ? a : b));
  expect(best.secondTurns).toBeLessThan(old.actions.flatMap((a) => a.moves).length);
  expect(best.secondMoves).toEqual(["U'", "R'"]);
  expect(e.equals(assertAdvancedDrafts(e, state, best.actions, frame), best.state)).toBe(true);
});
it.each([
  ['R', "M'", 'U', "R'"],
  ['R2', 'U2', "R'"],
  ['M', 'R', 'U2', "R'"],
] as TeachingMove[][])('replays an M-assisted or rear-block continuation from %j', (...moves) => {
  const { state, found } = collect(moves, 1);
  expect(found).toHaveLength(1);
  const route = found[0];
  expect(blockCompleteInFrame(e, route.state, frame, 'left')).toBe(true);
  expect(blockCompleteInFrame(e, route.state, frame, 'right')).toBe(true);
  expect(e.equals(assertAdvancedDrafts(e, state, route.actions, frame), route.state)).toBe(true);
  expect(twoBlockKey(route)).toContain(frame.id);
});
it('checks endpoint restoration for a maneuver that temporarily moves first-block pieces', () => {
  const before = advancedRouxFixture(e, 'solved'),
    moves: TeachingMove[] = ["F'", 'U', 'F'];
  expect(blockCompleteInFrame(e, e.apply(before, [moves[0]]), frame, 'left')).toBe(false);
  const after = e.apply(before, moves);
  expect(blockCompleteInFrame(e, after, frame, 'left')).toBe(true);
  const action = makeSecondBlockAction(e, before, moves, frame);
  expect(action.rouxAdvanced.protection).toBe('endpoint');
  expect(e.equals(assertAdvancedDrafts(e, before, [action], frame), after)).toBe(true);
  expect(() => makeSecondBlockAction(e, before, ['F'], frame)).toThrow(/restore/);
});
it('a failed continuation cannot advertise a first block as two complete blocks', () => {
  const state = e.apply(advancedRouxFixture(e, 'solved'), ['R', 'U', 'R2']);
  const first = describeBlockCandidate(e, state, frame, []);
  const events = [
    ...continueSecondBlock(
      e,
      first,
      frame,
      assets,
      createRouxSearchBudget('normal', { now: () => 0, maxOperations: 1 }),
    ),
  ];
  expect(events.filter((event) => event.kind === 'blocks')).toEqual([]);
});
it('enforces 16/32 unique frontier entries and replaces an inferior duplicate', () => {
  const nodes = Array.from({ length: 80 }, (_, i) => ({
    key: String(i),
    priority: i,
    ready: 0,
    mask: String(i % 5),
  }));
  const duplicate = { ...nodes[0], priority: -1 };
  for (const cap of [16, 32] as const) {
    const kept = selectContinuationFrontier([...nodes, duplicate], cap);
    expect(kept).toHaveLength(cap);
    expect(new Set(kept.map((n) => n.key)).size).toBe(cap);
    expect(kept.find((n) => n.key === '0')).toBe(duplicate);
  }
});
it('retains replayable checkpoint functions after the search budget stops', () => {
  const state = e.apply(advancedRouxFixture(e, 'solved'), ['R', 'U']);
  const first = describeBlockCandidate(e, state, frame, []),
    budget = createRouxSearchBudget('normal', { now: () => 0, maxOperations: 10000 });
  const run = continueSecondBlock(e, first, frame, assets, budget);
  let step = run.next();
  while (!step.done && step.value.kind !== 'blocks') step = run.next();
  if (step.done || step.value.kind !== 'blocks') throw Error('No complete route');
  const route = step.value.candidate;
  run.return();
  budget.charge('expand', budget.remaining().operations);
  expect(() => budget.charge('expand')).toThrow();
  expect(e.equals(assertAdvancedDrafts(e, state, route.actions, frame), route.state)).toBe(true);
});
it('retains a d+1 first block whose recorded combined continuation is shorter', () => {
  const fixture = ADVANCED_ROUX_TRADEOFF,
    input = prepareRouxInput(e, { kind: 'scramble', moves: fixture.scramble });
  const held = e.apply(input.initial, frame.positioningMoves);
  const proof = searchFirstBlockReference(
    e,
    input,
    frame,
    assets,
    createRouxSearchBudget('normal', { now: () => 0 }),
  );
  let final = proof.next();
  while (!final.done) final = proof.next();
  expect(final.value).toMatchObject({ status: 'proven-minimum', minimum: 1 });
  const completions = [fixture.shortestFirst, fixture.connectedFirst].map((moves) => {
    const first = describeBlockCandidate(e, held, frame, moves);
    for (const event of continueSecondBlock(
      e,
      first,
      frame,
      assets,
      createRouxSearchBudget('normal', { now: () => 0, maxOperations: 30000 }),
    ))
      if (event.kind === 'blocks') return event.candidate;
    throw Error('Missing recorded continuation');
  });
  expect(completions.map((c) => c.first.turns)).toEqual([1, 2]);
  expect(completions.map((c) => c.first.turns + c.secondTurns)).toEqual([5, 3]);
  for (const c of completions)
    expect(e.equals(assertAdvancedDrafts(e, held, c.actions, frame), c.state)).toBe(true);
});
it('maps second-block piece identities and checkpoints correctly in all eight frames', () => {
  for (const f of ROUX_FRAMES) {
    const state = e.apply(e.apply(e.solved(), f.positioningMoves), ['R', 'U']);
    const first = describeBlockCandidate(e, state, f, []);
    let found = false;
    for (const event of continueSecondBlock(
      e,
      first,
      f,
      assets,
      createRouxSearchBudget('normal', { now: () => 0, maxOperations: 20000 }),
    ))
      if (event.kind === 'blocks') {
        expect(
          e.equals(
            assertAdvancedDrafts(e, state, event.candidate.actions, f),
            event.candidate.state,
          ),
        ).toBe(true);
        found = true;
        break;
      }
    expect(found, f.id).toBe(true);
  }
});
