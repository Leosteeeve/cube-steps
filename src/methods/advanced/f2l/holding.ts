import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import type { ActionInput } from '../../shared/trace';
import type { F2LTarget } from './types';
import { observeF2LPairs } from '../../cfop/f2l-cases';
export function describeF2LHold(
  engine: CubeEngine,
  before: CubeState,
  after: CubeState,
  target: F2LTarget,
) {
  const previous = engine.observe(before),
    next = engine.observe(after);
  const pair = observeF2LPairs(engine, after).find(
    (p) => p.cornerId === target.cornerId && p.edgeId === target.edgeId,
  )!;
  const corner = next.corners.find((p) => p.id === target.cornerId)!,
    edge = next.edges.find((p) => p.id === target.edgeId)!;
  return {
    recognition: `The ${previous.centers.F} center is in front. Target corner ${target.cornerId}; target edge ${target.edgeId}.`,
    explanation: `Turn the whole cube to use the ${pair.slot} working slot with ${next.centers.F} in front. Keep white down. Find the target corner at ${corner.slot} and edge at ${edge.slot} before continuing.`,
  };
}
export function enumerateF2LHolds(
  engine: CubeEngine,
  state: CubeState,
  target: F2LTarget,
): { state: CubeState; target: F2LTarget; actions: ActionInput[] }[] {
  return ([[], ['y'], ["y'"], ['y2']] as TeachingMove[][]).map((moves) => {
    const held = moves.length ? engine.apply(state, moves) : state;
    const pair = observeF2LPairs(engine, held).find(
      (p) => p.cornerId === target.cornerId && p.edgeId === target.edgeId,
    );
    if (!pair) throw Error('Missing F2L target after regrip.');
    const nextTarget = {
      cornerId: pair.cornerId,
      edgeId: pair.edgeId,
      slot: pair.slot as F2LTarget['slot'],
    };
    const actions: ActionInput[] = moves.length
      ? [
          {
            kind: 'regrip',
            ruleId: 'advanced-f2l-regrip',
            caseId: 'f2l-working-hold',
            targets: [target.cornerId, target.edgeId],
            moves,
            ...describeF2LHold(engine, state, held, target),
          },
        ]
      : [];
    return { state: held, target: nextTarget, actions };
  });
}
