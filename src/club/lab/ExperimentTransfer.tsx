import { useState } from 'react';
import { buildLabExport, exportLabCsv } from '../../lab/experiments/export';
import {
  stageLabImport,
  commitLabImport,
  type LabImportPreview,
  type ImportResolutions,
} from '../../lab/experiments/transfer';
import { useLabNotebook } from './LabNotebookProvider';
import { useLabSession } from './LabSessionProvider';
import { downloadLabText } from './LabExperimentPanel';
export function ExperimentTransfer() {
  const { records, repository } = useLabNotebook(),
    { quiesce, timingLocked } = useLabSession();
  const [selected, setSelected] = useState<string[]>([]),
    [attempts, setAttempts] = useState(false),
    [labels, setLabels] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [preview, setPreview] = useState<LabImportPreview>(),
    [resolutions, setResolutions] = useState<ImportResolutions>({}),
    [source, setSource] = useState<File>();
  const options = new Map(records.experiments.map((e) => [e.id, e]));
  for (const p of records.pending)
    if (p.table === 'experiments')
      for (const row of p.records) if ('routes' in row) options.set(row.id, row);
  const selection = {
    experimentIds: selected,
    includeAttempts: attempts,
    includeTesterLabels: labels,
  };
  function exportFile(csv: boolean) {
    setError('');
    setStatus('');
    try {
      const text = csv
        ? exportLabCsv(records, selection)
        : JSON.stringify(buildLabExport(records, selection));
      downloadLabText(
        csv ? 'cfop-lab-trials.csv' : 'cfop-lab-experiments.json',
        text,
        csv ? 'text/csv;charset=utf-8' : 'application/json',
      );
      setStatus('Download prepared. Share only the file and details you intend to share.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function stage(file: File) {
    setBusy(true);
    setError('');
    setStatus('Checking file and replaying routes…');
    setPreview(undefined);
    setResolutions({});
    setSource(file);
    quiesce();
    try {
      const { loadLabContext } = await import('../../workers/lab-request');
      const p = await stageLabImport(file, await loadLabContext(), repository.snapshot());
      setPreview(p);
      setStatus('Preview ready. No records have been written.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('Import rejected. Stored records are unchanged.');
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError('');
    quiesce();
    try {
      await commitLabImport(preview, resolutions, repository);
      setPreview(undefined);
      setSource(undefined);
      setStatus('Import committed on this device.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(
        'Import was not committed. Your preview is retained; refresh it if another tab changed the notebook.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="lab-card lab-transfer"
      aria-label="Experiment transfer"
      data-tour="lab.transfer"
    >
      <h2>Share a reproducible experiment</h2>
      <p>
        JSON keeps exact routes and versions. Trial records and tester labels are optional. Files
        stay on your device until you choose to share them.
      </p>
      <fieldset disabled={busy || timingLocked}>
        <legend>Export selection</legend>
        {!options.size && <p>Save an experiment first, or import one below.</p>}
        {[...options.values()].map((e) => (
          <label key={e.id}>
            <input
              type="checkbox"
              checked={selected.includes(e.id)}
              onChange={(event) =>
                setSelected(
                  event.target.checked ? [...selected, e.id] : selected.filter((id) => id !== e.id),
                )
              }
              aria-label={`Export ${e.label || e.createdAt}`}
            />
            {e.label || e.createdAt} · {e.routes.length} route(s)
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={attempts}
            onChange={(e) => setAttempts(e.target.checked)}
          />
          Include trial records and revision history
        </label>
        <label>
          <input
            type="checkbox"
            checked={labels}
            disabled={!attempts}
            onChange={(e) => setLabels(e.target.checked)}
          />
          Include tester labels
        </label>
        <p>
          Default: routes only. Pending edits, when selected, are marked unsaved in the file. Only
          blocks referenced by exported attempts are included. Limit: 10 MiB, 50 experiments and
          5,000 attempt/revision records; reduce the selection if needed.
        </p>
        <div className="lab-transfer-actions">
          <button disabled={!selected.length} onClick={() => exportFile(false)}>
            Export selected JSON
          </button>
          <button disabled={!selected.length} onClick={() => exportFile(true)}>
            Export selected CSV
          </button>
        </div>
      </fieldset>
      <label>
        Import experiment JSON
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy || timingLocked}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void stage(file);
          }}
        />
      </label>
      {preview && (
        <div className="lab-import-preview">
          <h3>Import preview</h3>
          <p>
            {preview.data.experiments.length} experiment(s) ·{' '}
            {preview.data.experiments.reduce((n, e) => n + e.routes.length, 0)} route(s) ·{' '}
            {preview.data.attempts.length} trial(s) · {preview.data.attemptRevisions.length}{' '}
            revision record(s).
          </p>
          <p>
            {preview.deduplicated} identical record(s) can be reused. No existing records will be
            overwritten.
          </p>
          {!!preview.data.pending.length && (
            <p>
              {preview.data.pending.length} record(s) were marked unsaved on the source device.
              Commit will save the validated copies here.
            </p>
          )}
          {!!preview.archives.length && (
            <p>
              <strong>Archived · not a current recommendation</strong>
              <br />
              {preview.archives.length} experiment(s) use older or unknown versions. Physical replay
              passed; archived estimates are not current-profile evidence.
            </p>
          )}
          {preview.conflicts.map((c) => (
            <label key={c.experimentId}>
              Conflict:{' '}
              {preview.data.experiments.find((e) => e.id === c.experimentId)?.label ||
                c.experimentId}
              <span>{c.reason}</span>
              <select
                value={resolutions[c.experimentId] ?? ''}
                disabled={busy || timingLocked}
                onChange={(e) =>
                  setResolutions({
                    ...resolutions,
                    [c.experimentId]: e.target.value as 'skip' | 'import-copy',
                  })
                }
              >
                <option value="">Choose a resolution</option>
                <option value="skip">Skip this experiment</option>
                <option value="import-copy">Import a separate copy</option>
              </select>
            </label>
          ))}
          <div className="lab-transfer-actions">
            <button
              disabled={
                busy || timingLocked || preview.conflicts.some((c) => !resolutions[c.experimentId])
              }
              onClick={() => void commit()}
            >
              Commit validated import
            </button>
            <button
              disabled={busy || timingLocked}
              onClick={() => {
                if (source) void stage(source);
              }}
            >
              Refresh preview
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setPreview(undefined);
                setSource(undefined);
                setStatus('Preview discarded. No records were written.');
              }}
            >
              Discard preview
            </button>
          </div>
        </div>
      )}
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
