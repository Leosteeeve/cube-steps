import { useEffect, useRef, useState } from 'react';
import type { RouxLabSession } from './session';

type Snapshot = Pick<RouxLabSession, 'input' | 'routes' | 'coverage'>;

/** Keep keyed cards in place until a native pointer/keyboard interaction has finished. */
export function useRouteInteraction(state: RouxLabSession) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const pointer = useRef(false),
    focused = useRef(false);
  const held = snapshot?.input === state.input ? snapshot : null;

  function capture() {
    setSnapshot((current) =>
      current?.input === state.input
        ? current
        : {
            input: state.input,
            routes: state.routes,
            coverage: state.coverage,
          },
    );
  }
  function releasePointer() {
    pointer.current = false;
    if (!focused.current) setSnapshot(null);
  }
  useEffect(() => {
    pointer.current = false;
    focused.current = false;
    setSnapshot(null);
  }, [state.input]);
  useEffect(() => {
    // A release outside the cards has no click bubbling through the region.
    const up = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !region.current?.contains(event.target))
        releasePointer();
    };
    const reset = () => {
      pointer.current = false;
      focused.current = false;
      setSnapshot(null);
    };
    const hidden = () => {
      if (document.hidden) reset();
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', releasePointer);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', releasePointer);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  return {
    displayed: held ?? state,
    pending:
      !!held &&
      (held.routes.length !== state.routes.length ||
        held.routes.some((r, i) => r !== state.routes[i])),
    // Keep the refresh control focused and hold the newly shown batch for further keyboard use.
    refresh: () =>
      setSnapshot(
        focused.current
          ? {
              input: state.input,
              routes: state.routes,
              coverage: state.coverage,
            }
          : null,
      ),
    interaction: {
      ref: region,
      onPointerDownCapture: (event: React.PointerEvent) => {
        if (event.button > 0) return;
        pointer.current = true;
        capture();
      },
      onFocusCapture: () => {
        focused.current = true;
        capture();
      },
      onBlurCapture: (event: React.FocusEvent) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        )
          return;
        focused.current = false;
        if (!pointer.current) setSnapshot(null);
      },
      // Bubble after the button's callback, retaining the exact target through activation.
      onClick: releasePointer,
    },
  };
}
