import type { CubeEngine, CubeState, ExecutionMetrics } from '../../../core/types';
import { DEFAULT_F2L_LIMITS, type F2LTarget, type F2LLimits, type F2LPreparation } from './types';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
import { whiteCrossSolved } from '../../shared/pieces';
import { RuleError, type ActionInput } from '../../shared/trace';
import { isAdmissibleF2L, U_ALIGNMENTS } from './recognize';
import { F2L_CATALOG } from '../../../algorithms/data/f2l';
import { enumerateF2LHolds } from './holding';
import { measureF2LExecution, compareExecution, compareText, zeroExecution } from './execution';
type Path = F2LPreparation & { metrics: ExecutionMetrics };
export function enumerateF2LPreparations(
  engine: CubeEngine,
  state: CubeState,
  target: F2LTarget,
  limits: F2LLimits = DEFAULT_F2L_LIMITS,
): F2LPreparation[] {
  const current = observeF2LPairs(engine, state).find(
    (p) => p.cornerId === target.cornerId && p.edgeId === target.edgeId,
  );
  if (!current || engine.observe(state).centers.D !== 'white' || !whiteCrossSolved(engine, state))
    throw new RuleError(
      'unsupported-case',
      'advanced-f2l',
      'Pair preparation requires a valid target and a matched white bottom cross.',
    );
  if (current.solved) return [];
  const seen = new Set<string>();
  const keys = new WeakMap<CubeState, string>();
  const key = (s: CubeState) => {
    let k = keys.get(s);
    if (!k) {
      k = JSON.stringify(s.data);
      keys.set(s, k);
    }
    return k;
  };
  function register(s: CubeState) {
    const k = key(s);
    if (!seen.has(k)) {
      if (seen.size >= limits.maxPreparationStates)
        throw new RuleError('budget', 'advanced-f2l', 'F2L preparation state budget exceeded.');
      seen.add(k);
    }
    return k;
  }
  function prefer(paths: Map<string, Path>, candidate: Path) {
    const k = register(candidate.state),
      old = paths.get(k);
    const comparison = old
      ? compareExecution(candidate.metrics, old.metrics) ||
        compareText(
          candidate.actions.flatMap((a) => a.moves).join(' '),
          old.actions.flatMap((a) => a.moves).join(' '),
        )
      : -1;
    if (comparison < 0) paths.set(k, candidate);
  }
  let frontier = new Map<string, Path>([
    [register(state), { state, actions: [], metrics: zeroExecution() }],
  ]);
  for (let depth = 0; depth <= limits.maxExtractionMacros; depth++) {
    const heldPaths = new Map<string, Path>(),
      results = new Map<string, Path>(),
      next = new Map<string, Path>();
    for (const entry of frontier.values())
      for (const hold of enumerateF2LHolds(engine, entry.state, target)) {
        const actions = [...entry.actions, ...hold.actions],
          rotations = hold.actions.length;
        prefer(heldPaths, {
          state: hold.state,
          actions,
          metrics: {
            ...entry.metrics,
            effort: entry.metrics.effort + rotations,
            rotations: entry.metrics.rotations + rotations,
          },
        });
      }
    for (const entry of heldPaths.values()) {
      const admissible = isAdmissibleF2L(engine, entry.state, target),
        o = engine.observe(entry.state);
      const pair = observeF2LPairs(engine, entry.state).find(
        (p) => p.cornerId === target.cornerId,
      )!;
      const corner = o.corners.find((p) => p.id === target.cornerId)!,
        edge = o.edges.find((p) => p.id === target.edgeId)!;
      const wrongCorner =
        !corner.slot.includes('U') && ![...pair.slot].every((f) => corner.slot.includes(f));
      const occupied = wrongCorner ? corner.slot.replace('D', '') : edge.slot;
      const slot = ['FR', 'FL', 'BR', 'BL'].find(
        (s) => [...s].sort().join('') === [...occupied].sort().join(''),
      );
      for (const u of U_ALIGNMENTS) {
        const aligned = u.length ? engine.apply(entry.state, u) : entry.state;
        register(aligned);
        const actions = [...entry.actions];
        if (u.length)
          actions.push({
            kind: 'setup',
            ruleId: 'advanced-f2l-align',
            caseId: 'f2l-preparation',
            targets: [target.cornerId, target.edgeId],
            recognition: `Target corner at ${corner.slot}; target edge at ${edge.slot}.`,
            explanation:
              'Align the upper layer for the next complete maneuver; the cross and completed pairs stay in place.',
            moves: [...u],
          });
        const alignedMetrics = {
          ...entry.metrics,
          faceTurns: entry.metrics.faceTurns + u.length,
          effort: entry.metrics.effort + u.length,
        };
        if (admissible) {
          prefer(results, { state: aligned, actions, metrics: alignedMetrics });
          continue;
        }
        if (depth === limits.maxExtractionMacros || !slot) continue;
        const algorithmId = `advanced-extract/${slot.toLowerCase()}/toward`,
          algorithm = F2L_CATALOG.preparations[algorithmId];
        const after = engine.apply(aligned, algorithm.moves);
        if (!preservesF2L(engine, entry.state, after)) continue;
        const afterO = engine.observe(after),
          lifted = wrongCorner
            ? afterO.corners.find((p) => p.id === target.cornerId)!
            : afterO.edges.find((p) => p.id === target.edgeId)!;
        if (!lifted.slot.includes('U')) continue;
        const action: ActionInput = {
          kind: 'algorithm',
          ruleId: 'advanced-f2l-extract',
          caseId: `f2l-extraction-${slot.toLowerCase()}`,
          algorithmId,
          targets: [target.cornerId, target.edgeId],
          recognition: `The target ${wrongCorner ? 'corner' : 'edge'} is trapped in the unsolved ${slot} slot.`,
          explanation: algorithm.effect,
          moves: [...algorithm.moves],
          check: {
            id: 'f2l-protected',
            description: 'The white cross and every previously completed pair are restored.',
            test: (s) => preservesF2L(engine, aligned, s),
          },
        };
        const m = measureF2LExecution(engine, aligned, target, [action]);
        prefer(next, {
          state: after,
          actions: [...actions, action],
          metrics: {
            quality: alignedMetrics.quality + m.quality,
            faceTurns: alignedMetrics.faceTurns + m.faceTurns,
            rotations: alignedMetrics.rotations + m.rotations,
            effort: alignedMetrics.effort + m.effort,
            reasons: [...alignedMetrics.reasons, ...m.reasons],
          },
        });
      }
    }
    if (results.size) return [...results.values()].map(({ metrics: _, ...p }) => p);
    frontier = next;
    if (!frontier.size) break;
  }
  throw new RuleError(
    'budget',
    'advanced-f2l',
    'No protected preparation within the F2L extraction depth budget.',
  );
}
