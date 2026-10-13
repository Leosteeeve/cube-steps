import { useEffect, useState } from 'react';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { NOTATION_ENTRIES, notationToken, type NotationSelection } from './catalog';
import { NotationPlayer } from './NotationPlayer';
import '../club.css';
const selections = NOTATION_ENTRIES.flatMap(({ base }) =>
  (['', "'", '2'] as const).map((amount) => ({ base, amount })),
);
export default function NotationFixture() {
  const [engine, setEngine] = useState<CubeEngine | null>(null),
    [selection, setSelection] = useState<NotationSelection>(selections[0]);
  useEffect(() => {
    document.documentElement.dataset.edition = 'club';
    let active = true;
    createCubeEngine().then((value) => {
      if (active) setEngine(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main style={{ maxWidth: 1100, margin: 'auto', padding: 30 }}>
      <h1>Single-move playback check</h1>
      <label>
        Fixture move{' '}
        <select
          value={notationToken(selection)}
          onChange={(event) =>
            setSelection(selections.find((value) => notationToken(value) === event.target.value)!)
          }
        >
          {selections.map((value) => (
            <option key={notationToken(value)}>{notationToken(value)}</option>
          ))}
        </select>
      </label>
      {engine && <NotationPlayer engine={engine} selection={selection} />}
    </main>
  );
}
