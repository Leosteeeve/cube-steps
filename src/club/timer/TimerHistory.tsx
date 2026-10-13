import { memo, useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { TimerRepository } from './repository';
import type { DeleteToken } from './storage';
import type { Penalty } from './types';
import { useTimerHistory } from './use-timer';
import { effectiveResult, orderedAttempts } from './statistics';
import { formatResult } from './format';
import { prepareTimerScramble } from './scramble';
import { ScrambleNet } from './ScrambleNet';
export const TimerHistory = memo(function TimerHistory({
  repository,
  engine,
}: {
  repository: TimerRepository;
  engine: CubeEngine;
}) {
  const history = useTimerHistory(repository),
    active = useMemo(() => orderedAttempts(history.attempts), [history.attempts]);
  const [page, setPage] = useState(0),
    [selected, setSelected] = useState(''),
    [undo, setUndo] = useState<DeleteToken | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const lastPage = Math.max(0, Math.ceil(active.length / 25) - 1),
    current = Math.min(page, lastPage),
    rows = active
      .slice()
      .reverse()
      .slice(current * 25, (current + 1) * 25);
  const chosen = active.find((a) => a.id === selected);
  const prepared = useMemo(
    () => (chosen ? prepareTimerScramble(engine, chosen.scramble, chosen.id) : null),
    [engine, chosen],
  );
  async function act(operation: () => Promise<unknown>) {
    setBusy(true);
    setMessage('');
    try {
      await operation();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Could not change this result. Retry after reloading history.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="timer-history" aria-label="Solve history">
      <div className="timer-card-heading">
        <h2>Your solve history</h2>
        <span>ON THIS DEVICE</span>
      </div>
      {!active.length ? (
        <div className="timer-empty">
          <strong>A fresh start.</strong>
          <p>Your completed solves will appear here.</p>
        </div>
      ) : (
        <>
          <table>
            <caption className="sr-only">
              Newest solves first. Select a time to review its scramble.
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Time</th>
                <th scope="col">Adjustment</th>
                <th scope="col">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const n = active.length - current * 25 - i,
                  pending = history.pendingIds.includes(a.id);
                return (
                  <tr key={a.id}>
                    <td>{n}</td>
                    <td>
                      <button
                        className="timer-result-button"
                        aria-label={`View solve ${n}: ${formatResult(effectiveResult(a))}`}
                        aria-expanded={selected === a.id}
                        onClick={() => setSelected(selected === a.id ? '' : a.id)}
                      >
                        {formatResult(effectiveResult(a))}
                      </button>
                      {pending && <small className="timer-unsaved">Not saved</small>}
                    </td>
                    <td>
                      <select
                        aria-label={`Adjustment for solve ${n}`}
                        value={a.manualPenalty}
                        disabled={busy || pending}
                        onChange={(e) => {
                          const penalty = e.target.value as Penalty;
                          void act(() => repository.updatePenalty(a.id, a.revision, penalty));
                        }}
                      >
                        <option value="none">OK</option>
                        <option value="plus2">+2</option>
                        <option value="dnf">DNF</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="timer-delete"
                        aria-label={`Delete solve ${n}`}
                        disabled={busy || pending}
                        onClick={() =>
                          void act(async () => {
                            const token = await repository.softDelete(
                              a.id,
                              a.revision,
                              new Date().toISOString(),
                            );
                            setUndo(token);
                          })
                        }
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <nav className="timer-pagination" aria-label="History pages">
            <button disabled={current === 0} onClick={() => setPage(current - 1)}>
              Newer solves
            </button>
            <span>
              {current + 1} / {lastPage + 1}
            </span>
            <button disabled={current === lastPage} onClick={() => setPage(current + 1)}>
              Older solves
            </button>
          </nav>
        </>
      )}
      {undo && (
        <p className="timer-undo">
          Result deleted.{' '}
          <button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const restored = await repository.undoDelete(undo);
                setUndo(null);
                if (!restored)
                  setMessage('This result changed in another tab. Undo was not applied.');
              })
            }
          >
            Undo deletion
          </button>
        </p>
      )}
      {message && (
        <p role="alert" className="timer-notice">
          {message}
        </p>
      )}
      {chosen && prepared && (
        <div className="timer-record-details">
          <h3>Recorded scramble</h3>
          <p>{new Date(chosen.createdAt).toLocaleString()}</p>
          <p className="timer-scramble-text">{chosen.scramble}</p>
          <ScrambleNet facelets={prepared.facelets} label="Historical scramble diagram" />
          <dl>
            <div>
              <dt>Raw time</dt>
              <dd>{formatResult({ kind: 'time', ms: chosen.rawMs })}</dd>
            </div>
            <div>
              <dt>Inspection</dt>
              <dd>
                {chosen.inspectionMs === null
                  ? 'Off'
                  : `${(chosen.inspectionMs / 1000).toFixed(2)}s · ${chosen.inspectionPenalty === 'plus2' ? '+2' : chosen.inspectionPenalty === 'dnf' ? 'DNF' : 'OK'}`}
              </dd>
            </div>
            <div>
              <dt>Manual adjustment</dt>
              <dd>
                {chosen.manualPenalty === 'plus2'
                  ? '+2'
                  : chosen.manualPenalty === 'dnf'
                    ? 'DNF'
                    : 'OK'}
              </dd>
            </div>
            {chosen.interruption && (
              <div>
                <dt>Interrupted</dt>
                <dd>{chosen.interruption} · DNF</dd>
              </div>
            )}
          </dl>
        </div>
      )}
      <p className="timer-chart-note">
        Manual +2 adds to an inspection +2. DNF overrides the time. Corrections update every
        average.
      </p>
    </section>
  );
});
