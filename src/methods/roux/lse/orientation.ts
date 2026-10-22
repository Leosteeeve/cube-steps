import type { CubeEngine, CubeState } from '../../../core/types';
import { observeRouxFrame } from '../frame';
import type { RouxBudget } from '../budget';
import type { LseTables } from './policies';
import { traverseLse } from './traverse';
export function observeLseEO(
  engine: CubeEngine,
  state: CubeState,
): { reference: 'ready'; badIds: string[] } | { reference: 'setup-required'; badIds: null } {
  const frame = observeRouxFrame(engine, state);
  if (!frame.sideFrameValid)
    throw Error('Establish the fixed Roux frame before reading edge orientation.');
  if (!frame.eoReferenceValid) return { reference: 'setup-required', badIds: null };
  const slots = ['UF', 'UR', 'UB', 'UL', 'DF', 'DB'];
  return {
    reference: 'ready',
    badIds: engine
      .observe(state)
      .edges.filter(
        (p) =>
          slots.includes(p.slot) &&
          ![p.stickers.U, p.stickers.D].some((c) => c === 'white' || c === 'yellow'),
      )
      .map((p) => p.id),
  };
}
export const planEdgeOrientation = (
  engine: CubeEngine,
  initial: CubeState,
  tables: LseTables,
  budget: RouxBudget,
) => traverseLse(engine, initial, tables, budget, 'orientation');
