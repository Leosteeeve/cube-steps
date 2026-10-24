import type { CubeEngine, CubeState, StageId } from '../../core/types';
import type { MethodRuntime, TeachingAlgorithm } from '../contracts';
import { blockTargets, sameRouxPiece } from '../roux/predicates';
import { encodeLse } from '../roux/lse/coordinates';
import { createLseModel } from '../roux/lse/model';
import { createRouxFrameMap, ROUX_FRAMES } from './frames';
import { advancedRouxSolved, blockCompleteInFrame, observeAdvancedFrame } from './predicates';
import { recognizeCmll } from './cmll/recognize';
import { observeConnections } from './blocks/connections';
import { advancedRouxPresentation } from './presentation';
import { RouxBudgetStop } from './budget';
import type { AdvancedRouxAssets } from './assets';
import type { AdvancedRouxActionDraft, RouxFrame, RouxFrameId } from './types';
const equalSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && new Set(a).size === a.length && a.every((id) => b.includes(id));
export function rouxPositionAction(
  e: CubeEngine,
  before: CubeState,
  frame: RouxFrame,
): AdvancedRouxActionDraft | null {
  if (!frame.positioningMoves.length) return null;
  const after = e.apply(before, frame.positioningMoves);
  return {
    kind: 'regrip',
    ruleId: 'ar-position',
    caseId: frame.id,
    targets: [],
    moves: [...frame.positioningMoves],
    recognition: `Use ${frame.bottom} as the bottom color and ${frame.left} as the left block.`,
    explanation: `Physically rotate the whole cube with ${frame.positioningMoves.join(' ')}. Keep ${frame.bottom} down, ${frame.left} left and ${frame.centers.F} front. Camera dragging changes only the view.`,
    rouxAdvanced: {
      frameId: frame.id,
      goal: 'Set the selected holding frame',
      protectedIds: [],
      protection: 'endpoint',
      centerPhaseBefore: observeAdvancedFrame(e, before, frame).centerPhase,
      centerPhaseAfter: observeAdvancedFrame(e, after, frame).centerPhase!,
    },
  };
}
export function createAdvancedRouxRuntime(
  assets: AdvancedRouxAssets,
  frameId: RouxFrameId,
  formulas: Readonly<Record<string, TeachingAlgorithm>> = {},
): MethodRuntime {
  const frame = ROUX_FRAMES.find((f) => f.id === frameId);
  if (!frame) throw Error('Unknown Advanced Roux frame.');
  const presentation = advancedRouxPresentation({ ...assets.cmll.variants, ...formulas });
  const both = (e: CubeEngine, s: CubeState) =>
    blockCompleteInFrame(e, s, frame, 'left') && blockCompleteInFrame(e, s, frame, 'right');
  const checkStage = (e: CubeEngine, s: CubeState, id: StageId): boolean => {
    const o = observeAdvancedFrame(e, s, frame);
    if (id === 'ar-position') return o.sideFrameValid && o.centerPhase === 0;
    if (id === 'ar-first-block') return blockCompleteInFrame(e, s, frame, 'left');
    if (id === 'ar-second-block') return both(e, s);
    if (id === 'ar-cmll') return both(e, s) && o.cornerOffset !== null;
    if (id === 'ar-last-four') return advancedRouxSolved(e, s, frame);
    if (id === 'ar-eolr') {
      const c = encodeLse(e, createRouxFrameMap(e, frameId).toCanonical(s));
      return !!c && createLseModel(e).goal(c, 'left-right');
    }
    return false;
  };
  return {
    presentation,
    checkStage,
    checkAction(e, a, stage) {
      try {
        const m = a.rouxAdvanced;
        if (
          !m ||
          m.frameId !== frameId ||
          a.roux ||
          a.pair ||
          a.cross ||
          a.selection ||
          !e.equals(e.apply(a.before, a.moves), a.after)
        )
          return false;
        const before = observeAdvancedFrame(e, a.before, frame),
          after = observeAdvancedFrame(e, a.after, frame);
        if (
          after.centerPhase === null ||
          m.centerPhaseBefore !== before.centerPhase ||
          m.centerPhaseAfter !== after.centerPhase ||
          (m.cornerOffsetBefore !== undefined && m.cornerOffsetBefore !== before.cornerOffset) ||
          (m.cornerOffsetAfter !== undefined && m.cornerOffsetAfter !== after.cornerOffset)
        )
          return false;
        if (m.protection !== 'always' && m.protection !== 'endpoint') return false;
        if (
          a.ruleId === 'ar-execution-hold' &&
          (a.moves.length < 3 ||
            !/^y[2']?$/.test(a.moves[0]) ||
            a.moves.at(-1) !==
              ({ y: "y'", "y'": 'y', y2: 'y2' } as Record<string, string>)[a.moves[0]] ||
            a.moves.slice(1, -1).some((move) => /^[xyz]/.test(move)))
        )
          return false;
        const map = createRouxFrameMap(e, frameId),
          left = blockTargets(e, 'left').map((p) => map.toPhysicalId(p.id)),
          locks = [...left, ...blockTargets(e, 'right').map((p) => map.toPhysicalId(p.id))];
        const expectedLocks =
          stage === 'ar-position' || stage === 'ar-first-block'
            ? []
            : stage === 'ar-second-block'
              ? left
              : locks;
        if (!equalSet(m.protectedIds, expectedLocks)) return false;
        const o = e.observe(a.before),
          protectedPieces = [...o.edges, ...o.corners].filter((p) => expectedLocks.includes(p.id));
        if (a.targets.some((id) => ![...o.edges, ...o.corners].some((p) => p.id === id)))
          return false;
        const protectedAt = (s: CubeState) => {
          const q = e.observe(s);
          return protectedPieces.every((p) =>
            [...q.edges, ...q.corners].some((v) => sameRouxPiece(p, v)),
          );
        };
        if (!protectedAt(a.after)) return false;
        if (m.protection === 'always') {
          let s = a.before;
          for (const move of a.moves) {
            s = e.apply(s, [move]);
            if (!protectedAt(s)) return false;
          }
        }
        if (stage === 'ar-position') {
          const expected = rouxPositionAction(e, a.before, frame);
          return (
            !!expected &&
            (
              [
                'kind',
                'ruleId',
                'caseId',
                'moves',
                'targets',
                'recognition',
                'explanation',
                'rouxAdvanced',
              ] as const
            ).every((key) => JSON.stringify(a[key]) === JSON.stringify(expected[key]))
          );
        }
        if (stage === 'ar-first-block') {
          if (
            ![
              'ar-observed-block-connection',
              'ar-first-block-search',
              'ar-execution-hold',
            ].includes(a.ruleId) ||
            a.kind !== 'setup'
          )
            return false;
          if (m.goal === 'Complete the first block') return checkStage(e, a.after, stage);
          if (m.goal !== 'Build the next observed connection') return false;
          const previous = observeConnections(e, a.before, frame),
            next = observeConnections(e, a.after, frame);
          return next.some(
            (n) =>
              !previous.some(
                (p) => p.kind === n.kind && p.pieceIds.join('/') === n.pieceIds.join('/'),
              ),
          );
        }
        if (stage === 'ar-second-block') {
          if (
            !checkStage(e, a.before, 'ar-first-block') ||
            !checkStage(e, a.after, 'ar-first-block')
          )
            return false;
          if (
            a.kind !== 'algorithm' &&
            !['ar-second-block-turn', 'ar-execution-hold'].includes(a.ruleId)
          )
            return false;
          return m.goal === 'Complete both blocks'
            ? both(e, a.after)
            : m.goal === 'Prepare the next right-block connection';
        }
        if (stage === 'ar-cmll') {
          if (!both(e, a.before) || !both(e, a.after)) return false;
          const match = recognizeCmll(e, a.before, frame, assets.cmll);
          if (match.caseId === 'solved' || match.caseId !== a.caseId) return false;
          if (a.kind === 'setup')
            return (
              a.ruleId === 'ar-cmll-setup' &&
              a.moves.length === 1 &&
              /^U[2']?$/.test(a.moves[0]) &&
              m.goal === 'Set up the recognized CMLL case' &&
              m.protection === 'always'
            );
          return (
            a.kind === 'algorithm' &&
            a.ruleId === a.algorithmId &&
            !!presentation.algorithms[a.algorithmId!] &&
            m.goal === 'Solve the top corners modulo U alignment' &&
            checkStage(e, a.after, stage)
          );
        }
        if (stage === 'ar-eolr' || stage === 'ar-last-four') {
          if (a.moves.some((move) => !/^[MU][2']?$/.test(move)) || m.protection !== 'always')
            return false;
          const ca = encodeLse(e, map.toCanonical(a.before)),
            cb = encodeLse(e, map.toCanonical(a.after));
          if (!ca || !cb || m.cornerOffsetBefore !== ca.offset || m.cornerOffsetAfter !== cb.offset)
            return false;
          const goal =
            stage === 'ar-last-four'
              ? 'Restore the last four edges, centers and U alignment'
              : m.goal.toLowerCase().includes('all six remaining')
                ? 'Orient all six remaining edges'
                : 'Orient six edges and place the upper lateral edges beside their matching corners';
          if (m.goal !== goal && m.goal !== `Prepare: ${goal.toLowerCase()}`) return false;
          if (a.kind !== 'algorithm' && !/^ar-lse-(eo|lr|combined|last)$/.test(a.ruleId))
            return false;
          return (
            m.goal.startsWith('Prepare:') ||
            (goal.startsWith('Orient all')
              ? createLseModel(e).goal(cb, 'orientation')
              : checkStage(e, a.after, stage))
          );
        }
        return false;
      } catch (error) {
        if (error instanceof RouxBudgetStop) throw error;
        return false;
      }
    },
  };
}
