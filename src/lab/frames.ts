import type { Color, CubeEngine, CubeState, Face, TeachingMove } from '../core/types';
import { CENTER_SLOTS } from '../core/observations';
import { createColorRelabeler } from '../core/color-relabel';
import type { LabHold, LabInput } from './types';
import { LAB_WORK, meterLabEngine, type LabBudget, type LabWork } from './budget';

export interface LabFrame {
  hold: LabHold;
  positioningMoves: readonly TeachingMove[];
  toCanonical(state: CubeState): CubeState;
  toPhysical(state: CubeState): CubeState;
  toPhysicalMoves(moves: readonly TeachingMove[]): readonly TeachingMove[];
  physicalPieceId(canonicalId: string): string;
  canonicalPieceId(physicalId: string): string;
  physicalColor(canonical: Color): Color;
  canonicalColor(physical: Color): Color;
}

const ROTATIONS: readonly TeachingMove[] = ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2'];
const orientations = new WeakMap<
  CubeEngine,
  readonly { state: CubeState; moves: readonly TeachingMove[] }[]
>();
function* holdingFrameSteps(engine: CubeEngine) {
  let cached = orientations.get(engine);
  if (cached) return cached;
  const queue = [{ state: engine.solved(), moves: [] as TeachingMove[] }];
  const key = (state: CubeState) => state.data.CENTERS.pieces.join(',');
  const seen = new Set([key(queue[0].state)]);
  for (let index = 0; index < queue.length; index++)
    for (const move of ROTATIONS) {
      const next = engine.apply(queue[index].state, [move]);
      yield LAB_WORK;
      if (!seen.has(key(next))) {
        seen.add(key(next));
        queue.push({ state: next, moves: [...queue[index].moves, move] });
      }
    }
  cached = queue;
  orientations.set(engine, cached);
  return cached;
}
function holdingFrames(engine: CubeEngine) {
  const steps = holdingFrameSteps(engine);
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
  }
}

/** Warm the finite orientation table cooperatively before the small frame lookup. */
export function* createLabFrameSteps(
  engine: CubeEngine,
  input: LabInput,
  hold: LabHold,
  budget: LabBudget,
): Generator<LabWork, LabFrame> {
  const metered = meterLabEngine(engine, budget);
  yield* holdingFrameSteps(metered);
  budget.charge('expand');
  yield LAB_WORK;
  return createLabFrame(metered, input, hold);
}

export function createLabFrame(engine: CubeEngine, input: LabInput, hold: LabHold): LabFrame {
  const frames = holdingFrames(engine);
  // User inputs currently enter in the standard hold. Still match the actual
  // centers here so that positioning is explicit rather than a hidden relabel.
  const positioning = frames.find(({ moves }) => {
    const centers = engine.observe(engine.apply(input.initial, moves)).centers;
    return centers.D === hold.bottom && centers.F === hold.front;
  });
  if (!positioning) throw Error('Choose adjacent, different bottom and front colors.');
  const canonical = frames.find(({ state }) => {
    const centers = engine.observe(state).centers;
    return centers.D === 'white' && centers.F === 'green';
  })!;
  const physicalCenters = engine.observe(engine.apply(input.initial, positioning.moves)).centers;
  const canonicalCenters = engine.observe(canonical.state).centers;
  const colors = Object.fromEntries(
    CENTER_SLOTS.map((face) => [physicalCenters[face], canonicalCenters[face]]),
  ) as Record<Color, Color>;
  const inverse = Object.fromEntries(Object.entries(colors).map(([a, b]) => [b, a])) as Record<
    Color,
    Color
  >;
  const forward = createColorRelabeler(colors),
    reverse = createColorRelabeler(inverse);
  return Object.freeze({
    hold: Object.freeze({ ...hold }),
    positioningMoves: Object.freeze([...positioning.moves]),
    toCanonical: forward.state,
    toPhysical: reverse.state,
    // Relabeling changes the virtual identity, never spatial axes. Real x/y/z
    // moves therefore remain explicit and face/wide/slice notation is unchanged.
    toPhysicalMoves: (moves: readonly TeachingMove[]) => Object.freeze([...moves]),
    physicalPieceId: reverse.id,
    canonicalPieceId: forward.id,
    physicalColor: (color: Color) => inverse[color],
    canonicalColor: (color: Color) => colors[color],
  });
}
