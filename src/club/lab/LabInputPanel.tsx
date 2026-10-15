import { useMemo, useState } from 'react';
import { ColorEntry } from '../../app/color-entry/ColorEntry';
import { parseScramble } from '../../core/notation';
import { generateScramble } from '../../core/scramble';
import { stateToFacelets } from '../../core/facelets';
import { LAB_COLORS } from '../../workers/lab-protocol';
import { useGuidanceTarget } from '../../ui/guidance';
import { useLabSession } from './LabSessionProvider';
import { LabCubeNet } from './LabCubeNet';
export function LabInputPanel() {
  const { engine, state, edit, analyze, inputError, validation, checkColors, preferencesSaved } =
    useLabSession();
  const [randomizing, setRandomizing] = useState(false),
    [randomError, setRandomError] = useState('');
  const inputTarget = useGuidanceTarget('lab.input'),
    colorsTarget = useGuidanceTarget('lab.colors');
  const diagram = useMemo(() => {
    if (state.draft.mode !== 'scramble') return;
    const parsed = parseScramble(state.draft.text);
    return parsed.ok && parsed.moves.length <= 512
      ? stateToFacelets(engine.apply(engine.solved(), parsed.moves))
      : undefined;
  }, [engine, state.draft.mode, state.draft.text]);
  const colors = state.settings.allowedColors;
  function setColors(allowedColors: typeof colors) {
    edit({ type: 'settings', settings: { ...state.settings, allowedColors } });
  }
  async function randomize() {
    setRandomizing(true);
    setRandomError('');
    try {
      edit({ type: 'edit', text: await generateScramble(), mode: 'scramble' });
    } catch {
      setRandomError('A random scramble could not load. Paste a sequence instead.');
    } finally {
      setRandomizing(false);
    }
  }
  return (
    <aside className="lab-card lab-input" ref={inputTarget}>
      <h2>Your starting point</h2>
      <p className="muted">One cube state. Several ways through.</p>
      <fieldset>
        <legend>Input</legend>
        <div className="lab-actions">
          {(['scramble', 'facelets'] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={state.draft.mode === mode}
              onClick={() => edit({ type: 'edit', mode })}
            >
              {mode === 'scramble' ? 'Scramble' : 'Face colors'}
            </button>
          ))}
        </div>
      </fieldset>
      {state.draft.mode === 'scramble' ? (
        <>
          <label htmlFor="lab-scramble">Scramble sequence</label>
          <textarea
            id="lab-scramble"
            rows={4}
            spellCheck={false}
            value={state.draft.text}
            onChange={(e) => edit({ type: 'edit', text: e.target.value })}
          />
          <small>U D L R F B, with ′ or 2. Blank means an already solved cube.</small>
          <button onClick={randomize} disabled={randomizing}>
            {randomizing ? 'Generating…' : 'Random scramble'}
          </button>
          {diagram && (
            <details>
              <summary>Check the input cube</summary>
              <LabCubeNet facelets={diagram} label="Input cube six-face diagram" />
            </details>
          )}
        </>
      ) : (
        <>
          <p>Color drafts stay in this Lab session. They are not restored after refresh.</p>
          <ColorEntry
            state={state.draft.colors}
            onAction={(action) => edit({ type: 'color-draft', action })}
            validation={validation}
            onCheck={checkColors}
            onSolve={analyze}
            busy={false}
            storageAvailable={true}
            solveLabel="Analyze these colors"
          />
        </>
      )}
      <fieldset ref={colorsTarget}>
        <legend>Cross colors</legend>
        <div className="lab-actions">
          <button onClick={() => setColors([...LAB_COLORS])}>All six</button>
          <button onClick={() => setColors(['white'])}>White only</button>
          <button onClick={() => setColors(['white', 'yellow'])}>White + yellow</button>
        </div>
        <div className="lab-color-options">
          {LAB_COLORS.map((color) => (
            <label key={color}>
              <input
                type="checkbox"
                checked={colors.includes(color)}
                disabled={colors.length === 1 && colors.includes(color)}
                onChange={(e) =>
                  setColors(
                    e.target.checked ? [...colors, color] : colors.filter((c) => c !== color),
                  )
                }
              />
              <span className="lab-color-dot" data-color={color} />
              {color}
            </label>
          ))}
        </div>
        <small>Choose colors you can recognize. At least one must stay selected.</small>
      </fieldset>
      <dl className="lab-policy">
        <div>
          <dt>Cross allowance</dt>
          <dd>Shortest + up to 2</dd>
        </div>
        <div>
          <dt>Execution profile</dt>
          <dd>Right-hand lead</dd>
        </div>
        <div>
          <dt>Analysis limit</dt>
          <dd>30 seconds</dd>
        </div>
      </dl>
      {inputError && <p role="alert">{inputError}</p>}
      {randomError && <p role="alert">{randomError}</p>}
      {!preferencesSaved && (
        <p role="status">Color preferences could not be saved. This session still works.</p>
      )}
      <button className="primary-button lab-analyze-button" onClick={analyze}>
        Analyze
      </button>
      <p className="lab-footnote">
        Stop whenever you like and keep verified results. Comfort scores are estimates to test on a
        real cube.
      </p>
    </aside>
  );
}
