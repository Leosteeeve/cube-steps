import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CubeEngine, SolveSession, StageId, MethodId } from '../core/types';
import { parseScramble } from '../core/notation';
import { CubePlayer } from '../player/CubePlayer';
import type { SolvePlaybackBookmark } from '../player/PlaybackView';
import { SolveComparison, useSolveComparison } from './solve-comparison';
import { createSolveClient } from './solve-client';
import { LessonLayout } from './LessonLayout';
import { stateToFacelets, validateFacelets, type FaceletValidation } from '../core/facelets';
import { ScrambleNet } from '../club/timer/ScrambleNet';
import { summarizeTraceMoves } from './solve-comparison-metrics';
import './solve-workspace.css';
import { ColorEntry } from './color-entry/ColorEntry';
import { FaceOverview } from './color-entry/FaceOverview';
import { createDraftState, reduceDraft, type DraftAction } from './color-entry/draft';
import { createDraftStore } from './color-entry/draft-storage';
import { useEdition } from './edition';
import { FACE_ENTRY_ORDER } from '../core/facelet-layout';
import { getMethodInfo as getMethod } from '../methods/info';
import { MethodSelector } from './MethodSelector';
import { useGuidanceScope, useGuidanceTarget } from '../ui/guidance';
import type { RouxFrameId } from '../methods/roux-advanced/types';
export function SolvePage({
  engine,
  method = 'lbl',
  rouxOptions,
}: {
  engine: CubeEngine;
  method?: MethodId;
  rouxOptions?: {
    allowedFrames: readonly RouxFrameId[];
    onAllowedFramesChange: (ids: readonly RouxFrameId[]) => void;
  };
}) {
  const framesKey =
    method === 'roux-advanced' ? (rouxOptions?.allowedFrames ?? ['white-blue']).join(',') : '';
  const inputTarget = useGuidanceTarget('solve.input'),
    validationTarget = useGuidanceTarget('solve.validation'),
    explanationTarget = useGuidanceTarget('solve.explanation');
  const presentation = getMethod(method),
    firstStage = presentation.stages[0].id;
  const methodRef = useRef(method);
  methodRef.current = method;
  const edition = useEdition();
  const client = useMemo(() => createSolveClient(undefined, edition), [edition]),
    epoch = useRef(0);
  const store = useMemo(
    () =>
      createDraftStore(
        () => window.sessionStorage,
        edition === 'club' ? 'cubesteps.club.color-draft.v1' : undefined,
      ),
    [edition],
  );
  const [recovered] = useState(() => store.load());
  const [draft, setDraft] = useState(() => createDraftState(recovered.draft));
  const [storageAvailable, setStorageAvailable] = useState(recovered.available);
  const [mode, setMode] = useState<'scramble' | 'colors'>('scramble');
  const [inputExpanded, setInputExpanded] = useState(true);
  const [tourShowsInput, setTourShowsInput] = useState(false);
  useGuidanceScope(
    'solve-input',
    useCallback(() => {
      setTourShowsInput(true);
      return { restore() {}, dispose: () => setTourShowsInput(false) };
    }, []),
  );
  const showInput = inputExpanded || tourShowsInput;
  const inputPanelId = useId(),
    inputToggle = useRef<HTMLButtonElement>(null);
  const [validation, setValidation] = useState<{
    revision: number;
    result: FaceletValidation;
  } | null>(null);
  const checked = validation?.revision === draft.revision ? validation.result : null;
  const [text, setText] = useState(''),
    [storedSession, setSession] = useState<SolveSession | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [randomizing, setRandomizing] = useState(false),
    [stage, setStage] = useState<StageId>(firstStage),
    [stageRequestId, setStageRequestId] = useState(0),
    [active, setActive] = useState<StageId>(firstStage);
  useLayoutEffect(() => {
    epoch.current++;
    client.cancel();
    setBusy(false);
    setRandomizing(false);
    setError('');
    setSession(null);
    setInputExpanded(true);
    setStage(firstStage);
    setActive(firstStage);
  }, [client, method, firstStage, framesKey]);
  const parsedDraft = useMemo(
    () => (mode === 'scramble' ? parseScramble(text) : null),
    [mode, text],
  );
  const startingDiagram = useMemo(() => {
    // Long pastes can still be solved by the worker without blocking typing to draw a preview.
    if (!parsedDraft?.ok || parsedDraft.moves.length > 256) return null;
    return stateToFacelets(engine.apply(engine.solved(), parsedDraft.moves));
  }, [engine, parsedDraft]);
  const session = storedSession?.trace.method === method ? storedSession : null;
  const metrics = useMemo(() => session && summarizeTraceMoves(session.trace), [session]);
  useLayoutEffect(() => {
    if (session) inputToggle.current?.focus();
  }, [session]);
  const recordedInput = session?.input;
  const inputMatches =
    recordedInput &&
    (mode === 'colors'
      ? recordedInput.kind === 'facelets' &&
        FACE_ENTRY_ORDER.every((face) =>
          draft.draft.facelets[face].every(
            (color, index) => color === recordedInput.facelets[face][index],
          ),
        )
      : recordedInput.kind === 'scramble' &&
        parsedDraft?.ok &&
        parsedDraft.moves.join(' ') === recordedInput.moves.join(' '));
  const comparisonSource =
    edition === 'club' && inputMatches && !busy && !randomizing ? session : null;
  const comparison = useSolveComparison(comparisonSource, rouxOptions?.allowedFrames);
  const preview = comparisonSource ? comparison.preview : null;
  const originalBookmark = useRef<SolvePlaybackBookmark | null>(null);
  const comparisonPlayerId = useId();
  useEffect(() => {
    setStorageAvailable(store.save(draft.draft));
  }, [store, draft.draft]);
  useEffect(
    () => () => {
      epoch.current++;
      client.cancel();
    },
    [client],
  );
  function cancelPending() {
    epoch.current++;
    client.cancel();
    setBusy(false);
    setRandomizing(false);
    setError('');
  }
  function updateText(value: string) {
    cancelPending();
    setText(value);
  }
  function editColors(action: DraftAction) {
    const next = reduceDraft(draft, action);
    if (next.revision !== draft.revision) {
      cancelPending();
      setValidation(null);
    }
    setDraft(next);
  }
  function changeMode(next: 'scramble' | 'colors') {
    if (next === mode) return;
    cancelPending();
    setMode(next);
  }
  function checkColors() {
    cancelPending();
    setValidation({
      revision: draft.revision,
      result: validateFacelets(draft.draft.facelets, engine.solved()),
    });
  }
  async function solve() {
    if (mode === 'colors' && !checked?.ok) return;
    const token = ++epoch.current;
    setBusy(true);
    setError('');
    if (method === 'roux-beginner') {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          import('../methods/roux/browser-runtime').then((m) => m.prepareRouxPlayback()),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () => reject(Error('Roux playback loading timed out. Please try again.')),
              30000,
            );
          }),
        ]);
      } catch (error) {
        if (token === epoch.current && methodRef.current === method) {
          setBusy(false);
          setError(
            error instanceof Error
              ? error.message
              : 'Unable to load Roux playback. Please try again.',
          );
        }
        return;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
      if (token !== epoch.current || methodRef.current !== method) return;
    }
    const options =
      method === 'roux-advanced'
        ? Object.freeze({
            allowedFrames: Object.freeze([
              ...(rouxOptions?.allowedFrames ?? (['white-blue'] as RouxFrameId[])),
            ]),
          })
        : undefined;
    const result =
      mode === 'colors' && checked?.ok
        ? options
          ? await client.solveFacelets(checked.facelets, method, options)
          : await client.solveFacelets(checked.facelets, method)
        : options
          ? await client.solveScramble(text, method, options)
          : await client.solveScramble(text, method);
    if (token !== epoch.current || methodRef.current !== method) return;
    setBusy(false);
    if (result.ok) {
      setSession(result.session);
      setInputExpanded(false);
      setStage(firstStage);
      setActive(firstStage);
    } else if (result.error.kind !== 'cancelled') {
      if (mode === 'colors' && result.error.kind === 'input' && result.error.issues)
        setValidation({
          revision: draft.revision,
          result: { ok: false, issues: result.error.issues },
        });
      else
        setError(
          `${result.error.stageId ? `${presentation.stages.find((s) => s.id === result.error.stageId)?.label ?? result.error.stageId}: ` : ''}${result.error.offset === undefined ? '' : `At character ${result.error.offset + 1}: `}${result.error.message}`,
        );
    }
  }
  async function random() {
    const token = ++epoch.current;
    client.cancel();
    setBusy(false);
    setRandomizing(true);
    setError('');
    try {
      const { generateScramble } = await import('../core/scramble');
      const alg = await generateScramble();
      if (token !== epoch.current || methodRef.current !== method) return;
      const parsed = parseScramble(alg);
      if (!parsed.ok)
        throw new Error('The generated scramble contains unsupported notation. Please try again.');
      setText(alg);
    } catch (e) {
      if (token === epoch.current)
        setError(e instanceof Error ? e.message : 'Unable to generate a scramble.');
    } finally {
      if (token === epoch.current) setRandomizing(false);
    }
  }
  return (
    <LessonLayout
      free
      stagesReady={!!session}
      presentation={edition === 'club' ? 'club' : undefined}
      method={preview?.session.trace.method ?? method}
      selected={preview?.active ?? active}
      onSelect={(id) => {
        if (preview) {
          comparison.seek(id);
          return;
        }
        setStage(id);
        setStageRequestId((value) => value + 1);
        setActive(id);
      }}
    >
      <header className="lesson-heading solve-heading">
        <h1>Solve your cube.</h1>
        <p>Choose your method, set up your cube and follow the turns at your own pace.</p>
      </header>
      <MethodSelector method={method} kind="solve" />
      {store.isProtected() && (
        <p role="status">
          Saved color data could not be read. This draft stays in this page.{' '}
          <button
            onClick={() => {
              const ok = store.reset();
              setStorageAvailable(ok && store.save(draft.draft));
            }}
          >
            Reset saved color data
          </button>
        </p>
      )}
      <section className="solve-input-panel" aria-label="Starting cube">
        {session && (
          <button
            ref={inputToggle}
            className="input-disclosure"
            type="button"
            aria-expanded={showInput}
            aria-controls={inputPanelId}
            onClick={() => setInputExpanded((value) => !value)}
          >
            {showInput ? 'Hide cube input' : 'Edit cube input'}
            <span aria-hidden="true">{showInput ? '−' : '+'}</span>
          </button>
        )}
        <div id={inputPanelId} hidden={!!session && !showInput}>
          <div
            ref={mode === 'scramble' ? inputTarget : undefined}
            className="input-mode-switch"
            role="group"
            aria-label="Cube input"
          >
            <button
              type="button"
              aria-pressed={mode === 'scramble'}
              onClick={() => changeMode('scramble')}
            >
              Scramble
            </button>
            <button
              type="button"
              aria-pressed={mode === 'colors'}
              onClick={() => changeMode('colors')}
            >
              Enter colors
            </button>
          </div>
          {mode === 'colors' ? (
            <>
              <ColorEntry
                state={draft}
                onAction={editColors}
                validation={checked}
                onCheck={checkColors}
                onSolve={() => void solve()}
                busy={busy}
                storageAvailable={storageAvailable}
                solveLabel={`Explain with ${presentation.label}`}
              />
              {busy && (
                <button type="button" onClick={cancelPending}>
                  Cancel
                </button>
              )}
            </>
          ) : (
            <form
              className="scramble-form solve-scramble"
              onSubmit={(e) => {
                e.preventDefault();
                void solve();
              }}
            >
              <div className="scramble-entry">
                <div className="form-top">
                  <label htmlFor="scramble">Scramble sequence</label>
                  <button
                    type="button"
                    className="text-button"
                    disabled={randomizing}
                    onClick={() => void random()}
                  >
                    {randomizing ? 'Generating…' : 'Random scramble'}{' '}
                    <span aria-hidden="true">↝</span>
                  </button>
                </div>
                <textarea
                  id="scramble"
                  value={text}
                  onChange={(e) => updateText(e.target.value)}
                  placeholder="R U R' U' F2…"
                  spellCheck={false}
                  rows={2}
                  aria-describedby="scramble-help"
                />
                <div className="form-bottom">
                  <p ref={!error ? validationTarget : undefined} id="scramble-help">
                    Use U D L R F B with ′ or 2.
                    <br />
                    Leave blank to explore a solved cube.
                  </p>
                  <button className="primary-button" type="submit" disabled={busy || randomizing}>
                    {busy ? 'Finding your steps…' : `Explain with ${presentation.label}`}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                  {busy && (
                    <button
                      type="button"
                      onClick={() => {
                        epoch.current++;
                        client.cancel();
                        setBusy(false);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <aside className="scramble-preview" aria-label="Scramble preview">
                <h2>Starting position</h2>
                {startingDiagram ? (
                  <ScrambleNet facelets={startingDiagram} label="Starting cube diagram" />
                ) : (
                  <p>
                    {parsedDraft?.ok
                      ? 'Preview paused for long sequences. You can still solve this scramble.'
                      : 'Check the notation to preview your cube.'}
                  </p>
                )}
              </aside>
            </form>
          )}
        </div>
      </section>
      {error && (
        <p ref={mode === 'scramble' ? validationTarget : undefined} className="error" role="alert">
          {error}
          {session ? ' Your previous verified solution remains below.' : ''}
        </p>
      )}
      {session ? (
        <>
          <div className="solution-summary">
            <div className="solve-result-title">
              <span className="success-dot" aria-hidden="true" />
              <strong>Verified {getMethod(session.trace.method).label} solution</strong>
            </div>
            {metrics && (
              <dl className="solve-totals" aria-label="Solution move counts">
                <div>
                  <dt>Turns</dt>
                  <dd>{metrics.turns}</dd>
                </div>
                <div>
                  <dt>Cube rotations</dt>
                  <dd>{metrics.rotations}</dd>
                </div>
              </dl>
            )}
            <details>
              <summary>
                {session.input.kind === 'scramble'
                  ? 'Scramble for this solution'
                  : 'Colors used for this solution'}
              </summary>
              {session.input.kind === 'scramble' ? (
                <code>{session.input.moves.join(' ') || 'Solved cube — no scramble'}</code>
              ) : (
                <FaceOverview facelets={session.input.facelets} />
              )}
            </details>
          </div>
          {session.trace.rouxAdvanced && (
            <aside className="notice" aria-label="Roux search evidence">
              <p>
                {session.trace.rouxAdvanced.basis === 'optimized'
                  ? 'Optimized route within the search budget.'
                  : 'Verified baseline fallback — optimization did not improve this route within the budget.'}{' '}
                Holding frame: {session.trace.rouxAdvanced.frameId.replace('-', ' bottom / ')} left.
                The two blocks use {session.trace.rouxAdvanced.counts.combined} slice turns; this is
                not a claim of the shortest complete solve.
              </p>
              <p>
                {session.trace.rouxAdvanced.evidence.status === 'not-explored'
                  ? 'The independent shortest-left-block search was not completed.'
                  : session.trace.rouxAdvanced.evidence.status === 'proven-minimum'
                    ? `Independent left-block minimum: ${session.trace.rouxAdvanced.evidence.minimum} slice turns. The chosen route may spend more here for a smoother second block.`
                    : `Independent left-block bound: ${session.trace.rouxAdvanced.evidence.lowerBound}–${session.trace.rouxAdvanced.evidence.upperBound} slice turns. A minimum has not been proved.`}
              </p>
            </aside>
          )}
          {!inputMatches && (
            <p className="notice" role="status">
              The draft has changed. The solution below still uses its saved input.
            </p>
          )}
          {comparisonSource && (
            <SolveComparison comparison={comparison} playerId={comparisonPlayerId} />
          )}
          <div
            ref={explanationTarget}
            id={comparisonPlayerId}
            tabIndex={-1}
            role="group"
            aria-label={getMethod(preview?.session.trace.method ?? method).label + ' steps'}
          >
            <CubePlayer
              key={preview ? 'compare-' + preview.session.trace.method : 'original'}
              engine={engine}
              session={preview?.session ?? session}
              stage={preview?.stage ?? stage}
              stageRequestId={preview?.requestId ?? stageRequestId}
              onStageChange={preview ? comparison.setActive : setActive}
              bookmark={edition === 'club' && !preview ? originalBookmark : undefined}
            />
          </div>
        </>
      ) : (
        <p className="solve-notation-link">
          <a href="#/learn/notation">Learn how to read cube notation →</a>
        </p>
      )}
    </LessonLayout>
  );
}
