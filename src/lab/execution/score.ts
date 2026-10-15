import type { Face } from '../../core/types';
import { countTeachingMoves } from '../../core/move-metrics';
import type { LabRoute, LabExecutionEvent } from '../types';
import { LAB_WORK, type LabBudget, type LabWork } from '../budget';
import type {
  ExecutionCatalog,
  ExecutionPath,
  ExecutionSegment,
  RatedLabScore,
  RecognitionCheckpoint,
} from './types';

const textOrder = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function rankExecutionPaths(a: ExecutionPath, b: ExecutionPath): number {
  return (
    a.score.cost - b.score.cost ||
    a.score.T - b.score.T ||
    a.score.R - b.score.R ||
    a.score.G - b.score.G ||
    textOrder(a.terminalGrip, b.terminalGrip)
  );
}
export function rankLabRoutes(a: LabRoute, b: LabRoute): number {
  const ac = a.score.rated && a.modelVersion === 'lab-execution-v1',
    bc = b.score.rated && b.modelVersion === 'lab-execution-v1';
  if (ac !== bc) return ac ? -1 : 1;
  if (ac && bc && a.score.rated && b.score.rated)
    return (
      a.score.cost - b.score.cost ||
      a.score.T - b.score.T ||
      a.score.R - b.score.R ||
      a.score.G - b.score.G ||
      textOrder(a.id, b.id)
    );
  return textOrder(a.id, b.id);
}
export function visibilityEvidence(check: RecognitionCheckpoint): {
  visible: boolean;
  reason: string;
} {
  const { observation: o, target, bottomColor, mode } = check;
  const corner = o.corners.find((p) => p.id === target.cornerId),
    edge = o.edges.find((p) => p.id === target.edgeId);
  if (!corner || !edge) throw Error('Recognition checkpoint is missing its physical target.');
  const bottomFace = Object.entries(corner.stickers).find(
    ([, color]) => color === bottomColor,
  )?.[0];
  const reference = ({ FR: 'F', FL: 'L', BR: 'R', BL: 'B' } as const)[target.slot];
  const edgeFace = Object.entries(edge.stickers).find(
    ([, color]) => color === o.centers[reference],
  )?.[0];
  const visible = ['UFR', 'UFL'].some((view) => {
    const cornerVisible =
      bottomFace === 'D'
        ? Object.entries(corner.stickers).some(
            ([face, color]) => view.includes(face) && color === o.centers[face as Face],
          )
        : !!bottomFace && view.includes(bottomFace);
    if (!cornerVisible) return false;
    if (mode === 'connected-pair') {
      const shared = Object.keys(edge.stickers).filter(
        (face) => corner.stickers[face as Face] === edge.stickers[face as Face],
      );
      return shared.length === 2 && shared.every((face) => view.includes(face));
    }
    return !!edgeFace && view.includes(edgeFace);
  });
  return {
    visible,
    reason: visible
      ? 'The recognition stickers fit a front view (U/F/R or U/F/L).'
      : 'The identifying stickers need an additional view around the cube.',
  };
}
const zeroScore = (): RatedLabScore => ({
  rated: true,
  modelVersion: 'lab-execution-v1',
  T: 0,
  R: 0,
  G: 0,
  V: 0,
  A: 0,
  cost: 0,
  events: [],
});
export function* scoreExecution(
  segments: readonly ExecutionSegment[],
  catalog: ExecutionCatalog,
  budget: LabBudget,
  initial?: readonly ExecutionPath[],
): Generator<LabWork | { kind: 'paths'; paths: readonly ExecutionPath[]; unratedReason?: string }> {
  let paths: readonly ExecutionPath[] = initial ?? [
    { terminalGrip: catalog.neutralGrip, score: zeroScore(), nextBoundary: 0 },
  ];
  for (const segment of segments) {
    if (segment.phase === 'position' || segment.phase === 'last-layer') continue;
    if (segment.algorithmId) {
      const formula = catalog.formulas[segment.algorithmId];
      if (!formula || formula.moves.join(' ') !== segment.moves.join(' ')) {
        yield {
          kind: 'paths',
          paths: [],
          unratedReason: 'This formula has no matching admitted execution profile.',
        };
        return;
      }
    }
    const visibility = segment.recognition ? visibilityEvidence(segment.recognition) : undefined;
    if (visibility && !visibility.visible) {
      paths = paths.map((path) => ({
        ...path,
        score: {
          ...path.score,
          V: path.score.V + 1,
          cost: path.score.cost + 3,
          events: [
            ...path.score.events,
            {
              boundary: path.nextBoundary,
              kind: 'visibility',
              profileId: segment.algorithmId ?? 'recognition',
              fromGrip: path.terminalGrip,
              toGrip: path.terminalGrip,
              count: 1,
              rationale: visibility.reason,
            },
          ],
        },
      }));
    }
    for (const [index, move] of segment.moves.entries()) {
      const profile = catalog.tokens[move];
      if (!profile) {
        yield { kind: 'paths', paths: [], unratedReason: `No execution profile for ${move}.` };
        return;
      }
      const counts = countTeachingMoves([move]);
      const next = new Map<string, ExecutionPath>();
      for (const path of paths)
        for (const transition of profile.transitions) {
          budget.charge('score');
          yield LAB_WORK;
          const before = catalog.poses[path.terminalGrip],
            entry = catalog.poses[transition.from];
          if (!before || !entry || !catalog.poses[transition.to])
            throw Error('Unknown execution grip.');
          // Whole-cube rotation includes its handling; never add a preparatory
          // hand reposition to the same rotation event.
          if (counts.rotations && path.terminalGrip !== transition.from) continue;
          const g = counts.rotations
            ? 0
            : Number(before.leftWrist !== entry.leftWrist) +
              Number(before.rightWrist !== entry.rightWrist);
          const a =
            transition.awkward === 'none' ||
            (transition.awkward === 'grip' && g > 0) ||
            (transition.awkward === 'view' && index === 0 && visibility && !visibility.visible)
              ? 0
              : 1;
          const score: RatedLabScore = {
            ...path.score,
            T: path.score.T + counts.faceTurnEquivalents,
            R: path.score.R + counts.rotations,
            G: path.score.G + g,
            A: path.score.A + a,
            cost:
              path.score.cost + counts.faceTurnEquivalents + 2 * counts.rotations + 2 * g + 2 * a,
          };
          const candidate: ExecutionPath = {
            terminalGrip: transition.to,
            score,
            nextBoundary: path.nextBoundary + 1,
          };
          const old = next.get(candidate.terminalGrip);
          if (old && rankExecutionPaths(old, candidate) <= 0) continue;
          const events: LabExecutionEvent[] = [];
          if (g)
            events.push({
              boundary: path.nextBoundary,
              kind: 'hand-regrip',
              profileId: 'lab-execution-v1/reposition',
              fromGrip: path.terminalGrip,
              toGrip: transition.from,
              count: g,
              rationale: `Reposition ${g === 2 ? 'both hands' : 'one hand'} to ${transition.from} while the other fingers support the cube; do not turn a layer.`,
            });
          events.push({
            boundary: path.nextBoundary,
            kind: counts.rotations ? 'rotation' : 'turn',
            profileId: profile.id,
            fromGrip: transition.from,
            toGrip: transition.to,
            count: counts.rotations || counts.faceTurnEquivalents,
            rationale: transition.instruction,
          });
          if (a)
            events.push({
              boundary: path.nextBoundary,
              kind: 'awkward',
              profileId: profile.id,
              fromGrip: transition.from,
              toGrip: transition.to,
              count: 1,
              rationale: `Model-marked ${transition.awkward} transition: ${transition.instruction}`,
            });
          score.events = [...path.score.events, ...events];
          next.set(candidate.terminalGrip, candidate);
        }
      paths = [...next.values()];
      if (!paths.length) {
        yield {
          kind: 'paths',
          paths: [],
          unratedReason: 'No feasible grip continuation in the admitted model.',
        };
        return;
      }
    }
  }
  yield { kind: 'paths', paths: [...paths].sort(rankExecutionPaths) };
}
