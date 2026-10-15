import type { VerifiedLabRoute } from '../../lab/validate';
import { useLabSession } from './LabSessionProvider';
export function CandidateCard({
  checked,
  recommended = false,
}: {
  checked: VerifiedLabRoute;
  recommended?: boolean;
}) {
  const { state, edit } = useLabSession(),
    r = checked.route,
    s = r.score,
    pinned = state.pinnedRouteId === r.id;
  return (
    <article className="lab-card lab-candidate" data-route-id={r.id}>
      <span className="eyebrow">
        {r.startHold.bottom} cross · {r.startHold.front} front
      </span>
      <h3>{recommended ? 'Recommended among searched routes' : 'Alternative route'}</h3>
      <p>
        Exact cross minimum {r.crossMinimum} · Route cross {r.crossLength}
      </p>
      {s.rated ? (
        <>
          <dl className="lab-metrics">
            <div>
              <dt>Cross + F2L turns</dt>
              <dd>{s.T}</dd>
            </div>
            <div>
              <dt>Cube rotations</dt>
              <dd>{s.R}</dd>
            </div>
            <div>
              <dt>Est. hand regrips</dt>
              <dd>{s.G}</dd>
            </div>
          </dl>
          <p className="lab-footnote">
            Model cost {s.cost} · T + 2R + 2G + 3V + 2A · {r.modelVersion}. Not seconds.
          </p>
        </>
      ) : (
        <p>Unrated reference: {s.reason}</p>
      )}
      <p>
        {r.crossLength === r.crossMinimum
          ? 'Uses an exact minimum cross.'
          : `Uses ${r.crossLength - r.crossMinimum} extra cross move(s) to explore the full Cross + F2L sequence.`}{' '}
        {s.rated
          ? `The estimate includes ${s.V} visibility and ${s.A} awkward-transition event(s).`
          : ''}
      </p>
      <div className="lab-actions">
        <button aria-pressed={pinned} onClick={() => edit({ type: 'pin', routeId: r.id })}>
          {pinned ? 'Pinned for playback' : 'Pin for playback'}
        </button>
        <label>
          <input
            type="checkbox"
            checked={state.comparedRouteIds.includes(r.id)}
            disabled={!state.comparedRouteIds.includes(r.id) && state.comparedRouteIds.length === 4}
            onChange={(e) => edit({ type: 'compare', routeId: r.id, selected: e.target.checked })}
          />{' '}
          Compare this route
        </label>
      </div>
    </article>
  );
}
