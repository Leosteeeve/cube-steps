import type { CubeEngine } from '../../core/types';
import { ROUX_LESSON_DETAILS, ROUX_LESSON_TEXT } from '../../content/roux-course';
import { buildRouxDiagram } from '../../content/roux/diagrams';
import { rouxReferenceState } from '../../methods/roux/frame';
import { blockTargets } from '../../methods/roux/predicates';
import { RouxCaseDiagram } from './RouxCaseDiagram';
import { RouxReference } from './RouxReference';
import { RouxFoundation } from './RouxFoundation';
import './roux.css';
export function RouxLessonDetails({ engine, lessonId }: { engine: CubeEngine; lessonId: string }) {
  const detail = ROUX_LESSON_DETAILS[lessonId],
    text = ROUX_LESSON_TEXT[lessonId];
  const mode = lessonId.includes('corner')
    ? 'corners'
    : lessonId.includes('edge')
      ? 'lse'
      : 'block';
  const targets = blockTargets(engine, lessonId === 'roux-second-block' ? 'right' : 'left').map(
    (p) => p.id,
  );
  const diagram = buildRouxDiagram(engine, rouxReferenceState(engine), targets, mode);
  return (
    <section className="roux-lesson-details" aria-label="Roux teaching details">
      <div className="roux-overview">
        <div>
          <span className="eyebrow">UNDERSTAND THE GOAL</span>
          <h2>What you are building.</h2>
          <p>{detail.overview}</p>
          <p className="notice">
            Preview · The solver is verified by replay. Physical teaching acceptance is still
            pending.
          </p>
        </div>
        <RouxCaseDiagram model={diagram} label="Completed stage goal in the Roux reference hold" />
      </div>
      <div className="roux-four-steps">
        {[
          ['Look', text.look],
          ['Prepare', text.prepare],
          ['Do', text.do],
          ['Check', text.check],
        ].map(([label, copy], i) => (
          <article key={label}>
            <span className="eyebrow">0{i + 1}</span>
            <h3>{label}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      {lessonId === 'intro' && <RouxFoundation engine={engine} />}
      <details className="roux-example-list">
        <summary>Worked examples in this chapter ({detail.workedExamples.length})</summary>
        <p>
          Select a case in the Practice case menu above, then follow its verified solution. All case
          inputs use the standard input hold; the player shows the real starting regrip.
        </p>
        <ol>
          {detail.workedExamples.map((e) => (
            <li key={e.id}>{e.caption}</li>
          ))}
        </ol>
      </details>
      <section>
        <h3>If something looks wrong</h3>
        <div className="roux-mistakes">
          {detail.mistakes.map((m) => (
            <article key={m.symptom}>
              <h4>{m.symptom}</h4>
              <p>{m.explanation}</p>
              <p>
                <strong>Try this:</strong> {m.recovery}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="roux-physical-check">
        <h3>Try it with your cube</h3>
        <ul>
          {detail.physicalChecks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      {detail.referenceIds.length > 0 && (
        <RouxReference engine={engine} ids={detail.referenceIds} />
      )}
    </section>
  );
}
