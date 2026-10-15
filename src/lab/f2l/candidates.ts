import type { CubeEngine, CubeState, TeachingMove } from '../../core/types';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
import type { AlgorithmVariant } from '../../algorithms/types';
import { observeF2LPairs, preservesF2L } from '../../methods/cfop/f2l-cases';
import { whiteCrossSolved } from '../../methods/shared/pieces';
import { f2lSignature, isAdmissibleF2L, U_ALIGNMENTS } from '../../methods/advanced/f2l/recognize';
import type { F2LTarget } from '../../methods/advanced/f2l/types';
import { LAB_WORK, LabStopped, meterLabEngine, type LabBudget, type LabWork } from '../budget';
import type { LabAction } from '../types';
import type { LabFrame } from '../frames';
import type { ExecutionCatalog, ExecutionPath, ExecutionSegment } from '../execution/types';
import { scoreExecution, rankExecutionPaths } from '../execution/score';
import { fingerprintLabState } from '../input';

export interface F2LNode {
  state: CubeState;
  frame: LabFrame;
  completedIds: readonly string[];
  actions: readonly LabAction[];
  segments: readonly ExecutionSegment[];
  paths: readonly ExecutionPath[];
  unratedReason?: string;
}
export interface LabInsertion extends F2LNode {
  target: F2LTarget;
  variantId: string;
}
interface Preparation {
  state: CubeState;
  actions: LabAction[];
  segments: ExecutionSegment[];
  depth: number;
}
const variants = new Map<string, AlgorithmVariant[]>();
for (const v of Object.values(ALGORITHM_REGISTRY.variants))
  if (v.targetSlot) {
    const list = variants.get(v.startSignature) ?? [];
    list.push(v);
    variants.set(v.startSignature, list);
  }
const HOLDS: readonly (readonly TeachingMove[])[] = [[], ['y'], ["y'"], ['y2']];
export function completedPhysicalPairs(
  engine: CubeEngine,
  state: CubeState,
  frame: LabFrame,
): string[] {
  return observeF2LPairs(engine, state)
    .filter((p) => p.solved)
    .map((p) => frame.physicalPieceId(p.cornerId))
    .sort();
}
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function compareF2LNodes(a: F2LNode, b: F2LNode): number {
  const score = (a.paths[0]?.score.cost ?? Infinity) - (b.paths[0]?.score.cost ?? Infinity);
  return (
    score ||
    order(a.actions.flatMap((x) => x.moves).join(' '), b.actions.flatMap((x) => x.moves).join(' '))
  );
}

function append(
  engine: CubeEngine,
  node: F2LNode,
  prep: Preparation,
  target: F2LTarget,
  moves: readonly TeachingMove[],
  kind: LabAction['kind'],
  rule: string,
  explanation: string,
  algorithmId?: string,
  final = false,
): Preparation {
  const frame = node.frame;
  const state = engine.apply(prep.state, moves);
  const before = frame.toPhysical(prep.state),
    after = frame.toPhysical(state);
  const observation = engine.observe(before);
  const current = observeF2LPairs(engine, prep.state).find((p) => p.cornerId === target.cornerId)!;
  const targets = [frame.physicalPieceId(target.cornerId), frame.physicalPieceId(target.edgeId)];
  const corner = observation.corners.find((p) => p.id === targets[0])!;
  const edge = observation.edges.find((p) => p.id === targets[1])!;
  const formula = algorithmId
    ? (ALGORITHM_REGISTRY.variants[algorithmId] ?? ALGORITHM_REGISTRY.preparations[algorithmId])
    : undefined;
  const caseId = algorithmId && ALGORITHM_REGISTRY.variants[algorithmId]?.caseId;
  const nextCenters = engine.observe(after).centers;
  const recognition = `Corner ${corner.slot} (${Object.entries(corner.stickers)
    .map(([f, c]) => `${f} ${c}`)
    .join(', ')}); edge ${edge.slot} (${Object.entries(edge.stickers)
    .map(([f, c]) => `${f} ${c}`)
    .join(
      ', ',
    )}).${caseId ? ` Matches ${ALGORITHM_REGISTRY.cases[caseId].label} for ${current.slot}.` : ''}`;
  const action: LabAction = {
    id: `lab-f2l-${node.actions.length + prep.actions.length}`,
    section: 'lab-f2l',
    kind,
    ruleId: rule,
    caseId: caseId || (rule === 'lab-f2l-extract' ? 'f2l-extraction' : 'f2l-preparation'),
    algorithmId,
    targets,
    recognition,
    explanation:
      kind === 'rotation'
        ? `Turn the whole cube ${moves.join(' ')}. Keep ${nextCenters.D} down and bring ${nextCenters.F} to the front before locating the pair again.`
        : explanation,
    moves,
    before,
    after,
    pair: {
      cornerId: targets[0],
      edgeId: targets[1],
      slot: current.slot,
      phase: final ? 'insert' : 'prepare',
      ordinal: node.completedIds.length + 1,
      solvedBefore: node.completedIds.length,
      solvedAfter: completedPhysicalPairs(engine, state, frame).length,
    },
    checkpoint: {
      predicate: final ? 'pair' : 'cross',
      description: final
        ? 'The target pair is solved; the cross and prior pairs are restored.'
        : 'The cross and prior pairs are restored.',
      protectedIds: node.completedIds,
      targets: final ? targets : [],
      hold: { bottom: nextCenters.D, front: nextCenters.F },
    },
  };
  const segment: ExecutionSegment = {
    phase: 'f2l',
    moves,
    algorithmId,
    recognition: formula?.f2lExecution
      ? {
          observation,
          target: {
            cornerId: targets[0],
            edgeId: targets[1],
            slot: current.slot as F2LTarget['slot'],
          },
          bottomColor: frame.hold.bottom,
          mode: formula.f2lExecution.recognition,
        }
      : undefined,
  };
  return {
    state,
    actions: [...prep.actions, action],
    segments: [...prep.segments, segment],
    depth: prep.depth,
  };
}

export function* enumerateLabInsertions(
  rawEngine: CubeEngine,
  node: F2LNode,
  requested: F2LTarget,
  frame: LabFrame,
  profiles: ExecutionCatalog,
  budget: LabBudget,
): Generator<LabWork | { kind: 'insertion'; candidate: LabInsertion }> {
  const engine = meterLabEngine(rawEngine, budget);
  budget.charge('expand');
  yield LAB_WORK;
  if (
    frame !== node.frame ||
    !whiteCrossSolved(engine, node.state) ||
    engine.observe(node.state).centers.D !== 'white'
  )
    throw Error('Invalid Lab F2L root.');
  const actual = observeF2LPairs(engine, node.state).find(
    (p) => p.cornerId === requested.cornerId && p.edgeId === requested.edgeId,
  );
  if (!actual) throw Error('Missing Lab F2L target.');
  if (actual.solved) return;
  const target = actual as F2LTarget;
  const queue: Preparation[] = [{ state: node.state, actions: [], segments: [], depth: 0 }];
  const heldEntries = new Set<unknown>();
  const seen = new Set<string>();
  const candidates: LabInsertion[] = [];
  const candidateEntries = new Map<LabInsertion, symbol>();
  const track = (key: unknown) => {
    if (!budget.retain(key)) throw new LabStopped('frontier-limit');
    heldEntries.add(key);
  };
  function register(prep: Preparation): boolean {
    // Different paths can reach the same cube with different terminal grips.
    const key =
      fingerprintLabState(prep.state) + '|' + prep.actions.flatMap((a) => a.moves).join(' ');
    if (seen.has(key) || seen.size >= 1024) return false;
    seen.add(key);
    track({ key });
    return true;
  }
  function retain(candidate: LabInsertion) {
    candidates.push(candidate);
    candidates.sort(compareF2LNodes);
    const diverse = new Map<string, LabInsertion>();
    for (const c of candidates) {
      const key = `${c.target.slot}|${c.variantId}|${c.paths[0]?.terminalGrip ?? 'unrated'}`;
      if (!diverse.has(key)) diverse.set(key, c);
    }
    // Keep one route in each physical working slot, then fill by model cost.
    const selected = new Set<LabInsertion>();
    const slots = new Set<string>();
    for (const c of diverse.values())
      if (!slots.has(c.target.slot)) {
        selected.add(c);
        slots.add(c.target.slot);
      }
    for (const c of diverse.values()) {
      if (selected.size >= 12) break;
      selected.add(c);
    }
    for (const [old, key] of candidateEntries)
      if (!selected.has(old)) {
        budget.release(key);
        heldEntries.delete(key);
        candidateEntries.delete(old);
      }
    if (selected.has(candidate) && !candidateEntries.has(candidate)) {
      const key = Symbol('insertion');
      track(key);
      candidateEntries.set(candidate, key);
    }
    candidates.splice(0, candidates.length, ...[...selected].sort(compareF2LNodes));
  }
  try {
    register(queue[0]);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const entry = queue[cursor];
      for (const rotation of HOLDS) {
        budget.charge('expand');
        yield LAB_WORK;
        const held = rotation.length
          ? append(engine, node, entry, target, rotation, 'rotation', 'lab-f2l-hold', '')
          : entry;
        const admissible = isAdmissibleF2L(engine, held.state, target);
        const o = engine.observe(held.state);
        const pair = observeF2LPairs(engine, held.state).find(
          (p) => p.cornerId === target.cornerId,
        )!;
        const c = o.corners.find((p) => p.id === target.cornerId)!,
          e = o.edges.find((p) => p.id === target.edgeId)!;
        const wrongCorner =
          !c.slot.includes('U') && ![...pair.slot].every((f) => c.slot.includes(f));
        const occupied = wrongCorner ? c.slot.replace('D', '') : e.slot;
        const extractionSlot = ['FR', 'FL', 'BR', 'BL'].find(
          (s) => [...s].sort().join('') === [...occupied].sort().join(''),
        );
        for (const u of U_ALIGNMENTS) {
          budget.charge('expand');
          yield LAB_WORK;
          const aligned = u.length
            ? append(
                engine,
                node,
                held,
                target,
                u,
                'setup',
                'lab-f2l-align',
                'Align the upper layer for the recognized formula while preserving the completed pairs.',
              )
            : held;
          if (admissible) {
            for (const variant of variants.get(f2lSignature(engine, aligned.state, target)) ?? []) {
              budget.charge('expand');
              yield LAB_WORK;
              const inserted = append(
                engine,
                node,
                aligned,
                target,
                variant.moves,
                'algorithm',
                'lab-f2l-insert',
                variant.effect,
                variant.id,
                true,
              );
              const completedIds = completedPhysicalPairs(engine, inserted.state, frame);
              if (
                completedIds.length <= node.completedIds.length ||
                !completedIds.includes(frame.physicalPieceId(target.cornerId)) ||
                !preservesF2L(engine, node.state, inserted.state)
              )
                continue;
              let paths: readonly ExecutionPath[] = [],
                unratedReason = node.unratedReason;
              if (!unratedReason)
                for (const event of scoreExecution(
                  inserted.segments,
                  profiles,
                  budget,
                  node.paths,
                )) {
                  if (event.kind === 'work') yield event;
                  else {
                    paths = event.paths;
                    unratedReason = event.unratedReason;
                  }
                }
              const atInsertion = observeF2LPairs(engine, aligned.state).find(
                (p) => p.cornerId === target.cornerId,
              )!;
              retain({
                state: inserted.state,
                frame,
                completedIds,
                actions: [...node.actions, ...inserted.actions],
                segments: [...node.segments, ...inserted.segments],
                paths: [...paths].sort(rankExecutionPaths),
                unratedReason,
                target: atInsertion as F2LTarget,
                variantId: variant.id,
              });
            }
          } else if (entry.depth < 2 && extractionSlot) {
            const id = `advanced-extract/${extractionSlot.toLowerCase()}/toward`,
              formula = ALGORITHM_REGISTRY.preparations[id];
            const extracted = append(
              engine,
              node,
              aligned,
              target,
              formula.moves,
              'algorithm',
              'lab-f2l-extract',
              formula.effect,
              id,
            );
            const nextO = engine.observe(extracted.state);
            const lifted = (wrongCorner ? nextO.corners : nextO.edges).find(
              (p) => p.id === (wrongCorner ? target.cornerId : target.edgeId),
            )!;
            if (lifted.slot.includes('U') && preservesF2L(engine, node.state, extracted.state)) {
              extracted.depth = entry.depth + 1;
              if (register(extracted)) queue.push(extracted);
            }
          }
        }
      }
    }
    for (const candidate of candidates) {
      budget.checkpoint();
      yield { kind: 'insertion', candidate };
    }
  } finally {
    for (const key of heldEntries) budget.release(key);
  }
}
