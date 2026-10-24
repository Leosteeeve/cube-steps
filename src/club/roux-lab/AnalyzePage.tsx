import { useEffect, useRef, useState } from 'react';
import type { CubeEngine, SolveInput } from '../../core/types';
import { ColorEntry } from '../../app/color-entry/ColorEntry';
import { createDraftState, reduceDraft } from '../../app/color-entry/draft';
import { validateFacelets, type FaceletValidation } from '../../core/facelets';
import { parseScramble } from '../../core/notation';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
import type { RouxLabSession } from './session';
import { OrientationPicker } from './OrientationPicker';
import { RouteSummary } from './RouteSummary';
import { useGuidanceTarget } from '../../ui/guidance';
import { selectRouxRoutes, currentRouxEvidence } from '../../methods/roux-advanced/selection';
export function AnalyzePage({
  engine,
  state,
  onStart,
  onEdit,
  onFrames,
  onSelect,
  onCompare,
}: {
  engine: CubeEngine;
  state: RouxLabSession;
  onStart: (input: SolveInput) => void;
  onEdit: () => void;
  onFrames: (ids: readonly RouxFrameId[]) => void;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
}) {
  const [mode, setMode] = useState<'scramble' | 'colors'>('scramble'),
    [text, setText] = useState(''),
    [draft, setDraft] = useState(createDraftState),
    [validation, setValidation] = useState<FaceletValidation | null>(null),
    [error, setError] = useState(''),
    [randomizing, setRandomizing] = useState(false),
    generation = useRef(0);
  const busy = state.status === 'initializing' || state.status === 'searching';
  const recommendations = selectRouxRoutes(state.routes, state.coverage?.frames ?? {}, 4);
  const inputTarget = useGuidanceTarget('roux-lab.input'),
    frameTarget = useGuidanceTarget('roux-lab.frames'),
    routeTarget = useGuidanceTarget('roux-lab.routes');
  useEffect(() => {
    const source = state.input?.source;
    if (!source) return;
    generation.current++;
    setRandomizing(false);
    setError('');
    if (source.kind === 'scramble') {
      setMode('scramble');
      setText(source.moves.join(' '));
    } else {
      setMode('colors');
      setDraft(createDraftState({ facelets: source.facelets, face: 'F', selection: 'white' }));
      setValidation(validateFacelets(source.facelets, engine.solved()));
    }
  }, [state.input, engine]);
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
      <aside className="roux-lab-card" ref={inputTarget}>
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
        <div ref={frameTarget}>
          <OrientationPicker
            frames={state.settings.allowedFrames}
            onChange={(ids) => {
              edit();
              onFrames(ids);
            }}
          />
        </div>
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
        <section aria-label="Roux routes" ref={routeTarget}>
          {state.routes.length ? (
            <div className="roux-route-cards">
              {state.routes.map((r) => (
                <RouteSummary
                  key={r.id}
                  route={r}
                  label={
                    !recommendations.includes(r)
                      ? 'PLAYBACK REFERENCE'
                      : recommendations[0] === r
                        ? 'CURRENT LEADING ROUTE'
                        : 'ALTERNATIVE'
                  }
                  referenceOnly={!recommendations.includes(r)}
                  currentEvidence={currentRouxEvidence(r, state.coverage?.frames ?? {})}
                  selected={state.selectedId === r.id}
                  onSelect={() => onSelect(r.id)}
                  onCompare={() => onCompare(r.id)}
                  comparisonSlot={
                    state.comparison?.A.id === r.id || state.comparisonA?.id === r.id
                      ? 'A'
                      : state.comparison?.B.id === r.id
                        ? 'B'
                        : undefined
                  }
                />
              ))}
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
      </div>
    </div>
  );
}
