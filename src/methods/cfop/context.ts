import type { CubeEngine } from '../../core/types';
import type { TraceBuilder } from '../shared/trace';
import { whiteDownMoves } from './stages';
export interface CFOPContext { engine: CubeEngine; trace: TraceBuilder }
export function ensureWhiteDown({ engine, trace }: CFOPContext): void {
  const moves = whiteDownMoves(engine, trace.current);
  if (!moves.length) return;
  trace.append({ kind: 'regrip', ruleId: 'cfop-hold-white-down', caseId: 'white-down', targets: [], moves,
    recognition: `The white center currently faces ${Object.entries(engine.observe(trace.current).centers).find(([, c]) => c === 'white')![0]}.`,
    explanation: 'Rotate the whole cube to put white on the bottom and yellow on top. Follow this physical regrip; orbiting the camera does not turn your cube.',
    check: { id: 'white-down', description: 'White is down and yellow is up.', test: s => engine.observe(s).centers.D === 'white' },
  });
}
