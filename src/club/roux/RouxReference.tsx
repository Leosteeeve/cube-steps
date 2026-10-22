import type { CubeEngine } from '../../core/types';
import { ROUX_REFERENCE } from '../../content/roux/reference';
import { buildRouxDiagram } from '../../content/roux/diagrams';
import { RouxCaseDiagram } from './RouxCaseDiagram';
import { useState } from 'react';
export function RouxReference({ engine, ids }: { engine: CubeEngine; ids: readonly string[] }) {
  const [group, setGroup] = useState('slice');
  const block = ids.some((id) => id.startsWith('roux-block-'));
  const items = ROUX_REFERENCE.filter((item) => ids.includes(item.id)).filter(
    (item) =>
      !block ||
      (group === 'trigger'
        ? item.algorithm.moves.length > 1
        : item.algorithm.moves.length === 1 &&
          (group === 'slice'
            ? item.algorithm.moves[0].startsWith('M')
            : !item.algorithm.moves[0].startsWith('M'))),
  );
  return (
    <section className="roux-reference">
      <h2>Keep these nearby.</h2>
      <p>
        These are the same definitions used by the solver. Match the shown case and preparation
        before using a formula.
      </p>
      {block && (
        <>
          <p>
            Reference hold: blue left · green right · white-bottom blocks. Middle centers may move.
            Follow the player's actual target and setup before selecting a maneuver.
          </p>
          <label>
            Block maneuver group{' '}
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="slice">Middle slice: M, M′, M2</option>
              <option value="setup">Single-face setups</option>
              <option value="trigger">Open, adjust, close</option>
            </select>
          </label>
        </>
      )}
      <div className="roux-reference-grid">
        {items.map((item) => {
          const id = item.id;
          return (
            <details key={id}>
              <summary>{item.algorithm.name}</summary>
              {id.includes('ocll') || id === 'roux-t' || id === 'roux-y' ? (
                <RouxCaseDiagram
                  model={buildRouxDiagram(engine, item.exampleState(engine), [], 'corners')}
                  label={item.algorithm.name + ' execution hold'}
                />
              ) : null}
              <p>{item.algorithm.precondition}</p>
              <code>{item.algorithm.moves.join(' ')}</code>
              <p>{item.algorithm.effect}</p>
              {item.protection && (
                <p>
                  {item.protection === 'always'
                    ? 'Protection: use this setup only when the current completed pieces stay in place.'
                    : 'Protection: check the completed pieces after the whole maneuver; they may move temporarily inside it.'}
                </p>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
