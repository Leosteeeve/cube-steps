import { useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { RouxLabSession } from './session';
import type { RouxExperiment } from '../../roux-lab/experiments/types';
import { createRouxExperiment, createRouxComparison } from '../../roux-lab/experiments/snapshots';
import { useRouxNotebook } from './RouxNotebookProvider';
import { ExperimentTransfer } from './ExperimentTransfer';
export function ExperimentPanel({
  engine,
  state,
  onLoad,
  onSaved,
  quiesce,
}: {
  engine: CubeEngine;
  state: RouxLabSession;
  onLoad: (e: RouxExperiment) => Promise<void>;
  onSaved: (e: RouxExperiment) => void;
  quiesce: () => void;
}) {
  const notebook = useRouxNotebook(),
    [label, setLabel] = useState(''),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  if (!notebook) return <p role="status">Opening the local Roux notebook…</p>;
  const { records, repository } = notebook;
  async function save() {
    if (!notebook) return;
    quiesce();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const pinned = state.comparison ? [state.comparison.A, state.comparison.B] : [],
        routes = [
          ...pinned,
          ...state.routes.filter((r) => !pinned.some((p) => p.id === r.id)),
        ].slice(0, 4),
        experiment = createRouxExperiment(
          { ...state, routes },
          routes.map((r) => r.id),
          label,
        );
      await notebook.repository.saveExperiment(experiment);
      if (state.comparison)
        await notebook.repository.saveComparison(
          createRouxComparison(experiment, state.comparison.A.id, state.comparison.B.id),
        );
      onSaved(experiment);
      setStatus('Roux experiment saved on this device.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function load(id: string) {
    const e = records.experiments.find((e) => e.id === id);
    if (!e) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await onLoad(e);
      setStatus('Saved Roux experiment loaded. Search has not restarted.');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Roux experiment notebook">
      <details className="roux-lab-card">
        <summary>Save & open experiments</summary>
        <p>
          Records stay in this browser on this device. Export a file to share a route with a
          clubmate or keep a backup.
        </p>
        <label className="roux-input-label">
          Experiment label (optional)
          <input value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <button
          disabled={busy || !state.routes.length || !state.coverage}
          onClick={() => void save()}
        >
          Save Roux experiment
        </button>
        <label className="roux-input-label">
          Saved Roux experiments
          <select
            value={state.experimentId ?? ''}
            disabled={busy}
            onChange={(e) => void load(e.target.value)}
          >
            <option value="">Choose an experiment</option>
            {records.experiments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label ?? e.createdAt}
              </option>
            ))}
          </select>
        </label>
        {records.pending.length > 0 && (
          <div role="status">
            <p>Unsaved work — keep this tab open.</p>
            {records.pending.map((p) => (
              <div key={p.id}>
                <p>{p.error ?? 'Waiting for the transaction to commit.'}</p>
                {p.conflict ? (
                  <p>
                    Refresh and reconcile this edit. Your unsaved version is still available for
                    export.
                  </p>
                ) : (
                  <button
                    onClick={() => void repository.retry(p.id).catch((e) => setError(String(e)))}
                  >
                    Retry save
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {records.error && (
          <p role="alert">
            {records.error}
            <button onClick={() => void repository.refresh()}>Retry notebook</button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {status && <p role="status">{status}</p>}
      </details>
      <ExperimentTransfer engine={engine} quiesce={quiesce} />
    </section>
  );
}
