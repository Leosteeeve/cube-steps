import type { CubeEngine, CubeState, SolveLimits } from '../../core/types';
import { createMethodTrace, type TraceBuilder } from '../shared/trace';
import { LBL_RUNTIME } from './definition';
export * from '../shared/trace';
export interface LBLContext {
  engine: CubeEngine;
  trace: TraceBuilder;
}
export function createTraceBuilder(
  engine: CubeEngine,
  initial: CubeState,
  limits?: SolveLimits,
): TraceBuilder {
  return createMethodTrace(engine, initial, LBL_RUNTIME, limits);
}
