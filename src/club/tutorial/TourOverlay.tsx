import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { TutorialRuntime } from './runtime';
import { TOURS } from './catalog';
import { collectTourFocusables } from './focus';
import { positionTour } from './position';
export function TourOverlay({ runtime }: { runtime: TutorialRuntime }) {
  const state = useSyncExternalStore(runtime.subscribe, runtime.snapshot),
    run = state.run;
  const tour = run ? TOURS[run.tourId] : null,
    index = tour?.steps.findIndex((s) => s.id === run?.stepId) ?? 0,
    step = tour?.steps[index];
  const target = step ? runtime.getTarget(step.targetId) : null,
    interactive = !!step?.action;
  const bubble = useRef<HTMLDivElement>(null),
    title = useRef<HTMLHeadingElement>(null);
  const [layout, setLayout] = useState<{ left: number; top: number; placement: string } | null>(
    null,
  );
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const open = !!(run || state.welcome),
    token = run?.token;
  useEffect(() => {
    if (!run || !step) return;
    const check = () =>
      runtime.controller.target(run.token, runtime.getTarget(step.targetId) ? 'ready' : 'waiting');
    check();
    const timeout = setTimeout(() => {
      if (!runtime.getTarget(step.targetId)) runtime.controller.target(run.token, 'unavailable');
    }, 5000);
    return () => clearTimeout(timeout);
  }, [runtime, token, step, target]);
  useLayoutEffect(() => {
    if (run && target) runtime.controller.target(run.token, 'ready');
  }, [runtime, token, target]);
  useLayoutEffect(() => {
    if (!open) return;
    title.current?.focus();
    if (target && run) target.scrollIntoView?.({ block: 'center', behavior: 'instant' });
  }, [open, token]);
  useLayoutEffect(() => {
    if (!open || !bubble.current) return;
    let frame = 0;
    function measure() {
      frame = 0;
      if (!bubble.current) return;
      const v = window.visualViewport,
        viewport = {
          left: v?.offsetLeft ?? 0,
          top: v?.offsetTop ?? 0,
          width: v?.width ?? innerWidth,
          height: v?.height ?? innerHeight,
        };
      // CSS zoom scales fixed-position coordinates as well as text. Convert
      // viewport measurements back to the overlay's local coordinate system.
      const scale =
        (Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1) *
        (Number.parseFloat(getComputedStyle(document.body).zoom) || 1);
      bubble.current.style.width = `${Math.min(360, viewport.width / scale - 24)}px`;
      bubble.current.style.maxHeight = `${viewport.height / scale - 24}px`;
      const box = bubble.current.getBoundingClientRect();
      const current = step ? runtime.getTarget(step.targetId) : null,
        r = current?.getBoundingClientRect();
      if (run && step && !current && runtime.controller.snapshot().run?.status !== 'unavailable')
        runtime.controller.target(run.token, 'waiting');
      const measured = r
        ? positionTour(r, box, viewport)
        : {
            left: Math.max(12, viewport.left + (viewport.width - box.width) / 2),
            top: Math.max(12, viewport.top + (viewport.height - box.height) / 2),
            placement: 'center',
          };
      const next = { ...measured, left: measured.left / scale, top: measured.top / scale };
      setLayout((old) =>
        old && old.left === next.left && old.top === next.top && old.placement === next.placement
          ? old
          : next,
      );
      const nr = r
        ? {
            left: r.left / scale,
            top: r.top / scale,
            width: r.width / scale,
            height: r.height / scale,
          }
        : null;
      setRect((old) => (JSON.stringify(old) === JSON.stringify(nr) ? old : nr));
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    resize?.observe(bubble.current);
    if (target) resize?.observe(target);
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [open, token, target, runtime, step]);
  useEffect(() => {
    if (!open) return;
    const permitted = (node: EventTarget | null) =>
      node instanceof Node &&
      (bubble.current?.contains(node) || (interactive && target?.contains(node)));
    const block = (event: Event) => {
      if (!permitted(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (state.welcome) runtime.welcomeChoice('later');
        else runtime.exit();
        return;
      }
      if (event.key === 'Tab' && bubble.current) {
        const list = collectTourFocusables(bubble.current, target, interactive),
          at = list.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        event.stopImmediatePropagation();
        list[
          event.shiftKey ? (at <= 0 ? list.length - 1 : at - 1) : (at + 1) % list.length
        ]?.focus();
      } else if (!permitted(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const focus = (event: FocusEvent) => {
      if (!permitted(event.target)) title.current?.focus();
    };
    document.addEventListener('pointerdown', block, true);
    document.addEventListener('click', block, true);
    document.addEventListener('keydown', keys, true);
    document.addEventListener('focusin', focus, true);
    return () => {
      document.removeEventListener('pointerdown', block, true);
      document.removeEventListener('click', block, true);
      document.removeEventListener('keydown', keys, true);
      document.removeEventListener('focusin', focus, true);
    };
  }, [open, token, target, interactive, state.welcome, runtime]);
  if (!open) return null;
  return createPortal(
    <div className="tutorial-layer">
      <div className="tutorial-shade" aria-hidden="true" />
      {rect && <div className="tutorial-outline" aria-hidden="true" style={rect} />}
      <div
        ref={bubble}
        className="tutorial-bubble"
        role="dialog"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        data-tutorial="true"
        data-placement={layout?.placement}
        style={layout ? { left: layout.left, top: layout.top } : undefined}
      >
        <div className="tutorial-eyebrow">
          {state.welcome
            ? 'MAKE YOURSELF AT HOME'
            : `PAGE TOUR · ${index + 1} OF ${tour!.steps.length}`}
        </div>
        <h2 id="tutorial-title" ref={title} tabIndex={-1}>
          {state.welcome ? 'Would you like a quick tour?' : step!.title}
        </h2>
        <p id="tutorial-description">
          {state.welcome
            ? 'Take a short look around, with a few simple things to try. You can skip, exit, or open Page tour again at any time.'
            : step!.body}
        </p>
        {state.welcome ? (
          <div className="tutorial-actions">
            <button
              className="club-primary"
              onClick={() => runtime.requestStart(state.welcome!, 'start')}
            >
              Start tour
            </button>
            <button onClick={() => runtime.welcomeChoice('later')}>Not now</button>
            <button onClick={() => runtime.welcomeChoice('never')}>Don't ask again</button>
          </div>
        ) : (
          <>
            <p className="tutorial-status" role="status">
              {run!.status === 'unavailable'
                ? 'This control is not available here. You can skip this step or exit.'
                : run!.status === 'waiting'
                  ? 'Waiting for this control… You can skip at any time.'
                  : run!.status === 'done'
                    ? 'Done. Continue when you are ready.'
                    : interactive
                      ? 'Your turn — try the highlighted control.'
                      : 'Read, then continue at your pace.'}
            </p>
            <div className="tutorial-actions">
              <button disabled={index === 0} onClick={runtime.controller.back}>
                Back
              </button>
              <button
                className="club-primary"
                disabled={interactive && run!.status !== 'done'}
                onClick={runtime.controller.next}
              >
                {index === tour!.steps.length - 1 ? 'Finish tour' : 'Next'}
              </button>
              <button onClick={runtime.controller.skip}>Skip step</button>
              <button onClick={runtime.exit}>Exit tour</button>
              <a href={`#/guide/${step!.guideSection}`} onClick={runtime.exit}>
                Written guide
              </a>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
