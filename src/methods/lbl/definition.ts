import type { CubeEngine, CubeObservation, StageId, TraceAction } from '../../core/types';
import type { MethodRuntime } from '../contracts';
import { pieceSolved, piecePositioned } from '../shared/pieces';
import { LBL_PRESENTATION } from './presentation';
import { checkStage } from './stages';
const petalIds = (o: CubeObservation) =>
  o.edges.filter((p) => p.stickers.U === 'white').map((p) => p.id);
function checkAction(engine: CubeEngine, action: TraceAction, stage: StageId): boolean {
  const before = engine.observe(action.before),
    after = engine.observe(action.after);
  const target = [...before.edges, ...before.corners].find((p) => p.id === action.targets[0]);
  const preserve = (id: StageId) => checkStage(engine, action.after, id);
  if (action.ruleId === 'holding-frame')
    return action.kind === 'regrip' && action.moves.every((m) => /^[xyz]/.test(m));
  if (stage === 'white-cross') {
    if (before.centers.U !== 'yellow' || after.centers.U !== 'yellow') return false;
    const petals = petalIds(before),
      next = petalIds(after);
    if (action.ruleId.startsWith('daisy-')) {
      if (
        ![
          'daisy-clear-slot',
          'daisy-lift-bottom',
          'daisy-extract-sideways',
          'daisy-lift-middle',
        ].includes(action.ruleId)
      )
        return false;
      const adds = action.ruleId === 'daisy-lift-bottom' || action.ruleId === 'daisy-lift-middle';
      return (
        action.kind === 'setup' &&
        petals.every((id) => next.includes(id)) &&
        (!adds || (next.length > petals.length && next.includes(action.targets[0])))
      );
    }
    if (action.ruleId === 'cross-match-center')
      return action.kind === 'regrip' && next.length === petals.length;
    if (action.ruleId === 'cross-align-petal')
      return action.kind === 'setup' && next.length === petals.length;
    if (
      action.ruleId !== 'cross-lower-petal' ||
      action.algorithmId !== 'daisy-to-cross' ||
      !target ||
      target.slot !== 'UF'
    )
      return false;
    return (
      target.stickers.U === 'white' &&
      target.stickers.F === before.centers.F &&
      next.length === petals.length - 1 &&
      after.edges
        .filter(
          (p) =>
            p.id === target.id ||
            before.edges.some(
              (b) =>
                b.id === p.id &&
                Object.values(b.stickers).includes('white') &&
                pieceSolved(b, before),
            ),
        )
        .every((p) => pieceSolved(p, after))
    );
  }
  if (action.kind !== 'algorithm') {
    const rules: Partial<Record<StageId, string[]>> = {
      'first-layer': ['corner-extract-frame', 'corner-slot', 'corner-align'],
      'middle-layer': ['middle-extract-frame', 'middle-align', 'middle-face'],
      'top-cross': ['yellow-pattern-frame'],
      'top-edges': ['top-edge-align', 'top-edge-pair-frame'],
      'top-corners': ['top-corner-frame'],
      'corner-orientation': ['next-final-corner'],
    };
    if (!rules[stage]?.includes(action.ruleId)) return false;
    if (stage === 'corner-orientation')
      return before.centers.D === 'yellow' && action.moves.join(' ') === 'D';
    return preserve(
      stage === 'first-layer'
        ? 'white-cross'
        : stage === 'middle-layer'
          ? 'first-layer'
          : 'middle-layer',
    );
  }
  if (stage === 'first-layer')
    return (
      action.algorithmId === 'right-trigger' &&
      ['corner-eject', 'corner-insert'].includes(action.ruleId) &&
      before.centers.D === 'white' &&
      Boolean(target && Object.values(target.stickers).includes('white')) &&
      preserve('white-cross')
    );
  if (stage === 'middle-layer') {
    if (before.centers.D !== 'white' || !target || !preserve('first-layer')) return false;
    if (action.ruleId === 'middle-eject')
      return target.slot === 'FR' && action.algorithmId === 'middle-right';
    return (
      action.ruleId === 'middle-insert' &&
      target.slot === 'UF' &&
      target.stickers.F === before.centers.F &&
      ((action.algorithmId === 'middle-right' && target.stickers.U === before.centers.R) ||
        (action.algorithmId === 'middle-left' && target.stickers.U === before.centers.L))
    );
  }
  if (stage === 'top-cross') {
    const slots = before.edges.filter((p) => p.stickers.U === 'yellow').map((p) => p.slot);
    const correct =
      action.ruleId === 'yellow-dot'
        ? slots.length === 0
        : action.ruleId === 'yellow-line'
          ? slots.includes('UL') && slots.includes('UR') && slots.length === 2
          : action.ruleId === 'yellow-L' &&
            slots.includes('UL') &&
            slots.includes('UB') &&
            slots.length === 2;
    return (
      before.centers.U === 'yellow' &&
      action.algorithmId === 'top-cross' &&
      correct &&
      preserve('middle-layer')
    );
  }
  if (stage === 'top-edges')
    return (
      before.centers.U === 'yellow' &&
      action.algorithmId === 'top-edge-cycle' &&
      ['edges-opposite', 'edges-adjacent'].includes(action.ruleId) &&
      preserve('top-cross')
    );
  if (stage === 'top-corners') {
    const corners = before.corners.filter(
      (p) => p.slot.includes('U') && piecePositioned(p, before),
    );
    return (
      before.centers.U === 'yellow' &&
      action.algorithmId === 'top-corner-cycle' &&
      (action.ruleId === 'corners-none-correct'
        ? corners.length === 0
        : action.ruleId === 'corners-one-correct' && corners.some((p) => p.slot === 'UFR')) &&
      preserve('top-edges')
    );
  }
  return (
    stage === 'corner-orientation' &&
    before.centers.D === 'yellow' &&
    action.ruleId === 'final-corner-twist' &&
    action.algorithmId === 'right-trigger'
  );
}
export const LBL_RUNTIME: MethodRuntime = {
  presentation: LBL_PRESENTATION,
  checkStage,
  checkAction,
};
