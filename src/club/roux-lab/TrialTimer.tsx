import { useCallback, useEffect, useRef, useState } from 'react';
import type { RouxRoute } from '../../roux-lab/types';
import { downloadRouxText } from './ExperimentTransfer';
import type {
  RouxTrialConditions as TrialConditions,
  RouxTrialDraft as TrialDraft,
  RouxTrialEvent as TrialEvent,
  RouxTrialMemory as TrialMemory,
  RouxTrialState as TrialState,
} from '../../roux-lab/trials/types';
import {
  createRouxTrial as createTrial,
  reduceRouxTrial as reduceTrial,
  trialIsActive,
  TRIAL_HOLD_MS,
} from '../../roux-lab/trials/machine';
import { shouldHandleTrialKey, trialNow } from '../../lab/trials/input';
import { useOptionalClubTutorial } from '../tutorial/TutorialProvider';
export function routeHasTrialWork(route: RouxRoute) {
  return route.counts.combined > 0;
}
export const trialTime = (ms: number | null) =>
  ms === null ? 'Untimed' : `${(ms / 1000).toFixed(2)} s`;
export function TrialTimer(props: {
  route: RouxRoute;
  conditions: TrialConditions;
  active: boolean;
  memory: TrialMemory;
  quiesce: () => void;
  onActivity: (active: boolean) => void;
  onReview: (review: boolean) => void;
  onSave: (draft: TrialDraft, id: string, createdAt: string) => Promise<void>;
}) {
  const latest = useRef(props);
  const pointer = useRef<number | null>(null);
  latest.current = props;
  const [state, setState] = useState<TrialState>(
      () => props.memory.current ?? createTrial(props.conditions),
    ),
    current = useRef(state);
  const [tick, setTick] = useState(0),
    [manual, setManual] = useState(''),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const runtime = useOptionalClubTutorial()?.runtime,
    signature = JSON.stringify(props.conditions),
    hasWork = routeHasTrialWork(props.route);
  const persist = useCallback((next: TrialState) => {
    const p = latest.current;
    current.current = next;
    p.memory.current = next;
    if (next.status === 'review' && !p.memory.draftId) {
      p.memory.draftId = crypto.randomUUID();
      p.memory.createdAt = new Date().toISOString();
    }
    p.onActivity(trialIsActive(next));
    p.onReview(next.status === 'review');
    setState(next);
  }, []);
  const send = useCallback(
    (event: TrialEvent) => {
      const result = reduceTrial(current.current, event);
      for (const effect of result.effects) if (effect.type === 'quiesce') latest.current.quiesce();
      if (result.state !== current.current) persist(result.state);
    },
    [persist],
  );
  useEffect(() => {
    if (
      current.current.status === 'preparing' &&
      JSON.stringify(current.current.conditions) !== signature
    )
      send({ type: 'next', conditions: latest.current.conditions });
  }, [signature, state.status, send]);
  useEffect(() => {
    latest.current.onReview(current.current.status === 'review');
    if (!props.active) send({ type: 'interrupt', reason: 'leave', now: trialNow() });
    return () => {
      send({ type: 'interrupt', reason: 'leave', now: trialNow() });
      latest.current.onActivity(false);
    };
  }, [props.active, send]);
  useEffect(() => {
    if (!runtime) return;
    const guard = runtime.registerGuard(() => !trialIsActive(current.current)),
      lock = runtime.registerInputLock((locked) => send({ type: 'lock', locked, now: trialNow() }));
    return () => {
      guard();
      lock();
    };
  }, [runtime, send]);
  useEffect(() => {
    if (state.status !== 'holding') return;
    const token = state.token;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      send({ type: 'arm', token, now: trialNow() });
      if (current.current.status === 'holding' && current.current.token === token)
        timer = setTimeout(arm, 5);
    };
    timer = setTimeout(arm, Math.max(0, TRIAL_HOLD_MS - (trialNow() - state.pressedAt)));
    return () => clearTimeout(timer);
  }, [state.status, state.token, send]);
  useEffect(() => {
    if (state.status !== 'running') return;
    let raf: number;
    const frame = () => {
      setTick(trialNow());
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [state.status]);
  useEffect(() => {
    const interrupt = (reason: 'blur' | 'hidden' | 'leave' | 'escape') =>
      send({ type: 'interrupt', reason, now: trialNow() });
    const key = (event: KeyboardEvent) => {
      if (!latest.current.active) return;
      if (event.code === 'Escape' && trialIsActive(current.current)) {
        event.preventDefault();
        interrupt('escape');
        return;
      }
      if (
        current.current.conditions.timingMethod !== 'keyboard' ||
        !routeHasTrialWork(latest.current.route)
      )
        return;
      const owned =
        event.target instanceof Element && event.target.closest('[data-roux-timing-surface]');
      const eligible = owned
        ? shouldHandleTrialKey(
            {
              ...event,
              code: event.code,
              repeat: event.repeat,
              ctrlKey: event.ctrlKey,
              altKey: event.altKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
              target: document.body,
            },
            current.current.inputLocked,
          )
        : shouldHandleTrialKey(event, current.current.inputLocked);
      if (!eligible) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      send({
        type: event.type === 'keydown' ? 'press' : 'release',
        now: trialNow(),
        ...(event.type === 'keydown' ? { repeat: event.repeat } : {}),
      } as TrialEvent);
    };
    const blur = () => interrupt('blur'),
      focus = (event: FocusEvent) => {
        if (
          current.current.conditions.timingMethod === 'keyboard' &&
          ['holding', 'ready'].includes(current.current.status) &&
          !(event.target instanceof Element && event.target.closest('[data-roux-timing-surface]'))
        )
          interrupt('blur');
      },
      hidden = () => {
        if (document.hidden) interrupt('hidden');
      },
      leave = () => interrupt('leave');
    document.addEventListener('keydown', key, true);
    document.addEventListener('keyup', key, true);
    document.addEventListener('focusin', focus, true);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('hashchange', leave);
    return () => {
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('keyup', key, true);
      document.removeEventListener('focusin', focus, true);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('hashchange', leave);
    };
  }, [send]);
  useEffect(() => {
    if (state.status !== 'review') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.status]);
  const reset = () => {
    pointer.current = null;
    latest.current.memory.draftId = undefined;
    latest.current.memory.createdAt = undefined;
    setError('');
    setManual('');
    send({ type: 'next', conditions: latest.current.conditions });
  };
  const feedback = (field: 'flow' | 'recognition' | 'note', value: string) => {
    if (current.current.status !== 'review') return;
    const draft = {
      ...current.current.draft,
      [field]: field === 'note' ? value : value ? Number(value) : undefined,
    };
    persist({ ...current.current, draft });
  };
  const save = async () => {
    if (current.current.status !== 'review' || !current.current.draft.outcome) return;
    setSaving(true);
    setError('');
    try {
      await props.onSave(
        current.current.draft,
        (props.memory.draftId ??= crypto.randomUUID()),
        (props.memory.createdAt ??= new Date().toISOString()),
      );
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="roux-lab-card roux-trial-timer" aria-label="Roux two-block trial timer">
      <h2>Practice the route. Then time it.</h2>
      <p>
        Stop when both 1×2×3 blocks are complete, before CMLL. Initial positioning is untimed. This
        timer cannot detect turns or verify completion.
      </p>
      {!hasWork ? (
        <p className="notice">
          Both blocks are already complete. Measured timing is disabled for this checkpoint.
        </p>
      ) : props.route.counts.first === 0 ? (
        <p className="notice">
          The first block is already complete. This partial-route trial measures the second block
          under the saved conditions.
        </p>
      ) : null}
      {state.status === 'review' ? (
        <div className="roux-trial-review">
          <h3>Review this trial</h3>
          <p>{trialTime(state.draft.rawMs)}</p>
          <p>
            {state.draft.timingMethod} · {state.draft.kind} ·{' '}
            {state.draft.interruption
              ? `Interrupted: ${state.draft.interruption}`
              : 'Completion and route adherence are self-reported.'}
          </p>
          <label>
            Outcome
            <select
              value={state.draft.outcome ?? ''}
              disabled={!!state.draft.interruption || saving}
              onChange={(e) =>
                send({
                  type: 'classify',
                  outcome: e.target.value as TrialDraft['outcome'] & string,
                })
              }
            >
              <option value="">Choose outcome</option>
              <option value="followed">Followed the route and completed both blocks</option>
              <option value="deviated">Deviated from the route</option>
              <option value="incomplete">Incomplete</option>
              <option value="interrupted" disabled>
                Interrupted
              </option>
            </select>
          </label>
          {(['flow', 'recognition'] as const).map((key) => (
            <label key={key}>
              {key === 'flow' ? 'Execution flow' : 'Recognition ease'} (optional)
              <select
                value={state.draft[key] ?? ''}
                disabled={saving}
                onChange={(e) => feedback(key, e.target.value)}
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                    {n === 1 ? ' — difficult' : n === 5 ? ' — smooth/easy' : ''}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Trial note
            <textarea
              maxLength={2000}
              value={state.draft.note ?? ''}
              disabled={saving}
              onChange={(e) => feedback('note', e.target.value)}
            />
          </label>
          <button disabled={saving || !state.draft.outcome} onClick={() => void save()}>
            Save trial
          </button>
          <button
            disabled={saving}
            onClick={() =>
              downloadRouxText(
                'roux-unsaved-trial.json',
                JSON.stringify(
                  {
                    kind: 'cubesteps-roux-trial-draft',
                    schemaVersion: 1,
                    id: props.memory.draftId,
                    createdAt: props.memory.createdAt,
                    draft: state.draft,
                    route: props.route,
                  },
                  null,
                  2,
                ),
                'application/json',
              )
            }
          >
            Export unsaved review
          </button>
          <p>
            This recovery file keeps the draft and exact route; save the trial to include it in a
            notebook import.
          </p>
          <button disabled={saving} onClick={reset}>
            Discard review and prepare next
          </button>
        </div>
      ) : (
        <>
          <fieldset disabled={state.status !== 'preparing' || state.inputLocked || !hasWork}>
            <legend>Before every attempt</legend>
            <label>
              <input
                type="checkbox"
                checked={state.setupConfirmed}
                onChange={(e) => send({ type: 'confirm-setup', value: e.target.checked })}
              />
              I reset the original cube and checked its diagram.
            </label>
            <label>
              <input
                type="checkbox"
                checked={state.holdConfirmed}
                onChange={(e) => send({ type: 'confirm-hold', value: e.target.checked })}
              />
              I matched the starting hold and grip after initial positioning.
            </label>
          </fieldset>
          {state.conditions.timingMethod === 'external-manual' ? (
            <div>
              <label>
                External time
                <input
                  inputMode="decimal"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="12.34 or 1:02.345"
                  disabled={state.inputLocked || !hasWork}
                />
              </label>
              <p>External timing is kept separate. Leave blank only for an untimed warmup.</p>
              <button
                disabled={state.inputLocked || !hasWork}
                onClick={() => send({ type: 'manual', text: manual })}
              >
                Review external time
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                data-roux-timing-surface="true"
                className={'roux-timing-surface ' + state.status}
                aria-label="Trial timing surface"
                disabled={state.inputLocked || !hasWork}
                onPointerDown={(e) => {
                  if (state.conditions.timingMethod !== 'touch' || !e.isPrimary || e.button !== 0)
                    return;
                  e.preventDefault();
                  pointer.current = e.pointerId;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  send({ type: 'press', now: trialNow() });
                }}
                onPointerUp={(e) => {
                  if (
                    state.conditions.timingMethod !== 'touch' ||
                    !e.isPrimary ||
                    e.pointerId !== pointer.current
                  )
                    return;
                  e.preventDefault();
                  send({ type: 'release', now: trialNow() });
                }}
                onPointerCancel={(e) => {
                  if (e.isPrimary && e.pointerId === pointer.current)
                    send({ type: 'interrupt', reason: 'pointer-cancel', now: trialNow() });
                }}
                onLostPointerCapture={(e) => {
                  if (
                    e.pointerId === pointer.current &&
                    ['holding', 'ready'].includes(current.current.status)
                  )
                    send({ type: 'interrupt', reason: 'pointer-cancel', now: trialNow() });
                }}
              >
                <span aria-live="off">
                  {state.status === 'running'
                    ? trialTime(Math.max(0, tick - state.startedAt))
                    : state.status === 'ready'
                      ? 'Release to start'
                      : state.status === 'holding'
                        ? 'Keep holding…'
                        : 'Ready when you are'}
                </span>
              </button>
              <p role="status">
                {state.status === 'running'
                  ? 'Timing both blocks. Press to stop.'
                  : state.status === 'ready'
                    ? 'Ready. Release to start.'
                    : state.status === 'holding'
                      ? 'Hold for 300 milliseconds.'
                      : 'Confirm setup, hold Space or the touch pad until ready, then release.'}
              </p>
            </>
          )}
        </>
      )}
      {(error || state.issue) && <p role="alert">{error || state.issue}</p>}
    </section>
  );
}
