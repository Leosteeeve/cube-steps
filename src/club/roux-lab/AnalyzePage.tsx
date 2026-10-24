import { useMemo, useRef, useState } from 'react';
import type { CubeEngine, SolveInput, SolveSession } from '../../core/types';
import { ColorEntry } from '../../app/color-entry/ColorEntry';
import { createDraftState, reduceDraft } from '../../app/color-entry/draft';
import { validateFacelets, type FaceletValidation } from '../../core/facelets';
import { parseScramble } from '../../core/notation';
import { CubePlayer } from '../../player/CubePlayer';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
import type { RouxLabSession } from './session';
import { OrientationPicker } from './OrientationPicker';
import { evidenceText } from './ResultSummary';
export function AnalyzePage({
  engine,
  state,
  onStart,
  onEdit,
  onFrames,
  onSelect,
}: {
  engine: CubeEngine;
  state: RouxLabSession;
  onStart: (input: SolveInput) => void;
  onEdit: () => void;
  onFrames: (ids: readonly RouxFrameId[]) => void;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<'scramble' | 'colors'>('scramble'),
    [text, setText] = useState(''),
    [draft, setDraft] = useState(createDraftState),
    [validation, setValidation] = useState<FaceletValidation | null>(null),
    [error, setError] = useState(''),
    [randomizing, setRandomizing] = useState(false),
    generation = useRef(0);
  const busy = state.status === 'initializing' || state.status === 'searching';
  const selected = state.routes.find((r) => r.id === state.selectedId),
    session = useMemo<SolveSession | null>(
      () => (selected ? { input: selected.input.source, trace: selected.trace } : null),
      [selected],
    );
  const edit = () => {
    generation.current++;
    setRandomizing(false);
    setError('');
    onEdit();
  };
  function start() {
    if (mode === 'colors') {
      if (validation?.ok) onStart({ kind: 'facelets', facelets: validation.facelets });
      return;
    }
    const parsed = parseScramble(text);
    if (!parsed.ok) {
      setError(`At character ${parsed.offset + 1}: ${parsed.message}`);
      return;
    }
    onStart({ kind: 'scramble', moves: parsed.moves });
  }
  async function random() {
    edit();
    const token = ++generation.current;
    setRandomizing(true);
    try {
      const { generateScramble } = await import('../../core/scramble');
      const value = await generateScramble();
      if (generation.current === token) setText(value);
    } catch {
      if (generation.current === token)
        setError('Could not load a random scramble. Paste a sequence or retry.');
    } finally {
      if (generation.current === token) setRandomizing(false);
    }
  }
  return (
    <div className="roux-analyze-grid">
      <aside className="roux-lab-card">
        <h2>Your starting cube</h2>
        <div className="roux-lab-actions">
          {(['scramble', 'colors'] as const).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                edit();
                setMode(m);
              }}
            >
              {m === 'scramble' ? 'Scramble' : 'Face colors'}
            </button>
          ))}
        </div>
        {mode === 'scramble' ? (
          <>
            <label className="roux-input-label">
              Scramble sequence
              <textarea
                rows={3}
                spellCheck={false}
                value={text}
                onChange={(e) => {
                  edit();
                  setText(e.target.value);
                }}
              />
            </label>
            <p>
              Start solved, white up and green front. Use U D L R F B with ′ or 2. Blank means
              solved.
            </p>
            <button onClick={() => void random()} disabled={randomizing}>
              {randomizing ? 'Generating…' : 'Random scramble'}
            </button>
          </>
        ) : (
          <>
            <p>This color draft stays in this Lab page.</p>
            <ColorEntry
              state={draft}
              onAction={(a) => {
                edit();
                setDraft((d) => reduceDraft(d, a));
                setValidation(null);
              }}
              validation={validation}
              onCheck={() => {
                edit();
                setValidation(validateFacelets(draft.draft.facelets, engine.solved()));
              }}
              onSolve={start}
              busy={busy}
              storageAvailable={true}
              solveLabel="Analyze these colors"
            />
          </>
        )}
        <OrientationPicker
          frames={state.settings.allowedFrames}
          onChange={(ids) => {
            edit();
            onFrames(ids);
          }}
        />
        {error && <p role="alert">{error}</p>}
        {mode === 'scramble' && (
          <button className="primary-button" disabled={busy || randomizing} onClick={start}>
            Analyze cube
          </button>
        )}
        <p>
          Right-leading, two-handed handling model. A complete verified route appears first; bounded
          exploration can improve it.
        </p>
      </aside>
      <div className="roux-results">
        <section aria-label="Roux routes">
          {state.routes.length ? (
            <div className="roux-route-cards">
              {state.routes.map((r, i) => {
                const f = ROUX_FRAMES.find((f) => f.id === r.frameId)!;
                return (
                  <article className="roux-lab-card" key={r.id} data-roux-route={r.id}>
                    <span className="eyebrow">
                      {i === 0 ? 'CURRENT LEADING ROUTE' : 'ALTERNATIVE'}
                    </span>
                    <h2>
                      {f.bottom} bottom · {f.left} left
                    </h2>
                    <p>
                      {r.basis === 'optimized'
                        ? 'Optimized within this search'
                        : 'Verified baseline fallback'}
                    </p>
                    <dl>
                      <div>
                        <dt>First block</dt>
                        <dd>{r.counts.first} STM</dd>
                      </div>
                      <div>
                        <dt>Second block</dt>
                        <dd>{r.counts.second} STM</dd>
                      </div>
                      <div>
                        <dt>Both blocks</dt>
                        <dd>{r.counts.combined} STM</dd>
                      </div>
                      <div>
                        <dt>Later rotations</dt>
                        <dd>{r.counts.rotations}</dd>
                      </div>
                    </dl>
                    <p>{evidenceText(r.evidence)}</p>
                    <p>
                      {r.score.rated
                        ? `Modeled handling: ${r.score.G} regrips, ${r.score.V} visibility flags, ${r.score.A} awkward-transition flags.`
                        : r.score.reason}
                    </p>
                    <button aria-pressed={state.selectedId === r.id} onClick={() => onSelect(r.id)}>
                      Play full solve
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="roux-lab-card">
              <h2>Find a useful connection.</h2>
              <p>
                Analyze one cube, compare the holds you allow, then test the complete two-block
                route in your hands.
              </p>
              <p>No verified route yet. A stopped search does not mean the cube is invalid.</p>
            </div>
          )}
        </section>
        {selected && session && (
          <section
            className="roux-lab-player"
            aria-label="Selected Roux route"
            data-selected-route={selected.id}
          >
            <p>
              Playing the fixed {selected.frameId.replace('-', ' / ')} route. New results will not
              change this playback. Follow the printed physical hold; camera dragging only changes
              your view.
            </p>
            <CubePlayer engine={engine} session={session} />
          </section>
        )}
      </div>
    </div>
  );
}
