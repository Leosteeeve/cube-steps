import type { CubeEngine, CubeState, TeachingMove, TraceAction } from '../../../core/types';
import type { PlaybackSource } from '../../../player/playback-source';
import type { PlaybackTimeline } from '../../../player/playback-timeline';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { freezeLabValue } from '../../../lab/input';
import { ROUX_FRAMES } from '../frames';
import type { RouxFrameId, Quarter } from '../types';
import { CMLL_CATALOG } from './catalog';
import { admitCmllCatalog } from './admission';
import { recognizeCmll } from './recognize';
import { createRouxSearchBudget } from '../budget';
import { blockCompleteInFrame, observeAdvancedFrame } from '../predicates';
const setups: readonly (readonly TeachingMove[])[] = [[], ['U'], ['U2'], ["U'"]];
export function createCmllDemonstration(
  e: CubeEngine,
  caseId: string,
  variantId: string,
  frameId: RouxFrameId,
  auf: Quarter,
): {
  source: PlaybackSource;
  recognition: string;
  holding: string;
} {
  const group = CMLL_CATALOG.cases.find((c) => c.id === caseId),
    frame = ROUX_FRAMES.find((f) => f.id === frameId),
    variant = CMLL_CATALOG.variants[variantId];
  if (
    !group ||
    !frame ||
    !group.variantIds.includes(variantId) ||
    !variant ||
    !Number.isInteger(auf) ||
    auf < 0 ||
    auf > 3
  )
    throw Error('Choose an admitted CMLL case, its variant and a valid hold/setup.');
  admitCmllCatalog(e, CMLL_CATALOG, createRouxSearchBudget('normal'));
  // Leave legal last-six-edge work visible: CMLL's checkpoint concerns corners and blocks.
  const edgeMix: TeachingMove[] = ['M', 'U2', "M'", 'U2'],
    setup = [
      ...frame.positioningMoves,
      ...edgeMix,
      ...invertTeachingMoves(variant.moves),
      ...invertTeachingMoves(setups[auf]),
    ],
    initial = e.apply(e.solved(), setup),
    match = recognizeCmll(e, initial, frame);
  if (match.caseId !== caseId)
    throw Error('The constructed legal case does not match its requested CMLL class.');
  const observation = e.observe(initial),
    topCorners = observation.corners.filter((p) => p.slot.includes('U')),
    recognition = `Ignore the last six edges. Inspect the ${frame.centers.U} corner stickers on U and the side-color pattern: ${topCorners
      .map(
        (p) =>
          `${p.slot} ${Object.entries(p.stickers)
            .map(([face, color]) => `${face} ${color}`)
            .join(', ')}`,
      )
      .join('; ')}. This is ${group.family} — ${group.label}.`,
    holding = `Hold ${frame.bottom} down and ${frame.left} left; ${frame.centers.F} faces you. Keep both blocks in place.`,
    timeline: PlaybackTimeline = {
      moves: [],
      states: [initial],
      actions: [],
      sections: [],
      completion: {
        title: 'CMLL complete.',
        description:
          'The upper corners are in cyclic order and both blocks are intact. Remaining edges belong to LSE; no yellow or white edge cross is required before this formula.',
      },
    };
  let state: CubeState = initial;
  for (const [sectionId, moves, label, algorithm] of [
    ['cmll-setup', setups[auf], 'Match the formula hold', false],
    ['cmll-formula', variant.moves, variant.name, true],
  ] as const) {
    const start = timeline.moves.length,
      before = state;
    for (const move of moves) {
      state = e.apply(state, [move]);
      timeline.moves.push(move);
      timeline.states.push(state);
    }
    if (moves.length) {
      const action: TraceAction = {
        kind: algorithm ? 'algorithm' : 'setup',
        ruleId: algorithm ? variantId : 'cmll-demo-setup',
        caseId,
        ...(algorithm ? { algorithmId: variantId } : {}),
        targets: topCorners.map((p) => p.id),
        recognition,
        explanation: algorithm
          ? `Apply ${variant.name} as the displayed chunks. The edges may change; check both blocks and the corner side colors after the complete formula.`
          : `Turn ${moves.join(' ')} to match the displayed formula hold, keeping both blocks intact.`,
        moves: [...moves],
        before,
        after: state,
        checkpoint: {
          id: sectionId,
          description: algorithm
            ? 'Both blocks remain complete and the top corners are in cyclic order.'
            : 'The recognized case is in its formula hold.',
          passed: true,
        },
      };
      timeline.actions.push({ action, sectionId, start, end: timeline.moves.length });
    }
    timeline.sections.push({
      id: sectionId,
      label,
      start,
      end: timeline.moves.length,
      ...(!moves.length ? { skipReason: 'The case is already in the formula hold.' } : {}),
    });
  }
  if (
    !blockCompleteInFrame(e, state, frame, 'left') ||
    !blockCompleteInFrame(e, state, frame, 'right') ||
    observeAdvancedFrame(e, state, frame).cornerOffset === null ||
    !e.equals(e.apply(initial, timeline.moves), state)
  )
    throw Error('CMLL demonstration failed physical verification.');
  return freezeLabValue({
    source: {
      kind: 'cmll',
      prepared: {
        timeline,
        setup,
        algorithms: { [variantId]: variant },
        label: `CMLL · ${group.family} · ${group.label}`,
      },
    },
    recognition,
    holding,
  });
}
