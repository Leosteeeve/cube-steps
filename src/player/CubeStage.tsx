import type { ReactNode, Ref } from 'react';
import type { CubeViewPreferences } from './view-preferences';

export function CubeStage({
  hostRef,
  preferences,
  onPreferencesChange,
  onResetView,
  renderUnavailable = false,
  holding,
  children,
}: {
  hostRef: Ref<HTMLDivElement>;
  preferences: CubeViewPreferences;
  onPreferencesChange: (value: CubeViewPreferences) => void;
  onResetView: () => void;
  renderUnavailable?: boolean;
  holding: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="cube-stage" data-background={preferences.background}>
      <div className="cube-view-bar">
        <details className="cube-view-settings">
          <summary>View settings</summary>
          <div className="cube-view-options">
            <label>
              <input
                type="checkbox"
                checked={preferences.background === 'light'}
                onChange={(e) =>
                  onPreferencesChange({
                    ...preferences,
                    background: e.target.checked ? 'light' : 'dark',
                  })
                }
              />{' '}
              Light cube background
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.showBackFaces}
                onChange={(e) =>
                  onPreferencesChange({ ...preferences, showBackFaces: e.target.checked })
                }
              />{' '}
              Back-face view aid
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.showNet}
                onChange={(e) => onPreferencesChange({ ...preferences, showNet: e.target.checked })}
              />
              Six-face diagram
            </label>
            <p>These options change your view. Your cube and moves stay the same.</p>
          </div>
        </details>
        <button type="button" onClick={onResetView} disabled={renderUnavailable}>
          Reset view <span aria-hidden="true">↺</span>
        </button>
      </div>
      <div className="cube-canvas" ref={hostRef} hidden={renderUnavailable} />
      {!renderUnavailable && (
        <p className="orbit-note">Drag to look around · View changes do not turn the cube</p>
      )}
      <div className="cube-holding">{holding}</div>
      {children}
    </div>
  );
}
