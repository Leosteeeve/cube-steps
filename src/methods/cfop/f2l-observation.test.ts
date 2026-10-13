import { it, expect, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { observeF2LPairs } from './f2l-cases';
it('reuses pair observations for deeply frozen states but rereads mutable inputs', async () => {
  const engine = await createCubeEngine(),
    state = engine.apply(engine.solved(), ['z2']);
  const observe = vi.spyOn(engine, 'observe');
  try {
    expect(observeF2LPairs(engine, state).every((p) => p.solved)).toBe(true);
    expect(observeF2LPairs(engine, state).every((p) => p.solved)).toBe(true);
    expect(observe).toHaveBeenCalledTimes(1);
    const mutable = structuredClone(state);
    expect(observeF2LPairs(engine, mutable).every((p) => p.solved)).toBe(true);
    mutable.data = structuredClone(engine.apply(state, ['R', 'U', "R'"]).data);
    expect(observeF2LPairs(engine, mutable).some((p) => !p.solved)).toBe(true);
  } finally {
    observe.mockRestore();
  }
});
