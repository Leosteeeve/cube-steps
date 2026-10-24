import type { CubeEngine } from '../core/types';
import type { PlaybackTimeline } from '../player/playback-timeline';
import { freezeLabValue } from '../lab/input';
import type { AdvancedRouxAssets } from '../methods/roux-advanced/assets';
import { validateRouxRoute } from '../methods/roux-advanced/validate';
import { ADVANCED_ROUX_PRESENTATION } from '../methods/roux-advanced/presentation';
import type { RouxRoute } from './types';
import { rouxStageConnection } from '../player/roux-stage-connections';
export function prepareRouxPlayback(e: CubeEngine, raw: RouxRoute, assets: AdvancedRouxAssets) {
  const route = validateRouxRoute(e, raw, assets),
    timeline: PlaybackTimeline = {
      moves: [],
      states: [route.trace.initial],
      actions: [],
      sections: [],
      completion: {
        title: 'Cube solved.',
        description:
          'This complete Roux route has been replayed and verified. The experimental comfort estimate covers the two blocks.',
      },
    };
  for (const [i, stage] of route.trace.stages.entries()) {
    const start = timeline.moves.length;
    for (const action of stage.actions) {
      const actionStart = timeline.moves.length;
      for (const move of action.moves) {
        timeline.moves.push(move);
        timeline.states.push(e.apply(timeline.states.at(-1)!, [move]));
      }
      timeline.actions.push({
        action,
        sectionId: stage.id,
        start: actionStart,
        end: timeline.moves.length,
      });
    }
    timeline.sections.push({
      id: stage.id,
      label: ADVANCED_ROUX_PRESENTATION.stages[i].label,
      start,
      end: timeline.moves.length,
      connection: rouxStageConnection(route.trace, i),
      ...(stage.skipReason ? { skipReason: stage.skipReason } : {}),
    });
  }
  return freezeLabValue({
    timeline,
    setup: route.input.setupMoves!,
    algorithms: route.formulas,
    label: `Roux Lab · ${route.frameId.replace('-', ' bottom / ')} left`,
    handling: route.score.rated ? route.score.events : [],
  });
}
