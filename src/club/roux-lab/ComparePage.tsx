import type { RouxPinnedComparison } from '../../roux-lab/comparison';
import { RouteSummary } from './RouteSummary';
export function ComparePage({
  comparison,
  selectedId,
  onSelect,
  onClear,
}: {
  comparison: RouxPinnedComparison | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  if (!comparison)
    return (
      <section className="roux-lab-card">
        <h2>Choose two routes in Analyze.</h2>
        <p>
          Select A, then B from the same starting cube. Their exact versions remain fixed while the
          search continues.
        </p>
        <a href="#/roux-lab">Back to Analyze</a>
      </section>
    );
  const { A, B } = comparison,
    difference = B.counts.combined - A.counts.combined;
  return (
    <section aria-label="Fixed Roux comparison">
      <h2>A and B · one starting cube</h2>
      <p>
        {difference === 0
          ? 'A and B use the same number of block turns'
          : `B uses ${Math.abs(difference)} ${difference > 0 ? 'more' : 'fewer'} block turns than A`}
        . Compare visibility and grip changes as well as turns. These are model estimates; physical
        trials can disagree.
      </p>
      <div className="roux-route-cards">
        {(
          [
            ['A', A],
            ['B', B],
          ] as const
        ).map(([label, route]) => (
          <RouteSummary
            key={label}
            label={`FIXED ROUTE ${label}`}
            route={route}
            selected={selectedId === route.id}
            onSelect={() => onSelect(route.id)}
          />
        ))}
      </div>
      <button onClick={onClear}>Clear comparison</button>
    </section>
  );
}
