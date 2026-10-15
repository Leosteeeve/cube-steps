import type { TeachingMove, TraceAction } from '../core/types';
import type { TeachingAlgorithm } from '../methods/contracts';
import type { PlaybackTimeline } from '../player/playback-timeline';
import type { LabContext } from './finalize';
import { LAB_SECTIONS } from './finalize';
import type { LabExecutionEvent, LabInput, LabSectionId } from './types';
import { freezeLabValue } from './input';
import { isVerifiedLabRoute, type VerifiedLabRoute } from './validate';
export interface LabPlaybackData {
  readonly timeline: PlaybackTimeline;
  readonly setup: readonly TeachingMove[];
  readonly label: string;
  readonly algorithms: Readonly<Record<string, TeachingAlgorithm>>;
  readonly handling: readonly LabExecutionEvent[];
}
const LABELS: Record<LabSectionId, string> = {
  'lab-position': 'Position your cube',
  'lab-cross': 'Build the cross',
  'lab-f2l': 'Complete F2L',
  'lab-oll': 'Orient the last layer',
  'lab-pll': 'Permute the last layer',
  'lab-auf': 'Final alignment',
};
/** Only a frozen, independently replayed wrapper can cross this presentation boundary. */
export function createLabPlayback(
  context: LabContext,
  input: LabInput,
  checked: VerifiedLabRoute,
): LabPlaybackData {
  if (!isVerifiedLabRoute(checked))
    throw Error('Lab playback requires an independently verified route.');
  const route = checked.route,
    engine = context.engine;
  if (route.inputFingerprint !== input.fingerprint || !engine.equals(route.initial, input.initial))
    throw Error('Verified Lab route does not match this input.');
  const timeline: PlaybackTimeline = {
    moves: [],
    states: [route.initial],
    actions: [],
    sections: [],
    completion: {
      title: 'Cube solved.',
      description:
        'This verified experimental route finishes all six faces. Its estimate applies only to Cross + F2L.',
    },
  };
  for (const section of LAB_SECTIONS) {
    const start = timeline.moves.length;
    for (const raw of route.actions.filter((a) => a.section === section)) {
      const action: TraceAction = {
        kind: raw.kind === 'rotation' ? 'regrip' : raw.kind,
        ruleId: raw.ruleId,
        caseId: raw.caseId,
        targets: [...raw.targets],
        recognition: raw.recognition,
        explanation: raw.explanation,
        moves: [...raw.moves],
        ...(raw.algorithmId ? { algorithmId: raw.algorithmId } : {}),
        ...(raw.pair ? { pair: { ...raw.pair } } : {}),
        ...(raw.repetition ? { repetition: { ...raw.repetition } } : {}),
        before: raw.before,
        after: raw.after,
        checkpoint: { id: raw.id, description: raw.checkpoint.description, passed: true },
      };
      const actionStart = timeline.moves.length;
      for (const move of action.moves) {
        timeline.moves.push(move);
        timeline.states.push(engine.apply(timeline.states.at(-1)!, [move]));
      }
      timeline.actions.push({
        action,
        sectionId: section,
        start: actionStart,
        end: timeline.moves.length,
      });
    }
    timeline.sections.push({
      id: section,
      label: LABELS[section],
      start,
      end: timeline.moves.length,
      ...(route.skips.find((s) => s.section === section)
        ? { skipReason: route.skips.find((s) => s.section === section)!.reason }
        : {}),
    });
  }
  return freezeLabValue({
    timeline,
    setup: route.setupMoves,
    label: `CFOP Lab · ${route.startHold.bottom} bottom / ${route.startHold.front} front`,
    algorithms: route.formulas,
    handling: route.score.rated
      ? route.score.events.map((e) => ({
          ...e,
          boundary: e.boundary + route.boundaries.crossStart,
        }))
      : [],
  });
}
