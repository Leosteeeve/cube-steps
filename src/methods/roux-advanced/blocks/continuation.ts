import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { fingerprintLabState } from '../../../lab/input';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { blockTargets } from '../../roux/predicates';
import { ROUX_BLOCK_MANEUVERS } from '../../roux/blocks/catalog';
import { createRouxFrameMap } from '../frames';
import { blockCompleteInFrame, observeAdvancedFrame } from '../predicates';
import type {
  AdvancedRouxActionDraft,
  BlockCandidate,
  RouxFrame,
  TwoBlockCandidate,
} from '../types';
export const twoBlockKey = (candidate: TwoBlockCandidate) =>
  `${candidate.first.frameId}:${fingerprintLabState(candidate.state)}:${candidate.secondMoves.at(-1) ?? ''}`;
function describe(e: CubeEngine, state: CubeState, ids: readonly string[]): string {
  const o = e.observe(state);
  return [...o.edges, ...o.corners]
    .filter((p) => ids.includes(p.id))
    .map((p) => `${Object.values(p.stickers).join('-')} at ${p.slot}`)
    .join('; ');
}
export function firstBlockDraft(
  e: CubeEngine,
  first: BlockCandidate,
  frame: RouxFrame,
): AdvancedRouxActionDraft[] {
  if (!first.moves.length) return [];
  const held = e.apply(first.state, invertTeachingMoves(first.moves)),
    map = createRouxFrameMap(e, frame.id);
  const targets = blockTargets(e, 'left').map((p) => map.toPhysicalId(p.id));
  const after = observeAdvancedFrame(e, first.state, frame);
  if (after.centerPhase === null || !blockCompleteInFrame(e, first.state, frame, 'left'))
    throw Error('Incomplete first-block source.');
  return [
    {
      kind: 'setup',
      ruleId: 'ar-first-block-search',
      caseId: first.id,
      targets,
      recognition: describe(e, held, targets),
      explanation: `Build the ${frame.bottom}-${frame.left} block. Follow the observed ${first.construction === 'free' ? 'piece connections' : first.construction.replaceAll('-', ' ')} route; check all five pieces at the endpoint.`,
      moves: [...first.moves],
      rouxAdvanced: {
        frameId: frame.id,
        goal: 'Complete the first block',
        protectedIds: [],
        protection: 'endpoint',
        centerPhaseBefore: observeAdvancedFrame(e, held, frame).centerPhase,
        centerPhaseAfter: after.centerPhase,
        construction: first.construction,
      },
      check: {
        id: 'ar-first-block',
        description: 'All five first-block pieces and side centers match.',
        test: (s) => fingerprintLabState(s) === fingerprintLabState(first.state),
      },
    },
  ];
}
export function makeSecondBlockAction(
  e: CubeEngine,
  before: CubeState,
  moves: readonly TeachingMove[],
  frame: RouxFrame,
): AdvancedRouxActionDraft {
  const map = createRouxFrameMap(e, frame.id),
    canonical = map.toCanonical(before),
    after = e.apply(before, moves);
  if (
    !blockCompleteInFrame(e, before, frame, 'left') ||
    !blockCompleteInFrame(e, after, frame, 'left')
  )
    throw Error('The maneuver must restore the first block at its endpoint.');
  const left = blockTargets(e, 'left'),
    right = blockTargets(e, 'right');
  const named = ROUX_BLOCK_MANEUVERS.find(
    (m) => m.kind === 'algorithm' && m.moves.join(' ') === moves.join(' '),
  );
  const goal = {
    side: 'right' as const,
    phase: 'pair' as const,
    targetIds: right.map((p) => p.id),
    lockedIds: left.map((p) => p.id),
  };
  if (
    named &&
    (!named.match(e, canonical, goal) || !named.check(e, canonical, map.toCanonical(after), goal))
  )
    throw Error('The block maneuver precondition or effect failed.');
  const targets = right.map((p) => map.toPhysicalId(p.id)),
    locks = left.map((p) => map.toPhysicalId(p.id));
  let current = before,
    always = true;
  for (const move of moves) {
    current = e.apply(current, [move]);
    if (!blockCompleteInFrame(e, current, frame, 'left')) always = false;
  }
  const phase = observeAdvancedFrame(e, after, frame).centerPhase;
  if (phase === null) throw Error('The continuation leaves an invalid side frame.');
  const done = blockCompleteInFrame(e, after, frame, 'right');
  return {
    kind: named ? 'algorithm' : 'setup',
    ruleId: named?.id ?? 'ar-second-block-turn',
    caseId: moves.join(' '),
    algorithmId: named?.algorithmId,
    targets,
    moves: [...moves],
    recognition: describe(e, before, targets),
    explanation: `${named ? `Open with ${moves[0]}, adjust with ${moves[1]}, then close with ${moves[2]}.` : `Use ${moves.join(' ')} to reposition the right-block pieces or their free buffer.`} ${always ? 'The first block stays intact.' : 'The first block temporarily moves and is restored at this checkpoint.'} ${done ? 'Both blocks are now complete.' : 'Look for the next pair or square before continuing.'}`,
    rouxAdvanced: {
      frameId: frame.id,
      goal: done ? 'Complete both blocks' : 'Prepare the next right-block connection',
      protectedIds: locks,
      protection: always ? 'always' : 'endpoint',
      centerPhaseBefore: observeAdvancedFrame(e, before, frame).centerPhase,
      centerPhaseAfter: phase,
    },
    check: {
      id: 'ar-second-block-endpoint',
      description: 'The first block and side frame are restored.',
      test: (s) => fingerprintLabState(s) === fingerprintLabState(after),
    },
  };
}
