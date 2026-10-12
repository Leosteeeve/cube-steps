import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, SolveSession } from '../core/types';
import { solveLBL } from '../methods/lbl/solve';
import { createPlaybackController } from './controller';
import { flattenTrace } from '../methods/lbl/trace';
import { solveCFOP } from '../methods/cfop/solve';
import { CFOP_ALGORITHMS } from '../methods/cfop/catalog';
import { invertTeachingMoves } from '../core/teaching-moves';
import { stateToFacelets } from '../core/facelets';
let engine: CubeEngine, session: SolveSession;
beforeAll(async () => {
  engine = await createCubeEngine();
  const moves = ['R', 'U2', "F'"] as const;
  const result = solveLBL(engine, engine.apply(engine.solved(), moves));
  if (!result.ok) throw new Error(result.message);
  session = { input: { kind: 'scramble', moves: [...moves] }, trace: result.trace };
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('steps both ways and seeks exact stage checkpoints', () => {
  const player = createPlaybackController(engine, session);
  player.step(1);
  expect(player.snapshot().moveIndex).toBe(1);
  player.step(-1);
  expect(engine.equals(player.snapshot().boundaryState, session.trace.initial)).toBe(true);
  player.seekStage('top-cross');
  expect(engine.equals(player.snapshot().boundaryState, session.trace.stages[3].before)).toBe(true);
  player.dispose();
});
it('replays one complete action and cancels obsolete animation after seeking', () => {
  const player = createPlaybackController(engine, session),
    flat = flattenTrace(session.trace);
  const i = flat.actions.findIndex((a) => a.action.kind === 'algorithm');
  player.replayAction(i);
  vi.advanceTimersByTime(20000);
  expect(player.snapshot().moveIndex).toBe(flat.actions[i].end);
  expect(player.snapshot().playing).toBe(false);
  player.play();
  player.seekMove(0);
  vi.advanceTimersByTime(2000);
  expect(player.snapshot().moveIndex).toBe(0);
  player.play();
  player.dispose();
  const end = player.snapshot();
  vi.advanceTimersByTime(2000);
  expect(player.snapshot()).toEqual(end);
});
it('continues the full solution when Play follows a completed action replay', () => {
  const player = createPlaybackController(engine, session);
  const index = player.timeline.actions.findIndex((item) => item.action.kind === 'algorithm');
  const action = player.timeline.actions[index];
  player.replayAction(index);
  vi.advanceTimersByTime(500);
  player.pause();
  player.play();
  vi.advanceTimersByTime(20000);
  expect(player.snapshot().moveIndex).toBe(action.end);
  expect(player.snapshot().playing).toBe(false);
  player.play();
  vi.advanceTimersByTime(2100);
  expect(player.snapshot().moveIndex).toBeGreaterThan(action.end);
  expect(player.snapshot().playing).toBe(true);
  player.dispose();
});
it('uses renderer timing, limits speeds and rejects a mismatched initial setup', () => {
  const player = createPlaybackController(engine, session),
    count = flattenTrace(session.trace).moves.length;
  player.setBoundaries(Array.from({ length: count + 1 }, (_, i) => i * 800));
  player.seekMove(2);
  expect(player.snapshot().timestamp).toBe(1600);
  expect(() => player.setSpeed(0)).toThrow();
  expect(() =>
    createPlaybackController(engine, { ...session, input: { kind: 'scramble', moves: [] } }),
  ).toThrow(/initial/i);
  player.dispose();
});
it('stays complete when there are no moves', () => {
  const result = solveLBL(engine, engine.solved());
  if (!result.ok) throw new Error(result.message);
  const player = createPlaybackController(engine, {
    input: { kind: 'scramble', moves: [] },
    trace: result.trace,
  });
  player.play();
  expect(player.snapshot().currentMove).toBeNull();
  expect(player.snapshot().playing).toBe(false);
  player.dispose();
});
it('keeps an empty CFOP player on its own final stage', () => {
  const result = solveCFOP(engine, engine.solved());
  if (!result.ok) throw new Error(result.message);
  const player = createPlaybackController(engine, { input: { kind: 'scramble', moves: [] }, trace: result.trace });
  expect(player.snapshot().stageId).toBe('cfop-auf'); expect(player.snapshot().total).toBe(0);
  player.seekStage('cfop-oll-corners'); expect(player.snapshot().stageId).toBe('cfop-oll-corners');
  player.seekStage('cfop-cross'); expect(player.snapshot().stageId).toBe('cfop-cross');
  player.dispose();
});
it('rejects a formula reference from another method', () => {
  const invalid = structuredClone(session);
  invalid.trace.stages.flatMap(s => s.actions).find(a => a.kind === 'algorithm')!.algorithmId = 'pll-h';
  expect(() => createPlaybackController(engine, invalid)).toThrow(/algorithm/i);
});
it.each(['pll-h', 'pll-z'])('steps backward and replays to the formula boundary for %s', id => {
  const initial = engine.apply(engine.solved(), ['x2', ...invertTeachingMoves(CFOP_ALGORITHMS[id].moves), 'x2']);
  const result = solveCFOP(engine, initial); if (!result.ok) throw new Error(result.message);
  const player = createPlaybackController(engine, { input: { kind: 'facelets', facelets: stateToFacelets(initial) }, trace: result.trace });
  const i = player.timeline.actions.findIndex(a => a.action.algorithmId === id), range = player.timeline.actions[i];
  expect(i).toBeGreaterThanOrEqual(0);
  for (let index = range.start; index <= range.end; index++) {
    player.seekMove(index); if (index > range.start) { player.step(-1); player.step(1); }
    expect(engine.equals(player.snapshot().boundaryState, engine.apply(initial, player.timeline.moves.slice(0, index)))).toBe(true);
  }
  player.replayAction(i); vi.advanceTimersByTime(20000);
  expect(player.snapshot().moveIndex).toBe(range.end); expect(player.snapshot().playing).toBe(false);
  player.dispose();
});
