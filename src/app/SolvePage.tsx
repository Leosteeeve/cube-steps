import { useEffect, useMemo, useRef, useState } from 'react';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
import { parseScramble } from '../core/notation';
import { CubePlayer } from '../player/CubePlayer';
import { createSolveClient } from './solve-client';
import { LessonLayout } from './LessonLayout';
import { validateFacelets, type FaceletValidation } from '../core/facelets';
import { ColorEntry } from './color-entry/ColorEntry';
import { FaceOverview } from './color-entry/FaceOverview';
import { createDraftState, reduceDraft, type DraftAction } from './color-entry/draft';
import { createDraftStore } from './color-entry/draft-storage';
import { FACE_ENTRY_ORDER } from '../core/facelet-layout';
export function SolvePage({ engine }: { engine: CubeEngine }) {
  const client = useMemo(() => createSolveClient(), []),
    epoch = useRef(0);
  const store = useMemo(() => createDraftStore(() => window.sessionStorage), []);
  const [recovered] = useState(() => store.load());
  const [draft, setDraft] = useState(() => createDraftState(recovered.draft));
  const [storageAvailable, setStorageAvailable] = useState(recovered.available);
  const [mode, setMode] = useState<'scramble' | 'colors'>('scramble');
  const [validation, setValidation] = useState<{
    revision: number;
    result: FaceletValidation;
  } | null>(null);
  const checked = validation?.revision === draft.revision ? validation.result : null;
  const [text, setText] = useState(''),
    [session, setSession] = useState<SolveSession | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [randomizing, setRandomizing] = useState(false),
    [stage, setStage] = useState<StageId>('white-cross'),
    [stageRequestId, setStageRequestId] = useState(0),
    [active, setActive] = useState<StageId>('white-cross');
  const parsedDraft = mode === 'scramble' ? parseScramble(text) : null;
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
    const result =
      mode === 'colors' && checked?.ok
        ? await client.solveFacelets(checked.facelets, 'lbl')
        : await client.solveScramble(text, 'lbl');
    if (token !== epoch.current) return;
    setBusy(false);
    if (result.ok) {
      setSession(result.session);
      setStage('white-cross');
      setActive('white-cross');
    } else if (result.error.kind !== 'cancelled') {
      if (mode === 'colors' && result.error.kind === 'input' && result.error.issues)
        setValidation({
          revision: draft.revision,
          result: { ok: false, issues: result.error.issues },
        });
      else
        setError(
          `${result.error.offset === undefined ? '' : `At character ${result.error.offset + 1}: `}${result.error.message}`,
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
      if (token !== epoch.current) return;
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
      selected={active}
      onSelect={(id) => {
        setStage(id);
        setStageRequestId((value) => value + 1);
        setActive(id);
      }}
    >
      <div className="lesson-heading">
        <span className="eyebrow">YOUR CUBE. THE SAME METHOD.</span>
        <h1>A clear path for your cube.</h1>
        <p>Get a complete beginner solution, with a reason behind every move.</p>
      </div>
      <div className="input-mode-switch" role="group" aria-label="Cube input">
        <button
          type="button"
          aria-pressed={mode === 'scramble'}
          onClick={() => changeMode('scramble')}
        >
          Scramble
        </button>
        <button type="button" aria-pressed={mode === 'colors'} onClick={() => changeMode('colors')}>
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
          />
          {busy && (
            <button type="button" onClick={cancelPending}>
              Cancel
            </button>
          )}
        </>
      ) : (
        <form
          className="scramble-form"
          onSubmit={(e) => {
            e.preventDefault();
            void solve();
          }}
        >
          <div className="form-top">
            <label htmlFor="scramble">Scramble sequence</label>
            <button
              type="button"
              className="text-button"
              disabled={randomizing}
              onClick={() => void random()}
            >
              {randomizing ? 'Generating…' : 'Random scramble'} <span aria-hidden="true">↝</span>
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
            <p id="scramble-help">
              Start solved, white up & green front. Use U D L R F B with ′ or 2.
              <br />
              Leave blank to explore an already solved cube.
            </p>
            <button className="primary-button" type="submit" disabled={busy || randomizing}>
              {busy ? 'Finding your steps…' : 'Explain this solve'}{' '}
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
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
          {session ? ' Your previous verified solution remains below.' : ''}
        </p>
      )}
      {session ? (
        <>
          <div className="solution-summary">
            <span className="success-dot" /> Verified LBL solution{' '}
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
          {!inputMatches && (
            <p className="notice" role="status">
              The draft has changed. The solution below still uses its saved input.
            </p>
          )}
          <CubePlayer
            engine={engine}
            session={session}
            stage={stage}
            stageRequestId={stageRequestId}
            onStageChange={setActive}
          />
        </>
      ) : (
        <div className="empty-solve">
          <div className="empty-cube" aria-hidden="true">
            ▧
          </div>
          <h2>A clear path from scrambled to solved.</h2>
          <p>
            Enter your cube’s colors, paste a scramble, or generate a new one. Then follow the same
            formulas taught in the course.
          </p>
          <a href="#/learn/notation">New to cube notation? Start here →</a>
        </div>
      )}
    </LessonLayout>
  );
}
