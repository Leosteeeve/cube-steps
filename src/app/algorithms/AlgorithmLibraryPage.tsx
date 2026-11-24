import { memo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { ALGORITHM_REGISTRY as registry } from '../../algorithms/registry';
import type { CaseFixture } from '../../algorithms/types';
import { CaseDiagram } from './CaseDiagram';
import { CatalogCaseLink } from './CatalogCaseLink';
import { useFixtures } from './use-fixtures';
import './algorithm-library.css';
import { normalizePracticeSelection } from '../../practice/storage';
import { usePracticeStore } from '../practice/use-practice-store';
import { useGuidanceTarget } from '../../ui/guidance';
import {
  createCatalogDraft,
  clearCatalogFilters,
  changeCaseSelection,
  matchesCatalogCase,
} from './catalog-draft';
import { CatalogPractice, CatalogResults, CatalogSearch } from './CatalogControls';

const useLibraryDraft = createCatalogDraft<readonly string[]>();
const families = ['f2l', 'oll', 'pll'];
const cases = Object.values(registry.cases).sort(
  (a, b) =>
    families.indexOf(a.family) - families.indexOf(b.family) ||
    a.label.localeCompare(b.label, 'en', { numeric: true }),
);

const Recognition = memo(function Recognition({
  engine,
  fixture,
}: {
  engine: CubeEngine;
  fixture: CaseFixture;
}) {
  const observed = engine.observe(fixture.initial);
  const targets = fixture.target
    ? [fixture.target.cornerId, fixture.target.edgeId]
    : [...observed.edges, ...observed.corners]
        .filter((piece) => piece.slot.includes('U'))
        .map((piece) => piece.id);
  return <CaseDiagram state={fixture.initial} targets={targets} />;
});

export function AlgorithmLibraryPage({ engine }: { engine: CubeEngine }) {
  const filtersTarget = useGuidanceTarget('algorithms.filters'),
    caseTarget = useGuidanceTarget('algorithms.case');
  const store = usePracticeStore();
  const [saved] = useState(() => store.load().selection.caseIds);
  const [draft, update, finishSelection] = useLibraryDraft(engine, saved);
  const { family, group, search, practice: selected } = draft;
  const fixtures = useFixtures();
  const groups = [
    ...new Set(cases.filter((c) => family === 'all' || c.family === family).map((c) => c.group)),
  ];
  const visible = cases.filter(
    (c) =>
      (family === 'all' || c.family === family) &&
      (group === 'all' || c.group === group) &&
      matchesCatalogCase(search, c, families),
  );
  function choose(ids: readonly string[], checked: boolean) {
    update({ practice: changeCaseSelection(selected, ids, checked) });
  }
  function practice() {
    store.save(normalizePracticeSelection({ version: 1, caseIds: selected }));
    finishSelection();
    location.hash = '#/practice';
  }
  return (
    <section className="algorithm-library formula-index">
      <div className="index-top">
        <header className="index-heading">
          <p className="index-kicker">Advanced CFOP · Preview</p>
          <h1>CFOP formula library</h1>
          <p>Match a corner–edge pair or last-layer pattern, then practice the cases you choose.</p>
        </header>
        <div className="index-filters" ref={filtersTarget}>
          <CatalogSearch
            value={search}
            onChange={(value) => update({ search: value })}
            example="Try OLL27, Z perm or a group name"
          />
          <div className="index-selectors">
            <label>
              Family
              <select
                value={family}
                onChange={(event) => update({ family: event.target.value, group: 'all' })}
              >
                <option value="all">All families</option>
                <option value="f2l">F2L (41)</option>
                <option value="oll">OLL (57)</option>
                <option value="pll">PLL (21)</option>
              </select>
            </label>
            <label>
              Group
              <select value={group} onChange={(event) => update({ group: event.target.value })}>
                <option value="all">All groups</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <CatalogPractice
          selected={selected.length}
          onClear={() => update({ practice: [] })}
          onPractice={practice}
        />
      </div>
      <CatalogResults
        count={visible.length}
        filtered={!!search || group !== 'all' || family !== 'all'}
        select={() =>
          choose(
            visible.map((c) => c.id),
            true,
          )
        }
        clear={() => update(clearCatalogFilters)}
      >
        {fixtures.error ? (
          <p role="alert" className="error">
            {fixtures.error}
          </p>
        ) : !fixtures.get ? (
          <p>Loading recognition views…</p>
        ) : (
          <div className="index-cases">
            {visible.map((c, i) => (
              <article
                key={c.id}
                ref={i === 0 ? caseTarget : undefined}
                className="case-tile index-case"
              >
                <div className="index-figure">
                  <Recognition engine={engine} fixture={fixtures.get!(c.fixtureIds[0])!} />
                </div>
                <div className="index-case-info">
                  <p className="index-id">{c.group}</p>
                  <h2>
                    <CatalogCaseLink
                      href={'#/algorithms/' + c.id}
                      name={'Explore ' + c.label + ' →'}
                      label={c.label}
                    />
                  </h2>
                  <label className="index-check">
                    <input
                      type="checkbox"
                      aria-label={'Select ' + c.label}
                      checked={selected.includes(c.id)}
                      onChange={(e) => choose([c.id], e.target.checked)}
                    />
                    Practice this case
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </CatalogResults>
    </section>
  );
}
