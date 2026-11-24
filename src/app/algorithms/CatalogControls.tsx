import type { ReactNode } from 'react';
import './formula-index.css';

export function CatalogSearch({
  value,
  onChange,
  example,
}: {
  value: string;
  onChange: (value: string) => void;
  example: string;
}) {
  return (
    <label className="index-search">
      Search cases
      <span>
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
        <input
          type="search"
          placeholder={example}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

export function CatalogPractice({
  selected,
  onPractice,
  onClear,
}: {
  selected: number;
  onPractice: () => void;
  onClear: () => void;
}) {
  return (
    <aside className="index-practice" aria-label="Practice selection">
      <div className="index-practice-title">
        <h2>Practice set</h2>
        <button className="index-text-button" disabled={!selected} onClick={onClear}>
          Clear selection
        </button>
      </div>
      <p aria-live="polite">
        <strong>{selected}</strong> {selected === 1 ? 'case' : 'cases'} selected
      </p>
      <button className="primary-button" disabled={!selected} onClick={onPractice}>
        Practice selected cases <span aria-hidden="true">→</span>
      </button>
    </aside>
  );
}

export function CatalogResults({
  count,
  filtered,
  select,
  clear,
  children,
}: {
  count: number;
  filtered: boolean;
  select: () => void;
  clear: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="index-results">
        <p role="status">
          <strong>{count}</strong> {count === 1 ? 'case' : 'cases'}
        </p>
        <div>
          <button className="index-text-button" disabled={!filtered} onClick={clear}>
            Clear filters
          </button>
          <button className="index-select" disabled={!count} onClick={select}>
            Select filtered cases
          </button>
        </div>
      </div>
      {!count ? (
        <div className="index-empty">
          <h2>No matching cases</h2>
          <p>Try a different case name or clear the filters above.</p>
        </div>
      ) : (
        children
      )}
    </>
  );
}
