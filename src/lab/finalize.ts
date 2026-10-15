import type { CubeEngine, CubeState, TeachingMove } from '../core/types';
import type { CrossTable } from '../methods/advanced/cross/table';
import { ALGORITHM_REGISTRY } from '../algorithms/registry';
import { recognizeAdvancedOLL, ollSignature } from '../methods/advanced/recognize-oll';
import { recognizeAdvancedPLL, pllSignature } from '../methods/advanced/recognize-pll';
import { advancedAufMoves } from '../methods/advanced/last-layer';
import { firstTwoLayersSolved, whiteCrossSolved } from '../methods/shared/pieces';
import { invertTeachingMoves } from '../core/teaching-moves';
import type { CompletedF2L } from './f2l/planner';
import type { ExecutionCatalog } from './execution/types';
import { rankExecutionPaths } from './execution/score';
import { createLabBudget, LAB_WORK, meterLabEngine, type LabBudget, type LabWork } from './budget';
import type {
  LabAction,
  LabCheckpoint,
  LabFormula,
  LabInput,
  LabRoute,
  LabSectionId,
} from './types';
export interface LabContext {
  engine: CubeEngine;
  table: CrossTable;
  profiles: ExecutionCatalog;
}
export const LAB_SEARCH_VERSION = 'lab-search-v1';
export const LAB_CATALOG_VERSION = 'cubesteps-cfop-2026-10-14';
export const LAB_SECTIONS: readonly LabSectionId[] = [
  'lab-position',
  'lab-cross',
  'lab-f2l',
  'lab-oll',
  'lab-pll',
  'lab-auf',
];

/** Content identifier only. Physical equality and full paths govern validation/deduplication. */
export function labRouteId(inputFingerprint: string, actions: readonly LabAction[]): string {
  const text =
    inputFingerprint +
    '|' +
    actions
      .map((a) =>
        [a.section, a.ruleId, a.algorithmId, a.targets.join(','), a.moves.join(' ')].join(':'),
      )
      .join('|');
  let a = 0xcbf29ce484222325n,
    b = 0x84222325cbf29ce4n;
  for (let i = 0; i < text.length; i++) {
    a = BigInt.asUintN(64, (a ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n);
    b = BigInt.asUintN(64, (b ^ BigInt(text.charCodeAt(i) + (i % 251))) * 0x100000001b3n);
  }
  return `lab-${a.toString(16).padStart(16, '0')}${b.toString(16).padStart(16, '0')}`;
}
export function formulaSnapshot(id: string): LabFormula {
  const formula = ALGORITHM_REGISTRY.variants[id] ?? ALGORITHM_REGISTRY.preparations[id];
  if (!formula) throw Error('Missing Lab formula definition.');
  const variant = ALGORITHM_REGISTRY.variants[id];
  return {
    id,
    caseId: variant?.caseId ?? 'f2l-extraction',
    name: formula.name,
    moves: [...formula.moves],
    precondition: formula.precondition,
    effect: formula.effect,
    ...(formula.segments ? { segments: structuredClone(formula.segments) } : {}),
    sourceRefs: variant?.sourceRefs ?? [],
  };
}
export function labStageComplete(
  engine: CubeEngine,
  canonical: CubeState,
  section: LabSectionId,
): boolean {
  if (section === 'lab-position') return true;
  if (!whiteCrossSolved(engine, canonical)) return false;
  if (section === 'lab-cross') return true;
  if (!firstTwoLayersSolved(engine, canonical)) return false;
  if (section === 'lab-f2l') return true;
  if (ollSignature(engine, canonical) !== 'UUUUUUUU') return false;
  if (section === 'lab-oll') return true;
  return section === 'lab-pll'
    ? pllSignature(engine, canonical) === '0123|0123'
    : engine.isSolved(canonical);
}
export function drainLabSteps<T>(iterator: Generator<LabWork, T>): T {
  for (;;) {
    const next = iterator.next();
    if (next.done) return next.value;
  }
}
export function finalizeLabRoute(
  context: LabContext,
  input: LabInput,
  endpoint: CompletedF2L,
): LabRoute {
  return drainLabSteps(finalizeLabRouteSteps(context, input, endpoint, createLabBudget()));
}
export function* finalizeLabRouteSteps(
  context: LabContext,
  input: LabInput,
  endpoint: CompletedF2L,
  budget: LabBudget,
): Generator<LabWork, LabRoute> {
  const engine = meterLabEngine(context.engine, budget),
    { cross, node } = endpoint,
    frame = cross.frame;
  if (!firstTwoLayersSolved(engine, node.state))
    throw Error('An incomplete F2L endpoint cannot be finalized.');
  const actions: LabAction[] = [],
    skips: { section: LabSectionId; reason: string }[] = [];
  let state = input.initial;
  const physicalTargets = (s: CubeState, lastLayer = false) => {
    const o = engine.observe(s);
    return [...o.edges, ...o.corners]
      .filter((p) =>
        lastLayer
          ? Object.values(p.stickers).includes(o.centers.U)
          : p.id.length === 2 && Object.values(p.stickers).includes(frame.hold.bottom),
      )
      .map((p) => p.id);
  };
  function add(
    section: LabSectionId,
    moves: readonly TeachingMove[],
    predicate: LabCheckpoint['predicate'],
    recognition: string,
    explanation: string,
    ruleId: string,
    kind: LabAction['kind'] = 'setup',
    algorithmId?: string,
    caseId = 'lab-setup',
  ) {
    const before = state;
    state = engine.apply(state, moves);
    const o = engine.observe(state);
    const targets =
      section === 'lab-position'
        ? []
        : physicalTargets(before, ['lab-oll', 'lab-pll', 'lab-auf'].includes(section));
    actions.push({
      id: `lab-action-${actions.length}`,
      section,
      kind,
      ruleId,
      caseId,
      algorithmId,
      targets,
      recognition,
      explanation,
      moves: [...moves],
      before,
      after: state,
      checkpoint: {
        predicate,
        description: explanation,
        targets: [],
        protectedIds: section === 'lab-f2l' ? node.completedIds : [],
        hold: { bottom: o.centers.D, front: o.centers.F },
      },
    });
  }
  if (frame.positioningMoves.length)
    add(
      'lab-position',
      frame.positioningMoves,
      'position',
      'Set the declared starting hold before the timed Cross + F2L segment.',
      `Hold ${frame.hold.bottom} down and ${frame.hold.front} in front. This positioning is outside the optimized subtotal.`,
      'lab-position',
      'rotation',
    );
  else
    skips.push({
      section: 'lab-position',
      reason: 'The cube already has the selected starting hold.',
    });
  const crossStart = actions.flatMap((a) => a.moves).length;
  for (const [i, move] of cross.moves.entries()) {
    budget.charge('expand');
    yield LAB_WORK;
    const before = engine.observe(state),
      after = engine.observe(engine.apply(state, [move]));
    const changed = before.edges
      .filter((p) => Object.values(p.stickers).includes(frame.hold.bottom))
      .flatMap((p) => {
        const q = after.edges.find((x) => x.id === p.id)!;
        return JSON.stringify(p) !== JSON.stringify(q) ? [`${p.id}: ${p.slot} to ${q.slot}`] : [];
      });
    add(
      'lab-cross',
      [move],
      i === cross.moves.length - 1 ? 'cross' : 'cross-progress',
      `Track the ${frame.hold.bottom} cross edges against their side centers.`,
      `${move}: ${changed.join('; ') || 'keep the selected cross edges in place while preparing the continuation'}. This cross uses ${cross.length} turns; the exact minimum is ${cross.minimum}.`,
      'lab-cross-turn',
    );
  }
  if (!cross.moves.length)
    skips.push({
      section: 'lab-cross',
      reason: 'The selected cross is already matched to its side centers.',
    });
  if (!engine.equals(state, cross.after))
    throw Error('Cross endpoint does not match original-input replay.');
  const crossEnd = crossStart + cross.moves.length;
  for (const action of node.actions) {
    budget.charge('expand');
    yield LAB_WORK;
    if (!engine.equals(state, action.before))
      throw Error('F2L action starts from a different physical cube.');
    actions.push({ ...action, id: `lab-action-${actions.length}` });
    state = action.after;
  }
  if (!node.actions.length)
    skips.push({ section: 'lab-f2l', reason: 'All four pairs are already complete.' });
  const f2lEnd = actions.flatMap((a) => a.moves).length;
  for (const section of ['lab-oll', 'lab-pll'] as const) {
    budget.charge('expand');
    yield LAB_WORK;
    if (labStageComplete(engine, frame.toCanonical(state), section)) {
      skips.push({
        section,
        reason:
          section === 'lab-oll'
            ? 'The last-layer stickers are already oriented.'
            : 'The last-layer pieces are already in order.',
      });
      continue;
    }
    // Give the recognizers their canonical front with explicit physical moves.
    for (const y of [[], ['y'], ["y'"], ['y2']] as TeachingMove[][]) {
      const held = engine.apply(frame.toCanonical(state), y);
      yield LAB_WORK;
      if (engine.observe(held).centers.F !== 'green') continue;
      if (y.length)
        add(
          section,
          y,
          section === 'lab-oll' ? 'f2l' : 'oll',
          'Use the displayed holding pattern for the last-layer formula.',
          'Turn the whole cube to the formula holding pattern. This continuation is outside the Cross + F2L objective.',
          'lab-last-layer-hold',
          'rotation',
        );
      break;
    }
    const canonical = frame.toCanonical(state);
    const match = (section === 'lab-oll' ? recognizeAdvancedOLL : recognizeAdvancedPLL)(
      engine,
      canonical,
    );
    if (!match) throw Error('Unfinished last layer has no admitted match.');
    const v = ALGORITHM_REGISTRY.variants[match.variantId];
    if (match.setup.length)
      add(
        section,
        match.setup,
        section === 'lab-oll' ? 'f2l' : 'oll',
        `Match ${ALGORITHM_REGISTRY.cases[match.caseId].label}.`,
        'Align the upper layer with the displayed formula pattern.',
        'lab-last-layer-setup',
        'setup',
        undefined,
        match.caseId,
      );
    const evidence = engine.observe(state);
    const physicalEvidence = [...evidence.edges, ...evidence.corners]
      .filter((p) => p.slot.includes('U'))
      .map(
        (p) =>
          `${p.slot}: ${Object.entries(p.stickers)
            .map(([f, c]) => `${f} ${c}`)
            .join(', ')}`,
      )
      .join('; ');
    add(
      section,
      v.moves,
      section === 'lab-oll' ? 'oll' : 'pll',
      `${ALGORITHM_REGISTRY.cases[match.caseId].label}. ${physicalEvidence}`,
      section === 'lab-oll'
        ? `Turn every ${evidence.centers.U} last-layer sticker to the top, and restore the completed first two layers. Side colors can still need PLL.`
        : 'Put the last-layer pieces in their relative order while preserving their orientation and both completed layers. A final U alignment can still be needed.',
      'lab-last-layer-formula',
      'algorithm',
      v.id,
      v.caseId,
    );
  }
  const auf = advancedAufMoves(engine, frame.toCanonical(state));
  if (auf === null) throw Error('PLL endpoint cannot be aligned to a solved cube.');
  if (auf.length)
    add(
      'lab-auf',
      auf,
      'solved',
      'The last layer is in order but offset from the side centers.',
      'Align the upper layer with the side centers.',
      'lab-auf',
    );
  else skips.push({ section: 'lab-auf', reason: 'Every face is already aligned.' });
  if (!engine.isSolved(state)) throw Error('Lab continuation did not solve the cube.');
  const allMoves = actions.flatMap((a) => a.moves);
  if (allMoves.length > 512 || actions.length > 128)
    throw Error('Lab route exceeds its playback bounds.');
  let setupMoves: TeachingMove[];
  if (input.input.kind === 'scramble') setupMoves = [...input.input.moves];
  else {
    const queue = [{ state: engine.solved(), moves: [] as TeachingMove[] }],
      seen = new Set<string>();
    let orientation: TeachingMove[] | undefined;
    for (let head = 0; head < queue.length; head++) {
      budget.charge('expand');
      yield LAB_WORK;
      const current = queue[head];
      if (engine.equals(current.state, state)) {
        orientation = current.moves;
        break;
      }
      for (const turn of ['x', 'y'] as const) {
        const next = engine.apply(current.state, [turn]),
          key = next.data.CENTERS.pieces.join(',');
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ state: next, moves: [...current.moves, turn] });
        }
      }
      if (queue.length > 25) throw Error('Invalid solved holding orientation.');
    }
    if (!orientation) throw Error('No matching solved holding orientation.');
    setupMoves = [...orientation, ...invertTeachingMoves(allMoves)];
  }
  let setupState = engine.solved();
  for (const move of setupMoves) {
    setupState = engine.apply(setupState, [move]);
    yield LAB_WORK;
  }
  if (!engine.equals(setupState, input.initial))
    throw Error('Lab setup does not reconstruct the original input.');
  const formulas: Record<string, LabFormula> = {};
  for (const action of actions)
    if (action.algorithmId) formulas[action.algorithmId] = formulaSnapshot(action.algorithmId);
  const end = engine.observe(state).centers;
  return {
    kind: 'cfop-lab',
    schemaVersion: 1,
    id: labRouteId(input.fingerprint, actions),
    inputFingerprint: input.fingerprint,
    input: input.input,
    initial: input.initial,
    startHold: frame.hold,
    endHold: { bottom: end.D, front: end.F },
    positioningMoves: frame.positioningMoves,
    neutralGrip: context.profiles.neutralGrip,
    crossMinimum: cross.minimum,
    crossLength: cross.length,
    actions,
    skips,
    boundaries: { crossStart, crossEnd, f2lEnd },
    final: state,
    setupMoves,
    score: [...node.paths].sort(rankExecutionPaths)[0]?.score ?? {
      rated: false,
      reason: node.unratedReason ?? 'No admitted continuous grip path.',
    },
    searchVersion: LAB_SEARCH_VERSION,
    modelVersion: context.profiles.version,
    catalogVersion: LAB_CATALOG_VERSION,
    formulas,
  };
}
