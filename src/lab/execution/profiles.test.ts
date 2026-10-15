import { expect, it } from 'vitest';
import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
import { EXECUTION_CATALOG, admitExecutionCatalog } from './profiles';

it('admits exact formula tokens and explicit feasible grip transitions', () => {
  expect(() => admitExecutionCatalog(EXECUTION_CATALOG)).not.toThrow();
  for (const [id, variant] of Object.entries(ALGORITHM_REGISTRY.variants)) {
    if (!variant.targetSlot) continue;
    expect(EXECUTION_CATALOG.formulas[id].moves).toEqual(variant.moves);
    expect(EXECUTION_CATALOG.formulas[id].rationale.length).toBeGreaterThan(0);
  }
});

it('rejects impossible grip IDs and unbound formula tokens rather than inventing handling', () => {
  const bad = structuredClone(EXECUTION_CATALOG);
  bad.tokens.R!.transitions[0].to = 'missing-grip';
  expect(() => admitExecutionCatalog(bad)).toThrow(/grip/i);
  const altered = structuredClone(EXECUTION_CATALOG);
  const id = Object.keys(altered.formulas)[0];
  altered.formulas[id].moves = ['R'];
  expect(() => admitExecutionCatalog(altered)).toThrow(/formula/i);
});

it('rotations include handling once and preserve instructions instead of claiming measured fingers', () => {
  for (const transition of EXECUTION_CATALOG.tokens.y2!.transitions) {
    expect(transition.to).toBe(EXECUTION_CATALOG.neutralGrip);
    expect(transition.instruction).toMatch(/whole cube/i);
    expect(transition.awkward).toBe('none');
  }
});

it('rejects a wrist turn profile that leaves the wrist unchanged', () => {
  const bad = structuredClone(EXECUTION_CATALOG);
  bad.tokens.R!.transitions[0].to = bad.tokens.R!.transitions[0].from;
  expect(() => admitExecutionCatalog(bad)).toThrow(/grip transition/i);
});
