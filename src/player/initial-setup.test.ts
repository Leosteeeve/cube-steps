import { beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, SolveSession, TeachingMove } from '../core/types';
import { GOLDEN_CASES } from '../../tests/fixtures/facelet-cases';
import { solveLBL } from '../methods/lbl/solve';
import { flattenTrace } from '../methods/lbl/trace';
import { buildInitialSetup } from './initial-setup';
import { createPlaybackController } from './controller';
import { solveCFOP } from '../methods/cfop/solve';
import { CFOP_ALGORITHMS } from '../methods/cfop/catalog';
import { invertTeachingMoves } from '../core/teaching-moves';
import { stateToFacelets } from '../core/facelets';
let engine: CubeEngine, session: SolveSession;
it.each(['pll-h', 'pll-z'])(
  'initializes exact entered colors for %s without counting the hidden setup',
  (id) => {
    const initial = engine.apply(engine.solved(), [
      'x2',
      ...invertTeachingMoves(CFOP_ALGORITHMS[id].moves),
      'x2',
    ]);
    const result = solveCFOP(engine, initial);
    if (!result.ok) throw new Error(result.message);
    const session: SolveSession = {
      input: { kind: 'facelets', facelets: stateToFacelets(initial) },
      trace: result.trace,
    };
    expect(
      engine.equals(engine.apply(engine.solved(), buildInitialSetup(engine, session)), initial),
    ).toBe(true);
    expect(flattenTrace(session.trace).moves.some((m) => m.startsWith('M'))).toBe(true);
  },
);
beforeAll(async () => {
  engine = await createCubeEngine();
  const example = GOLDEN_CASES[7],
    result = solveLBL(engine, engine.apply(engine.solved(), example.moves));
  if (!result.ok) throw new Error(result.message);
  session = { input: { kind: 'facelets', facelets: example.facelets }, trace: result.trace };
});
it('starts at the entered cube without counting setup as teaching moves', () => {
  expect(
    engine.equals(
      engine.apply(engine.solved(), buildInitialSetup(engine, session)),
      session.trace.initial,
    ),
  ).toBe(true);
  const controller = createPlaybackController(engine, session);
  expect(controller.snapshot()).toMatchObject({
    moveIndex: 0,
    total: flattenTrace(session.trace).moves.length,
  });
});
it('preserves scramble setup and handles an empty solved color trace', () => {
  const input = { kind: 'scramble', moves: GOLDEN_CASES[7].moves } as const;
  expect(buildInitialSetup(engine, { ...session, input })).toEqual(input.moves);
  const solved = solveLBL(engine, engine.solved());
  if (!solved.ok) throw new Error(solved.message);
  expect(
    buildInitialSetup(engine, {
      input: { kind: 'facelets', facelets: GOLDEN_CASES[0].facelets },
      trace: solved.trace,
    }),
  ).toEqual([]);
});
it('initializes correctly for every one of the 24 final solved holding orientations', () => {
  const seen = new Set<string>();
  for (const pitch of [[], ['x'], ['x2'], ["x'"], ['z'], ["z'"]] as TeachingMove[][]) {
    for (const yaw of [[], ['y'], ['y2'], ["y'"]] as TeachingMove[][]) {
      const trace = structuredClone(session.trace),
        moves = [...pitch, ...yaw],
        before = trace.final;
      const after = engine.apply(before, moves),
        last = trace.stages.at(-1)!;
      last.actions.push({
        kind: 'regrip',
        ruleId: 'test-orientation',
        caseId: 'test',
        targets: [],
        recognition: 'Solved cube',
        explanation: 'Change holding orientation',
        moves,
        before,
        after,
        checkpoint: { id: 'test', description: 'Solved', passed: true },
      });
      last.after = after;
      trace.final = after;
      seen.add(JSON.stringify(after.data.CENTERS.pieces));
      const setup = buildInitialSetup(engine, { ...session, trace });
      expect(engine.equals(engine.apply(engine.solved(), setup), trace.initial)).toBe(true);
    }
  }
  expect(seen.size).toBe(24);
});
it('rejects mismatched input, false final state, and an unsolved endpoint', () => {
  expect(() =>
    buildInitialSetup(engine, { ...session, input: { kind: 'scramble', moves: [] } }),
  ).toThrow(/initial/i);
  expect(() =>
    buildInitialSetup(engine, {
      ...session,
      trace: { ...session.trace, final: session.trace.initial },
    }),
  ).toThrow();
  const trace = structuredClone(session.trace),
    last = trace.stages.at(-1)!,
    before = trace.final;
  const after = engine.apply(before, ['R']);
  last.actions.push({
    kind: 'setup',
    ruleId: 'test',
    caseId: 'test',
    targets: [],
    recognition: '',
    explanation: '',
    moves: ['R'],
    before,
    after,
    checkpoint: { id: 'test', description: '', passed: false },
  });
  last.after = after;
  trace.final = after;
  expect(() => buildInitialSetup(engine, { ...session, trace })).toThrow(/solved/i);
});
