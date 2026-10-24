import { useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { CMLL_CATALOG } from '../../methods/roux-advanced/cmll/catalog';
import { createCmllDemonstration } from '../../methods/roux-advanced/cmll/demonstration';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import type { RouxFrameId, Quarter } from '../../methods/roux-advanced/types';
import { buildRouxDiagram } from '../../content/roux/diagrams';
import { RouxCaseDiagram } from '../roux/RouxCaseDiagram';
import { PlaybackView } from '../../player/PlaybackView';
import '../roux/roux.css';
import './roux-advanced.css';
export function CmllFrameSelect({
  value,
  onChange,
}: {
  value: RouxFrameId;
  onChange: (id: RouxFrameId) => void;
}) {
  return (
    <label className="cmll-control">
      Holding frame
      <select value={value} onChange={(e) => onChange(e.target.value as RouxFrameId)}>
        {ROUX_FRAMES.map((f) => (
          <option key={f.id} value={f.id}>
            {f.bottom} bottom · {f.left} left
          </option>
        ))}
      </select>
    </label>
  );
}
export function CmllDiagram({
  engine,
  caseId,
  variantId,
  frameId,
  auf = 0,
  label,
}: {
  engine: CubeEngine;
  caseId: string;
  variantId: string;
  frameId: RouxFrameId;
  auf?: Quarter;
  label: string;
}) {
  const model = useMemo(() => {
    const demo = createCmllDemonstration(engine, caseId, variantId, frameId, auf);
    if (demo.source.kind !== 'cmll') throw Error('Expected a CMLL demonstration.');
    return buildRouxDiagram(engine, demo.source.prepared.timeline.states[0], [], 'corners');
  }, [engine, caseId, variantId, frameId, auf]);
  return <RouxCaseDiagram model={model} label={label} />;
}
export function CmllAnswer({
  engine,
  caseId,
  frameId,
  auf = 0,
  initialVariantId,
}: {
  engine: CubeEngine;
  caseId: string;
  frameId: RouxFrameId;
  auf?: Quarter;
  initialVariantId?: string;
}) {
  const group = CMLL_CATALOG.cases.find((c) => c.id === caseId)!;
  const [selected, setSelected] = useState(initialVariantId ?? group.variantIds[0]);
  const variantId = group.variantIds.includes(selected) ? selected : group.variantIds[0],
    variant = CMLL_CATALOG.variants[variantId];
  const demo = useMemo(
    () => createCmllDemonstration(engine, caseId, variantId, frameId, auf),
    [engine, caseId, variantId, frameId, auf],
  );
  return (
    <section data-testid="cmll-answer" className="cmll-answer">
      <h2>
        {group.family} · {group.label}
      </h2>
      <p>{demo.holding}</p>
      <label className="cmll-control">
        Formula variant
        <select value={variantId} onChange={(e) => setSelected(e.target.value)}>
          {group.variantIds.map((id, i) => (
            <option key={id} value={id}>
              {i === 0 ? 'Primary' : 'Alternative'} · {CMLL_CATALOG.variants[id].moves.join(' ')}
            </option>
          ))}
        </select>
      </label>
      <p className="cmll-formula" data-testid="cmll-formula">
        {variant.moves.join(' ')}
      </p>
      <ol className="cmll-chunks">
        {variant.segments?.map((s) => (
          <li key={s.start}>
            <span>{s.label}</span>
            <code>{variant.moves.slice(s.start, s.end).join(' ')}</code>
          </li>
        ))}
      </ol>
      <p>
        Read the top stickers and the side colors together. The six remaining edges do not identify
        the CMLL case.
      </p>
      <details>
        <summary>Exact corner recognition</summary>
        <p>{demo.recognition}</p>
      </details>
      <PlaybackView engine={engine} source={demo.source} />
      <details>
        <summary>Formula sources &amp; execution notes</summary>
        <p>
          The primary is our starting choice for right-leading practice, not a claim of the fastest
          formula for every hand. Compare the alternative on a physical cube.
        </p>
        <ul>
          {variant.sourceRefs.map((ref) => (
            <li key={ref.url}>
              <a href={ref.url} target="_blank" rel="noreferrer">
                {ref.title}
              </a>
              <p>{ref.usageNotes}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
export function CmllCasePage({
  engine,
  caseId,
  initialVariantId,
  initialFrameId = 'white-blue',
}: {
  engine: CubeEngine;
  caseId: string;
  initialVariantId?: string;
  initialFrameId?: RouxFrameId;
}) {
  const [frameId, setFrame] = useState<RouxFrameId>(initialFrameId),
    [auf, setAuf] = useState<Quarter>(0);
  const group = CMLL_CATALOG.cases.find((c) => c.id === caseId);
  if (!group || (initialVariantId && !group.variantIds.includes(initialVariantId)))
    return (
      <section>
        <h1>Case not found.</h1>
        <a href="#/cmll">CMLL library</a>
      </section>
    );
  return (
    <section className="cmll-page">
      <a href="#/cmll">← All 42 CMLL cases</a>
      <h1>
        {group.family} · {group.label}
      </h1>
      <div className="cmll-controls">
        <CmllFrameSelect value={frameId} onChange={setFrame} />
        <label className="cmll-control">
          U setup
          <select value={auf} onChange={(e) => setAuf(Number(e.target.value) as Quarter)}>
            {['None', 'U', 'U2', 'U′'].map((s, i) => (
              <option key={s} value={i}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <CmllAnswer
        key={caseId}
        engine={engine}
        caseId={caseId}
        frameId={frameId}
        auf={auf}
        initialVariantId={initialVariantId}
      />
    </section>
  );
}
