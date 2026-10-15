import { useState } from 'react';
import { createExperiment, verifyExperiment } from '../../lab/experiments/snapshots';
import { useLabSession } from './LabSessionProvider';
import { useLabNotebook } from './LabNotebookProvider';
export function downloadLabText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LabExperimentPanel() {
  const { state, edit, quiesce, timingLocked } = useLabSession(),
    { repository, records } = useLabNotebook();
  const [label, setLabel] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  const ids = [
    ...new Set([state.pinnedRouteId, ...state.comparedRouteIds].filter((id): id is string => !!id)),
  ].slice(0, 4);
  async function save() {
    setBusy(true);
    setStatus('Saving experiment…');
    quiesce();
    try {
      const e = createExperiment(
        { ...state.snapshot, routes: ids.map((id) => state.routes[id]), settings: state.settings },
        ids,
        label,
      );
      await repository.saveExperiment(e);
      setStatus('Experiment saved on this device.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function load(id: string) {
    if (!id) return;
    setBusy(true);
    setStatus('Checking saved routes…');
    quiesce();
    try {
      const e = records.experiments.find((e) => e.id === id)!;
      const { loadLabContext } = await import('../../workers/lab-request'),
        context = await loadLabContext();
      const routes = await verifyExperiment(context, e);
      edit({
        type: 'load-experiment',
        experimentId: e.id,
        input: e.input,
        settings: e.settings,
        routes,
        coverage: e.coverage,
      });
      setStatus('Saved experiment loaded. Search has not restarted.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="lab-card lab-save" aria-label="Experiment notebook">
      <h2>Keep an experiment</h2>
      <p>
        Save the pinned route and selected comparisons (up to four) with their exact input and
        versions. Nothing is shared automatically.
      </p>
      <label>
        Experiment label (optional)
        <input maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <button
        disabled={
          timingLocked || busy || !ids.length || state.routes[ids[0]]?.validationMode !== 'current'
        }
        onClick={() => void save()}
      >
        Save experiment
      </button>
      <label>
        Saved experiments
        <select
          disabled={busy || timingLocked}
          value={state.selectedExperimentId ?? ''}
          onChange={(e) => void load(e.target.value)}
        >
          <option value="">Choose a saved experiment</option>
          {records.experiments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label || e.createdAt} · {e.routes.length} route(s)
            </option>
          ))}
        </select>
      </label>
      {status && <p role="status">{status}</p>}
      {records.error && <p role="alert">{records.error}</p>}
      {records.incompatibleCount > 0 && (
        <p role="status">
          {records.incompatibleCount} incompatible record(s) preserved and excluded.{' '}
          <button
            onClick={() =>
              downloadLabText(
                'lab-recovery.json',
                JSON.stringify(records.incompatibleRecords, null, 2),
              )
            }
          >
            Export preserved records
          </button>
        </p>
      )}
      {!!records.pending.length && (
        <div role="status">
          <strong>Unsaved work — keep this tab open.</strong>
          <p>A failed save is only in memory. Retry or export it before closing the browser.</p>
          {records.pending.map((p) => (
            <p key={p.id}>
              {p.table}: {p.error || 'Saving…'}{' '}
              <button
                disabled={busy || p.conflict}
                onClick={() => void repository.retry(p.id).catch(() => {})}
              >
                Retry save
              </button>
              {p.error && (
                <button onClick={() => repository.discardPending(p.id)}>
                  Discard unsaved edit; keep saved version
                </button>
              )}
            </p>
          ))}
          <button
            onClick={() =>
              downloadLabText(
                'lab-unsaved-recovery.json',
                JSON.stringify({ schemaVersion: 1, pending: records.pending }, null, 2),
              )
            }
          >
            Export unsaved recovery
          </button>
        </div>
      )}
    </section>
  );
}
