import type { SolveTrace } from '../core/types';
import { combineAdjacentTurns } from '../methods/shared/connected-actions';

/** Preserve a real pedagogical checkpoint; do not pretend it survives a merged turn. */
export function rouxStageConnectionInfo(
  trace: SolveTrace,
  index: number,
): { text: string; leftTurns: number; rightTurns: number } | undefined {
  if (trace.method !== 'roux-advanced' || index < 2) return;
  const next = trace.stages[index];
  if (!next.actions.length) return;
  const previous = trace.stages
    .slice(1, index)
    .reverse()
    .find((s) => s.actions.length);
  if (!previous || !previous.checkpoint.passed) return;
  const left = previous.actions.flatMap((a) => a.moves),
    right = next.actions.flatMap((a) => a.moves);
  let leftTurns = 1,
    rightTurns = 1,
    connected = combineAdjacentTurns([left.at(-1)!, right[0]]);
  if (connected.length === 2) return;
  while (!connected.length && leftTurns < left.length && rightTurns < right.length) {
    const pair = combineAdjacentTurns([left[left.length - leftTurns - 1], right[rightTurns]]);
    if (pair.length === 2) break;
    leftTurns++;
    rightTurns++;
    connected = pair;
  }
  return {
    leftTurns,
    rightTurns,
    text: `Stage connection: ${left.slice(-leftTurns).join(' ')} finishes the previous stage and ${right.slice(0, rightTurns).join(' ')} starts this one. Pause between them to inspect the completed checkpoint. Once you can recognize it, connect them as ${connected.length ? connected.join(' ') : 'no turn'} in continuous practice; that skips the displayed intermediate check. This teaching replay keeps the two stage moves separate.`,
  };
}
export const rouxStageConnection = (trace: SolveTrace, index: number) =>
  rouxStageConnectionInfo(trace, index)?.text;
