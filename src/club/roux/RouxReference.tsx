import type { CubeEngine } from '../../core/types';
import { ROUX_REFERENCE } from '../../content/roux/reference';
import { buildRouxDiagram } from '../../content/roux/diagrams';
import { RouxCaseDiagram } from './RouxCaseDiagram';
export function RouxReference({ engine, ids }: { engine: CubeEngine; ids: readonly string[] }) {
  return (
    <section className="roux-reference">
      <h2>Keep these nearby.</h2>
      <p>
        These are the same definitions used by the solver. Match the shown case and preparation
        before using a formula.
      </p>
      <div className="roux-reference-grid">
        {ids.map((id) => {
          const item = ROUX_REFERENCE.find((r) => r.id === id);
          if (!item) return null;
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
            </details>
          );
        })}
      </div>
    </section>
  );
}
