import { useState } from 'react';
import type { CubeEngine } from '../../core/types';
import {
  NOTATION_ENTRIES,
  describeNotation,
  type NotationEntry,
  type NotationSelection,
} from './catalog';
import { NotationPlayer } from './NotationPlayer';
import './moves.css';
export function MoveExplorerPage({ engine }: { engine: CubeEngine }) {
  const [selection, setSelection] = useState<NotationSelection>({ base: 'U', amount: '' });
  function choices(family: NotationEntry['family'], label: string) {
    return (
      <div className="move-family" role="group" aria-label={label}>
        {NOTATION_ENTRIES.filter((entry) => entry.family === family).map((entry) => (
          <button
            key={entry.base}
            type="button"
            aria-label={`${entry.base}, ${entry.name}`}
            aria-pressed={selection.base === entry.base}
            onClick={() => setSelection((current) => ({ ...current, base: entry.base }))}
          >
            <strong>{entry.base}</strong>
            <span>{entry.name.replace(' face', '')}</span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <section className="move-explorer">
      <header className="moves-heading">
        <p className="eyebrow">THE CUBE’S LANGUAGE</p>
        <h1>A letter. A turn. Now it clicks.</h1>
        <p>Choose a move. Watch what turns. Try it on the cube in your hands.</p>
      </header>
      <div className="moves-workbench">
        <aside className="moves-picker" aria-label="Move selection">
          <h2>01 / Choose a face</h2>
          {choices('face', 'Face turns')}
          <details className="moves-advanced">
            <summary>Explore more moves</summary>
            <h3>Whole cube</h3>
            {choices('rotation', 'Whole-cube rotations')}
            <h3>Two layers</h3>
            {choices('wide', 'Wide turns')}
            <h3>Middle slices</h3>
            {choices('slice', 'Slice turns')}
          </details>
          <p className="moves-picker-note">Letters follow your grip, not a fixed sticker color.</p>
        </aside>
        <div className="moves-example">
          <div className="moves-variants" role="group" aria-label="Turn amount">
            <span>02 / Choose a turn</span>
            {(['', "'", '2'] as const).map((amount) => {
              const description = describeNotation({ base: selection.base, amount });
              return (
                <button
                  key={amount}
                  type="button"
                  aria-label={description.spoken}
                  aria-pressed={selection.amount === amount}
                  onClick={() => setSelection((current) => ({ ...current, amount }))}
                >
                  {description.display}
                </button>
              );
            })}
          </div>
          <span className="moves-selection-announcement" role="status">
            Selected {describeNotation(selection).spoken}. Start from the solved position.
          </span>
          <NotationPlayer engine={engine} selection={selection} />
        </div>
      </div>
      <div className="moves-follow-along">
        <strong>Try it in your hands.</strong>
        <p>
          Hold your cube as shown, play the move, then follow along. Reset before another example so
          you can compare each turn from the same starting point.
        </p>
      </div>
    </section>
  );
}
