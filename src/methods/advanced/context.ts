import type { CubeEngine } from '../../core/types';
import type { TraceBuilder } from '../shared/trace';
import type { CrossTable } from './cross/table';
import { canonicalHoldingMoves } from '../../core/holding-frame';
export interface AdvancedContext {
  engine: CubeEngine;
  trace: TraceBuilder;
  crossTable: CrossTable;
}
export function ensureAdvancedHolding({ engine, trace }: AdvancedContext): void {
  const moves = canonicalHoldingMoves(engine, trace.current);
  if (!moves.length) return;
  trace.append({
    kind: 'regrip',
    ruleId: 'advanced-holding',
    caseId: 'white-down-green-front',
    targets: [],
    moves,
    recognition: `White currently faces ${Object.entries(engine.observe(trace.current).centers).find(([, c]) => c === 'white')![0]}.`,
    explanation:
      'Rotate the whole cube to hold white down and green in front. Follow these physical rotations; moving the camera only changes your view.',
    check: {
      id: 'advanced-holding',
      description: 'White faces down and green faces front.',
      test: (s) => {
        const c = engine.observe(s).centers;
        return c.D === 'white' && c.F === 'green';
      },
    },
  });
}
