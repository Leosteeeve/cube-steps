import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { fingerprintLabState, freezeLabValue } from '../../../lab/input';
import { ROUX_BLOCK_MANEUVERS } from '../../roux/blocks/catalog';
import { blockTargets, sameRouxPiece } from '../../roux/predicates';
import { rouxReferenceState } from '../../roux/frame';
import { ROUX_FRAMES, createRouxFrameMap } from '../frames';
import { blockCompleteInFrame } from '../predicates';
import { meterRouxEngine, RouxBudgetStop } from '../budget';
import type {
  AdvancedRouxActionDraft,
  BlockCandidate,
  RouxFrame,
  RouxSearchBudget,
  TwoBlockCandidate,
} from '../types';
import { firstBlockLowerBound, assertBlockSearchAssets, type BlockSearchAssets } from './distance';
import { firstBlockDraft, makeSecondBlockAction, twoBlockKey } from './continuation';
interface Node {
  state: CubeState;
  moves: TeachingMove[];
  actions: AdvancedRouxActionDraft[];
  priority: number;
  ready: number;
  mask: string;
  key: string;
  history: readonly string[];
}
export function selectContinuationFrontier<
  T extends { priority: number; ready: number; mask: string; key: string },
>(nodes: readonly T[], cap: 16 | 32): T[] {
  const groups = new Map<string, T[]>();
  const unique = new Map<string, T>();
  for (const node of nodes) {
    const old = unique.get(node.key);
    if (!old || node.priority < old.priority) unique.set(node.key, node);
  }
  for (const n of [...unique.values()].sort(
    (a, b) => a.priority - b.priority || b.ready - a.ready || a.key.localeCompare(b.key),
  )) {
    const group = groups.get(n.mask) ?? [];
    group.push(n);
    groups.set(n.mask, group);
  }
  const result: T[] = [];
  for (let i = 0; result.length < cap; i++) {
    let added = false;
    for (const g of groups.values())
      if (g[i] && result.length < cap) {
        result.push(g[i]);
        added = true;
      }
    if (!added) break;
  }
  return result.sort(
    (a, b) => a.priority - b.priority || b.ready - a.ready || a.key.localeCompare(b.key),
  );
}
export function* continueSecondBlock(
  raw: CubeEngine,
  first: BlockCandidate,
  frame: RouxFrame,
  assets: BlockSearchAssets,
  budget: RouxSearchBudget,
): Generator<{ kind: 'work' } | { kind: 'blocks'; candidate: TwoBlockCandidate }, void> {
  assertBlockSearchAssets(assets);
  const e = meterRouxEngine(raw, budget),
    cap = budget.mode === 'normal' ? 16 : 32,
    allocated = new Set<string>();
  const retain = (key: string, bytes: number) => {
    budget.retain(key, bytes);
    allocated.add(key);
  };
  const release = (key: string) => {
    budget.release(key);
    allocated.delete(key);
  };
  try {
    if (first.frameId !== frame.id || !blockCompleteInFrame(e, first.state, frame, 'left'))
      throw Error('Complete the requested first block before continuing.');
    const map = createRouxFrameMap(e, frame.id),
      opposite = ROUX_FRAMES.find((f) => f.bottom === frame.bottom && f.left === frame.centers.R)!;
    const targets = blockTargets(e, 'right'),
      reference = rouxReferenceState(e);
    const sequences = [
      ...ROUX_BLOCK_MANEUVERS.map((m) => m.moves),
      ...['Rw', "Rw'", 'Rw2'].map((m) => [m as TeachingMove]),
    ];
    const maneuvers: TeachingMove[][] = [];
    for (const m of sequences) {
      // A fixed transform preserving every left-block slot is valid in any held state.
      const physical = map.fromCanonical(e.apply(reference, m));
      if (blockCompleteInFrame(e, physical, frame, 'left')) maneuvers.push(m);
      yield { kind: 'work' };
    }
    const score = (
      state: CubeState,
      moves: TeachingMove[],
      actions: AdvancedRouxActionDraft[],
      history: readonly string[],
    ): Node => {
      budget.charge('score');
      const canonical = map.toCanonical(state),
        o = e.observe(canonical),
        pieces = [...o.edges, ...o.corners];
      const flags = targets.map((t) => pieces.some((p) => sameRouxPiece(p, t)));
      const lower = firstBlockLowerBound(e, e.apply(state, ['y2']), opposite, assets);
      return {
        state,
        moves,
        actions,
        priority: moves.length + lower,
        ready: flags.filter(Boolean).length,
        mask: flags.map(Number).join(''),
        key: fingerprintLabState(state) + '/' + (moves.at(-1) ?? ''),
        history,
      };
    };
    const initial = score(first.state, [], firstBlockDraft(e, first, frame), [
        fingerprintLabState(first.state),
      ]),
      seen = new Map<string, number>(),
      outputs = new Set<string>();
    let frontier = [initial];
    retain('sb-front/' + initial.key, 2200);
    while (frontier.length) {
      budget.charge('expand');
      const current = frontier.shift()!;
      release('sb-front/' + current.key);
      yield { kind: 'work' };
      if (blockCompleteInFrame(e, current.state, frame, 'right')) {
        const candidate = freezeLabValue({
          first,
          secondMoves: current.moves,
          state: current.state,
          secondTurns: current.moves.length,
          actions: current.actions,
        });
        const key = twoBlockKey(candidate);
        if (!outputs.has(key)) {
          retain('sb-output/' + key, 200 + key.length * 2);
          outputs.add(key);
          yield { kind: 'blocks', candidate };
        }
        if (outputs.size >= cap) return;
        continue;
      }
      if (current.moves.length >= 30) continue;
      for (const moves of maneuvers) {
        budget.charge('expand');
        if (
          moves.length === 1 &&
          current.moves.at(-1)?.replace(/['2]$/, '') === moves[0].replace(/['2]$/, '')
        )
          continue;
        const state = e.apply(current.state, moves),
          combined = [...current.moves, ...moves];
        if (combined.length > 30) continue;
        const stateKey = fingerprintLabState(state);
        if (current.history.includes(stateKey)) continue;
        const key = fingerprintLabState(state) + '/' + combined.at(-1);
        const prior = seen.get(key);
        if (prior !== undefined && prior <= combined.length) continue;
        // Named formulas are admitted only after their actual match/effect check.
        let action: AdvancedRouxActionDraft;
        try {
          action = makeSecondBlockAction(e, current.state, moves, frame);
        } catch (error) {
          if (error instanceof RouxBudgetStop) throw error;
          continue;
        }
        const next = score(
          state,
          combined,
          [...current.actions, action],
          [...current.history, stateKey],
        );
        retain('sb-seen/' + key, 200 + key.length * 2);
        seen.set(key, combined.length);
        const selected = selectContinuationFrontier([...frontier, next], cap);
        const selectedKeys = new Set(selected.map((n) => n.key));
        for (const old of frontier) if (!selectedKeys.has(old.key)) release('sb-front/' + old.key);
        if (selectedKeys.has(next.key))
          retain(
            'sb-front/' + next.key,
            2400 +
              next.actions.length * 1800 +
              JSON.stringify(next.moves).length * 2 +
              JSON.stringify(next.actions).length * 2 +
              JSON.stringify(next.history).length * 2,
          );
        frontier = selected;
        yield { kind: 'work' };
      }
    }
  } catch (error) {
    if (!(error instanceof RouxBudgetStop)) throw error;
  } finally {
    for (const key of allocated) budget.release(key);
  }
}
