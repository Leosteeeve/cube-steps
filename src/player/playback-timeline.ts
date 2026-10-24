import type { CubeEngine, CubeState, TeachingMove, TraceAction } from '../core/types';
import type { PlaybackSource, PlaybackSectionId } from './playback-source';
import type { AdvancedAssets } from '../methods/advanced/assets';
import { createTimeline } from './timeline';
import { assertSessionInput } from '../core/solve-input';
import {
  getMethod,
  getRegisteredRuntime,
  getRegisteredAdvancedRouxFrameRuntime,
} from '../methods/registry';
import { verifyTrace } from '../methods/shared/verification';
import { LBL_RUNTIME } from '../methods/lbl/definition';
import { CFOP_RUNTIME } from '../methods/cfop/definition';
import { createAdvancedRuntime } from '../methods/advanced/definition';
import { verifyDemonstration } from '../algorithms/demonstration';
import { rouxStageConnection } from './roux-stage-connections';
export interface PlaybackTimeline {
  moves: TeachingMove[];
  states: CubeState[];
  actions: { action: TraceAction; sectionId: PlaybackSectionId; start: number; end: number }[];
  sections: {
    id: PlaybackSectionId;
    label: string;
    start: number;
    end: number;
    skipReason?: string;
    connection?: string;
  }[];
  completion: { title: string; description: string };
}
export function createPlaybackTimeline(
  engine: CubeEngine,
  source: PlaybackSource,
  assets?: AdvancedAssets,
): PlaybackTimeline {
  if (source.kind === 'lab' || source.kind === 'roux-lab' || source.kind === 'cmll')
    return source.prepared.timeline;
  if (source.kind === 'solve') {
    const { session } = source;
    assertSessionInput(engine, session);
    // Preserve catalog-specific diagnostics before full semantic verification.
    const flat = createTimeline(engine, session.trace),
      method = getMethod(session.trace.method);
    if (session.trace.method === 'cfop-advanced' && !assets)
      throw new Error('Advanced playback requires verified cross assets.');
    const runtime =
      session.trace.method === 'lbl'
        ? LBL_RUNTIME
        : session.trace.method === 'cfop-beginner'
          ? CFOP_RUNTIME
          : session.trace.method === 'roux-beginner'
            ? getRegisteredRuntime('roux-beginner')
            : session.trace.method === 'roux-advanced'
              ? session.trace.rouxAdvanced &&
                getRegisteredAdvancedRouxFrameRuntime(session.trace.rouxAdvanced.frameId)
              : createAdvancedRuntime(assets!.crossTable);
    if (!runtime) throw new Error('Roux playback requires its registered verification runtime.');
    verifyTrace(engine, session.trace, runtime);
    return {
      moves: flat.moves,
      states: flat.states,
      actions: flat.actions.map(({ stageId, ...a }) => ({ ...a, sectionId: stageId })),
      sections: flat.stages.map((s, i) => ({
        ...s,
        label: method.stages[i].label,
        skipReason: session.trace.stages[i].skipReason,
        connection: rouxStageConnection(session.trace, i),
      })),
      completion: {
        title: 'Cube solved.',
        description:
          'All six faces match their centers. Replay a stage whenever you want to see why it works.',
      },
    };
  }
  const demo = source.demonstration;
  verifyDemonstration(engine, demo);
  const result: PlaybackTimeline = {
    moves: [],
    states: [demo.initial],
    actions: [],
    sections: [],
    completion: { title: 'Algorithm complete.', description: demo.checkpoint.description },
  };
  for (const action of demo.actions) {
    const sectionId = action.kind === 'algorithm' ? 'algorithm-formula' : 'algorithm-setup',
      start = result.moves.length;
    for (const move of action.moves) {
      result.moves.push(move);
      result.states.push(engine.apply(result.states.at(-1)!, [move]));
    }
    const end = result.moves.length;
    result.actions.push({ action, sectionId, start, end });
    const section = result.sections.at(-1);
    if (section?.id === sectionId) section.end = end;
    else
      result.sections.push({
        id: sectionId,
        label: sectionId === 'algorithm-setup' ? 'Prepare the case' : 'Apply the formula',
        start,
        end,
      });
  }
  return result;
}
