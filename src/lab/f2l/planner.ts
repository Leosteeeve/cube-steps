import type { CubeEngine } from '../../core/types';
import type { CrossCandidate } from '../cross';
import type { ExecutionCatalog, ExecutionPath } from '../execution/types';
import { scoreExecution } from '../execution/score';
import { LAB_WORK, LabStopped, meterLabEngine, type LabBudget, type LabWork } from '../budget';
import { observeF2LPairs } from '../../methods/cfop/f2l-cases';
import type { F2LTarget } from '../../methods/advanced/f2l/types';
import { fingerprintLabState } from '../input';
import {
  enumerateLabInsertions,
  completedPhysicalPairs,
  compareF2LNodes,
  type F2LNode,
} from './candidates';
export type { F2LNode, LabInsertion } from './candidates';
export interface CompletedF2L {
  kind: 'f2l';
  cross: CrossCandidate;
  node: F2LNode;
}
export type F2LProgress = LabWork | CompletedF2L;

function* rootSteps(
  engine: CubeEngine,
  cross: CrossCandidate,
  profiles: ExecutionCatalog,
  budget: LabBudget,
): Generator<LabWork, F2LNode> {
  const segments = [{ phase: 'cross' as const, moves: cross.moves }];
  let paths: readonly ExecutionPath[] = [],
    unratedReason: string | undefined;
  for (const event of scoreExecution(segments, profiles, budget)) {
    if (event.kind === 'work') yield event;
    else {
      paths = event.paths;
      unratedReason = event.unratedReason;
    }
  }
  budget.charge('expand');
  yield LAB_WORK;
  return {
    state: cross.canonicalAfter,
    frame: cross.frame,
    completedIds: completedPhysicalPairs(
      meterLabEngine(engine, budget),
      cross.canonicalAfter,
      cross.frame,
    ),
    actions: [],
    segments,
    paths,
    unratedReason,
  };
}
/** Bounded synchronous fixture helper; production uses rootSteps through planLabF2L. */
export function createF2LRoot(
  engine: CubeEngine,
  cross: CrossCandidate,
  profiles: ExecutionCatalog,
  budget: LabBudget,
): F2LNode {
  const steps = rootSteps(engine, cross, profiles, budget);
  for (;;) {
    const result = steps.next();
    if (result.done) return result.value;
  }
}
export function f2lNodeKey(node: F2LNode, profiles: ExecutionCatalog): string {
  return [
    profiles.version,
    fingerprintLabState(node.state),
    node.frame.hold.bottom,
    node.completedIds.join(','),
    node.paths
      .map(
        (p) =>
          `${p.terminalGrip}:${p.score.cost}:${p.score.T}:${p.score.R}:${p.score.G}:${p.score.V}:${p.score.A}`,
      )
      .sort()
      .join('|'),
    node.unratedReason ?? '',
  ].join(';');
}

export function* planLabF2L(
  rawEngine: CubeEngine,
  cross: CrossCandidate,
  profiles: ExecutionCatalog,
  budget: LabBudget,
): Generator<F2LProgress> {
  const engine = meterLabEngine(rawEngine, budget);
  const root = yield* rootSteps(engine, cross, profiles, budget);
  if (root.completedIds.length === 4) {
    yield { kind: 'f2l', cross, node: root };
    return;
  }
  const emitted = new Map<string, symbol>();
  // A complete width-one seed comes before the wider beam. Both compare every
  // remaining target at each depth and share the same budget and model.
  try {
    for (const width of [1, 32]) {
      let frontier = [root];
      const owned = new Set<unknown>();
      const track = (node: F2LNode) => {
        if (!budget.retain(node)) throw new LabStopped('frontier-limit');
        owned.add(node);
      };
      try {
        track(root);
        for (let depth = 0; depth < 4 && frontier.length; depth++) {
          const next = new Map<string, F2LNode>();
          for (const node of frontier) {
            budget.charge('expand');
            yield LAB_WORK;
            const targets = observeF2LPairs(engine, node.state).filter((p) => !p.solved);
            for (const target of targets) {
              for (const event of enumerateLabInsertions(
                engine,
                node,
                target as F2LTarget,
                node.frame,
                profiles,
                budget,
              )) {
                if (event.kind === 'work') {
                  yield event;
                  continue;
                }
                const candidate = event.candidate;
                budget.charge('expand');
                yield LAB_WORK;
                if (candidate.completedIds.length === 4) {
                  const key = candidate.actions.flatMap((a) => a.moves).join(' ');
                  if (!emitted.has(key)) {
                    const retained = Symbol('completed F2L');
                    if (!budget.retain(retained)) throw new LabStopped('frontier-limit');
                    emitted.set(key, retained);
                    yield { kind: 'f2l', cross, node: candidate };
                  }
                  continue;
                }
                const key = f2lNodeKey(candidate, profiles),
                  existing = next.get(key);
                // Cache hits still consume an expansion and a cooperative work event.
                if (existing && compareF2LNodes(existing, candidate) <= 0) continue;
                if (existing) {
                  budget.release(existing);
                  owned.delete(existing);
                }
                track(candidate);
                next.set(key, candidate);
                if (next.size > width) {
                  const worst = [...next.entries()]
                    .sort((a, b) => compareF2LNodes(a[1], b[1]))
                    .at(-1)!;
                  next.delete(worst[0]);
                  budget.release(worst[1]);
                  owned.delete(worst[1]);
                }
              }
            }
            budget.release(node);
            owned.delete(node);
          }
          frontier = [...next.values()].sort(compareF2LNodes);
        }
      } finally {
        for (const key of owned) budget.release(key);
      }
    }
  } finally {
    for (const key of emitted.values()) budget.release(key);
  }
}
