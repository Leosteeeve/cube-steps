import { useState } from 'react';
import type { DraftAction, DraftState } from './draft';
import type { FaceletValidation } from '../../core/facelets';
import { FACE_ENTRY_ORDER, FACE_NAMES } from '../../core/facelet-layout';
import { COLORS } from '../../core/observations';
import { FaceGrid } from './FaceGrid';
import { FaceOverview } from './FaceOverview';
import { HoldingGuide } from './HoldingGuide';
import './color-entry.css';
import { useGuidanceTarget } from '../../ui/guidance';
interface Props {
  state: DraftState;
  onAction: (action: DraftAction) => void;
  validation: FaceletValidation | null;
  onCheck: () => void;
  onSolve: () => void;
  busy: boolean;
  storageAvailable: boolean;
  solveLabel?: string;
}
export function ColorEntry({
  state,
  onAction,
  validation,
  onCheck,
  onSolve,
  busy,
  storageAvailable,
  solveLabel = 'Explain with LBL',
}: Props) {
  const [review, setReview] = useState(false);
  const inputTarget = useGuidanceTarget('solve.input'),
    validationTarget = useGuidanceTarget('solve.validation');
  const { facelets, face, selection } = state.draft;
  const index = FACE_ENTRY_ORDER.indexOf(face),
    all = Object.values(facelets).flat();
  const entered = all.filter((color) => color !== null).length - 6;
  const issues = validation && !validation.ok ? validation.issues : [];
  return (
    <section ref={inputTarget} className="color-entry" aria-label="Enter cube colors">
      <div className="color-entry-intro">
        <div>
          <span className="eyebrow">FROM YOUR HANDS TO THE SCREEN</span>
          <h2>Bring your cube.</h2>
          <p>Choose a color, then paint the matching stickers. The centers stay fixed.</p>
        </div>
        <span className="entry-progress" role="status">
          {entered} / 48 stickers entered
        </span>
      </div>
      <details className="center-scheme">
        <summary>Check your center colors first</summary>
        <p>
          Hold white up and green front: red must be on the right, orange on the left, blue at the
          back, and yellow below. This version supports this standard scheme only.
        </p>
      </details>
      {!storageAvailable && (
        <p className="storage-notice" role="status">
          Your draft works on this page, but cannot be restored after refresh because browser
          storage is unavailable.
        </p>
      )}
      <nav className="face-steps" aria-label="Faces to enter">
        {FACE_ENTRY_ORDER.map((item, step) => (
          <button
            type="button"
            key={item}
            aria-label={`${FACE_NAMES[item]} face`}
            aria-current={!review && item === face ? 'step' : undefined}
            onClick={() => {
              onAction({ type: 'select-face', face: item });
              setReview(false);
            }}
          >
            <span className="face-step-number">{step + 1}</span>
            <span>
              {FACE_NAMES[item]}
              <small>{facelets[item].filter((color) => color !== null).length - 1} / 8</small>
            </span>
          </button>
        ))}
      </nav>
      {review ? (
        <div className="entry-review">
          <h2>Review your cube</h2>
          <p>
            Look straight at each face using the center directions shown. Edit any face to correct a
            sticker.
          </p>
          <FaceOverview
            facelets={facelets}
            issues={issues}
            onEdit={(item) => {
              onAction({ type: 'select-face', face: item });
              setReview(false);
            }}
          />
        </div>
      ) : (
        <div className="color-workspace">
          <div className="paint-board">
            <div className="paint-board-title">
              <h2>{FACE_NAMES[face]} face</h2>
              <span>{index + 1} / 6</span>
            </div>
            <FaceGrid
              face={face}
              facelets={facelets}
              editable
              invalidCells={issues.flatMap((issue) => issue.cells)}
              onPaint={(cell) => onAction({ type: 'paint', cell })}
            />
            <div className="face-navigation">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onAction({ type: 'select-face', face: FACE_ENTRY_ORDER[index - 1] })}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  index === 5
                    ? setReview(true)
                    : onAction({ type: 'select-face', face: FACE_ENTRY_ORDER[index + 1] })
                }
              >
                {index === 5 ? 'Review all faces' : 'Next'}
              </button>
            </div>
          </div>
          <div className="paint-instructions">
            <HoldingGuide face={face} />
            <fieldset className="color-palette">
              <legend>Choose your paint</legend>
              <div>
                {Object.values(COLORS).map((color) => (
                  <button
                    type="button"
                    key={color}
                    aria-pressed={selection === color}
                    aria-label={color[0].toUpperCase() + color.slice(1)}
                    onClick={() => onAction({ type: 'select-color', color })}
                  >
                    <i data-color={color} aria-hidden="true" />
                    {color[0].toUpperCase() + color.slice(1)}
                    {selection === color && <b aria-hidden="true">✓</b>}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="edit-actions">
              <button
                type="button"
                aria-pressed={selection === null}
                onClick={() => onAction({ type: 'select-color', color: null })}
              >
                Eraser
              </button>
              <button
                type="button"
                disabled={!state.history.length}
                onClick={() => onAction({ type: 'undo' })}
              >
                Undo
              </button>
              <button type="button" onClick={() => onAction({ type: 'reset' })}>
                Reset colors
              </button>
            </div>
            <p className="selected-paint">
              Selected: <strong>{selection ?? 'eraser'}</strong>. Your selection stays the same
              until you change it.
            </p>
            {index !== 5 && (
              <button type="button" className="text-button" onClick={() => setReview(true)}>
                Review all faces
              </button>
            )}
          </div>
        </div>
      )}
      {review && (
        <div className="edit-actions">
          <button
            type="button"
            disabled={!state.history.length}
            onClick={() => onAction({ type: 'undo' })}
          >
            Undo
          </button>
          <button type="button" onClick={() => onAction({ type: 'reset' })}>
            Reset colors
          </button>
        </div>
      )}
      <div ref={validationTarget} className="color-validation">
        <div className="color-counts" aria-label="Color counts">
          {Object.values(COLORS).map((color) => {
            const count = all.filter((value) => value === color).length;
            return (
              <div
                key={color}
                aria-label={`${color} count`}
                className={count > 9 ? 'over-count' : ''}
              >
                <i data-color={color} aria-hidden="true" />
                <span>
                  {color}
                  <strong>
                    {count} / 9{count > 9 ? ' · too many' : ''}
                  </strong>
                </span>
              </div>
            );
          })}
        </div>
        {issues.length > 0 && (
          <div className="color-errors" role="alert">
            <strong>Review your colors</strong>
            <ul>
              {issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
        {validation?.ok && (
          <p className="color-valid" role="status">
            Colors checked. This cube can be solved with normal turns.
          </p>
        )}
      </div>
      <div className="color-solve-actions">
        <p>
          Before following the solution, return to <strong>white up, green front</strong>.
        </p>
        <div>
          <button type="button" onClick={onCheck}>
            Check colors
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!validation?.ok || busy}
            onClick={onSolve}
          >
            {busy ? 'Finding your steps…' : solveLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
