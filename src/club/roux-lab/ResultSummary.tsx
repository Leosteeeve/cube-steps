import type { RouxLabSession } from './session';
import type { FirstBlockEvidence } from '../../methods/roux-advanced/types';
export function evidenceText(e: FirstBlockEvidence | undefined): string {
  return !e || e.status === 'not-explored'
    ? 'Not explored'
    : e.status === 'proven-minimum'
      ? `Proven left-block minimum: ${e.minimum} STM`
      : `Best found: ${e.upperBound} STM · lower bound ${e.lowerBound}; not proved minimal`;
}
export function ResultSummary({ state, onStop }: { state: RouxLabSession; onStop: () => void }) {
  const busy = state.status === 'initializing' || state.status === 'searching';
  return (
    <section
      className="roux-lab-status"
      aria-label="Search coverage"
      data-roux-phase={state.status}
    >
      <div className="roux-lab-actions">
        <strong role="status">
          {state.status === 'initializing'
            ? 'Preparing a verified route…'
            : state.status === 'searching'
              ? 'Searching and checking routes…'
              : state.status === 'complete'
                ? 'Analysis complete'
                : state.status === 'stopped'
                  ? 'Search stopped'
                  : state.status === 'failed'
                    ? 'Analysis could not continue'
                    : 'Ready to explore'}
        </strong>
        {busy && <button onClick={onStop}>Stop search</button>}
      </div>
      {state.error && (
        <p role="alert">
          {state.error}
          {state.routes.length ? ' Your verified routes remain available.' : ''}
        </p>
      )}
      {state.coverage && (
        <p>
          {(state.coverage.elapsedMs / 1000).toFixed(1)} s observed ·{' '}
          {state.coverage.operations.toLocaleString()} recorded operations ·{' '}
          {state.coverage.verifiedRoutes} verified routes
          {state.coverage.reason ? ` · stopped by ${state.coverage.reason}` : ''}
        </p>
      )}
      <details>
        <summary>Actual search coverage and proof scope</summary>
        <ul>
          {state.settings.allowedFrames.map((id) => (
            <li key={id}>
              <strong>{id.replace('-', ' / ')}</strong>: {evidenceText(state.coverage?.frames[id])}
            </li>
          ))}
        </ul>
        <p>
          A left-block minimum proves only that isolated goal in the admitted move set. It does not
          prove the best two-block or complete solution. A reference witness without a full
          continuation is not a playable full solve.
        </p>
        <p>
          STM counts an outer, wide or slice half turn as one. Whole-cube rotations are separate.
          The handling model estimates turns, regrips, visibility and awkward transitions; physical
          comfort still needs your trial.
        </p>
      </details>
    </section>
  );
}
