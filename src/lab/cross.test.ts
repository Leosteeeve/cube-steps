import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, Color } from '../core/types';
import { extractCross, rankCross } from '../methods/advanced/cross/coordinates';
import { createLabFrame } from './frames';
import { prepareLabInput, fingerprintLabState } from './input';
import { createLabBudget } from './budget';
import { crossMinimum, createCrossQuota, exploreCross } from './cross';
import type { CrossCandidate } from './cross';
import { seededScramble } from '../../tests/fixtures/lbl-cases';

let engine: CubeEngine;
const table = {
  version: 1 as const,
  goalIndex: 69760,
  distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
};
beforeAll(async () => {
  engine = await createCubeEngine();
});

it('counts half turns as one and gives the same minimum in four front holds', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: ['R2'] });
  for (const front of ['green', 'red', 'blue', 'orange'] as Color[]) {
    const frame = createLabFrame(engine, input, { bottom: 'white', front });
    expect(crossMinimum(engine, input, frame, table)).toBe(1);
  }
});

it('keeps distinct full states even when their solved cross coordinates are identical', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] });
  const frame = createLabFrame(engine, input, { bottom: 'white', front: 'green' });
  const events = [
    ...exploreCross(engine, input, frame, table, createLabBudget({ now: () => 0 }), {
      extraLengths: [0, 1, 2],
    }),
  ];
  const candidates = events.filter((e) => e.kind === 'cross').map((e) => e.candidate);
  expect(candidates[0].moves).toEqual([]);
  const u = candidates.find((c) => c.moves.join(' ') === 'U')!,
    prime = candidates.find((c) => c.moves.join(' ') === "U'")!;
  expect(u).toBeDefined();
  expect(prime).toBeDefined();
  expect(fingerprintLabState(u.after)).not.toBe(fingerprintLabState(prime.after));
  for (const c of candidates) {
    expect(c.length).toBeLessThanOrEqual(c.minimum + 2);
    expect(rankCross(extractCross(engine, frame.toCanonical(c.after)))).toBe(table.goalIndex);
  }
  // R then R' temporarily moves away from an already solved cross.
  expect(candidates.some((c) => c.moves.join(' ') === "R R'")).toBe(true);
  expect(() => [
    ...exploreCross(engine, input, frame, table, createLabBudget(), { extraLengths: [3] as never }),
  ]).toThrow();
});

it('finds physically replayable shortest seeds for all colors using the same work budget', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: seededScramble(9) });
  const budget = createLabBudget({ now: () => 0 }),
    quota = createCrossQuota();
  const holds = [
    ['white', 'green'],
    ['yellow', 'green'],
    ['red', 'green'],
    ['orange', 'green'],
    ['green', 'white'],
    ['blue', 'white'],
  ] as const;
  let previous = 0;
  for (const [bottom, front] of holds) {
    const frame = createLabFrame(engine, input, { bottom, front });
    const iterator = exploreCross(engine, input, frame, table, budget, {
      extraLengths: [0],
      maxCompletions: 1,
      quota,
    });
    let candidate: CrossCandidate | undefined;
    for (const event of iterator) if (event.kind === 'cross') candidate = event.candidate;
    expect(candidate).toBeDefined();
    expect(candidate!.length).toBe(candidate!.minimum);
    expect(
      engine.equals(
        candidate!.after,
        engine.apply(engine.apply(input.initial, frame.positioningMoves), candidate!.moves),
      ),
    ).toBe(true);
    expect(budget.snapshot().operations).toBeGreaterThan(previous);
    previous = budget.snapshot().operations;
  }
  expect(budget.snapshot().entries).toBe(0);
});

it('shares a per-bottom completion quota across holds and yields unsuccessful work for cancellation', () => {
  const input = prepareLabInput(engine, { kind: 'scramble', moves: [] });
  const quota = createCrossQuota(2),
    budget = createLabBudget({ now: () => 0 });
  const first = [
    ...exploreCross(
      engine,
      input,
      createLabFrame(engine, input, { bottom: 'white', front: 'green' }),
      table,
      budget,
      { quota },
    ),
  ];
  const second = [
    ...exploreCross(
      engine,
      input,
      createLabFrame(engine, input, { bottom: 'white', front: 'red' }),
      table,
      budget,
      { quota },
    ),
  ];
  expect(first.filter((e) => e.kind === 'cross')).toHaveLength(2);
  expect(second.filter((e) => e.kind === 'cross')).toHaveLength(0);
  expect(first.some((e) => e.kind === 'work')).toBe(true);
  const limited = createLabBudget({ now: () => 0, maxOperations: 1 });
  expect(() => [
    ...exploreCross(
      engine,
      input,
      createLabFrame(engine, input, { bottom: 'white', front: 'green' }),
      table,
      limited,
    ),
  ]).toThrow(/work-limit/);
  expect(limited.snapshot().entries).toBe(0);
});
