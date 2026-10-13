import { useEffect, useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { TimerSettings } from './types';
import { createTimerController } from './controller';
import { isTimerKeyTarget } from './input';
import type { TimerRepository } from './repository';
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
}: {
  engine: CubeEngine;
  repository: TimerRepository;
  settings: TimerSettings;
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
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        controller.dispatch({ type: 'escape' });
        return;
      }
      if (e.code === 'Space' && isTimerKeyTarget(e.target)) {
        e.preventDefault();
        if (!e.repeat) controller.dispatch({ type: 'down', token: 'keyboard' });
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isTimerKeyTarget(e.target)) {
        e.preventDefault();
        controller.dispatch({ type: 'up', token: 'keyboard' });
      }
    };
    const blur = () => controller.dispatch({ type: 'blur' }),
      hidden = () => {
        if (document.hidden) controller.dispatch({ type: 'hidden' });
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
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    document.addEventListener('focusin', focus);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', restore);
    return () => {
      unsubscribe();
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      document.removeEventListener('focusin', focus);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', restore);
      controller.dispose();
    };
  }, [controller, repository]);
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
