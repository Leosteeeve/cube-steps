import type { CubeEngine, CubeState } from '../../../core/types';
import { DEFAULT_F2L_LIMITS, type F2LTarget, type F2LLimits, type F2LPreparation } from './types';
import { observeF2LPairs, preservesF2L } from '../../cfop/f2l-cases';
import { whiteCrossSolved } from '../../shared/pieces';
import { RuleError, type ActionInput } from '../../shared/trace';
import { isAdmissibleF2L, U_ALIGNMENTS } from './recognize';
import { F2L_CATALOG } from '../../../algorithms/data/f2l';
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
  const queue = [{ state, actions: [] as ActionInput[], depth: 0 }],
    seen = new Set<string>(),
    results: F2LPreparation[] = [];
  function register(s: CubeState): boolean {
    const key = JSON.stringify([target.cornerId, target.edgeId, s.data]);
    if (seen.has(key)) return false;
    if (seen.size >= limits.maxPreparationStates)
      throw new RuleError('budget', 'advanced-f2l', 'F2L preparation state budget exceeded.');
    seen.add(key);
    return true;
  }
  register(state);
  let reachedDepth = Infinity,
    exhausted = false;
  for (let head = 0; head < queue.length; head++) {
    const entry = queue[head];
    if (entry.depth > reachedDepth) continue;
    const admissible = isAdmissibleF2L(engine, entry.state, target);
    if (admissible) reachedDepth = entry.depth;
    const o = engine.observe(entry.state),
      pair = observeF2LPairs(engine, entry.state).find((p) => p.cornerId === target.cornerId)!;
    const corner = o.corners.find((p) => p.id === target.cornerId)!,
      edge = o.edges.find((p) => p.id === target.edgeId)!;
    // Extract the trapped corner first, otherwise the trapped edge. Other slots are irrelevant.
    const wrongCorner =
      !corner.slot.includes('U') && ![...pair.slot].every((f) => corner.slot.includes(f));
    const workingSlot = wrongCorner
      ? corner.slot.replace('D', '').split('').sort().join('')
      : edge.slot;
    const slot = ['FR', 'FL', 'BR', 'BL'].find(
      (s) => [...s].sort().join('') === workingSlot.split('').sort().join(''),
    );
    for (const u of U_ALIGNMENTS) {
      const aligned = u.length ? engine.apply(entry.state, u) : entry.state;
      if (u.length) register(aligned);
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
      if (admissible) {
        results.push({ state: aligned, actions });
        continue;
      }
      if (entry.depth >= limits.maxExtractionMacros) {
        exhausted = true;
        continue;
      }
      if (!slot) continue;
      // One complete lift per slot, with four U alignments, covers all trapped
      // targets while leaving room for the second lift in the 256-state budget.
      for (const direction of ['toward']) {
        const algorithmId = `advanced-extract/${slot.toLowerCase()}/${direction}`,
          algorithm = F2L_CATALOG.preparations[algorithmId];
        const after = engine.apply(aligned, algorithm.moves);
        if (!preservesF2L(engine, entry.state, after)) continue;
        const afterO = engine.observe(after),
          c = afterO.corners.find((p) => p.id === target.cornerId)!,
          e = afterO.edges.find((p) => p.id === target.edgeId)!;
        // The named trapped piece must actually leave its occupied slot.
        if (wrongCorner ? !c.slot.includes('U') : !e.slot.includes('U')) continue;
        if (!register(after)) continue;
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
        queue.push({ state: after, actions: [...actions, action], depth: entry.depth + 1 });
      }
    }
  }
  if (!results.length)
    throw new RuleError(
      exhausted ? 'budget' : 'unsupported-case',
      'advanced-f2l',
      exhausted
        ? 'F2L extraction depth budget exceeded.'
        : 'No protected preparation reaches an admitted F2L case.',
    );
  const unique = new Map<string, F2LPreparation>();
  for (const result of results) {
    const key = JSON.stringify(result.state.data);
    if (!unique.has(key)) unique.set(key, result);
  }
  return [...unique.values()];
}
