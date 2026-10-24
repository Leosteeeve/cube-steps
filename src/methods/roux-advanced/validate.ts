import type { CubeEngine, TeachingMove } from '../../core/types';
import type { RouxRoute } from '../../roux-lab/types';
import { isTeachingMove, invertTeachingMoves } from '../../core/teaching-moves';
import { freezeLabValue } from '../../lab/input';
import { verifyTrace } from '../shared/verification';
import { flattenTrace } from '../shared/trace';
import { rouxReferenceState, observeRouxFrame } from '../roux/frame';
import { blockComplete, blockTargets } from '../roux/predicates';
import { prepareRouxInput } from './input';
import { ROUX_FRAMES } from './frames';
import { blockCompleteInFrame } from './predicates';
import { firstBlockLowerBound } from './blocks/distance';
import { STM_MOVES } from './blocks/coordinates';
import { createAdvancedRouxRuntime } from './definition';
import { createRouxSearchBudget, meterRouxEngine } from './budget';
import {
  originalRouxActions,
  rouxBlockSegments,
  rouxRouteId,
  rouxTraceMeasures,
  rouxTraceMetadata,
} from './finalize';
import { scoreRouxExecution } from './execution/score';
import { recognizeCmll } from './cmll/recognize';
import type { CmllVariant } from './cmll/types';
import type { AdvancedRouxAssets } from './assets';
import type { FirstBlockEvidence, RouxFrame, RouxInput, RouxSearchBudget } from './types';
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Admit data only. Accessors, functions, exotic prototypes and cycles never run. */
export function assertRouxPlainData(raw: unknown): void {
  let nodes = 0,
    characters = 0;
  const stack = new Set<object>();
  const visit = (v: unknown, depth: number) => {
    if (++nodes > 200000 || depth > 24) throw Error('Roux data exceeds its structure limit.');
    if (v === null || v === undefined || typeof v === 'boolean') return;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw Error('Non-finite Roux value.');
      return;
    }
    if (typeof v === 'string') {
      characters += v.length;
      if (v.length > 16384 || characters > 4 * 1024 * 1024)
        throw Error('Roux text limit exceeded.');
      return;
    }
    if (
      typeof v !== 'object' ||
      (!Array.isArray(v) && ![Object.prototype, null].includes(Object.getPrototypeOf(v)))
    )
      throw Error('Roux data must be plain inert values.');
    if (stack.has(v) || (Array.isArray(v) && v.length > 1024))
      throw Error('Invalid Roux container.');
    stack.add(v);
    for (const key of Reflect.ownKeys(v)) {
      if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key))
        throw Error('Invalid Roux property.');
      const d = Object.getOwnPropertyDescriptor(v, key)!;
      if (!('value' in d)) throw Error('Roux data cannot contain accessors.');
      visit(d.value, depth + 1);
    }
    stack.delete(v);
  };
  visit(raw, 0);
}
export function checkedFirstBlockEvidence(
  e: CubeEngine,
  input: RouxInput,
  frame: RouxFrame,
  evidence: FirstBlockEvidence,
  assets: AdvancedRouxAssets,
): FirstBlockEvidence {
  if (!evidence || evidence.status === 'not-explored') return { status: 'not-explored' };
  if (!['best-found', 'proven-minimum'].includes(evidence.status))
    throw Error('Unknown first-block evidence.');
  const moves = evidence.witness;
  if (!Array.isArray(moves) || moves.length > 128 || moves.some((m) => !STM_MOVES.includes(m)))
    throw Error('Invalid first-block witness.');
  const held = e.apply(input.initial, frame.positioningMoves),
    lowerBound = firstBlockLowerBound(e, held, frame, assets.blocks);
  if (!blockCompleteInFrame(e, e.apply(held, moves), frame, 'left') || moves.length < lowerBound)
    throw Error('First-block witness does not prove a complete block.');
  if (evidence.status === 'proven-minimum') {
    if (
      evidence.minimum !== moves.length ||
      evidence.proof?.coordinateVersion !== 1 ||
      evidence.proof.moveSetVersion !== 'roux-stm-v1' ||
      evidence.proof.assetDigest !== assets.blocks.digest
    )
      throw Error('Invalid first-block proof metadata.');
  } else if (
    evidence.upperBound !== moves.length ||
    !Number.isInteger(evidence.lowerBound) ||
    evidence.lowerBound < 0 ||
    evidence.lowerBound > moves.length
  )
    throw Error('Invalid first-block bounds.');
  // A depth claim is not a replayable certificate. Retain only the independently
  // admitted table lower bound; equality certifies a minimum without a new search.
  if (lowerBound === moves.length)
    return {
      status: 'proven-minimum',
      minimum: lowerBound,
      witness: [...moves],
      proof: {
        coordinateVersion: 1,
        moveSetVersion: 'roux-stm-v1',
        completedDepth: lowerBound - 1,
        assetDigest: assets.blocks.digest,
      },
    };
  return {
    status: 'best-found',
    lowerBound,
    upperBound: moves.length,
    witness: [...moves],
    completedDepth: lowerBound - 1,
  };
}
function admitFormulaSnapshots(e: CubeEngine, route: RouxRoute, assets: AdvancedRouxAssets): void {
  const used = new Set(
    originalRouxActions(route.trace)
      .map((a) => a.algorithmId)
      .filter((id): id is string => !!id),
  );
  if (
    Object.keys(route.formulas).length !== used.size ||
    Object.keys(route.formulas).some((id) => !used.has(id))
  )
    throw Error('Orphan or missing formula snapshot.');
  const ref = rouxReferenceState(e),
    frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
  for (const [id, alg] of Object.entries(route.formulas)) {
    if (
      !alg.name ||
      !alg.precondition ||
      !alg.effect ||
      !Array.isArray(alg.moves) ||
      !alg.moves.length ||
      alg.moves.length > 64 ||
      alg.moves.some((m) => !isTeachingMove(m))
    )
      throw Error('Invalid archival formula.');
    let end = 0;
    for (const part of alg.segments ?? []) {
      if (!part.label || part.start !== end || part.end <= end || part.end > alg.moves.length)
        throw Error('Invalid archival formula chunks.');
      end = part.end;
    }
    if (alg.segments && end !== alg.moves.length) throw Error('Incomplete archival chunks.');
    if ('caseId' in alg) {
      const v = alg as CmllVariant,
        effect = e.apply(e.solved(), alg.moves),
        after = e.apply(ref, alg.moves),
        initial = e.apply(ref, invertTeachingMoves(alg.moves)),
        match = recognizeCmll(e, initial, frame, assets.cmll);
      if (
        v.id !== id ||
        v.caseId !== match.caseId ||
        !v.recognition ||
        v.holdingMoves.length ||
        !v.sourceRefs.length ||
        v.executionProfileId !== 'roux-execution-v1/primitive-composition' ||
        !equal(
          [...v.protectedIds].sort(),
          [...blockTargets(e, 'left'), ...blockTargets(e, 'right')].map((p) => p.id).sort(),
        ) ||
        !equal(v.edgeTransform, {
          permutation: effect.data.EDGES.pieces,
          orientationDelta: effect.data.EDGES.orientation,
        }) ||
        v.centerPhaseDelta !== observeRouxFrame(e, after).centerPhase
      )
        throw Error('Invalid archival CMLL transformation.');
      for (let phase = 0; phase < 4; phase++) {
        const result = e.apply(ref, [...(Array(phase).fill('M') as TeachingMove[]), ...alg.moves]);
        if (
          !blockComplete(e, result, 'left') ||
          !blockComplete(e, result, 'right') ||
          observeRouxFrame(e, result).centerPhase !== (phase + v.centerPhaseDelta) % 4
        )
          throw Error('Archival CMLL damaged its protected blocks.');
      }
    } else {
      const current = createAdvancedRouxRuntime(assets, route.frameId).presentation.algorithms[id];
      // Block/LSE maneuver definitions carry more than a formula effect. Old
      // names may keep their prose; the fixed maneuver must retain its moves.
      if (!current || !equal(current.moves, alg.moves))
        throw Error('Unknown archival block or LSE maneuver.');
    }
  }
}
export function validateRouxRoute(
  rawEngine: CubeEngine,
  raw: unknown,
  assets: AdvancedRouxAssets,
  budget: RouxSearchBudget = createRouxSearchBudget('normal'),
): RouxRoute {
  assertRouxPlainData(raw);
  const r = structuredClone(raw) as RouxRoute,
    e = meterRouxEngine(rawEngine, budget);
  if (
    !r ||
    r.kind !== 'roux-lab' ||
    r.schemaVersion !== 1 ||
    !['optimized', 'baseline-fallback'].includes(r.basis) ||
    !['basic', 'combined'].includes(r.lseMode) ||
    r.versions?.search !== 'roux-search-v1' ||
    r.versions.model !== 'roux-execution-v1'
  )
    throw Error('Unsupported Roux route schema or model.');
  const frame = ROUX_FRAMES.find((f) => f.id === r.frameId);
  if (!frame || !r.trace || r.trace.stages?.length !== 6 || !r.formulas)
    throw Error('Incomplete Roux route.');
  const allActions = r.trace.stages.flatMap((s) => s.actions);
  if (
    allActions.length > 512 ||
    originalRouxActions(r.trace).length > 512 ||
    flattenTrace(r.trace).moves.length > 512
  )
    throw Error('Roux route exceeds replay limits.');
  const input = prepareRouxInput(e, r.input.source);
  if (
    input.fingerprint !== r.input.fingerprint ||
    !e.equals(input.initial, r.input.initial) ||
    !e.equals(input.initial, r.trace.initial) ||
    !Array.isArray(r.input.setupMoves) ||
    r.input.setupMoves.length > 520 ||
    r.input.setupMoves.some((m) => !isTeachingMove(m)) ||
    !e.equals(e.apply(e.solved(), r.input.setupMoves), input.initial)
  )
    throw Error('Roux input or setup witness mismatch.');
  admitFormulaSnapshots(e, r, assets);
  verifyTrace(e, r.trace, createAdvancedRouxRuntime(assets, frame.id, r.formulas));
  const measures = rouxTraceMeasures(r.trace);
  if (
    !equal(measures.counts, r.counts) ||
    !equal(measures.boundaries, r.boundaries) ||
    !equal(r.trace.rouxAdvanced, rouxTraceMetadata(r)) ||
    rouxRouteId(r) !== r.id
  )
    throw Error('Roux route counts, boundaries or metadata mismatch.');
  const score = scoreRouxExecution(
    e,
    rouxBlockSegments(r.trace, e),
    frame,
    assets.execution,
    budget,
  );
  if (!equal(score, r.score)) throw Error('Roux execution score does not match physical moves.');
  r.evidence = checkedFirstBlockEvidence(e, input, frame, r.evidence, assets);
  r.trace.rouxAdvanced = rouxTraceMetadata(r);
  return freezeLabValue(r);
}
