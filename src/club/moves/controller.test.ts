import { beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { buildNotationDemo } from './demonstration';
import { createNotationController, type AnimationClock } from './controller';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
function setup() {
  let time = 0,
    id = 0;
  const frames = new Map<number, (time: number) => void>();
  const clock: AnimationClock = {
    now: () => time,
    request: (callback) => {
      frames.set(++id, callback);
      return id;
    },
    cancel: (handle) => {
      frames.delete(handle);
    },
  };
  const controller = createNotationController(
    buildNotationDemo(engine, { base: 'U', amount: '' }),
    clock,
  );
  const advance = (ms: number) => {
    time += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(time));
  };
  return { controller, frames, advance };
}
it('waits for matching readiness, plays once and holds at its endpoint', () => {
  const { controller, frames, advance } = setup();
  controller.play();
  expect(frames.size).toBe(0);
  controller.ready(1, 1000);
  expect(controller.snapshot().phase).toBe('ready');
  controller.play();
  advance(400);
  expect(controller.snapshot().progress).toBeCloseTo(0.4);
  advance(700);
  expect(controller.snapshot()).toMatchObject({ phase: 'complete', progress: 1, speed: 1 });
  expect(frames.size).toBe(0);
  controller.play();
  expect(frames.size).toBe(0);
});
it('restore pauses fractional playback and obeys static endpoints', () => {
  const { controller, frames } = setup();
  controller.ready(1, 1000);
  controller.play();
  controller.restorePaused({ progress: 0.5, speed: 0.5 });
  expect(controller.snapshot()).toMatchObject({ phase: 'paused', progress: 0.5, speed: 0.5 });
  expect(frames.size).toBe(0);
  controller.setReducedMotion(true);
  controller.restorePaused({ progress: 0.5, speed: 1 });
  expect(controller.snapshot().progress).toBe(0);
  controller.restorePaused({ progress: 2, speed: 1 });
  expect(controller.snapshot().progress).toBe(1);
  controller.select(buildNotationDemo(engine, { base: 'R', amount: '2' }));
  controller.restorePaused({ progress: 0.5, speed: 1 });
  expect(controller.snapshot()).toMatchObject({ phase: 'loading', progress: 0 });
});
it('preserves position on pause, resume and speed changes', () => {
  const { controller, advance, frames } = setup();
  controller.ready(1, 1000);
  controller.play();
  advance(250);
  controller.pause();
  advance(2000);
  expect(controller.snapshot().progress).toBe(0.25);
  expect(frames.size).toBe(0);
  controller.setSpeed(0.5);
  controller.play();
  advance(500);
  expect(controller.snapshot().progress).toBe(0.5);
  controller.setSpeed(1);
  expect(controller.snapshot().progress).toBe(0.5);
  advance(500);
  expect(controller.snapshot().phase).toBe('complete');
});
it('atomically replaces a playing selection and ignores all old callbacks', () => {
  const { controller, frames } = setup();
  controller.ready(1, 1000);
  controller.play();
  const stale = [...frames.values()][0];
  const version = controller.select(buildNotationDemo(engine, { base: 'B', amount: "'" }));
  controller.ready(version - 1, 1000);
  controller.fail(version - 1, 'old failure');
  stale(9000);
  controller.play();
  expect(controller.snapshot()).toMatchObject({
    version,
    phase: 'loading',
    progress: 0,
    error: null,
  });
  expect(controller.snapshot().demo.move).toBe("B'");
  expect(frames.size).toBe(0);
});
it('replays from Before, cancels duplicate work and resets without changing speed or token', () => {
  const { controller, frames, advance } = setup();
  controller.ready(1, 1000);
  controller.setSpeed(0.5);
  controller.replay();
  advance(300);
  controller.replay();
  controller.replay();
  expect(frames.size).toBe(1);
  expect(controller.snapshot().progress).toBe(0);
  controller.reset();
  expect(controller.snapshot()).toMatchObject({ phase: 'ready', progress: 0, speed: 0.5 });
  expect(controller.snapshot().demo.move).toBe('U');
  expect(frames.size).toBe(0);
});
it('returns to Before on system reduction during a turn and never auto-resumes', () => {
  const { controller, frames, advance } = setup();
  controller.ready(1, 1000);
  controller.play();
  advance(300);
  controller.setReducedMotion(true);
  expect(controller.snapshot()).toMatchObject({ progress: 0, phase: 'ready', reducedMotion: true });
  controller.play();
  controller.replay();
  expect(frames.size).toBe(0);
  controller.showEndpoint('after');
  expect(controller.snapshot()).toMatchObject({ progress: 1, phase: 'complete' });
  controller.setReducedMotion(false);
  expect(frames.size).toBe(0);
  controller.setReducedMotion(true);
  expect(controller.snapshot().progress).toBe(1);
  controller.showEndpoint('before');
  expect(controller.snapshot().progress).toBe(0);
});
it('keeps static fallback honest after failure, including Reset and a successful retry', () => {
  const { controller, frames } = setup();
  controller.ready(1, 1000);
  controller.play();
  controller.fail(1, '3D unavailable');
  controller.showEndpoint('after');
  expect(controller.snapshot()).toMatchObject({
    phase: 'error',
    progress: 1,
    error: '3D unavailable',
  });
  controller.reset();
  controller.play();
  expect(controller.snapshot()).toMatchObject({ phase: 'error', progress: 0 });
  expect(frames.size).toBe(0);
  controller.ready(1, 1000);
  expect(controller.snapshot().phase).toBe('error');
  const version = controller.select(controller.snapshot().demo);
  controller.ready(version, 1000);
  expect(controller.snapshot()).toMatchObject({ phase: 'ready', error: null });
});
it.each([0, -1, NaN, Infinity])('rejects invalid renderer duration %s', (duration) => {
  const { controller, frames } = setup();
  controller.ready(1, duration);
  controller.play();
  expect(controller.snapshot().phase).toBe('error');
  expect(frames.size).toBe(0);
});
it('disposes listeners and frames, including callbacks already delivered by the browser', () => {
  const { controller, frames } = setup(),
    listener = vi.fn();
  controller.subscribe(listener);
  expect(listener).toHaveBeenCalledTimes(1);
  controller.ready(1, 1000);
  controller.play();
  const callback = [...frames.values()][0];
  controller.dispose();
  const before = listener.mock.calls.length;
  callback(1000);
  controller.replay();
  controller.reset();
  controller.setSpeed(0.5);
  controller.select(controller.snapshot().demo);
  expect(frames.size).toBe(0);
  expect(listener).toHaveBeenCalledTimes(before);
});
