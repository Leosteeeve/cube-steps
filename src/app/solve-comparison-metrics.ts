import type { SolveTrace } from '../core/types';
import { flattenTrace } from '../methods/shared/trace';

export function summarizeTraceMoves(trace: SolveTrace) {
  let turns = 0;
  let slices = 0;
  let rotations = 0;
  for (const move of flattenTrace(trace).moves) {
    if (/^[xyz]/.test(move)) {
      rotations++;
    } else {
      turns++;
      if (/^[MES]/.test(move)) slices++;
    }
  }
  return { turns, slices, rotations };
}
