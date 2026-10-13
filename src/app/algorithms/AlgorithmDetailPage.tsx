import { useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { getAlgorithmCase, ALGORITHM_REGISTRY as registry } from '../../algorithms/registry';
import type { AlgorithmCase } from '../../algorithms/types';
import { createDemonstration } from '../../algorithms/demonstration';
import { describeCaseRecognition } from '../../algorithms/recognition-evidence';
import { AlgorithmPlayer } from '../../player/AlgorithmPlayer';
import { CaseDiagram } from './CaseDiagram';
import { useFixtures } from './use-fixtures';
import './algorithm-library.css';
export function AlgorithmDetailPage({ engine, caseId }: { engine: CubeEngine; caseId: string }) {
  const c = getAlgorithmCase(caseId);
  return c ? (
    <CaseDetail key={caseId} engine={engine} entry={c} />
  ) : (
    <section className="algorithm-library">
      <h1>Case not found.</h1>
      <p>This case is not in the current catalog.</p>
      <a href="#/algorithms">Back to the algorithm library</a>
    </section>
  );
}
function CaseDetail({ engine, entry: c }: { engine: CubeEngine; entry: AlgorithmCase }) {
  const [variantId, setVariantId] = useState(c.defaultVariantId),
    fixtures = useFixtures();
  const variant = registry.variants[variantId];
  const clip = useMemo(() => {
    if (!fixtures.get) return {};
    try {
      return { demo: createDemonstration(engine, fixtures.get(c.fixtureIds[0])!, variantId) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [engine, fixtures.get, c, variantId]);
  const formulaAction = clip.demo?.actions.find((a) => a.kind === 'algorithm');
  return (
    <section className="algorithm-library">
      <a className="back-link" href="#/algorithms">
        ← Algorithm library
      </a>
      <header className="library-heading">
        <p className="eyebrow">
          {c.family.toUpperCase()} · {c.group} · PREVIEW
        </p>
        <h1>{c.label}</h1>
        <p>
          {formulaAction
            ? describeCaseRecognition(engine, formulaAction.before, c, formulaAction.targets)
            : c.recognition}
        </p>
      </header>
      <div className="case-detail-intro">
        {formulaAction && (
          <figure>
            <CaseDiagram state={formulaAction.before} targets={formulaAction.targets} />
            <figcaption>
              Recognition view at the start of the selected formula. Prepare the holding frame shown
              below.
            </figcaption>
          </figure>
        )}
        <div className="case-formula">
          <label>
            Formula variant
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {c.variantIds.map((id) => (
                <option key={id} value={id}>
                  {registry.variants[id].name}
                  {registry.variants[id].targetSlot
                    ? ' · ' + registry.variants[id].targetSlot + ' slot'
                    : ''}
                  {id.includes('/no-regrip/') ? ' · without a regrip' : ''}
                </option>
              ))}
            </select>
          </label>
          <h2>Hold and recognize</h2>
          <p>{variant.precondition}</p>
          <code data-testid="selected-formula">{variant.moves.join(' ')}</code>
          <ol className="formula-segments" data-testid="formula-segments">
            {variant.segments?.map((s, i) => (
              <li key={i}>
                <strong>{s.label}</strong>
                <code>{variant.moves.slice(s.start, s.end).join(' ')}</code>
              </li>
            ))}
          </ol>
          <h2>What changes</h2>
          <p>{variant.effect}</p>
          <p className="muted">Choosing a variant here changes this demonstration only.</p>
        </div>
      </div>
      {fixtures.error || clip.error ? (
        <p role="alert" className="error">
          {fixtures.error ?? clip.error}
        </p>
      ) : clip.demo ? (
        <AlgorithmPlayer key={variantId} engine={engine} demonstration={clip.demo} />
      ) : (
        <p role="status">Preparing the verified demonstration…</p>
      )}
      <section className="case-sources">
        <h2>Formula references</h2>
        <p>
          Recognition diagrams and explanations are original to CubeSteps. Case IDs follow the
          project catalog; see the source reference for its ordering.
        </p>
        <ul>
          {variant.sourceRefs.map((ref, i) => (
            <li key={i}>
              <a href={ref.url} target="_blank" rel="noreferrer">
                {ref.title}
              </a>{' '}
              — {ref.reference}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
