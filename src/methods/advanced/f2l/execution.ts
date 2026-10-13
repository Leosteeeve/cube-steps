import type { CubeEngine, CubeState, ExecutionMetrics, Face } from '../../../core/types';
import type { ActionInput } from '../../shared/trace';
import type { F2LTarget } from './types';
import { ALGORITHM_REGISTRY } from '../../../algorithms/registry';
import { countTeachingMoves } from '../../../core/move-metrics';
import { observeF2LPairs } from '../../cfop/f2l-cases';
export const zeroExecution = (): ExecutionMetrics => ({
  quality: 0,
  faceTurns: 0,
  rotations: 0,
  effort: 0,
  reasons: [],
});
export const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function compareExecution(a: ExecutionMetrics, b: ExecutionMetrics): number {
  return a.quality - b.quality || a.effort - b.effort || a.rotations - b.rotations;
}
export function rankWithNext(current: ExecutionMetrics, next: ExecutionMetrics): readonly number[] {
  return [
    2 * current.quality + next.quality,
    2 * current.effort + next.effort,
    current.quality,
    current.effort,
    current.rotations,
  ];
}
export function measureF2LExecution(
  engine: CubeEngine,
  before: CubeState,
  target: F2LTarget,
  actions: readonly ActionInput[],
): ExecutionMetrics {
  const count = countTeachingMoves(actions.flatMap((a) => a.moves)),
    reasons: string[] = [];
  let state = before,
    quality = 0;
  for (const action of actions) {
    if (action.kind === 'algorithm') {
      const algorithm =
        ALGORITHM_REGISTRY.variants[action.algorithmId ?? ''] ??
        ALGORITHM_REGISTRY.preparations[action.algorithmId ?? ''];
      const profile = algorithm?.f2lExecution;
      if (!profile) throw Error('Missing admitted F2L execution profile.');
      const o = engine.observe(state),
        pair = observeF2LPairs(engine, state).find(
          (p) => p.cornerId === target.cornerId && p.edgeId === target.edgeId,
        );
      const corner = o.corners.find((p) => p.id === target.cornerId),
        edge = o.edges.find((p) => p.id === target.edgeId);
      if (!pair || !corner || !edge) throw Error('Invalid F2L recognition target.');
      const white = Object.entries(corner.stickers).find(([, c]) => c === 'white')![0] as Face;
      const reference = ({ FR: 'F', BR: 'R', BL: 'B', FL: 'L' } as const)[
        pair.slot as F2LTarget['slot']
      ];
      const edgeFace = Object.entries(edge.stickers).find(
        ([, c]) => c === o.centers[reference],
      )![0] as Face;
      const visible = ['UFR', 'UFL'].some((view) => {
        const cornerVisible =
          white === 'D'
            ? Object.entries(corner.stickers).some(
                ([face, color]) => view.includes(face) && color === o.centers[face as Face],
              )
            : view.includes(white);
        if (!cornerVisible || !view.includes(edgeFace)) return false;
        if (profile.recognition === 'connected-pair') {
          const shared = Object.keys(edge.stickers).filter(
            (face) => corner.stickers[face as Face] === edge.stickers[face as Face],
          );
          return shared.length === 2 && shared.every((face) => view.includes(face));
        }
        return true;
      });
      quality += profile.gripPenalty + (visible ? 0 : 2);
      reasons.push(
        `${action.algorithmId}: ${visible ? 'Recognition stickers are visible from a front view.' : 'Recognition requires looking around the cube.'} ${profile.rationale}`,
      );
    }
    state = engine.apply(state, action.moves);
  }
  return {
    quality,
    faceTurns: count.faceTurnEquivalents,
    rotations: count.rotations,
    effort: count.faceTurnEquivalents + count.rotations,
    reasons,
  };
}
