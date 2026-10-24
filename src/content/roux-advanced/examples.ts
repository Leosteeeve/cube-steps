import type { CaseExample } from '../course-types';
import type { CubeEngine, TeachingMove, TraceAction } from '../../core/types';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import { createRouxFrameMap } from '../../methods/roux-advanced/frames';
import { encodeLse } from '../../methods/roux/lse/coordinates';
import { createLseModel } from '../../methods/roux/lse/model';
import { blockCompleteInFrame, observeAdvancedFrame } from '../../methods/roux-advanced/predicates';
import { observeConnections } from '../../methods/roux-advanced/blocks/connections';
import { recognizeCmll } from '../../methods/roux-advanced/cmll/recognize';
import { CMLL_CATALOG } from '../../methods/roux-advanced/cmll/catalog';
import type { PlaybackSource } from '../../player/playback-source';
import type { PlaybackTimeline } from '../../player/playback-timeline';
import { freezeLabValue } from '../../lab/input';
import fixtures from './example-fixtures.json';
export interface RouxWorkedExample extends CaseExample {
  lessonIds: readonly string[];
  frameId: RouxFrameId;
  recognition: string;
  physicalChecks: readonly string[];
  setup: readonly TeachingMove[];
  moves: readonly TeachingMove[];
  stepNotes: readonly string[];
  formulaId?: string;
  eolrBoundary?: number;
}
export const ADVANCED_ROUX_EXAMPLES = fixtures as unknown as readonly RouxWorkedExample[];
export function verifyRouxWorkedExample(e: CubeEngine, x: RouxWorkedExample): boolean {
  try {
    const frame = ROUX_FRAMES.find((f) => f.id === x.frameId);
    if (!frame || !x.moves.length || x.stepNotes.length !== x.moves.length) return false;
    const before = e.apply(e.solved(), x.setup),
      after = e.apply(before, x.moves),
      connections = observeConnections(e, before, frame);
    const both = () =>
      blockCompleteInFrame(e, after, frame, 'left') &&
      blockCompleteInFrame(e, after, frame, 'right');
    const id = x.expectedCaseId;
    if (id.startsWith('cmll:'))
      return (
        !!x.formulaId &&
        CMLL_CATALOG.variants[x.formulaId]?.caseId === id.slice(5) &&
        CMLL_CATALOG.variants[x.formulaId].moves.join(' ') === x.moves.join(' ') &&
        recognizeCmll(e, before, frame).caseId === id.slice(5) &&
        both() &&
        observeAdvancedFrame(e, after, frame).cornerOffset !== null
      );
    if (id === 'eolr-combined' || id === 'lse-basic') {
      if (
        !Number.isInteger(x.eolrBoundary) ||
        x.eolrBoundary! < 0 ||
        x.eolrBoundary! > x.moves.length
      )
        return false;
      const c = encodeLse(
        e,
        createRouxFrameMap(e, frame.id).toCanonical(
          e.apply(before, x.moves.slice(0, x.eolrBoundary)),
        ),
      );
      if (!c || !createLseModel(e).goal(c, 'left-right')) return false;
    }
    if (['eolr-combined', 'lse-basic', 'slice-M', 'slice-M-prime', 'holding'].includes(id))
      return both() && e.equals(after, e.apply(e.solved(), frame.positioningMoves));
    if (id === 'second-block')
      return (
        blockCompleteInFrame(e, before, frame, 'left') &&
        !blockCompleteInFrame(e, before, frame, 'right') &&
        both()
      );
    if (id === 'lookahead') return !blockCompleteInFrame(e, before, frame, 'left') && both();
    if (
      blockCompleteInFrame(e, before, frame, 'left') ||
      !blockCompleteInFrame(e, after, frame, 'left')
    )
      return false;
    const pairs = connections.filter((c) => c.kind === 'pair').length,
      squares = connections.filter((c) => c.kind === 'square').length;
    if (id === 'square-pair') return pairs >= 2 && squares > 0;
    if (id === 'two-pairs-late-base') return pairs >= 2 && squares === 0;
    if (id === 'line') return connections.some((c) => c.kind === 'line');
    return id === 'joined-pair' && pairs > 0;
  } catch {
    return false;
  }
}
export function createRouxLessonDemonstration(e: CubeEngine, x: RouxWorkedExample): PlaybackSource {
  if (!verifyRouxWorkedExample(e, x))
    throw Error('The worked example does not match its claimed case or endpoint.');
  const timeline: PlaybackTimeline = {
    moves: [],
    states: [e.apply(e.solved(), x.setup)],
    actions: [],
    sections: [],
    completion: { title: 'Example complete.', description: x.physicalChecks.join(' ') },
  };
  const cuts = x.formulaId ? [x.moves.length] : x.moves.map((_, i) => i + 1);
  let start = 0;
  for (const end of cuts) {
    const before = timeline.states.at(-1)!;
    for (const move of x.moves.slice(start, end)) {
      timeline.moves.push(move);
      timeline.states.push(e.apply(timeline.states.at(-1)!, [move]));
    }
    const sectionId =
      x.eolrBoundary !== undefined && start >= x.eolrBoundary ? 'ar-last-four' : x.stageId;
    const action: TraceAction = {
      kind: x.formulaId ? 'algorithm' : 'setup',
      ...(x.formulaId ? { algorithmId: x.formulaId } : {}),
      ruleId: x.id,
      caseId: x.expectedCaseId,
      targets: [],
      recognition: x.recognition,
      explanation: x.formulaId
        ? 'Keep the full formula boundary. Inspect side colors and both blocks after the last turn.'
        : x.stepNotes[start],
      moves: [...x.moves.slice(start, end)],
      before,
      after: timeline.states.at(-1)!,
      checkpoint: {
        id: `${x.id}-${end}`,
        description:
          end === x.moves.length
            ? x.physicalChecks.join(' ')
            : 'Match the displayed intermediate state; the example goal is checked at its endpoint.',
        passed: true,
      },
    };
    timeline.actions.push({ action, sectionId, start, end });
    start = end;
  }
  const boundary = x.eolrBoundary;
  timeline.sections.push({
    id: x.stageId,
    label: x.title,
    start: 0,
    end: boundary ?? x.moves.length,
  });
  if (boundary !== undefined)
    timeline.sections.push({
      id: 'ar-last-four',
      label: 'Finish the last four edges',
      start: boundary,
      end: x.moves.length,
      ...(boundary === x.moves.length
        ? { skipReason: 'The EOLR endpoint is already solved.' }
        : {}),
    });
  return freezeLabValue({
    kind: 'roux-lesson',
    prepared: {
      timeline,
      setup: x.setup,
      label: x.title,
      algorithms: x.formulaId ? { [x.formulaId]: CMLL_CATALOG.variants[x.formulaId] } : {},
    },
  });
}
