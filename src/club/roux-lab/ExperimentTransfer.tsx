import { useRef, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { useRouxNotebook } from './RouxNotebookProvider';
import {
  exportRouxExperiments,
  previewRouxImport,
  TRANSFER_BYTES,
} from '../../roux-lab/experiments/transfer';
import { exportRouxCsv } from '../../roux-lab/experiments/csv';
import { loadRouxLabAssets } from '../../roux-lab/browser-assets';
export function downloadRouxText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExperimentTransfer({
  engine,
  quiesce,
}: {
  engine: CubeEngine;
  quiesce: () => void;
}) {
  const notebook = useRouxNotebook(),
    [selected, setSelected] = useState<string[]>([]),
    [trials, setTrials] = useState(false),
    [labels, setLabels] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [status, setStatus] = useState(''),
    [preview, setPreview] = useState<Awaited<ReturnType<typeof previewRouxImport>>>(),
    epoch = useRef(0);
  if (!notebook) return null;
  const { repository, records } = notebook,
    options = new Map(records.experiments.map((e) => [e.id, e]));
  for (const pending of records.pending)
    if (pending.table === 'experiments')
      for (const row of pending.records) if ('routes' in row) options.set(row.id, row);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
  function exportFile(csv = false) {
    setError('');
    try {
      if (csv) {
        const ids = new Set(selected),
          attempts = records.attempts.filter((a) => ids.has(a.experimentId));
        downloadRouxText('roux-lab-trials.csv', exportRouxCsv(attempts), 'text/csv');
      } else
        downloadRouxText(
          'roux-lab-experiments.json',
          exportRouxExperiments(records, {
            ids: selected,
            includeTrials: trials,
            includeLabels: labels,
          }),
        );
      setStatus('Export created. Keep this file as a backup.');
    } catch (e) {
      fail(e);
    }
  }
  async function read(file: File | undefined) {
    const token = ++epoch.current;
    setPreview(undefined);
    setStatus('');
    setError('');
    if (!file) return;
    if (file.size > TRANSFER_BYTES) {
      setError('Roux files may be at most 10 MiB.');
      return;
    }
    quiesce();
    setBusy(true);
    try {
      const data = await previewRouxImport(
        engine,
        await file.text(),
        await loadRouxLabAssets(),
        records,
      );
      if (token === epoch.current) setPreview(data);
    } catch (e) {
      if (token === epoch.current) fail(e);
    } finally {
      if (token === epoch.current) setBusy(false);
    }
  }
  async function saveImport() {
    if (!preview || preview.conflicts.length) return;
    setBusy(true);
    setError('');
    try {
      await repository.commitImport(preview.data);
      setPreview(undefined);
      setStatus('Import saved on this device.');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="roux-lab-card">
      <summary>Import, export & recovery</summary>
      <p>
        Files are checked and replayed before saving. Tester labels and trial records are excluded
        unless you choose to include them.
      </p>
      <fieldset>
        <legend>Experiments to export</legend>
        {[...options.values()].map((e) => (
          <label className="roux-export-choice" key={e.id}>
            <input
              type="checkbox"
              checked={selected.includes(e.id)}
              onChange={(v) =>
                setSelected(
                  v.target.checked ? [...selected, e.id] : selected.filter((id) => id !== e.id),
                )
              }
            />
            {e.label ?? e.createdAt}
          </label>
        ))}
      </fieldset>
      <label className="roux-export-choice">
        <input type="checkbox" checked={trials} onChange={(e) => setTrials(e.target.checked)} />
        Include trial records
      </label>
      <label className="roux-export-choice">
        <input
          type="checkbox"
          checked={labels}
          disabled={!trials}
          onChange={(e) => setLabels(e.target.checked)}
        />
        Include private tester labels
      </label>
      <div className="roux-lab-actions">
        <button disabled={!selected.length || busy} onClick={() => exportFile()}>
          Export Roux experiments
        </button>
        <button disabled={!selected.length || busy || !trials} onClick={() => exportFile(true)}>
          Export trial CSV
        </button>
      </div>
      <label className="roux-input-label">
        Import Roux file
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => void read(e.target.files?.[0])}
        />
      </label>
      {busy && <p role="status">Checking or saving the notebook…</p>}
      {preview && (
        <section aria-label="Roux import preview">
          <h3>Review before saving</h3>
          <p>
            {preview.data.experiments.length} experiments · {preview.data.attempts.length} attempts.
            Nothing has been saved yet.
          </p>
          {preview.conflicts.map((c) => (
            <p role="alert" key={c.id}>
              {c.reason}
            </p>
          ))}
          <button disabled={busy || !!preview.conflicts.length} onClick={() => void saveImport()}>
            Save imported experiments
          </button>
          <button disabled={busy} onClick={() => setPreview(undefined)}>
            Cancel import
          </button>
        </section>
      )}
      {records.incompatibleCount > 0 && (
        <>
          <p>{records.incompatibleCount} incompatible records were kept untouched.</p>
          <button
            onClick={() =>
              downloadRouxText(
                'roux-lab-recovery.json',
                JSON.stringify(
                  { kind: 'roux-recovery-only', records: records.incompatibleRecords },
                  null,
                  2,
                ),
              )
            }
          >
            Export incompatible records
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </details>
  );
}
