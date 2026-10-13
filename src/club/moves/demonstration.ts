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
}
export function buildNotationDemo(engine: CubeEngine, selection: NotationSelection): NotationDemo {
  const move = notationToken(selection),
    initial = engine.solved();
  return {
    selection: { ...selection },
    entry: NOTATION_ENTRIES.find((entry) => entry.base === selection.base)!,
    move,
    initial,
    final: engine.apply(initial, [move]),
  };
}
