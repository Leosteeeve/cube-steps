import { beforeAll, expect, it } from 'vitest';
import { rouxLabContext, fixtureRouxRoute } from '../../tests/helpers/roux-lab-route';
import { pinRouxComparison } from './comparison';
import { initialRouxLabSession, reduceRouxLabSession } from '../club/roux-lab/session';
import type { RouxRoute } from './types';
import { prepareRouxPlayback } from './playback';
import { withBasicLse } from '../methods/roux-advanced/complete';
import { validateRouxRoute } from '../methods/roux-advanced/validate';
import { createRouxSearchBudget } from '../methods/roux-advanced/budget';
const stmCount = (moves: readonly string[]) => moves.filter((m) => !/^[xyz]/.test(m)).length;
let context: Awaited<ReturnType<typeof rouxLabContext>>, a: RouxRoute, b: RouxRoute;
beforeAll(async () => {
  context = await rouxLabContext();
  a = fixtureRouxRoute(context.engine, context.assets);
  b = fixtureRouxRoute(context.engine, context.assets, 'yellow-red');
});
it('pins immutable A/B identity independent of recommendation rank', () => {
  const comparison = pinRouxComparison(a, b);
  expect(comparison.A).toBe(a);
  expect(comparison.B).toBe(b);
  expect(Object.isFrozen(comparison)).toBe(true);
  const ranked = [b, a];
  ranked.reverse();
  expect(comparison.A.id).toBe(a.id);
  expect(pinRouxComparison(a, b).id).toBe(comparison.id);
  expect(() => pinRouxComparison(a, a)).toThrow();
  expect(() => pinRouxComparison(a, structuredClone(b))).toThrow(/verified/i);
  const foreign = fixtureRouxRoute(context.engine, context.assets, 'yellow-red', ['F']);
  expect(() => pinRouxComparison(a, foreign)).toThrow(/same input/i);
});
it('counts only block turns and gives basic LSE its own route', () => {
  const prepared = prepareRouxPlayback(context.engine, a, context.assets),
    moves = prepared.timeline.moves;
  expect(stmCount(moves.slice(a.boundaries.firstStart, a.boundaries.firstEnd))).toBe(
    a.counts.first,
  );
  expect(stmCount(moves.slice(a.boundaries.firstEnd, a.boundaries.secondEnd))).toBe(
    a.counts.second,
  );
  expect(stmCount(moves.slice(a.boundaries.firstStart, a.boundaries.secondEnd))).toBe(
    a.counts.combined,
  );
  const basic = withBasicLse(
    context.engine,
    a,
    context.assets,
    createRouxSearchBudget('lab', { now: () => 0 }),
  );
  expect(basic.id).not.toBe(a.id);
  expect(basic.counts).toEqual(a.counts);
  expect(a.lseMode).toBe('combined');
});
it('keeps fixed comparison slots when the live rank or selected playback changes', () => {
  let s = reduceRouxLabSession(initialRouxLabSession(), { type: 'start', input: a.input });
  for (const route of [a, b]) s = reduceRouxLabSession(s, { kind: 'candidate', route });
  s = reduceRouxLabSession(s, { type: 'compare', id: a.id });
  s = reduceRouxLabSession(s, { type: 'compare', id: b.id });
  const pinned = s.comparison;
  s = reduceRouxLabSession(s, { kind: 'candidate', route: a });
  s = reduceRouxLabSession(s, { type: 'select', id: b.id });
  expect(s.comparison).toBe(pinned);
  expect(s.comparison?.A).toBe(a);
  expect(s.comparison?.B).toBe(b);
  expect(s.selectedId).toBe(b.id);
});
it('adopts an explicitly requested verified basic route even when the shortlist is full', () => {
  let s = reduceRouxLabSession(initialRouxLabSession(), { type: 'start', input: a.input });
  for (const route of [
    a,
    b,
    fixtureRouxRoute(context.engine, context.assets, 'white-red'),
    fixtureRouxRoute(context.engine, context.assets, 'yellow-blue'),
  ])
    s = reduceRouxLabSession(s, { kind: 'candidate', route });
  const basic = validateRouxRoute(
    context.engine,
    withBasicLse(
      context.engine,
      a,
      context.assets,
      createRouxSearchBudget('lab', { now: () => 0 }),
    ),
    context.assets,
  );
  s = reduceRouxLabSession(s, { type: 'adopt', route: basic });
  expect(s.selectedId).toBe(basic.id);
  expect(s.routes).toContain(basic);
  expect(s.routes.length).toBeLessThanOrEqual(4);
});
