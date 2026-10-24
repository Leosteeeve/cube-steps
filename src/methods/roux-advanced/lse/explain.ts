import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { fingerprintLabState } from '../../../lab/input';
import { blockTargets } from '../../roux/predicates';
import { encodeLse } from '../../roux/lse/coordinates';
import { createLseModel } from '../../roux/lse/model';
import { ROUX_LSE_MANEUVERS } from '../../roux/lse/catalog';
import { createRouxFrameMap } from '../frames';
import type { AdvancedRouxActionDraft, RouxFrame, Quarter } from '../types';
import type { AdvancedLseGoal } from './assets';
export function explainLseAction(
  e: CubeEngine,
  before: CubeState,
  moves: readonly TeachingMove[],
  after: CubeState,
  frame: RouxFrame,
  goal: AdvancedLseGoal,
  complete: boolean,
): AdvancedRouxActionDraft {
  const map = createRouxFrameMap(e, frame.id),
    a = encodeLse(e, map.toCanonical(before)),
    b = encodeLse(e, map.toCanonical(after));
  if (!a || !b || !e.equals(e.apply(before, moves), after))
    throw Error('Invalid LSE explanation domain or replay.');
  const model = createLseModel(e),
    bad = model.badSlots(a),
    remaining = model.badSlots(b),
    observation = e.observe(before),
    next = e.observe(after);
  const targets = [...observation.edges, ...observation.corners]
    .filter(
      (p) =>
        JSON.stringify(p) !==
        JSON.stringify([...next.edges, ...next.corners].find((q) => q.id === p.id)),
    )
    .map((p) => p.id);
  const protectedIds = [...blockTargets(e, 'left'), ...blockTargets(e, 'right')].map((p) =>
    map.toPhysicalId(p.id),
  );
  const name =
    goal === 'eo'
      ? 'Orient all six remaining edges'
      : goal === 'last'
        ? 'Restore the last four edges, centers and U alignment'
        : 'Orient six edges and place the upper lateral edges beside their matching corners';
  const named = ROUX_LSE_MANEUVERS.find(
      (m) => m.moves.length > 1 && m.moves.join(' ') === moves.join(' '),
    ),
    key = fingerprintLabState(after);
  const orientation =
    bad === null
      ? 'The middle centers are a quarter turn from the orientation reference.'
      : `Bad-edge slots: ${bad.map((i) => ['UF', 'UR', 'UB', 'UL', 'DF', 'DB'][i]).join(', ') || 'none'}.`;
  const outcome =
    remaining === null
      ? 'The middle-center reference is still in progress.'
      : `At this checkpoint ${remaining.length} edges need orientation.`;
  return {
    kind: named ? 'algorithm' : 'setup',
    ruleId: named?.id ?? `ar-lse-${goal}`,
    caseId: `${goal}/${a.phase}/${a.offset}/${bad?.join('-') ?? 'reference'}`,
    algorithmId: named?.algorithmId,
    targets,
    moves: [...moves],
    recognition: `${orientation} The upper corner ring has U offset ${a.offset}. Keep ${frame.bottom} down and ${frame.left} left.`,
    explanation: `${goal === 'combined' ? 'Coordinate edge orientation and lateral-edge placement together; this endpoint was compared with the remaining last-four work.' : goal === 'nearest' ? 'This is the nearest EOLR endpoint used for comparison.' : goal === 'eo' ? 'Use the middle slice to prepare and orient the edges before arranging the lateral pair.' : goal === 'lr' ? 'Keep the established edge orientation while moving the lateral edges beside their matching upper corners.' : 'Cycle the remaining middle-slice edges and finish the center and U alignment.'} Follow ${moves.join(' ')}. Both side blocks stay intact during these M/U turns. ${outcome} ${complete ? `${name}: checkpoint reached.` : 'Continue to the next observed edge case.'}`,
    rouxAdvanced: {
      frameId: frame.id,
      goal: complete ? name : `Prepare: ${name.toLowerCase()}`,
      protectedIds,
      protection: 'always',
      centerPhaseBefore: a.phase as Quarter,
      centerPhaseAfter: b.phase as Quarter,
      cornerOffsetBefore: a.offset as Quarter,
      cornerOffsetAfter: b.offset as Quarter,
    },
    check: {
      id: `ar-lse-${goal}`,
      description: complete ? name : 'Both blocks and the cyclic corner order remain intact.',
      test: (s) => fingerprintLabState(s) === key,
    },
  };
}
