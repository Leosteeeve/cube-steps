import { expect, it } from 'vitest';
import type { SolveTrace, TeachingMove, TraceAction, TraceStage } from '../core/types';
import { summarizeTraceMoves } from './solve-comparison-metrics';

const cube = { data: {} };
const checkpoint = { id: 'test', passed: true, description: '' };
function action(moves: TeachingMove[]): TraceAction {
  return {
    kind: 'setup',
    ruleId: '',
    caseId: '',
    targets: [],
    recognition: '',
    explanation: '',
    before: cube,
    after: cube,
    moves,
    checkpoint,
  };
}
function trace(actions: TraceAction[]): SolveTrace {
  const stage: TraceStage = {
    id: 'first-layer',
    status: 'completed',
    before: cube,
    after: cube,
    actions,
    checkpoint,
  };
  return { method: 'lbl', initial: cube, stages: [stage], final: cube };
}
it('counts the performed notation once, excluding whole-cube rotations and reference formulas', () => {
  const joined = {
    ...action(['R2', 'Uw2', 'M2', "E'", 'S', 'x2', "y'", 'z']),
    kind: 'joined' as const,
    joined: { sources: [action(['F', "F'", 'M', 'y'])], savedMoves: 2 },
  };
  expect(summarizeTraceMoves(trace([joined, action(["D'"])]))).toEqual({
    turns: 6,
    slices: 3,
    rotations: 3,
  });
  expect(summarizeTraceMoves(trace([]))).toEqual({ turns: 0, slices: 0, rotations: 0 });
});
