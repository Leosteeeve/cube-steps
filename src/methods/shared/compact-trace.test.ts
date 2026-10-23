import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine, SolveTrace, TeachingMove, TraceAction } from '../../core/types';
import { compactTeachingTrace } from './compact-trace';
import { combineAdjacentTurns, joinTeachingActions } from './connected-actions';
import { solveCFOP } from '../cfop/solve';
import { CFOP_RUNTIME } from '../cfop/definition';
import { verifyTrace } from './verification';
import { seededScramble } from '../../../tests/fixtures/lbl-cases';
let engine: CubeEngine, trace: SolveTrace;
beforeAll(async () => {
  engine = await createCubeEngine();
  const r = solveCFOP(engine, engine.apply(engine.solved(), seededScramble(4)));
  if (!r.ok) throw Error(r.message);
  trace = r.trace;
});
it.each([
  ["R U R' R U2 R'", "R U' R'"],
  ["U' U R U' R'", "R U' R'"],
  ["M M' U M", 'U M'],
  ['U U', 'U2'],
  ['y y2', "y'"],
  ["R L R'", "R L R'"],
  ["R Rw'", "R Rw'"],
  ['M E S', 'M E S'],
])('combines only adjacent identical layers: %s', (input, expected) => {
  const moves = input.split(' ') as TeachingMove[];
  const actual = combineAdjacentTurns(moves);
  expect(actual.join(' ')).toBe(expected);
  expect(
    engine.equals(engine.apply(engine.solved(), actual), engine.apply(engine.solved(), moves)),
  ).toBe(true);
});
it('keeps original catalog formulas intact and verifies them, then checks the connected endpoint', () => {
  for (const action of trace.stages.flatMap((s) => s.actions).filter((a) => a.joined)) {
    expect(action.joined!.sources.every((s) => !s.joined)).toBe(true);
    for (const source of action.joined!.sources)
      if (source.algorithmId)
        expect(source.moves).toEqual(
          CFOP_RUNTIME.presentation.algorithms[source.algorithmId].moves,
        );
  }
  expect(() => verifyTrace(engine, trace, CFOP_RUNTIME)).not.toThrow();
  expect(compactTeachingTrace(engine, trace, CFOP_RUNTIME)).toEqual(trace);
});
it.each([
  'moves',
  'source-rule',
  'source-catalog',
  'source-state',
  'source-check',
  'nested',
  'saved',
  'recognition',
  'pair',
  'check',
])('rejects a forged connected action: %s', (field) => {
  const damaged = structuredClone(trace),
    action = damaged.stages.flatMap((s) => s.actions).find((a) => a.joined)!;
  const source = action.joined!.sources[0];
  if (field === 'moves') action.moves[0] = 'F';
  if (field === 'source-rule') source.ruleId = 'not-a-teaching-rule';
  if (field === 'source-catalog') source.algorithmId = 'pll-h';
  if (field === 'source-state') source.before = engine.solved();
  if (field === 'source-check') source.checkpoint.passed = false;
  if (field === 'nested') source.joined = { sources: [], savedMoves: 1 };
  if (field === 'saved') action.joined!.savedMoves++;
  if (field === 'recognition') action.recognition = 'Wrong target';
  if (field === 'pair') action.pair!.solvedAfter = 4;
  if (field === 'check') action.checkpoint.passed = false;
  expect(() => verifyTrace(engine, damaged, CFOP_RUNTIME)).toThrow();
});
it('preserves every stage boundary in an independently verified complete solve', () => {
  const raw = {
    ...trace,
    stages: trace.stages.map((s) => ({
      ...s,
      actions: s.actions.flatMap((a) => a.joined?.sources ?? [a]),
    })),
  };
  const compact = compactTeachingTrace(engine, raw, CFOP_RUNTIME);
  expect(compact.stages.map((s) => [s.id, s.before, s.after, s.checkpoint])).toEqual(
    raw.stages.map((s) => [s.id, s.before, s.after, s.checkpoint]),
  );
});
it('can omit a completely cancelling setup pair without inventing a turn', () => {
  const start = engine.solved(),
    middle = engine.apply(start, ['U']);
  const base = trace.stages.flatMap((s) => s.actions).find((a) => a.joined)!.joined!.sources[0];
  const sources: TraceAction[] = [
    { ...base, moves: ['U'], before: start, after: middle },
    { ...base, moves: ["U'"], before: middle, after: start },
  ];
  expect(joinTeachingActions(engine, sources).moves).toEqual([]);
});
it('rejects invalid original actions even when their turns completely cancel', () => {
  const result = solveCFOP(engine, engine.solved());
  if (!result.ok) throw Error(result.message);
  const damaged = structuredClone(result.trace),
    stage = damaged.stages[1];
  const start = stage.before,
    middle = engine.apply(start, ['R']);
  const base = trace.stages.flatMap((s) => s.actions).find((a) => a.joined)!.joined!.sources[0];
  stage.status = 'completed';
  stage.actions = [
    {
      ...base,
      kind: 'setup',
      algorithmId: undefined,
      ruleId: 'forged-rule',
      moves: ['R'],
      before: start,
      after: middle,
      checkpoint: { ...base.checkpoint, passed: false },
    },
    {
      ...base,
      kind: 'setup',
      algorithmId: undefined,
      ruleId: 'forged-rule',
      moves: ["R'"],
      before: middle,
      after: start,
      checkpoint: { ...base.checkpoint, passed: false },
    },
  ];
  expect(() => verifyTrace(engine, damaged, CFOP_RUNTIME)).toThrow();
  expect(() => compactTeachingTrace(engine, damaged, CFOP_RUNTIME)).toThrow();
});
