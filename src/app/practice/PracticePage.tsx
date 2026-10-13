import { useEffect, useMemo, useRef, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { ALGORITHM_REGISTRY as registry } from '../../algorithms/registry';
import { verifyDemonstration } from '../../algorithms/demonstration';
import { describeCaseRecognition } from '../../algorithms/recognition-evidence';
import { createPracticePool } from '../../practice/pool';
import { practiceStore, PRACTICE_GROUPS, normalizePracticeSelection } from '../../practice/storage';
import type { PracticeExercise } from '../../practice/types';
import { createPracticeClient } from './practice-client';
import { CaseDiagram } from '../algorithms/CaseDiagram';
import { AlgorithmPlayer } from '../../player/AlgorithmPlayer';
import '../algorithms/algorithm-library.css';
import './practice.css';
export function PracticePage({ engine }: { engine: CubeEngine }) {
  const [loaded] = useState(() => practiceStore.load()),
    [selection, setSelection] = useState(loaded.selection),
    [available, setAvailable] = useState(loaded.available);
  const [exercise, setExercise] = useState<PracticeExercise>(),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [selectionOpen, setSelectionOpen] = useState(true);
  const client = useMemo(() => createPracticeClient(), []),
    revision = useRef(0);
  const pool = useMemo(() => createPracticePool(selection.caseIds, Math.random), [selection]);
  useEffect(
    () => () => {
      revision.current++;
      client.cancel();
    },
    [client],
  );
  function clear() {
    revision.current++;
    client.cancel();
    setExercise(undefined);
    setRevealed(false);
    setBusy(false);
    setError('');
  }
  function change(ids: string[], checked: boolean) {
    clear();
    const next = normalizePracticeSelection({
      version: 1,
      caseIds: checked
        ? [...selection.caseIds, ...ids]
        : selection.caseIds.filter((id) => !ids.includes(id)),
    });
    setSelection(next);
    setAvailable(practiceStore.save(next));
  }
  async function next() {
    clear();
    const picked = pool.next();
    if (!picked) return;
    const stamp = revision.current;
    setBusy(true);
    setSelectionOpen(false);
    try {
      const result = await client.generate(
        picked.caseId,
        picked.fixtureId,
        registry.cases[picked.caseId].defaultVariantId,
      );
      if (stamp !== revision.current) return;
      if (result.ok) {
        verifyDemonstration(engine, result.exercise.demonstration);
        setExercise(result.exercise);
      } else setError(result.message);
    } catch (e) {
      if (stamp === revision.current)
        setError(e instanceof Error ? e.message : 'The exercise could not be checked.');
    } finally {
      if (stamp === revision.current) setBusy(false);
    }
  }
  const demo = exercise?.demonstration,
    targets = demo?.actions[0]?.targets ?? [];
  return (
    <section className="algorithm-library practice-page">
      <header className="library-heading">
        <p className="eyebrow">CFOP PRACTICE · PREVIEW</p>
        <h1>Look first. Then turn.</h1>
        <p>
          Choose the cases you want to recognize. Set up a real cube or study the diagram, then
          reveal the shared teaching formula.
        </p>
      </header>
      <details
        className="practice-selection"
        open={selectionOpen}
        onToggle={(e) => setSelectionOpen(e.currentTarget.open)}
      >
        <summary>Choose cases</summary>
        <div className="practice-selection-actions">
          <button onClick={() => change(Object.keys(registry.cases), true)}>
            Select all cases
          </button>
          <button onClick={() => change(selection.caseIds, false)}>Clear selection</button>
        </div>
        {(['f2l', 'oll', 'pll'] as const).map((family) => {
          const ids = Object.values(registry.cases)
            .filter((c) => c.family === family)
            .map((c) => c.id);
          return (
            <fieldset className="practice-family" key={family}>
              <legend>{family.toUpperCase()}</legend>
              <SelectionCheckbox
                label={'All ' + family.toUpperCase() + ' cases'}
                ids={ids}
                selected={selection.caseIds}
                change={change}
              />
              <div className="practice-groups">
                {PRACTICE_GROUPS.filter((g) => g.family === family).map((g) => (
                  <fieldset key={g.id}>
                    <legend>
                      <SelectionCheckbox
                        label={family.toUpperCase() + ' — ' + g.label}
                        ids={g.caseIds}
                        selected={selection.caseIds}
                        change={change}
                      />
                    </legend>
                    <div className="practice-case-choices">
                      {g.caseIds.map((id) => (
                        <label key={id}>
                          <input
                            type="checkbox"
                            checked={selection.caseIds.includes(id)}
                            onChange={(e) => change([id], e.target.checked)}
                          />
                          {registry.cases[id].label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </fieldset>
          );
        })}
      </details>
      <div className="practice-toolbar">
        <p role="status">
          {selection.caseIds.length} {selection.caseIds.length === 1 ? 'case' : 'cases'} selected
        </p>
        <button
          className="primary-button"
          disabled={!selection.caseIds.length || busy}
          onClick={() => void next()}
        >
          {exercise ? 'Next case' : busy ? 'Preparing exercise…' : 'Start practice'}
        </button>
      </div>
      {!available && (
        <p className="notice">
          Your selection cannot be saved in this browser. Practice still works for this session.
        </p>
      )}
      {!selection.caseIds.length && <p>Select at least one case to start.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {(busy || demo) && (
        <section aria-label="Current exercise" className="practice-exercise">
          {busy ? (
            <p role="status">Preparing a verified setup…</p>
          ) : (
            demo && (
              <>
                <h2>
                  {revealed ? registry.cases[exercise!.caseId].label : 'What do you recognize?'}
                </h2>
                <div className="practice-prompt">
                  <figure>
                    <CaseDiagram state={demo.initial} targets={targets} hideIdentity={!revealed} />
                    <figcaption>
                      {targets.length === 2
                        ? 'Read the selected corner and edge. Muted stickers are outside that pair.'
                        : 'Read the top face and adjacent side stickers.'}{' '}
                      Letters identify colors.
                    </figcaption>
                  </figure>
                  <div className="practice-setup">
                    <h3>Set up your cube</h3>
                    <p>Start solved. White up, green front. Follow these face turns:</p>
                    <code>{demo.setup.join(' ') || 'No face turns needed.'}</code>
                    <p>Then physically rotate the whole cube:</p>
                    <code>{demo.holdingMoves.join(' ') || 'Keep the starting grip.'}</code>
                    <p>
                      Keep this grip while recognizing the case. Any further preparation is
                      explained with the answer.
                    </p>
                  </div>
                </div>
                {!revealed ? (
                  <button
                    className="primary-button reveal-button"
                    onClick={() => setRevealed(true)}
                  >
                    Show solution
                  </button>
                ) : (
                  <div className="practice-answer">
                    <p>
                      {describeCaseRecognition(
                        engine,
                        demo.initial,
                        registry.cases[exercise!.caseId],
                        targets,
                      )}
                    </p>
                    <AlgorithmPlayer engine={engine} demonstration={demo} />
                    <a href={'#/algorithms/' + exercise!.caseId}>
                      Explore this case in the library →
                    </a>
                  </div>
                )}
              </>
            )
          )}
        </section>
      )}
    </section>
  );
}
function SelectionCheckbox({
  label,
  ids,
  selected,
  change,
}: {
  label: string;
  ids: string[];
  selected: string[];
  change: (ids: string[], checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null),
    count = ids.filter((id) => selected.includes(id)).length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && count < ids.length;
  }, [count, ids.length]);
  return (
    <label>
      <input
        ref={ref}
        type="checkbox"
        checked={count === ids.length}
        onChange={(e) => change(ids, e.target.checked)}
      />
      {label}
    </label>
  );
}
