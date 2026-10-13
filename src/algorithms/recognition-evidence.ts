import type { CubeEngine, CubeState } from '../core/types';
import type { AlgorithmCase } from './types';

// Case guidance is orientation-independent. Position claims always describe
// this snapshot, including the grip before a preparation or after a regrip.
export function describeCaseRecognition(
  engine: CubeEngine,
  state: CubeState,
  entry: AlgorithmCase,
  targets: readonly string[] = [],
): string {
  const observed = engine.observe(state);
  const pieces = [...observed.edges, ...observed.corners].filter((piece) =>
    entry.family === 'f2l' ? targets.includes(piece.id) : piece.slot.startsWith('U'),
  );
  const evidence = pieces.flatMap((piece) =>
    Object.entries(piece.stickers)
      .filter(([face, color]) =>
        entry.family === 'oll' ? color === 'yellow' : entry.family === 'pll' ? face !== 'U' : true,
      )
      .map(([face, color]) => `${piece.slot}: ${color} on ${face}`),
  );
  return `${entry.recognition} Current grip: ${evidence.join('; ')}.`;
}
