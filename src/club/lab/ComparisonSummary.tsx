import type { ComparisonSummary as Summary } from '../../lab/trials/summary';
import { trialTime } from './TrialTimer';
export function ComparisonSummary({ summary: s }: { summary: Summary }) {
  return (
    <section className="lab-card" aria-label="Matched comparison summary">
      <h2>Your paired observations</h2>
      <p>
        {s.completeBlocks} complete matched A/B blocks · {s.rawCount} raw attempts ·{' '}
        {s.eligibleCount} paired results.
      </p>
      {s.status === 'insufficient' ? (
        <p role="status">
          Complete {Math.max(0, 5 - s.completeBlocks)} more matched block(s) with this tester and
          timing method before a descriptive summary appears.
        </p>
      ) : (
        <>
          <dl className="lab-metrics">
            <div>
              <dt>Median A</dt>
              <dd>{trialTime(s.medianA!)}</dd>
            </div>
            <div>
              <dt>Median B</dt>
              <dd>{trialTime(s.medianB!)}</dd>
            </div>
            <div>
              <dt>Median paired B − A</dt>
              <dd>{trialTime(s.medianDifference!)}</dd>
            </div>
          </dl>
          <p>
            A positive B − A means B took longer in these trials. This is descriptive practice
            feedback, not a scientific winner or a claim of statistical significance.
          </p>
        </>
      )}
      <details>
        <summary>Ratings and exclusions</summary>
        {(['A', 'B'] as const).map((label) => (
          <div key={label}>
            <h3>Route {label}</h3>
            {(['flow', 'recognition'] as const).map((key) => (
              <p key={key}>
                {key}: {s.ratings[label][key].count} ratings; counts at 1 / 2 / 3 / 4 / 5:{' '}
                {s.ratings[label][key].distribution.join(' / ')}. Missing ratings are not filled in.
              </p>
            ))}
          </div>
        ))}
        <ul>
          {s.exclusions.map((e) => (
            <li key={e.attemptId}>
              {e.attemptId.slice(0, 8)}: {e.reason}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
