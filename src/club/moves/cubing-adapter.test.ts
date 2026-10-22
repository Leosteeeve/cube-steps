// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { buildNotationDemo } from './demonstration';
import { createNotationAdapter } from './cubing-adapter';
import { EDGE_SLOTS } from '../../core/observations';
const state = vi.hoisted(() => ({
  ready: Promise.resolve<{ algDuration: () => number }>({ algDuration: () => 1000 }),
}));
vi.mock('cubing/twisty', () => {
  class Player extends HTMLElement {
    timestamp = 0;
    cameraLatitude = 0;
    cameraLongitude = 0;
    pause = vi.fn();
    experimentalModel = { indexer: { get: () => state.ready } };
    async experimentalCurrentVantages() {
      return [];
    }
    constructor() {
      super();
    }
  }
  customElements.define('mock-twisty', Player);
  return { TwistyPlayer: Player };
});
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
beforeEach(() => {
  state.ready = Promise.resolve({ algDuration: () => 1000 });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    getExtension: () => null,
  } as unknown as WebGL2RenderingContext);
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
const options = () => ({
  signal: new AbortController().signal,
  camera: { latitude: 28, longitude: 32, referenceFace: 'U' as const },
  onError: vi.fn(),
});
it('highlights the physical middle-slice pieces in a rotated Roux hold', async () => {
  const initial = engine.apply(engine.solved(), ['x2', 'y']);
  const host = document.createElement('div');
  document.body.append(host);
  const adapter = await createNotationAdapter(
    host,
    buildNotationDemo(engine, { base: 'M', amount: '' }, initial),
    options(),
  );
  const mask = (
    host.firstElementChild as unknown as {
      experimentalStickeringMaskOrbits: { orbits: { EDGES: { pieces: { facelets: string[] }[] } } };
    }
  ).experimentalStickeringMaskOrbits.orbits.EDGES;
  const highlighted = EDGE_SLOTS.filter((_, i) => mask.pieces[i].facelets[0] === 'regular');
  const expected = engine
    .observe(initial)
    .edges.filter((p) => !/[LR]/.test(p.slot))
    .map((p) => p.id);
  expect(highlighted.sort()).toEqual(expected.sort());
  adapter.dispose();
});
it('renders one token, preserves progress on camera changes and disposes only its own element', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const adapter = await createNotationAdapter(
    host,
    buildNotationDemo(engine, { base: 'M', amount: "'" }),
    options(),
  );
  expect(adapter.durationMs).toBe(1000);
  adapter.setProgress(0.4);
  const player = host.firstElementChild as HTMLElement & { timestamp: number };
  expect(player.timestamp).toBe(400);
  const orbits = (
    player as unknown as {
      experimentalStickeringMaskOrbits: {
        orbits: Record<string, { pieces: { facelets: string[] }[] }>;
      };
    }
  ).experimentalStickeringMaskOrbits.orbits;
  expect(orbits.CENTERS.pieces.filter((piece) => piece.facelets[0] === 'regular')).toHaveLength(4);
  expect(orbits.EDGES.pieces.filter((piece) => piece.facelets[0] === 'regular')).toHaveLength(4);
  expect(
    orbits.CORNERS.pieces.every((piece) => piece.facelets.every((face) => face === 'dim')),
  ).toBe(true);
  adapter.setCamera({ latitude: -90, longitude: 0, referenceFace: 'D' });
  expect(player.timestamp).toBe(400);
  const replacement = document.createElement('div');
  host.append(replacement);
  adapter.dispose();
  adapter.dispose();
  expect(host.children).toHaveLength(1);
  expect(host.firstChild).toBe(replacement);
});
it('honors abort both before construction and after readiness', async () => {
  const host = document.createElement('div'),
    abort = new AbortController();
  abort.abort();
  await expect(
    createNotationAdapter(host, buildNotationDemo(engine, { base: 'U', amount: '' }), {
      ...options(),
      signal: abort.signal,
    }),
  ).rejects.toThrow('replaced');
  expect(host.childElementCount).toBe(0);
  const active = new AbortController();
  const renderer = await createNotationAdapter(
    host,
    buildNotationDemo(engine, { base: 'E', amount: '' }),
    { ...options(), signal: active.signal },
  );
  active.abort();
  expect(host.childElementCount).toBe(0);
  renderer.dispose();
});
it('rejects late readiness after abort without removing a newer view', async () => {
  let resolve!: (v: { algDuration: () => number }) => void;
  state.ready = new Promise((r) => {
    resolve = r;
  });
  const host = document.createElement('div'),
    abort = new AbortController();
  const promise = createNotationAdapter(
    host,
    buildNotationDemo(engine, { base: 'U', amount: '' }),
    { ...options(), signal: abort.signal },
  );
  const rejected = expect(promise).rejects.toThrow();
  await vi.waitFor(() => expect(host.children.length).toBe(1));
  abort.abort();
  const next = document.createElement('div');
  host.append(next);
  resolve({ algDuration: () => 1000 });
  await rejected;
  expect(host.firstChild).toBe(next);
  expect(host.children).toHaveLength(1);
});
it('reports context loss and does not callback after disposal', async () => {
  const host = document.createElement('div'),
    config = options();
  const adapter = await createNotationAdapter(
    host,
    buildNotationDemo(engine, { base: 'x', amount: '' }),
    config,
  );
  const player = host.firstElementChild!;
  player.dispatchEvent(new Event('webglcontextlost', { bubbles: true }));
  expect(config.onError).toHaveBeenCalledTimes(1);
  adapter.dispose();
  player.dispatchEvent(new Event('webglcontextlost', { bubbles: true }));
  expect(config.onError).toHaveBeenCalledTimes(1);
});
it('cleans up after initialization rejects and explains unavailable WebGL', async () => {
  const host = document.createElement('div');
  state.ready = Promise.reject(new Error('indexer failed'));
  state.ready.catch(() => {});
  await expect(
    createNotationAdapter(host, buildNotationDemo(engine, { base: 'U', amount: '' }), options()),
  ).rejects.toThrow('indexer failed');
  expect(host.childElementCount).toBe(0);
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  await expect(
    createNotationAdapter(host, buildNotationDemo(engine, { base: 'U', amount: '' }), options()),
  ).rejects.toThrow('3D');
});
