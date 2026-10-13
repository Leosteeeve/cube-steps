import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { createSourcePlaybackController } from './controller';
import { createDemonstration } from '../algorithms/demonstration';
import { ALGORITHM_REGISTRY } from '../algorithms/registry';
import { getCaseFixture } from '../algorithms/fixtures';
import { buildPlaybackInitialSetup } from './initial-setup';
import { stateToFacelets } from '../core/facelets';
import { solveAdvancedCFOP } from '../methods/advanced/solve';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) =>
    setTimeout(() => f(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('tracks_wide_slice_centers_bidirectionally', () => {
  const families = new Set<string>();
  for (const variant of Object.values(ALGORITHM_REGISTRY.variants)) {
    const tokens = variant.moves.filter((m) => /^[MES]|w/.test(m));
    if (!tokens.some((m) => !families.has(m.replace(/2|'/g, '')))) continue;
    tokens.forEach((m) => families.add(m.replace(/2|'/g, '')));
    const c = ALGORITHM_REGISTRY.cases[variant.caseId],
      demo = createDemonstration(engine, getCaseFixture(c.fixtureIds[0])!, variant.id),
      player = createSourcePlaybackController(engine, { kind: 'algorithm', demonstration: demo });
    let expected = demo.initial,
      changed = 0;
    for (let i = 0; i < player.timeline.moves.length; i++) {
      const next = engine.apply(expected, [player.timeline.moves[i]]);
      if (
        JSON.stringify(engine.observe(expected).centers) !==
        JSON.stringify(engine.observe(next).centers)
      )
        changed++;
      player.step(1);
      expect(engine.equals(player.snapshot().boundaryState, next)).toBe(true);
      player.step(-1);
      expect(engine.equals(player.snapshot().boundaryState, expected)).toBe(true);
      player.step(1);
      expected = next;
    }
    expect(changed).toBeGreaterThan(0);
    const action = player.timeline.actions.findIndex((a) => a.action.kind === 'algorithm');
    player.replayAction(action);
    vi.advanceTimersByTime(90000);
    expect(player.snapshot().playing).toBe(false);
    expect(player.snapshot().moveIndex).toBe(player.timeline.actions[action].end);
    player.dispose();
  }
  expect(families.has('M')).toBe(true);
  expect([...families].some((s) => s.includes('w'))).toBe(true);
});
it('retains_exact_color_input_initialization', () => {
  const assets = {
    crossTable: {
      version: 1 as const,
      goalIndex: 69760,
      distances: new Uint8Array(readFileSync('src/methods/advanced/cross/distance-v1.bin')),
    },
  };
  const initial = engine.apply(engine.solved(), ['R', 'U2', "F'"]),
    r = solveAdvancedCFOP(engine, initial, assets);
  if (!r.ok) throw new Error(r.message);
  const source = {
    kind: 'solve' as const,
    session: {
      input: { kind: 'facelets' as const, facelets: stateToFacelets(initial) },
      trace: r.trace,
    },
  };
  const setup = buildPlaybackInitialSetup(engine, source);
  expect(engine.equals(engine.apply(engine.solved(), setup), initial)).toBe(true);
  const player = createSourcePlaybackController(engine, source, assets);
  expect(engine.equals(player.snapshot().boundaryState, initial)).toBe(true);
  expect(player.snapshot().moveIndex).toBe(0);
  player.seekMove(player.timeline.moves.length);
  expect(engine.isSolved(player.snapshot().boundaryState)).toBe(true);
  player.dispose();
  expect(() => createSourcePlaybackController(engine, source)).toThrow(/assets/i);
});
