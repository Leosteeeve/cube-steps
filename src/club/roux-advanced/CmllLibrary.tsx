import { useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
import { CMLL_CATALOG } from '../../methods/roux-advanced/cmll/catalog';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import { CmllDiagram, CmllFrameSelect } from './CmllCasePage';
export function CmllLibrary({ engine }: { engine: CubeEngine }) {
  const [family, setFamily] = useState('all'),
    [frameId, setFrame] = useState<RouxFrameId>('white-blue');
  const frame = ROUX_FRAMES.find((f) => f.id === frameId)!;
  const groups = CMLL_CATALOG.cases.filter((c) => family === 'all' || c.family === family);
  return (
    <section className="cmll-page">
      <span className="eyebrow">CORNERS FIRST. EDGES LATER.</span>
      <h1>CMLL, one pattern at a time.</h1>
      <p>
        42 cases, grouped by the top-corner pattern. Match the side colors too; ignore the remaining
        edges. Both blocks should be complete before starting.
      </p>
      <a className="primary-button" href="#/cmll-practice">
        Practice selected cases →
      </a>
      <div className="cmll-controls">
        <label className="cmll-control">
          CMLL family
          <select value={family} onChange={(e) => setFamily(e.target.value)}>
            <option value="all">All families · 42 cases</option>
            {[...new Set(CMLL_CATALOG.cases.map((c) => c.family))].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <CmllFrameSelect value={frameId} onChange={setFrame} />
      </div>
      <p>
        Hold {frame.bottom} down and {frame.left} left; {frame.centers.F} faces you.
      </p>
      <p aria-live="polite">{groups.length} cases</p>
      <div className="cmll-grid">
        {groups.map((c) => (
          <article className="cmll-card" key={c.id}>
            <h2>
              {c.family} · {c.label}
            </h2>
            <CmllDiagram
              engine={engine}
              caseId={c.id}
              variantId={c.variantIds[0]}
              frameId={frameId}
              label={`${c.family} ${c.label}`}
            />
            <a href={`#/cmll/${c.id}`} aria-label={`Open CMLL ${c.family} ${c.label}`}>
              Explore formula →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
