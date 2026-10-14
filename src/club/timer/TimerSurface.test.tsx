// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TimerSurface } from './TimerSurface';
import { createTutorialInputGate } from './tutorial-input';
import type { TimerState } from './machine';
afterEach(cleanup);
const state = {
  phase: 'idle',
  settings: { version: 1, inspectionEnabled: false },
  nowMs: 0,
  prepared: {},
} as TimerState;
it('protects direct surface Space events, including a held release after help closes', () => {
  const gate = createTutorialInputGate(),
    dispatch = vi.fn();
  render(<TimerSurface state={state} dispatch={dispatch} inputGate={gate} />);
  const button = screen.getByRole('button', { name: 'Timing surface' });
  gate.setLocked(true);
  gate.observeKey({ type: 'keydown', code: 'Space', repeat: false });
  fireEvent.keyDown(button, { code: 'Space' });
  gate.setLocked(false);
  gate.observeKey({ type: 'keyup', code: 'Space', repeat: false });
  fireEvent.keyUp(button, { code: 'Space' });
  expect(dispatch).not.toHaveBeenCalled();
  gate.observeKey({ type: 'keydown', code: 'Space', repeat: false });
  fireEvent.keyDown(button, { code: 'Space' });
  expect(dispatch).toHaveBeenCalledWith({ type: 'down', token: 'keyboard' });
});
it('never captures a locked pointer and handles lost capture after a fresh press', () => {
  const gate = createTutorialInputGate(),
    dispatch = vi.fn();
  render(<TimerSurface state={state} dispatch={dispatch} inputGate={gate} />);
  const button = screen.getByRole('button', { name: 'Timing surface' });
  button.setPointerCapture = vi.fn();
  const pointer = (type: string) => {
    const event = new MouseEvent(type, { bubbles: true, button: 0 });
    Object.defineProperties(event, { pointerId: { value: 4 }, isPrimary: { value: true } });
    fireEvent(button, event);
  };
  gate.setLocked(true);
  gate.observePointer({ type: 'pointerdown', pointerId: 4 });
  pointer('pointerdown');
  expect(button.setPointerCapture).not.toHaveBeenCalled();
  gate.setLocked(false);
  gate.observePointer({ type: 'pointerup', pointerId: 4 });
  pointer('pointerup');
  expect(dispatch).not.toHaveBeenCalled();
  gate.observePointer({ type: 'pointerdown', pointerId: 4 });
  pointer('pointerdown');
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'down', token: 'pointer:4' });
  pointer('lostpointercapture');
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'pointer-cancel' });
});
