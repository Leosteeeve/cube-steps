import { beforeAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import { fixtureLabRoute, labContext } from '../../tests/fixtures/lab-context';
import { seededScramble } from '../../tests/fixtures/lbl-cases';
import { prepareLabInput } from './input';
import { validateLabRoute } from './validate';
import { createLabPlayback } from './playback';
import { createSourcePlaybackController } from '../player/controller';
import { buildPlaybackInitialSetup } from '../player/initial-setup';
import { labStageComplete, formulaSnapshot } from './finalize';
import type { LabAction } from './types';
import { createLabFrame } from './frames';
let context: ReturnType<typeof labContext>;
beforeAll(async () => {
  context = labContext(await createCubeEngine());
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) =>
    setTimeout(() => fn(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function fixture(seed = 1, bottom: 'red' | 'white' | 'yellow' = 'red') {
  const input = prepareLabInput(context.engine, {
    kind: 'scramble',
    moves: seed ? seededScramble(seed) : [],
  });
  const route = validateLabRoute(
    context,
    input,
    fixtureLabRoute(context.engine, input, bottom),
    'current',
  );
  return { input, route, prepared: createLabPlayback(context, input, route) };
}
it('preserves physical non-white holds, setup, targets and every original formula boundary', () => {
  const { input, route, prepared } = fixture();
  expect(prepared.label).toContain('red bottom');
  const source = { kind: 'lab' as const, prepared };
  expect(
    context.engine.equals(
      context.engine.apply(
        context.engine.solved(),
        buildPlaybackInitialSetup(context.engine, source),
      ),
      input.initial,
    ),
  ).toBe(true);
  expect(prepared.timeline.moves).toEqual(route.route.actions.flatMap((a) => a.moves));
  expect(prepared.timeline.actions).toHaveLength(route.route.actions.length);
  route.route.actions.forEach((a, i) => {
    const shown = prepared.timeline.actions[i].action;
    expect(shown.targets).toEqual(a.targets);
    expect(shown.moves).toEqual(a.moves);
    expect(shown).not.toHaveProperty('cross');
    expect(shown).not.toHaveProperty('selection');
    if (a.algorithmId) expect(prepared.algorithms[a.algorithmId].moves).toEqual(a.moves);
  });
  const start = route.route.boundaries.crossStart;
  expect(prepared.timeline.moves.slice(0, start)).toEqual(route.route.positioningMoves);
  expect(context.engine.observe(prepared.timeline.states[start]).centers.D).toBe('red');
  const endpoint = prepared.timeline.states[route.route.boundaries.f2lEnd];
  const centers = context.engine.observe(endpoint).centers;
  expect(
    labStageComplete(
      context.engine,
      createLabFrame(context.engine, input, { bottom: centers.D, front: centers.F }).toCanonical(
        endpoint,
      ),
      'lab-f2l',
    ),
  ).toBe(true);
  expect(prepared.timeline.sections.find((s) => s.id === 'lab-oll')!.start).toBe(
    route.route.boundaries.f2lEnd,
  );
  expect(Object.isFrozen(prepared.timeline.actions)).toBe(true);
});
it('steps backward across physical rotations, jumps and replays complete formula groups', () => {
  const { prepared } = fixture(117);
  const player = createSourcePlaybackController(context.engine, { kind: 'lab', prepared });
  expect(prepared.timeline.moves.some((m) => m.startsWith('y'))).toBe(true);
  for (let i = 0; i < prepared.timeline.moves.length; i++) {
    player.step(1);
    expect(player.snapshot().boundaryState).toEqual(prepared.timeline.states[i + 1]);
    player.step(-1);
    expect(player.snapshot().boundaryState).toEqual(prepared.timeline.states[i]);
    player.step(1);
  }
  player.seekSection('lab-f2l');
  expect(player.snapshot().moveIndex).toBe(
    prepared.timeline.sections.find((s) => s.id === 'lab-f2l')!.start,
  );
  player.setSpeed(2);
  const i = prepared.timeline.actions.findIndex((a) => a.action.kind === 'algorithm');
  player.replayAction(i);
  vi.advanceTimersByTime(90000);
  expect(player.snapshot()).toMatchObject({
    playing: false,
    moveIndex: prepared.timeline.actions[i].end,
    speed: 2,
  });
  player.dispose();
});
it('keeps hand-regrip annotations outside the physical move stream', () => {
  const { route, prepared } = fixture(2, 'white');
  const hands = prepared.handling.filter((e) => e.kind === 'hand-regrip');
  expect(hands.length).toBeGreaterThan(0);
  expect(hands.map((e) => e.boundary)).toEqual(
    route.route.score.rated
      ? route.route.score.events
          .filter((e) => e.kind === 'hand-regrip')
          .map((e) => e.boundary + route.route.boundaries.crossStart)
      : [],
  );
  expect(prepared.timeline.moves.length).toBe(
    route.route.actions.reduce((n, a) => n + a.moves.length, 0),
  );
});
it('retains skipped stages and rejects altered/unverified payloads before playback', () => {
  const { input, route, prepared } = fixture(0, 'yellow');
  expect(prepared.timeline.sections).toHaveLength(6);
  expect(prepared.timeline.sections.every((s) => s.skipReason && s.start === s.end)).toBe(true);
  const forged = { ...route, route: { ...route.route, crossLength: 99 } };
  expect(() => createLabPlayback(context, input, forged)).toThrow(/verified/i);
  expect(() => validateLabRoute(context, input, forged.route, 'current')).toThrow();
});
it('preserves repeated archived formulas and their internal rotations without catalog substitution', () => {
  const input = prepareLabInput(context.engine, { kind: 'scramble', moves: [] });
  const raw = structuredClone(fixtureLabRoute(context.engine, input, 'yellow'));
  const formula = structuredClone(formulaSnapshot('pll-aa/main'));
  formula.name = 'Archived Aa demonstration';
  expect(formula.moves.some((m) => /^[xyz]/.test(m))).toBe(true);
  let state = input.initial;
  const actions: LabAction[] = [];
  for (let i = 0; i < 3; i++) {
    const before = state,
      observation = context.engine.observe(before);
    state = context.engine.apply(before, formula.moves);
    const centers = context.engine.observe(state).centers;
    actions.push({
      id: 'archive-repeat-' + i,
      section: 'lab-pll',
      kind: 'algorithm',
      ruleId: 'archived-repeat',
      caseId: formula.caseId,
      algorithmId: formula.id,
      moves: formula.moves,
      before,
      after: state,
      recognition: 'Archived repeated Aa demonstration.',
      explanation: 'Repeat the complete archived formula.',
      repetition: { group: 'aa-repeat', index: i + 1 },
      targets: [...observation.edges, ...observation.corners]
        .filter((p) => Object.values(p.stickers).includes(observation.centers.U))
        .map((p) => p.id),
      checkpoint: {
        predicate: 'oll',
        description: 'The top face remains oriented.',
        protectedIds: [],
        targets: [],
        hold: { bottom: centers.D, front: centers.F },
      },
    });
  }
  raw.actions = actions;
  raw.skips = raw.skips.filter((s) => s.section !== 'lab-pll');
  raw.formulas = { [formula.id]: formula };
  raw.final = state;
  raw.modelVersion = 'archived-model';
  if (raw.score.rated) raw.score.modelVersion = 'archived-model';
  const checked = validateLabRoute(context, input, raw, 'archive'),
    prepared = createLabPlayback(context, input, checked);
  expect(prepared.algorithms[formula.id].name).toBe('Archived Aa demonstration');
  expect(prepared.timeline.actions.map((a) => a.action.repetition?.index)).toEqual([1, 2, 3]);
  const player = createSourcePlaybackController(context.engine, { kind: 'lab', prepared });
  for (let i = 0; i < prepared.timeline.moves.length; i++) {
    player.step(1);
    expect(player.snapshot().boundaryState).toEqual(prepared.timeline.states[i + 1]);
    player.step(-1);
    expect(player.snapshot().boundaryState).toEqual(prepared.timeline.states[i]);
    player.step(1);
  }
  player.replayAction(1);
  vi.advanceTimersByTime(90000);
  expect(player.snapshot().moveIndex).toBe(formula.moves.length * 2);
  player.dispose();
});
