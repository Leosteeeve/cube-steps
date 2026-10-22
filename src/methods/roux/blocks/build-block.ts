import type { CubeEngine, CubeState } from '../../../core/types';
import type { RouxActionDraft, RouxPlanResult } from '../types';
import { observeRouxFrame } from '../frame';
import { blockComplete } from '../predicates';
import type { RouxBudget } from '../budget';
import { blockGoals } from './policies';
import { planBlockGoal } from './planner';
import type { RouxBlockPolicies } from './types';
export function planSideBlock(
  engine: CubeEngine,
  initial: CubeState,
  side: 'left' | 'right',
  policies: RouxBlockPolicies,
  budget: RouxBudget,
): RouxPlanResult {
  const stageId = side === 'left' ? 'roux-first-block' : 'roux-second-block';
  if (!observeRouxFrame(engine, initial).sideFrameValid)
    return {
      ok: false,
      code: 'verification',
      stageId,
      message: 'Start with blue left and green right in the Roux holding frame.',
    };
  if (side === 'right' && !blockComplete(engine, initial, 'left'))
    return {
      ok: false,
      code: 'verification',
      stageId,
      message: 'Complete the left block before building the right block.',
    };
  if (blockComplete(engine, initial, side)) return { ok: true, state: initial, actions: [] };
  const goals = blockGoals(engine).filter((g) => g.side === side),
    base = goals.find((g) => g.phase === 'base')!;
  const baseResult = planBlockGoal(engine, initial, base, policies, budget);
  if (!baseResult.ok) return baseResult;
  const pairGoals = goals.filter(
    (g) =>
      g.phase === 'pair' && g.lockedIds.length === base.lockedIds.length + base.targetIds.length,
  );
  const candidates: {
    state: CubeState;
    actions: RouxActionDraft[];
    rear: number;
    tokens: number;
    id: string;
  }[] = [];
  for (const first of pairGoals) {
    const a = planBlockGoal(engine, baseResult.state, first, policies, budget);
    if (!a.ok) return a;
    const second = goals.find(
      (g) =>
        g.phase === 'pair' &&
        !g.targetIds.some((id) => first.targetIds.includes(id)) &&
        first.targetIds.every((id) => g.lockedIds.includes(id)),
    )!;
    const b = planBlockGoal(engine, a.state, second, policies, budget);
    if (!b.ok) return b;
    const actions = [...baseResult.actions, ...a.actions, ...b.actions];
    let state = initial,
      rear = 0;
    for (const action of actions) {
      const o = engine.observe(state);
      rear += [...o.edges, ...o.corners].filter(
        (p) => action.targets.includes(p.id) && p.slot.includes('B'),
      ).length;
      state = engine.apply(state, action.moves);
    }
    candidates.push({
      state: b.state,
      actions,
      rear,
      tokens: actions.reduce((n, a) => n + a.moves.length, 0),
      id: actions.map((a) => a.ruleId).join('/'),
    });
  }
  candidates.sort(
    (a, b) =>
      a.actions.length - b.actions.length ||
      a.rear - b.rear ||
      a.tokens - b.tokens ||
      a.id.localeCompare(b.id),
  );
  const best = candidates[0];
  if (!best || !blockComplete(engine, best.state, side))
    return {
      ok: false,
      code: 'verification',
      stageId,
      message: 'The block route failed its physical checkpoint.',
    };
  return { ok: true, state: best.state, actions: best.actions };
}
