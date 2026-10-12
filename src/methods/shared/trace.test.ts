import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { LBL_RUNTIME } from '../lbl/definition';
import { createMethodTrace } from './trace';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
it('keeps a method identity and refuses a stage from another method', () => {
  const trace = createMethodTrace(engine, engine.solved(), LBL_RUNTIME);
  expect(trace.method).toBe('lbl');
  expect(() => trace.beginStage('cfop-cross')).toThrow(/method/i);
  expect(LBL_RUNTIME.checkStage(engine, engine.solved(), 'cfop-cross')).toBe(false);
});
it('cannot overwrite an open stage', () => {
  const trace = createMethodTrace(engine, engine.solved(), LBL_RUNTIME);
  trace.beginStage('white-cross');
  expect(() => trace.beginStage('first-layer')).toThrow(/close/i);
});
