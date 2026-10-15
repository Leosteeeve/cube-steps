import type { Color, CubeEngine, CubeState, Face, TeachingMove } from '../core/types';
import { CENTER_SLOTS, COLORS, CORNER_SLOTS, EDGE_SLOTS } from '../core/observations';
import { copyCubeState } from '../core/state';
import type { LabHold, LabInput } from './types';

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
function holdingFrames(engine: CubeEngine) {
  let cached = orientations.get(engine);
  if (cached) return cached;
  const queue = [{ state: engine.solved(), moves: [] as TeachingMove[] }];
  const key = (state: CubeState) => state.data.CENTERS.pieces.join(',');
  const seen = new Set([key(queue[0].state)]);
  for (let index = 0; index < queue.length; index++)
    for (const move of ROTATIONS) {
      const next = engine.apply(queue[index].state, [move]);
      if (!seen.has(key(next))) {
        seen.add(key(next));
        queue.push({ state: next, moves: [...queue[index].moves, move] });
      }
    }
  cached = queue;
  orientations.set(engine, cached);
  return cached;
}

function relabeler(colorMap: Record<Color, Color>) {
  const ids = new Map<string, string>();
  const tables = Object.entries({
    EDGES: EDGE_SLOTS,
    CORNERS: CORNER_SLOTS,
    CENTERS: CENTER_SLOTS,
  }).map(([orbit, names]) => {
    const mapping = names.map((name) => {
      const mapped = [...name].map((face) => colorMap[COLORS[face as Face]]);
      const piece = names.findIndex((candidate) =>
        [...candidate].every((face) => mapped.includes(COLORS[face as Face])),
      );
      if (piece < 0) throw Error('The requested frame does not preserve physical pieces.');
      const original = [...names[piece]].map((face) => COLORS[face as Face]);
      const delta = original.findIndex((_, shift) =>
        mapped.every((color, i) => color === original[(i + shift) % original.length]),
      );
      if (delta < 0) throw Error('The requested frame mirrors a physical corner.');
      ids.set(name, names[piece]);
      return { piece, delta, size: original.length };
    });
    return { orbit, mapping };
  });
  return {
    id(value: string): string {
      const mapped = ids.get(value);
      if (!mapped) throw Error('Unknown physical piece identity: ' + value);
      return mapped;
    },
    state(state: CubeState): CubeState {
      const data = { ...state.data };
      for (const { orbit, mapping } of tables) {
        const source = state.data[orbit];
        data[orbit] = {
          ...source,
          pieces: source.pieces.map((piece) => mapping[piece].piece),
          orientation: source.pieces.map((piece, slot) =>
            orbit === 'CENTERS'
              ? source.orientation[slot]
              : (source.orientation[slot] + mapping[piece].delta) % mapping[piece].size,
          ),
        };
      }
      return copyCubeState(data);
    },
  };
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
  const forward = relabeler(colors),
    reverse = relabeler(inverse);
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
