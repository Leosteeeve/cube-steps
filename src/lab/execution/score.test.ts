import { expect, it } from 'vitest';
import type { CubeObservation, TeachingMove } from '../../core/types';
import { createLabBudget } from '../budget';
import { EXECUTION_CATALOG } from './profiles';
import { scoreExecution, rankExecutionPaths, visibilityEvidence } from './score';
import type { ExecutionPath, ExecutionSegment } from './types';
import { createCubeEngine } from '../../core/cube';

function paths(segments: ExecutionSegment[], initial?: readonly ExecutionPath[]) {
  const events = [
    ...scoreExecution(segments, EXECUTION_CATALOG, createLabBudget({ now: () => 0 }), initial),
  ];
  const final = [...events].reverse().find((e) => e.kind === 'paths');
  if (!final || final.kind !== 'paths') throw Error('No completed execution evaluation');
  return [...final.paths].sort(rankExecutionPaths);
}
const segment = (
  moves: TeachingMove[],
  phase: ExecutionSegment['phase'] = 'f2l',
): ExecutionSegment => ({ moves, phase });

it('counts turns, slices and actual rotations while excluding positioning and last layer', () => {
  const result = paths([
    segment(['R2', 'Rw2', 'M2', 'y2']),
    segment(['x2'], 'position'),
    segment(['U', 'R'], 'last-layer'),
  ])[0];
  expect(result.score.T).toBe(4);
  expect(result.score.R).toBe(1);
  expect(result.score.cost).toBe(
    result.score.T +
      2 * result.score.R +
      2 * result.score.G +
      3 * result.score.V +
      2 * result.score.A,
  );
  expect(result.score.events.filter((e) => e.kind === 'rotation')).toHaveLength(1);
});

it('retains terminal grips and can prefer a more expensive prefix for its cheaper continuation', () => {
  const zero = paths([])[0];
  const cheap = { ...zero, terminalGrip: 'l0r-1' };
  const moreExpensive = { ...zero, score: { ...zero.score, T: 1, cost: 1 } };
  const chosen = paths([segment(['U', 'U'])], [cheap, moreExpensive])[0];
  expect(chosen.score.cost).toBe(3);
  expect(chosen.score.G).toBe(0);
  expect(paths([segment(['R2'])]).length).toBeGreaterThan(1);
});

it('models incompatible wrist continuations with a real hand-reposition event', () => {
  const result = paths([segment(['R', 'R', 'R'])])[0];
  expect(result.score.G).toBeGreaterThan(0);
  for (const event of result.score.events.filter((e) => e.kind === 'hand-regrip')) {
    expect(event.fromGrip).not.toBe(event.toGrip);
    expect(event.rationale).toMatch(/hand|grip/i);
  }
});

it('does not double charge cube rotation handling as a hand regrip', () => {
  const result = paths([segment(['y2'])])[0];
  expect(result.score).toMatchObject({ T: 0, R: 1, G: 0, V: 0, A: 0, cost: 2 });
});

it('does not bill grip awkwardness again when the same boundary needs a hand reposition', () => {
  const catalog = structuredClone(EXECUTION_CATALOG);
  for (const transition of catalog.tokens.R!.transitions) transition.awkward = 'grip';
  const initial = [{ ...paths([])[0], terminalGrip: 'l0r1' }];
  const result = [
    ...scoreExecution([segment(['R'])], catalog, createLabBudget({ now: () => 0 }), initial),
  ].at(-1);
  if (!result || result.kind !== 'paths') throw Error('No paths');
  for (const path of result.paths) {
    expect(path.score.G).toBeGreaterThan(0);
    expect(path.score.A).toBe(0);
  }
});

it('returns unrated when a formula or primitive profile is missing', () => {
  expect(paths([{ ...segment(['R']), algorithmId: 'unknown' }])).toEqual([]);
  const catalog = structuredClone(EXECUTION_CATALOG);
  delete catalog.tokens.R;
  const events = [...scoreExecution([segment(['R'])], catalog, createLabBudget({ now: () => 0 }))];
  expect(events.at(-1)).toMatchObject({
    kind: 'paths',
    paths: [],
    unratedReason: expect.any(String),
  });
});

it('rewards a rotation that reveals a rear pair but penalizes an unnecessary rotation', async () => {
  const engine = await createCubeEngine();
  const before = engine.apply(engine.solved(), ['z2', "R'", 'U', 'R']);
  const obs = engine.observe(before);
  const corner = obs.corners.find((p) => p.slot === 'DBR')?.id ?? 'UBL';
  const target = { cornerId: corner, edgeId: 'BL', slot: 'BR' as const };
  // Use explicit sticker directions to isolate the recognition contract.
  const hidden = {
    ...obs,
    corners: [
      {
        id: 'c',
        slot: 'UBL',
        stickers: { U: 'white' as const, B: 'green' as const, L: 'orange' as const },
      },
    ],
    edges: [{ id: 'e', slot: 'BL', stickers: { B: 'green' as const, L: 'orange' as const } }],
  };
  const shown = {
    ...obs,
    corners: [
      {
        id: 'c',
        slot: 'UFR',
        stickers: { U: 'white' as const, F: 'green' as const, R: 'orange' as const },
      },
    ],
    edges: [{ id: 'e', slot: 'FR', stickers: { F: 'green' as const, R: 'orange' as const } }],
  };
  const recognition = (observation: CubeObservation) => ({
    observation,
    target: { ...target, cornerId: 'c', edgeId: 'e', slot: 'FR' as const },
    bottomColor: 'white' as const,
    mode: 'connected-pair' as const,
  });
  expect(visibilityEvidence(recognition(hidden)).visible).toBe(false);
  expect(visibilityEvidence(recognition(shown)).visible).toBe(true);
  const unrotated = paths([{ ...segment(['R', 'U', "R'"]), recognition: recognition(hidden) }])[0];
  const rotated = paths([
    segment(['y2']),
    { ...segment(['R', 'U', "R'"]), recognition: recognition(shown) },
  ])[0];
  expect(rotated.score.cost).toBeLessThan(unrotated.score.cost);
  const visible = paths([{ ...segment(['R', 'U', "R'"]), recognition: recognition(shown) }])[0];
  expect(rotated.score.cost).toBeGreaterThan(visible.score.cost);
});

it('breaks cost ties deterministically and produces the same boundary instructions twice', () => {
  const a = paths([segment(['R', 'U', "R'", 'U2'])]);
  const b = paths([segment(['R', 'U', "R'", 'U2'])]);
  expect(a).toEqual(b);
  expect(new Set(a.map((p) => p.terminalGrip)).size).toBe(a.length);
});
