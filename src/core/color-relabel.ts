import type { Color, CubeState, Face } from './types';
import { CENTER_SLOTS, COLORS, CORNER_SLOTS, EDGE_SLOTS } from './observations';
import { copyCubeState } from './state';
export function createColorRelabeler(colorMap: Record<Color, Color>) {
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
