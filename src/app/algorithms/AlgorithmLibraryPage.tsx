import { useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { ALGORITHM_REGISTRY as registry } from '../../algorithms/registry';
import { CaseDiagram } from './CaseDiagram';
import { useFixtures } from './use-fixtures';
import './algorithm-library.css';
import '../practice/practice.css';
import { normalizePracticeSelection } from '../../practice/storage';
import { usePracticeStore } from '../practice/use-practice-store';
import { useGuidanceTarget } from '../../ui/guidance';
export function AlgorithmLibraryPage({ engine }: { engine: CubeEngine }) {
  const filtersTarget = useGuidanceTarget('algorithms.filters'),
    caseTarget = useGuidanceTarget('algorithms.case');
  const practiceStore = usePracticeStore();
  const [family, setFamily] = useState('all'),
    [group, setGroup] = useState('all'),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState(() => practiceStore.load().selection.caseIds);
  function choose(ids: string[], checked: boolean) {
    setSelected(
      checked ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id)),
    );
  }
  function practice() {
    practiceStore.save(normalizePracticeSelection({ version: 1, caseIds: selected }));
    location.hash = '#/practice';
  }
  const fixtures = useFixtures(),
    cases = Object.values(registry.cases);
  const groups = [
    ...new Set(cases.filter((c) => family === 'all' || c.family === family).map((c) => c.group)),
  ];
  const filtered = cases.filter(
    (c) =>
      (family === 'all' || c.family === family) &&
      (group === 'all' || c.group === group) &&
      (c.label + ' ' + c.id + ' ' + c.group).toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <section className="algorithm-library">
      <header className="library-heading">
        <p className="eyebrow">CFOP ALGORITHM LIBRARY · PREVIEW</p>
        <h1>Recognize it. Understand it. Try it.</h1>
        <p>
          41 F2L cases · 57 OLL cases · 21 PLL cases. The same verified formulas used in Advanced
          CFOP lessons and solves.
        </p>
      </header>
      <div ref={filtersTarget} className="library-filters">
        <label>
          Family
          <select
            value={family}
            onChange={(e) => {
              setFamily(e.target.value);
              setGroup('all');
            }}
          >
            <option value="all">All families</option>
            <option value="f2l">F2L (41)</option>
            <option value="oll">OLL (57)</option>
            <option value="pll">PLL (21)</option>
          </select>
        </label>
        <label>
          Group
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All groups</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label>
          Search cases
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Case name or ID"
          />
        </label>
      </div>
      <p role="status">{filtered.length} cases</p>
      <div className="library-practice-bar">
        <div>
          <button
            onClick={() =>
              choose(
                filtered.map((c) => c.id),
                true,
              )
            }
          >
            Select filtered cases
          </button>{' '}
          <button onClick={() => choose(selected, false)}>Clear selection</button>
        </div>
        <span>{selected.length} selected for practice</span>
        <button className="primary-button" disabled={!selected.length} onClick={practice}>
          Practice selected cases
        </button>
      </div>
      {fixtures.error ? (
        <p role="alert" className="error">
          {fixtures.error}
        </p>
      ) : !fixtures.get ? (
        <p>Loading recognition views…</p>
      ) : (
        <div className="case-grid">
          {filtered.map((c, index) => {
            const f = fixtures.get!(c.fixtureIds[0])!;
            const targets = f.target
              ? [f.target.cornerId, f.target.edgeId]
              : [...engine.observe(f.initial).edges, ...engine.observe(f.initial).corners]
                  .filter((p) => p.slot.includes('U'))
                  .map((p) => p.id);
            return (
              <article ref={index === 0 ? caseTarget : undefined} className="case-tile" key={c.id}>
                <div className="case-tile-heading">
                  <h2>{c.label}</h2>
                  <span>{c.family.toUpperCase()}</span>
                </div>
                <CaseDiagram state={f.initial} targets={targets} />
                <p>{c.group}</p>
                <label>
                  <input
                    type="checkbox"
                    aria-label={'Select ' + c.label}
                    checked={selected.includes(c.id)}
                    onChange={(e) => choose([c.id], e.target.checked)}
                  />
                  Practice this case
                </label>
                <a href={'#/algorithms/' + c.id}>Explore {c.label} →</a>
              </article>
            );
          })}
        </div>
      )}
      {!filtered.length && <p>No cases match these filters. Try another group or search.</p>}
    </section>
  );
}
