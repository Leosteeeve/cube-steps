import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine, TeachingMove } from '../../../core/types';
import { ROUX_FRAMES } from '../frames';
import { createRouxSearchBudget } from '../budget';
import { ROUX_EXECUTION_CATALOG, validateRouxExecutionCatalog } from './catalog';
import { scoreRouxExecution, improveBlockExecution } from './score';
import type { RouxExecutionCatalog, RouxExecutionSegment } from './types';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
const frame = ROUX_FRAMES[0];
const budget = () => createRouxSearchBudget('lab', { now: () => 0 });
function segments(chunks: readonly TeachingMove[][]): RouxExecutionSegment[] {
  let before = e.apply(e.solved(), frame.positioningMoves);
  return chunks.map((moves) => {
    const segment: RouxExecutionSegment = { before, moves, targets: [], phase: 'blocks' };
    before = e.apply(before, moves);
    return segment;
  });
}
function score(chunks: readonly TeachingMove[][], catalog = ROUX_EXECUTION_CATALOG) {
  return scoreRouxExecution(e, segments(chunks), frame, catalog, budget());
}
it('uses STM and the documented model units without charging positioning as block work', () => {
  const s = segments([['M', "M'", 'M2', 'Rw2']]);
  s.unshift({ before: e.solved(), moves: frame.positioningMoves, phase: 'position', targets: [] });
  const result = scoreRouxExecution(e, s, frame, ROUX_EXECUTION_CATALOG, budget());
  expect(result.rated).toBe(true);
  if (!result.rated) throw Error(result.reason);
  expect(result.T).toBe(4);
  expect(result.cost).toBe(result.T + 2 * result.R + 2 * result.G + 2 * result.V + 2 * result.A);
  expect(result.events.some((event) => event.profileId.startsWith('position/'))).toBe(true);
});
it('carries grips across the first-block to second-block boundary', () => {
  const compatible = score([['R'], ["R'"]]),
    awkward = score([['R'], ['R']]);
  if (!compatible.rated || !awkward.rated) throw Error('unrated');
  expect(awkward.G).toBeGreaterThan(compatible.G);
  expect(awkward.cost).toBeGreaterThan(compatible.cost);
  expect(score([['R', 'R']])).toEqual(awkward);
});
it('does not fabricate a missing grip or token profile', () => {
  const missing = {
    ...ROUX_EXECUTION_CATALOG,
    profiles: ROUX_EXECUTION_CATALOG.profiles.filter((p) => !p.moves.includes('M')),
  };
  expect(score([['M']], missing)).toMatchObject({ rated: false });
  const impossible: RouxExecutionCatalog = structuredClone(ROUX_EXECUTION_CATALOG);
  const p = impossible.profiles.find((p) => p.moves[0] === 'R')!;
  Object.assign(p, { exitGrip: 'nonexistent' });
  expect(score([['R']], impossible)).toMatchObject({ rated: false });
});
it('rejects false physical wrist transitions and invalid event boundaries', () => {
  const invalid = structuredClone(ROUX_EXECUTION_CATALOG);
  const p = invalid.profiles.find((p) => p.moves[0] === 'R')!;
  Object.assign(p, {
    exitGrip: p.entryGrip,
    events: p.events.map((event) => ({ ...event, toGrip: p.entryGrip })),
  });
  expect(() => validateRouxExecutionCatalog(invalid, budget())).toThrow(/transition/);
  const boundary = structuredClone(ROUX_EXECUTION_CATALOG);
  Object.assign(boundary.profiles[0].events[0], { boundary: 99 });
  expect(score([['R']], boundary)).toMatchObject({ rated: false });
});
it('records a real visibility check and rejects unknown physical targets or broken replay', () => {
  const s = segments([['U']]);
  const o = e.observe(s[0].before);
  s[0] = { ...s[0], targets: [o.edges.find((p) => p.slot === 'DB')!.id] };
  const result = scoreRouxExecution(e, s, frame, ROUX_EXECUTION_CATALOG, budget());
  expect(result).toMatchObject({ rated: true, V: 1, A: 0 });
  s[0] = { ...s[0], targets: ['fake'] };
  expect(scoreRouxExecution(e, s, frame, ROUX_EXECUTION_CATALOG, budget())).toMatchObject({
    rated: false,
  });
  const broken = segments([['R'], ['U']]);
  broken[1] = { ...broken[1], before: broken[0].before };
  expect(scoreRouxExecution(e, broken, frame, ROUX_EXECUTION_CATALOG, budget())).toMatchObject({
    rated: false,
  });
});
it('retains an explicit helpful rotation with the exact same final state and hold', () => {
  const s = segments([['B', 'U', "B'", 'U', 'B', 'U', "B'"]]);
  const before = scoreRouxExecution(e, s, frame, ROUX_EXECUTION_CATALOG, budget());
  const improved = improveBlockExecution(e, s, frame, ROUX_EXECUTION_CATALOG, budget());
  expect(before.rated && improved.score.rated).toBe(true);
  if (!before.rated || !improved.score.rated) throw Error('unrated');
  expect(improved.score.cost).toBeLessThan(before.cost);
  expect(improved.score.R).toBe(2);
  expect(
    e.equals(
      e.apply(s[0].before, s[0].moves),
      e.apply(
        s[0].before,
        improved.segments.flatMap((s) => s.moves),
      ),
    ),
  ).toBe(true);
  expect(improved.score.events.filter((ev) => ev.kind === 'rotation')).toHaveLength(2);
  for (const ev of improved.score.events.filter((ev) => ev.kind === 'rotation'))
    expect(
      improved.score.events.some(
        (other) => other.boundary === ev.boundary && other.kind === 'regrip',
      ),
    ).toBe(false);
});
it('charges profile validation and scoring to the shared budget', () => {
  const b = budget();
  scoreRouxExecution(e, segments([['R', 'U', "R'"]]), frame, ROUX_EXECUTION_CATALOG, b);
  expect(b.snapshot().operations).toBeGreaterThan(10);
  expect(() =>
    scoreRouxExecution(
      e,
      segments([['R']]),
      frame,
      ROUX_EXECUTION_CATALOG,
      createRouxSearchBudget('normal', { now: () => 0, maxOperations: 1 }),
    ),
  ).toThrow(/work-limit/);
});
it('covers all default primitive maneuvers with finite, sourced profiles', () => {
  for (const base of [
    'U',
    'D',
    'L',
    'R',
    'F',
    'B',
    'M',
    'E',
    'S',
    'Uw',
    'Dw',
    'Lw',
    'Rw',
    'Fw',
    'Bw',
  ])
    for (const suffix of ['', "'", '2'])
      expect(score([[`${base}${suffix}` as TeachingMove]])).toMatchObject({ rated: true, T: 1 });
  expect(ROUX_EXECUTION_CATALOG.profiles.every((p) => p.rationale && p.sourceRefs.length)).toBe(
    true,
  );
});
