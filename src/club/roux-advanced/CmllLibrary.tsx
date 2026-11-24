import { memo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
import { CMLL_CATALOG } from '../../methods/roux-advanced/cmll/catalog';
import { createCmllDemonstration } from '../../methods/roux-advanced/cmll/demonstration';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import { CmllFrameSelect } from './CmllCasePage';
import { CatalogCaseLink } from '../../app/algorithms/CatalogCaseLink';
import { CaseDiagram } from '../../app/algorithms/CaseDiagram';
import {
  CatalogPractice,
  CatalogResults,
  CatalogSearch,
} from '../../app/algorithms/CatalogControls';
import {
  createCatalogDraft,
  clearCatalogFilters,
  changeCaseSelection,
  matchesCatalogCase,
} from '../../app/algorithms/catalog-draft';
import { getCmllPracticeStore, type CmllPracticeSelection } from './preferences';

const families = [...new Set(CMLL_CATALOG.cases.map((c) => c.family))];
const useLibraryDraft = createCatalogDraft<CmllPracticeSelection>();

const CornerPattern = memo(function CornerPattern({
  engine,
  entry,
  frameId,
}: {
  engine: CubeEngine;
  entry: (typeof CMLL_CATALOG.cases)[number];
  frameId: RouxFrameId;
}) {
  const { source } = createCmllDemonstration(engine, entry.id, entry.variantIds[0], frameId, 0);
  if (source.kind !== 'cmll') throw Error('Expected a CMLL demonstration.');
  const state = source.prepared.timeline.states[0];
  const targets = engine
    .observe(state)
    .corners.filter((corner) => corner.slot.includes('U'))
    .map((corner) => corner.id);
  return <CaseDiagram state={state} targets={targets} />;
});

export function CmllLibrary({ engine }: { engine: CubeEngine }) {
  const store = getCmllPracticeStore(engine);
  const [saved] = useState(() => store.load().selection);
  const [draft, update, finishSelection] = useLibraryDraft(engine, saved);
  const { family, search, practice } = draft;
  const { caseIds, frameId } = practice;
  const frame = ROUX_FRAMES.find((f) => f.id === frameId)!;
  const visible = CMLL_CATALOG.cases.filter(
    (c) => (family === 'all' || c.family === family) && matchesCatalogCase(search, c, families),
  );
  function choose(ids: readonly string[], checked: boolean) {
    update({ practice: { ...practice, caseIds: changeCaseSelection(caseIds, ids, checked) } });
  }
  function openPractice() {
    store.openPractice(practice);
    finishSelection();
    location.hash = '#/cmll-practice';
  }

  return (
    <section className="cmll-page formula-index">
      <div className="index-top">
        <header className="index-heading">
          <p className="index-kicker">Advanced Roux · Preview</p>
          <h1>CMLL formula library</h1>
          <p>
            With both blocks built, match the four top corners and their side colors. The gray edges
            can be ignored.
          </p>
        </header>
        <div className="index-filters">
          <CatalogSearch
            value={search}
            onChange={(value) => update({ search: value })}
            example="Try Pi3, Right Bar or a family name"
          />
          <div className="index-selectors">
            <label>
              CMLL family
              <select value={family} onChange={(e) => update({ family: e.target.value })}>
                <option value="all">All families · 42 cases</option>
                {families.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <CmllFrameSelect
              value={frameId}
              onChange={(value) => update({ practice: { ...practice, frameId: value } })}
            />
          </div>
          <p className="index-hold">
            Hold {frame.bottom} down and {frame.left} left.{' '}
            {frame.centers.F[0].toUpperCase() + frame.centers.F.slice(1)} faces you.
          </p>
        </div>
        <CatalogPractice
          selected={caseIds.length}
          onClear={() => update({ practice: { ...practice, caseIds: [] } })}
          onPractice={openPractice}
        />
      </div>
      <CatalogResults
        count={visible.length}
        filtered={!!search || family !== 'all'}
        clear={() => update(clearCatalogFilters)}
        select={() =>
          choose(
            visible.map((c) => c.id),
            true,
          )
        }
      >
        <div className="index-cases">
          {visible.map((c) => (
            <article className="cmll-card index-case" key={c.id}>
              <div className="index-figure">
                <CornerPattern engine={engine} entry={c} frameId={frameId} />
              </div>
              <div className="index-case-info">
                <p className="index-id">
                  {c.family} {c.id.split('-').at(-1)}
                </p>
                <h2>
                  <CatalogCaseLink
                    href={'#/cmll/' + c.id + (frameId === 'white-blue' ? '' : '?frame=' + frameId)}
                    name={'Open CMLL ' + c.family + ' ' + c.label}
                    label={c.label}
                  />
                </h2>
                <label className="index-check">
                  <input
                    type="checkbox"
                    aria-label={'Select ' + c.family + ' ' + c.label}
                    checked={caseIds.includes(c.id)}
                    onChange={(e) => choose([c.id], e.target.checked)}
                  />
                  Practice this case
                </label>
              </div>
            </article>
          ))}
        </div>
      </CatalogResults>
    </section>
  );
}
