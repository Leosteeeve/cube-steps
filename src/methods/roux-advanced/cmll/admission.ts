import type { CubeEngine } from '../../../core/types';
import { invertTeachingMoves, isTeachingMove } from '../../../core/teaching-moves';
import { meterRouxEngine } from '../budget';
import type { RouxSearchBudget } from '../types';
import { ROUX_FRAMES } from '../frames';
import { rouxReferenceState, observeRouxFrame } from '../../roux/frame';
import { blockComplete, cornerOffset, blockTargets } from '../../roux/predicates';
import { cmllDigest, deeplyFrozen } from './catalog';
import { cmllIndex, cmllCornerKey } from './recognize';
import { ROUX_EXECUTION_CATALOG } from '../execution/catalog';
import { scoreRouxExecution } from '../execution/score';
import type { CmllCatalog } from './types';
const admitted = new WeakSet<CmllCatalog>();
export function admitCmllCatalog(
  engine: CubeEngine,
  c: CmllCatalog,
  budget: RouxSearchBudget,
): void {
  budget.charge('score');
  if (admitted.has(c)) return;
  const e = meterRouxEngine(engine, budget),
    expected = { O: 2, H: 4, Pi: 6, U: 6, T: 6, Sune: 6, 'Anti-Sune': 6, L: 6 },
    counts: Record<string, number> = {};
  if (c.version !== 'cmll-v1' || c.digest !== cmllDigest(c) || c.cases.length !== 42)
    throw Error('Invalid CMLL catalog version, count or digest.');
  const ids = new Set<string>(),
    variants = new Set<string>();
  for (const group of c.cases) {
    budget.charge('score');
    counts[group.family] = (counts[group.family] ?? 0) + 1;
    if (
      ids.has(group.id) ||
      !group.label ||
      group.variantIds.length < 1 ||
      group.variantIds.length > 2 ||
      group.variantIds.filter((id) => c.variants[id]?.default).length !== 1
    )
      throw Error('Invalid CMLL case identity or primary.');
    ids.add(group.id);
    for (const id of group.variantIds) {
      if (variants.has(id) || c.variants[id]?.caseId !== group.id)
        throw Error('Invalid CMLL variant identity.');
      variants.add(id);
    }
  }
  if (
    Object.keys(counts).length !== 8 ||
    Object.entries(expected).some(([family, count]) => counts[family] !== count) ||
    variants.size !== Object.keys(c.variants).length
  )
    throw Error('Invalid CMLL families or orphan variants.');
  const index = cmllIndex(e, c),
    ref = rouxReferenceState(e),
    frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!,
    locks = [...blockTargets(e, 'left'), ...blockTargets(e, 'right')].map((p) => p.id).sort();
  if (index.size !== 644) throw Error(`CMLL non-solved coverage is ${index.size}, expected 644.`);
  for (const v of Object.values(c.variants)) {
    budget.charge('score');
    if (
      v.id !== Object.keys(c.variants).find((id) => c.variants[id] === v) ||
      v.holdingMoves.length ||
      v.moves.length === 0 ||
      v.moves.some((m) => !isTeachingMove(m)) ||
      !v.recognition ||
      !v.precondition ||
      !v.effect ||
      !v.sourceRefs.length ||
      v.sourceRefs.some((s) => !s.url || !s.title || !s.accessed || !s.usageNotes) ||
      v.executionProfileId !== 'roux-execution-v1/primitive-composition' ||
      JSON.stringify([...v.protectedIds].sort()) !== JSON.stringify(locks)
    )
      throw Error('Incomplete CMLL variant metadata.');
    let boundary = 0;
    for (const s of v.segments) {
      if (s.start !== boundary || s.end <= s.start || s.end > v.moves.length || !s.label)
        throw Error('Invalid CMLL segmentation.');
      boundary = s.end;
    }
    if (boundary !== v.moves.length) throw Error('Incomplete CMLL segmentation.');
    const effect = e.apply(e.solved(), v.moves);
    if (
      JSON.stringify(v.edgeTransform) !==
      JSON.stringify({
        permutation: effect.data.EDGES.pieces,
        orientationDelta: effect.data.EDGES.orientation,
      })
    )
      throw Error('Incorrect CMLL edge effect.');
    if (observeRouxFrame(e, e.apply(ref, v.moves)).centerPhase !== v.centerPhaseDelta)
      throw Error('Incorrect CMLL center phase.');
    const initial = e.apply(ref, invertTeachingMoves(v.moves));
    if (index.get(cmllCornerKey(initial))?.caseId !== v.caseId)
      throw Error('CMLL alternative solves another corner class.');
    for (let phase = 0; phase < 4; phase++) {
      const before = e.apply(ref, Array(phase).fill('M')),
        after = e.apply(before, v.moves);
      if (
        !blockComplete(e, after, 'left') ||
        !blockComplete(e, after, 'right') ||
        observeRouxFrame(e, after).centerPhase !== (phase + v.centerPhaseDelta) % 4
      )
        throw Error('CMLL does not restore both blocks and its stated phase.');
      const solved = e.apply(e.apply(before, invertTeachingMoves(v.moves)), v.moves);
      if (cornerOffset(e, solved) === null) throw Error('CMLL endpoint has unsolved corners.');
    }
    const profile = scoreRouxExecution(
      e,
      [{ before: initial, moves: v.moves, targets: [], phase: 'blocks' }],
      frame,
      ROUX_EXECUTION_CATALOG,
      budget,
    );
    if (!profile.rated) throw Error(`CMLL has no feasible execution profile: ${v.id}.`);
  }
  if (deeplyFrozen(c)) admitted.add(c);
}
