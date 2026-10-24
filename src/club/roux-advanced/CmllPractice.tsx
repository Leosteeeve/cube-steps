import { useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { Quarter } from '../../methods/roux-advanced/types';
import { CMLL_CATALOG } from '../../methods/roux-advanced/cmll/catalog';
import { createCmllPracticeStore, pickCmllCase, type CmllPracticeSelection } from './preferences';
import { CmllAnswer, CmllDiagram, CmllFrameSelect } from './CmllCasePage';
export function CmllPractice({ engine }: { engine: CubeEngine }) {
  const [store] = useState(createCmllPracticeStore),
    [saved] = useState(() => store.load());
  const [selection, setSelection] = useState(saved.selection),
    [storageMessage, setStorageMessage] = useState(
      saved.status === 'ready'
        ? ''
        : saved.status === 'corrupt'
          ? 'Your saved selection could not be read. It stays untouched until you change the selection.'
          : 'Storage is unavailable. You can still practice on this page.',
    );
  const [drill, setDrill] = useState<{ caseId: string; auf: Quarter; round: number } | null>(null),
    [revealed, setRevealed] = useState(false);
  function change(next: CmllPracticeSelection) {
    setSelection(next);
    setDrill(null);
    setRevealed(false);
    setStorageMessage(
      store.save(next)
        ? 'Selection saved on this device.'
        : 'Could not save this selection. It remains available on this page.',
    );
  }
  function next() {
    const caseId = pickCmllCase(selection, drill?.caseId ?? null, Math.random);
    setDrill(
      caseId
        ? { caseId, auf: Math.floor(Math.random() * 4) as Quarter, round: (drill?.round ?? 0) + 1 }
        : null,
    );
    setRevealed(false);
  }
  const group = drill ? CMLL_CATALOG.cases.find((c) => c.id === drill.caseId) : undefined;
  return (
    <section className="cmll-page">
      <a href="#/cmll">← CMLL library</a>
      <h1>Recognize. Recall. Replay.</h1>
      <p>
        An untimed practice space. Identify the corner pattern before revealing the formula; the
        gray edges are not part of CMLL recognition.
      </p>
      {storageMessage && <p role="status">{storageMessage}</p>}
      <details open={!drill}>
        <summary>Practice selection · {selection.caseIds.length} cases</summary>
        <CmllFrameSelect
          value={selection.frameId}
          onChange={(frameId) => change({ ...selection, frameId })}
        />
        <div className="cmll-controls">
          <button
            onClick={() => change({ ...selection, caseIds: CMLL_CATALOG.cases.map((c) => c.id) })}
          >
            Select all
          </button>
          <button onClick={() => change({ ...selection, caseIds: [] })}>Clear selection</button>
        </div>
        <div className="cmll-selection">
          {CMLL_CATALOG.cases.map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={selection.caseIds.includes(c.id)}
                onChange={(e) =>
                  change({
                    ...selection,
                    caseIds: e.target.checked
                      ? [...selection.caseIds, c.id]
                      : selection.caseIds.filter((id) => id !== c.id),
                  })
                }
              />
              {c.family} · {c.label}
            </label>
          ))}
        </div>
      </details>
      {!selection.caseIds.length && <p>Select at least one case to start practice.</p>}
      {!drill ? (
        <button className="primary-button" disabled={!selection.caseIds.length} onClick={next}>
          Start practice
        </button>
      ) : (
        group && (
          <>
            <h2>Which corner pattern do you see?</h2>
            <p>
              Hold {selection.frameId.split('-')[0]} down and {selection.frameId.split('-')[1]}{' '}
              left.
            </p>
            <div className="cmll-practice-diagram">
              <CmllDiagram
                engine={engine}
                caseId={drill.caseId}
                variantId={group.variantIds[0]}
                frameId={selection.frameId}
                auf={drill.auf}
                label="Practice corner pattern"
              />
            </div>
            <div className="cmll-controls">
              {!revealed && (
                <button className="primary-button" onClick={() => setRevealed(true)}>
                  Reveal answer
                </button>
              )}
              <button onClick={next}>Next case</button>
            </div>
            {revealed && (
              <CmllAnswer
                key={drill.round}
                engine={engine}
                caseId={drill.caseId}
                frameId={selection.frameId}
                auf={drill.auf}
              />
            )}
          </>
        )
      )}
    </section>
  );
}
