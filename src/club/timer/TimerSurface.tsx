import { useRef } from 'react';
import type { TimerState, TimerInput } from './machine';
import { formatResult } from './format';
import { effectiveResult } from './statistics';
export function TimerSurface({
  state,
  dispatch,
}: {
  state: TimerState;
  dispatch: (input: TimerInput) => void;
}) {
  const pointer = useRef<number | null>(null);
  const inspectionStartedAt =
    state.phase === 'inspection' || state.phase === 'arming' ? state.inspectionStartedAt : null;
  const inspectionMs =
    inspectionStartedAt === null ? null : Math.max(0, state.nowMs - inspectionStartedAt);
  const ready =
    state.phase === 'arming' && !state.beginInspection && state.nowMs - state.armedAt >= 300;
  const label =
    state.phase === 'loading'
      ? 'Preparing your next scramble…'
      : state.phase === 'error'
        ? 'Generate a scramble to begin.'
        : state.phase === 'running'
          ? 'Solving. Press Space or touch to stop.'
          : state.phase === 'inspection'
            ? 'Inspect your cube. Hold, then release to start.'
            : state.phase === 'arming'
              ? state.beginInspection
                ? 'Release to begin inspection.'
                : ready
                  ? 'Ready. Release to start.'
                  : 'Keep holding…'
              : state.phase === 'stopped'
                ? 'Release to prepare the next scramble.'
                : state.settings.inspectionEnabled
                  ? 'Press and release to begin inspection.'
                  : 'Hold Space or this surface, then release to start.';
  const display =
    state.phase === 'running'
      ? formatResult({ kind: 'time', ms: Math.max(0, state.nowMs - state.solveStartedAt) })
      : inspectionMs !== null
        ? inspectionMs >= 17000
          ? 'DNF'
          : inspectionMs >= 15000
            ? '+2'
            : String(Math.ceil((15000 - inspectionMs) / 1000))
        : state.lastAttempt
          ? formatResult(effectiveResult(state.lastAttempt))
          : '0.00';
  return (
    <div className="timer-surface-wrap">
      <p className="timer-instruction" role="status">
        {label}
      </p>
      <button
        type="button"
        className="timer-surface"
        data-timer-surface
        aria-label="Timing surface"
        aria-describedby="timer-help"
        data-phase={state.phase}
        data-ready={ready}
        disabled={state.phase === 'loading' || state.phase === 'error'}
        onPointerDown={(e) => {
          if (e.button !== 0 || !e.isPrimary || pointer.current !== null) return;
          e.preventDefault();
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus({ preventScroll: true });
          dispatch({ type: 'down', token: `pointer:${e.pointerId}` });
        }}
        onPointerUp={(e) => {
          if (pointer.current !== e.pointerId) return;
          e.preventDefault();
          pointer.current = null;
          dispatch({ type: 'up', token: `pointer:${e.pointerId}` });
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          if (pointer.current !== e.pointerId) return;
          pointer.current = null;
          dispatch({ type: 'pointer-cancel' });
        }}
        onLostPointerCapture={() => {
          if (pointer.current !== null) {
            pointer.current = null;
            dispatch({ type: 'pointer-cancel' });
          }
        }}
        onKeyDown={(e) => {
          if (e.code === 'Space') {
            e.preventDefault();
            e.stopPropagation();
            if (!e.repeat) dispatch({ type: 'down', token: 'keyboard' });
          }
        }}
        onKeyUp={(e) => {
          if (e.code === 'Space') {
            e.preventDefault();
            e.stopPropagation();
            dispatch({ type: 'up', token: 'keyboard' });
          }
        }}
        onClick={(e) => e.preventDefault()}
      >
        <span aria-hidden="true">{display}</span>
      </button>
      <p id="timer-help">Hold for 0.3 seconds to arm. Release to start. Press to stop.</p>
      <p className="timer-gentle">One solve is a moment. Enjoy the practice.</p>
    </div>
  );
}
