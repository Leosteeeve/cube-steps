import { useState } from 'react';
import type { LabAttempt, LabDeleteToken, LabExperiment } from '../../lab/experiments/types';
import type { LabRepository } from '../../lab/experiments/repository';
import { parseTrialDuration } from '../../lab/trials/parse-duration';
import { trialTime } from './TrialTimer';
export function TrialHistory({
  attempts,
  experiment,
  repository,
  disabled,
}: {
  attempts: readonly LabAttempt[];
  experiment: LabExperiment;
  repository: LabRepository;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState<LabAttempt>(),
    [time, setTime] = useState(''),
    [note, setNote] = useState(''),
    [flow, setFlow] = useState(''),
    [recognition, setRecognition] = useState(''),
    [outcome, setOutcome] = useState<LabAttempt['outcome']>('incomplete'),
    [error, setError] = useState(''),
    [undo, setUndo] = useState<LabDeleteToken>();
  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  async function correct() {
    if (!editing) return;
    const parsed = time.trim() ? parseTrialDuration(time) : { ok: true as const, ms: null };
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    await repository.saveAttempt(
      {
        ...editing,
        rawMs: parsed.ms,
        outcome,
        note,
        flow: flow ? Number(flow) : undefined,
        recognition: recognition ? Number(recognition) : undefined,
        revision: editing.revision + 1,
        previousRevision: editing.revision,
        updatedAt: new Date().toISOString(),
      },
      editing.revision,
    );
    setEditing(undefined);
  }
  return (
    <section className="lab-card" aria-label="Trial history">
      <h2>Every attempt, kept in context</h2>
      <p>
        Corrections create a revision. Deleted attempts stay recoverable and do not count in
        summaries.
      </p>
      {!attempts.length && <p>No trials yet. Warmups and exploratory attempts are welcome.</p>}
      <ul className="lab-history">
        {attempts
          .slice()
          .sort(
            (a, b) =>
              b.createdAt.localeCompare(a.createdAt) ||
              (b.actualOrder ?? 0) - (a.actualOrder ?? 0) ||
              b.id.localeCompare(a.id),
          )
          .map((a) => {
            const route = experiment.routes.find((r) => r.id === a.routeId);
            return (
              <li key={a.id}>
                <strong>
                  {trialTime(a.rawMs)} · {a.outcome}
                  {a.deletedAt ? ' · Deleted' : ''}
                </strong>
                <p>
                  {route?.startHold.bottom} bottom / {route?.startHold.front} front ·{' '}
                  {a.timingMethod} · {a.kind} · revision {a.revision}
                </p>
                <p>
                  {a.blockId
                    ? `Block ${a.blockId.slice(0, 8)} · intended ${a.intendedOrder} · actual attempt ${a.actualOrder}`
                    : 'Exploratory — outside matched blocks'}
                  {a.retryOf ? ` · retry of ${a.retryOf.slice(0, 8)}` : ''}
                </p>
                {a.note && <p>{a.note}</p>}
                <p>
                  Flow {a.flow ?? 'not rated'} · Recognition {a.recognition ?? 'not rated'}
                  {a.interruption ? ` · ${a.interruption}` : ''}
                </p>
                <button
                  disabled={disabled || !!a.deletedAt}
                  onClick={() => {
                    setEditing(a);
                    setTime(a.rawMs === null ? '' : String(a.rawMs / 1000));
                    setNote(a.note ?? '');
                    setFlow(a.flow === undefined ? '' : String(a.flow));
                    setRecognition(a.recognition === undefined ? '' : String(a.recognition));
                    setOutcome(a.outcome);
                  }}
                >
                  Correct trial
                </button>
                {a.deletedAt ? (
                  <button
                    disabled={disabled}
                    onClick={() =>
                      void run(() => repository.undoDelete({ id: a.id, revision: a.revision }))
                    }
                  >
                    Restore trial
                  </button>
                ) : (
                  <button
                    disabled={disabled}
                    onClick={() =>
                      void run(async () =>
                        setUndo(await repository.softDeleteAttempt(a.id, a.revision)),
                      )
                    }
                  >
                    Delete trial
                  </button>
                )}
              </li>
            );
          })}
      </ul>
      {undo && (
        <button
          disabled={disabled}
          onClick={() =>
            void run(async () => {
              await repository.undoDelete(undo);
              setUndo(undefined);
            })
          }
        >
          Undo last deletion
        </button>
      )}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(correct);
          }}
        >
          <h3>Correct trial · revision {editing.revision}</h3>
          <label>
            Corrected duration
            <input value={time} onChange={(e) => setTime(e.target.value)} disabled={disabled} />
          </label>
          <label>
            Corrected outcome
            <select
              value={outcome}
              disabled={disabled || !!editing.interruption}
              onChange={(e) => setOutcome(e.target.value as LabAttempt['outcome'])}
            >
              <option value="followed">Followed</option>
              <option value="deviated">Deviated</option>
              <option value="incomplete">Incomplete</option>
              <option value="interrupted" disabled>
                Interrupted
              </option>
            </select>
          </label>
          <label>
            Correction note
            <textarea
              maxLength={2000}
              value={note}
              disabled={disabled}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label>
            Corrected flow
            <select value={flow} disabled={disabled} onChange={(e) => setFlow(e.target.value)}>
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Corrected recognition
            <select
              value={recognition}
              disabled={disabled}
              onChange={(e) => setRecognition(e.target.value)}
            >
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button disabled={disabled}>Save correction</button>
          <button type="button" onClick={() => setEditing(undefined)}>
            Cancel correction
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
