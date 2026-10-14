import { useEffect, useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { TimerSettings } from './types';
import { createTimerController } from './controller';
import { isTimerKeyTarget } from './input';
import type { TimerRepository } from './repository';
import type { TimerInput } from './machine';
import type { TutorialInputGate } from './tutorial-input';
export function useTimerHistory(repository: TimerRepository) {
  const [history, setHistory] = useState(() => repository.snapshot());
  useEffect(() => {
    const unsubscribe = repository.subscribe(setHistory);
    setHistory(repository.snapshot());
    void repository.refresh();
    return unsubscribe;
  }, [repository]);
  return history;
}
export function useTimer({
  engine,
  repository,
  settings,
  inputGate,
}: {
  engine: CubeEngine;
  repository: TimerRepository;
  settings: TimerSettings;
  inputGate?: TutorialInputGate;
}) {
  const controller = useMemo(
    () => createTimerController({ engine, repository, settings }),
    [engine, repository, settings],
  );
  const [state, setState] = useState(() => controller.snapshot());
  const history = useTimerHistory(repository);
  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    setState(controller.snapshot());
    void controller.newScramble();
    const dispatch = (input: TimerInput) => {
      if (!inputGate || inputGate.allow(input)) controller.dispatch(input);
    };
    const observeKey = (e: KeyboardEvent) =>
      inputGate?.observeKey({
        type: e.type as 'keydown' | 'keyup',
        code: e.code,
        repeat: e.repeat,
      });
    const observePointer = (e: PointerEvent) =>
      inputGate?.observePointer({
        type: e.type as 'pointerdown' | 'pointerup' | 'pointercancel',
        pointerId: e.pointerId,
      });
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        dispatch({ type: 'escape' });
        return;
      }
      if (e.code === 'Space' && isTimerKeyTarget(e.target)) {
        e.preventDefault();
        if (!e.repeat) dispatch({ type: 'down', token: 'keyboard' });
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isTimerKeyTarget(e.target)) {
        e.preventDefault();
        dispatch({ type: 'up', token: 'keyboard' });
      }
    };
    const blur = () => {
        inputGate?.releaseHeld();
        controller.dispatch({ type: 'blur' });
      },
      hidden = () => {
        if (document.hidden) {
          inputGate?.releaseHeld();
          controller.dispatch({ type: 'hidden' });
        }
      };
    const leave = () => controller.dispatch({ type: 'leave' });
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      void repository.refresh();
      if (controller.snapshot().phase === 'loading') void controller.newScramble();
    };
    const focus = (e: FocusEvent) => {
      const current = controller.snapshot();
      if (
        current.phase === 'arming' &&
        current.token === 'keyboard' &&
        !(e.target instanceof Element && e.target.closest('[data-timer-surface]')) &&
        !isTimerKeyTarget(e.target)
      )
        controller.dispatch({ type: 'blur' });
    };
    document.addEventListener('keydown', observeKey, true);
    document.addEventListener('keyup', observeKey, true);
    document.addEventListener('pointerdown', observePointer, true);
    document.addEventListener('pointerup', observePointer, true);
    document.addEventListener('pointercancel', observePointer, true);
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    document.addEventListener('focusin', focus);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', restore);
    return () => {
      unsubscribe();
      document.removeEventListener('keydown', observeKey, true);
      document.removeEventListener('keyup', observeKey, true);
      document.removeEventListener('pointerdown', observePointer, true);
      document.removeEventListener('pointerup', observePointer, true);
      document.removeEventListener('pointercancel', observePointer, true);
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      document.removeEventListener('focusin', focus);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', restore);
      controller.dispose();
    };
  }, [controller, repository, inputGate]);
  const active = ['inspection', 'arming', 'running'].includes(state.phase);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      controller.dispatch({ type: 'tick' });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [controller, active]);
  useEffect(() => {
    document.documentElement.dataset.timing = active ? 'active' : 'idle';
    return () => {
      delete document.documentElement.dataset.timing;
    };
  }, [active]);
  return { controller, state, history };
}
