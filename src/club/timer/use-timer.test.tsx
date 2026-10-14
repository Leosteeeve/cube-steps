// @vitest-environment jsdom
import { act, cleanup, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { useTimer } from './use-timer';
import { createTutorialInputGate, timerTutorialAllowed } from './tutorial-input';
import { createTutorialRuntime } from '../tutorial/runtime';
import type { TimerState } from './machine';
import type { TimerRepository } from './repository';
vi.mock('../../core/scramble', () => ({ generateScramble: vi.fn(async () => 'R U') }));
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(cleanup);
it('locks document handlers without replacing the prepared scramble or controller', async () => {
  const gate = createTutorialInputGate(),
    record = vi.fn(),
    history = { attempts: [], pendingIds: [], error: '' };
  const repository = {
    snapshot: () => history,
    subscribe: () => () => {},
    refresh: async () => {},
    record,
  } as unknown as TimerRepository;
  const settings = { version: 1 as const, inspectionEnabled: false };
  const hook = renderHook(() => useTimer({ engine, repository, settings, inputGate: gate }));
  await waitFor(() => expect(hook.result.current.state.phase).toBe('idle'));
  const controller = hook.result.current.controller,
    before = controller.snapshot();
  gate.setLocked(true);
  fireEvent.keyDown(document.body, { code: 'Space' });
  fireEvent.keyDown(document.body, { code: 'Escape' });
  gate.setLocked(false);
  fireEvent.keyDown(document.body, { code: 'Space', repeat: true });
  fireEvent.keyUp(document.body, { code: 'Space' });
  expect(controller.snapshot()).toEqual(before);
  expect(hook.result.current.controller).toBe(controller);
  expect(record).not.toHaveBeenCalled();
  fireEvent.keyDown(document.body, { code: 'Space' });
  expect(controller.snapshot().phase).toBe('arming');
  fireEvent.keyDown(document.body, { code: 'Escape' });
  expect(controller.snapshot().phase).toBe('idle');
});
it('a synchronous guard/start race never locks or interrupts an attempt', () => {
  localStorage.clear();
  const runtime = createTutorialRuntime(() => localStorage),
    lock = vi.fn();
  let phase = 'idle';
  runtime.setRoute('timer', 'timer');
  runtime.registerEntry('timer', true);
  runtime.registerInputLock(lock);
  runtime.registerGuard(() =>
    timerTutorialAllowed({ phase } as TimerState, { attempts: [], pendingIds: [], error: '' }),
  );
  phase = 'running';
  expect(runtime.requestStart('timer')).toBe(false);
  expect(runtime.snapshot().run).toBeNull();
  expect(lock.mock.calls).toEqual([[false]]);
  runtime.dispose();
});
