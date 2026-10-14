import { expect, it } from 'vitest';
import { createTutorialInputGate, timerTutorialAllowed } from './tutorial-input';
import type { TimerState } from './machine';
const key = (type: 'keydown' | 'keyup', repeat = false) => ({ type, code: 'Space', repeat });
it.each(['loading', 'error', 'idle', 'inspection', 'arming', 'running', 'stopped'])(
  'only idle accepts tutorial help: %s',
  (phase) => {
    const state = { phase } as TimerState,
      history = { attempts: [], pendingIds: [], error: '' };
    expect(timerTutorialAllowed(state, history)).toBe(phase === 'idle');
    expect(timerTutorialAllowed(state, { ...history, pendingIds: ['saving'] })).toBe(false);
    expect(timerTutorialAllowed(state, { ...history, error: 'Save failed' })).toBe(false);
  },
);
it('requires fresh Space after closing help with the key held', () => {
  const gate = createTutorialInputGate();
  gate.setLocked(true);
  gate.observeKey(key('keydown'));
  gate.setLocked(false);
  expect(gate.allow({ type: 'down', token: 'keyboard', repeat: true })).toBe(false);
  gate.observeKey(key('keyup'));
  expect(gate.allow({ type: 'up', token: 'keyboard' })).toBe(false);
  gate.observeKey(key('keydown'));
  expect(gate.allow({ type: 'down', token: 'keyboard' })).toBe(true);
});
it('waits until all held keyboard and pointer input is released', () => {
  const gate = createTutorialInputGate();
  gate.setLocked(true);
  gate.observePointer({ type: 'pointerdown', pointerId: 1 });
  gate.observeKey(key('keydown'));
  gate.setLocked(false);
  gate.observeKey(key('keyup'));
  expect(gate.allow({ type: 'up', token: 'keyboard' })).toBe(false);
  gate.observeKey(key('keydown'));
  expect(gate.allow({ type: 'down', token: 'keyboard' })).toBe(false);
  gate.observeKey(key('keyup'));
  gate.observePointer({ type: 'pointercancel', pointerId: 1 });
  gate.observeKey(key('keydown'));
  expect(gate.allow({ type: 'down', token: 'keyboard' })).toBe(true);
});
it('blocks Escape and pointer cancellation during help; blur clears held tracking without events', () => {
  const gate = createTutorialInputGate();
  gate.setLocked(true);
  for (const type of ['escape', 'pointer-cancel', 'blur'] as const)
    expect(gate.allow({ type })).toBe(false);
  gate.observeKey(key('keydown'));
  gate.releaseHeld();
  gate.setLocked(false);
  expect(gate.allow({ type: 'escape' })).toBe(true);
  gate.observeKey(key('keydown'));
  expect(gate.allow({ type: 'down', token: 'keyboard', repeat: true })).toBe(false);
  expect(gate.allow({ type: 'down', token: 'keyboard' })).toBe(true);
  gate.dispose();
  expect(gate.allow({ type: 'down', token: 'keyboard' })).toBe(false);
});
it('rejects unlocked release from a press observed while locked even if the bubble swallowed dispatch', () => {
  const gate = createTutorialInputGate();
  gate.setLocked(true);
  gate.observePointer({ type: 'pointerdown', pointerId: 9 });
  gate.setLocked(false);
  gate.observePointer({ type: 'pointerup', pointerId: 9 });
  expect(gate.allow({ type: 'up', token: 'pointer:9' })).toBe(false);
  gate.observePointer({ type: 'pointerdown', pointerId: 10 });
  expect(gate.allow({ type: 'down', token: 'pointer:10' })).toBe(true);
});
