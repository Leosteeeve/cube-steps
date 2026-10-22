import type { CubeEngine, CubeState, TeachingMove } from '../../core/types';
import {
  NOTATION_ENTRIES,
  notationToken,
  type NotationEntry,
  type NotationSelection,
} from './catalog';
export interface NotationDemo {
  selection: NotationSelection;
  entry: NotationEntry;
  move: TeachingMove;
  initial: CubeState;
  final: CubeState;
  setup: TeachingMove[];
}
function solvedHoldSetup(engine: CubeEngine, initial: CubeState): TeachingMove[] {
  const holds = [{ state: engine.solved(), moves: [] as TeachingMove[] }];
  for (let i = 0; i < holds.length; i++) {
    const hold = holds[i];
    if (engine.equals(hold.state, initial)) return hold.moves;
    for (const move of ['x', 'y'] as const) {
      const state = engine.apply(hold.state, [move]);
      if (!holds.some((h) => engine.equals(h.state, state)))
        holds.push({ state, moves: [...hold.moves, move] });
    }
  }
  throw Error('A notation demonstration must start from a solved holding orientation.');
}
export function buildNotationDemo(
  engine: CubeEngine,
  selection: NotationSelection,
  initial: CubeState = engine.solved(),
): NotationDemo {
  const move = notationToken(selection);
  return {
    selection: { ...selection },
    entry: NOTATION_ENTRIES.find((entry) => entry.base === selection.base)!,
    move,
    initial,
    final: engine.apply(initial, [move]),
    setup: solvedHoldSetup(engine, initial),
  };
}
