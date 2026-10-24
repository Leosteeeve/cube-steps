import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { fingerprintLabState } from '../../../lab/input';
import { combineAdjacentTurns } from '../../shared/connected-actions';
import { blockTargets } from '../../roux/predicates';
import { createRouxFrameMap } from '../frames';
import { blockCompleteInFrame, observeAdvancedFrame } from '../predicates';
import type { AdvancedRouxActionDraft, RouxFrame, RouxInput } from '../types';
import { observeConnections } from './connections';
import { makeSecondBlockAction } from './continuation';

/** Remove only physically verified closed loops and adjacent same-layer turns. */
export function compactBlockMoves(
  e: CubeEngine,
  initial: CubeState,
  moves: readonly TeachingMove[],
): TeachingMove[] {
  const stack: TeachingMove[] = [],
    states = [initial],
    seen = new Map([[fingerprintLabState(initial), 0]]);
  for (const move of moves) {
    const after = e.apply(states.at(-1)!, [move]),
      key = fingerprintLabState(after),
      old = seen.get(key);
    if (old !== undefined) {
      for (const discarded of states.slice(old + 1)) seen.delete(fingerprintLabState(discarded));
      states.length = old + 1;
      stack.length = old;
    } else {
      stack.push(move);
      states.push(after);
      seen.set(key, stack.length);
    }
  }
  const compact = combineAdjacentTurns(stack);
  if (!e.equals(e.apply(initial, moves), e.apply(initial, compact)))
    throw Error('Block compaction changed its endpoint.');
  return compact;
}
function position(e: CubeEngine, state: CubeState, ids: readonly string[]): string {
  const o = e.observe(state);
  return [...o.edges, ...o.corners]
    .filter((p) => ids.includes(p.id))
    .map(
      (p) =>
        `${Object.values(p.stickers).join('-')} ${p.id.length === 2 ? 'edge' : 'corner'} at ${p.slot} (${Object.entries(
          p.stickers,
        )
          .map(([f, c]) => `${c} ${f}`)
          .join(', ')})`,
    )
    .join('; ');
}
export function explainBlockRoute(
  e: CubeEngine,
  input: RouxInput,
  frame: RouxFrame,
  firstMoves: readonly TeachingMove[],
  secondMoves: readonly TeachingMove[],
): AdvancedRouxActionDraft[] {
  const held = e.apply(input.initial, frame.positioningMoves),
    map = createRouxFrameMap(e, frame.id),
    firstEnd = e.apply(held, firstMoves),
    end = e.apply(firstEnd, secondMoves);
  if (
    !blockCompleteInFrame(e, firstEnd, frame, 'left') ||
    !blockCompleteInFrame(e, end, frame, 'left') ||
    !blockCompleteInFrame(e, end, frame, 'right')
  )
    throw Error('The supplied block route has incomplete endpoints.');
  const actions: AdvancedRouxActionDraft[] = [];
  let state = held;
  for (const [side, moves] of [
    ['left', firstMoves],
    ['right', secondMoves],
  ] as const) {
    const seen = new Set([fingerprintLabState(state)]),
      targets = blockTargets(e, side).map((p) => map.toPhysicalId(p.id));
    let start = state,
      pending: TeachingMove[] = [],
      prior = observeConnections(e, state, frame);
    for (let index = 0; index < moves.length; index++) {
      pending.push(moves[index]);
      state = e.apply(state, [moves[index]]);
      const key = fingerprintLabState(state);
      if (seen.has(key)) throw Error('A block route repeated physical state without progress.');
      seen.add(key);
      const phase = observeAdvancedFrame(e, state, frame).centerPhase;
      if (phase === null) continue;
      if (side === 'right') {
        if (!blockCompleteInFrame(e, state, frame, 'left')) continue;
        actions.push(makeSecondBlockAction(e, start, pending, frame));
      } else {
        const next = observeConnections(e, state, frame);
        const gained = next.filter(
          (n) =>
            !prior.some((p) => p.kind === n.kind && p.pieceIds.join('/') === n.pieceIds.join('/')),
        );
        if (!gained.length && index !== moves.length - 1) continue;
        const chosen = [...new Set(gained.flatMap((c) => c.pieceIds))];
        const ids = chosen.length ? chosen : targets,
          fingerprint = key;
        actions.push({
          kind: 'setup',
          ruleId: 'ar-observed-block-connection',
          caseId: `${frame.id}/${index}`,
          targets: ids,
          moves: [...pending],
          recognition: position(e, start, ids),
          explanation: `Keep ${frame.bottom} down and ${frame.left} left. ${gained.length ? `This creates a ${[...new Set(gained.map((c) => c.kind))].join(' and ')} connection.` : 'Position the remaining first-block pieces.'} ${pending.some((m) => /^M/.test(m)) ? 'Use the middle slice as a free buffer; M and M′ are actual layer turns. ' : ''}Check ${position(e, state, ids)}. ${index === moves.length - 1 ? 'All five first-block pieces and the side centers now match.' : 'The next action continues from this connection.'}`,
          rouxAdvanced: {
            frameId: frame.id,
            goal:
              index === moves.length - 1
                ? 'Complete the first block'
                : 'Build the next observed connection',
            protectedIds: [],
            protection: 'endpoint',
            centerPhaseBefore: observeAdvancedFrame(e, start, frame).centerPhase,
            centerPhaseAfter: phase,
            construction: gained.map((c) => c.kind).join('+') || 'free',
          },
          check: {
            id: 'ar-connection',
            description: 'The observed pieces reach the recorded connection.',
            test: (s) => fingerprintLabState(s) === fingerprint,
          },
        });
        prior = next;
      }
      pending = [];
      start = state;
    }
    if (pending.length) throw Error('No restored side-frame checkpoint at the block endpoint.');
  }
  return actions;
}
