import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { rouxReferenceState } from '../frame';
import {
  encodeLse,
  decodeLse,
  permutationParity,
  LSE_SLOTS,
  type LseCoordinate,
} from './coordinates';
export type LseGoal = 'orientation' | 'left-right' | 'solved';
export const LSE_GENERATORS = ['U', "U'", 'U2', 'M', "M'", 'M2'] as const;
export interface LseTransform {
  sources: number[];
  flips: number[];
  phase: number;
  offset: number;
}
export interface LseModel {
  step(c: LseCoordinate, moves: readonly TeachingMove[]): LseCoordinate;
  transform(moves: readonly TeachingMove[]): LseTransform;
  goal(c: LseCoordinate, goal: LseGoal): boolean;
  badSlots(c: LseCoordinate): number[] | null;
}
const models = new WeakMap<CubeEngine, LseModel>();
export function applyLseTransform(c: LseCoordinate, t: LseTransform): LseCoordinate {
  return {
    edges: t.sources.map((s) => c.edges[s]),
    flips: t.sources.map((s, i) => c.flips[s] ^ t.flips[i]),
    phase: (c.phase + t.phase) % 4,
    offset: (c.offset + t.offset) % 4,
  };
}
export function createLseModel(engine: CubeEngine): LseModel {
  const existing = models.get(engine);
  if (existing) return existing;
  const transforms = new Map<string, LseTransform>(),
    reference = rouxReferenceState(engine);
  const identity: LseCoordinate = {
    edges: [0, 1, 2, 3, 4, 5],
    flips: [0, 0, 0, 0, 0, 0],
    phase: 0,
    offset: 0,
  };
  const transform = (moves: readonly TeachingMove[]) => {
    const key = moves.join(' ');
    let t = transforms.get(key);
    if (t) return t;
    if (moves.some((m) => !LSE_GENERATORS.includes(m as (typeof LSE_GENERATORS)[number])))
      throw Error('LSE maneuvers use M and U only.');
    const c = encodeLse(engine, engine.apply(reference, moves));
    if (!c) throw Error('LSE move left its legal domain.');
    t = { sources: c.edges, flips: c.flips, phase: c.phase, offset: c.offset };
    transforms.set(key, t);
    return t;
  };
  const good = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => [false, false]));
  for (let slot = 0; slot < 6; slot++)
    for (let edge = 0; edge < 6; edge++)
      for (let flip = 0; flip < 2; flip++) {
        const c = structuredClone(identity);
        [c.edges[slot], c.edges[edge]] = [c.edges[edge], c.edges[slot]];
        c.offset = permutationParity(c.edges);
        c.flips[slot] = flip;
        c.flips[(slot + 1) % 6] = flip;
        const state = decodeLse(engine, c),
          p = engine
            .observe(state)
            .edges.find(
              (p) =>
                p.id ===
                engine
                  .observe(reference)
                  .edges.find((p) => p.slot === ['UF', 'UR', 'UB', 'UL', 'DF', 'DB'][edge])!.id,
            )!;
        good[slot][edge][flip] = [p.stickers.U, p.stickers.D].some(
          (color) => color === 'white' || color === 'yellow',
        );
      }
  const badSlots = (c: LseCoordinate) =>
    c.phase % 2
      ? null
      : c.edges.flatMap((edge, slot) => (good[slot][edge][c.flips[slot]] ? [] : [slot]));
  const targetSlots = Array.from(
    { length: 4 },
    (_, offset) => applyLseTransform(identity, transform(Array(offset).fill('U'))).edges,
  );
  const goal = (c: LseCoordinate, target: LseGoal) => {
    if (target === 'solved')
      return (
        c.phase === 0 &&
        c.offset === 0 &&
        c.edges.every((e, i) => e === i) &&
        c.flips.every((f) => f === 0)
      );
    const bad = badSlots(c);
    if (!bad || bad.length) return false;
    return (
      target === 'orientation' ||
      [1, 3].every((id) => c.edges.indexOf(id) === targetSlots[c.offset].indexOf(id))
    );
  };
  const model = {
    step: (c: LseCoordinate, moves: readonly TeachingMove[]) =>
      applyLseTransform(c, transform(moves)),
    transform,
    goal,
    badSlots,
  };
  models.set(engine, model);
  return model;
}
export function lseGoalReached(engine: CubeEngine, state: CubeState, goal: LseGoal): boolean {
  const c = encodeLse(engine, state);
  return c !== null && createLseModel(engine).goal(c, goal);
}
