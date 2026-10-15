import { countTeachingMoves } from '../../core/move-metrics';
import { useGuidanceTarget } from '../../ui/guidance';
import { useLabSession } from './LabSessionProvider';
export function ComparePage() {
  const { state, edit } = useLabSession(),
    target = useGuidanceTarget('lab.table');
  const routes = state.comparedRouteIds.map((id) => state.routes[id]).filter(Boolean);
  return (
    <section className="lab-card" ref={target} aria-label="Route comparison">
      <h2>Compare the tradeoffs.</h2>
      <p>
        Choose up to four routes in Analyze. Every comparison uses the same original cube. Counts
        describe the moves; G, V, A and cost are model estimates.
      </p>
      {!routes.length ? (
        <p>Select “Compare this route” on a result to begin.</p>
      ) : (
        <>
          <p>
            {routes
              .map(
                ({ route: r }) =>
                  `${r.startHold.bottom} / ${r.startHold.front}: ${r.crossLength} cross turns${r.score.rated ? `, ${r.score.R} rotations, cost ${r.score.cost}` : ''}`,
              )
              .join(' · ')}
          </p>
          <div
            className="lab-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Comparison table"
          >
            <table>
              <caption>Cross + F2L, excluding initial positioning and the last layer</caption>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Exact cross minimum</th>
                  <th>Route cross</th>
                  <th>F2L turns</th>
                  <th>Rotations</th>
                  <th>Est. G / V / A</th>
                  <th>Model cost</th>
                  <th>Pair order</th>
                  <th>Playback</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(({ route: r }) => {
                  const f2l = countTeachingMoves(
                      r.actions.filter((a) => a.section === 'lab-f2l').flatMap((a) => a.moves),
                    ),
                    s = r.score;
                  return (
                    <tr key={r.id}>
                      <th>
                        {r.startHold.bottom} bottom
                        <br />
                        {r.startHold.front} front
                      </th>
                      <td>{r.crossMinimum}</td>
                      <td>{r.crossLength}</td>
                      <td>{f2l.faceTurnEquivalents}</td>
                      <td>{s.rated ? s.R : '—'}</td>
                      <td>{s.rated ? `${s.G} / ${s.V} / ${s.A}` : 'Unrated'}</td>
                      <td>{s.rated ? s.cost : '—'}</td>
                      <td>
                        {r.actions
                          .filter((a) => a.checkpoint.predicate === 'pair')
                          .map((a) => `${a.pair?.slot} (${a.targets.join(' + ')})`)
                          .join(' → ') || 'Already complete'}
                      </td>
                      <td>
                        <button onClick={() => edit({ type: 'pin', routeId: r.id })}>
                          {state.pinnedRouteId === r.id ? 'Pinned' : 'Pin route'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>
            No globally fastest route is claimed. Try the actual holds and complete sequences before
            judging the handling estimates.
          </p>
        </>
      )}
    </section>
  );
}
