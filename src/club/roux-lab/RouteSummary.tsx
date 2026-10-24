import type { RouxRoute } from '../../roux-lab/types';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import { evidenceText } from './ResultSummary';
export function RouteSummary({
  route: r,
  label,
  selected,
  onSelect,
  onCompare,
  comparisonSlot,
}: {
  route: RouxRoute;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onCompare?: () => void;
  comparisonSlot?: string;
}) {
  const f = ROUX_FRAMES.find((f) => f.id === r.frameId)!,
    events = r.score.rated ? r.score.events.filter((e) => e.kind !== 'turn').slice(0, 2) : [];
  return (
    <article className="roux-lab-card" data-roux-route={r.id}>
      <span className="eyebrow">{label}</span>
      <h2>
        {f.bottom} bottom · {f.left} left
      </h2>
      <p>
        {r.basis === 'optimized' ? 'Optimized within this search' : 'Verified baseline fallback'}
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
      <details>
        <summary>What to try in your hands</summary>
        <p>
          Build the first block, then preserve it while connecting the second. Check the indicated
          targets at each action boundary. The handling estimate covers these two blocks, not CMLL
          or LSE.
        </p>
        {events.map((e, i) => (
          <p key={i}>
            At playback move {e.boundary}: {e.instruction}
          </p>
        ))}
        {!events.length && <p>No extra handling event was identified by this model.</p>}
      </details>
      <p>LSE playback: {r.lseMode === 'basic' ? 'basic steps' : 'combined EOLR'}.</p>
      <div className="roux-lab-actions">
        <button aria-pressed={selected} onClick={onSelect}>
          Play full solve
        </button>
        {onCompare && (
          <button aria-pressed={!!comparisonSlot} onClick={onCompare}>
            {comparisonSlot ? `Selected as ${comparisonSlot}` : 'Compare this route'}
          </button>
        )}
      </div>
    </article>
  );
}
