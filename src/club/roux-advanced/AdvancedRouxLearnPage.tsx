import { useEffect, useMemo, useState } from 'react';
import type { CubeEngine, StageId } from '../../core/types';
import { ADVANCED_ROUX_COURSE, ADVANCED_ROUX_DETAILS } from '../../content/roux-advanced-course';
import { createRouxLessonDemonstration } from '../../content/roux-advanced/examples';
import { advancedRouxExampleDiagram } from '../../content/roux-advanced/diagrams';
import { LessonLayout } from '../../app/LessonLayout';
import { MethodSelector } from '../../app/MethodSelector';
import { lessonRoute } from '../../app/routes';
import { PlaybackView } from '../../player/PlaybackView';
import { RouxCaseDiagram } from '../roux/RouxCaseDiagram';
import { useClubProgress, ProgressStatus } from '../learning/use-club-progress';
import { useGuidanceTarget } from '../../ui/guidance';
import { TourEntry } from '../tutorial/TourEntry';
export function AdvancedRouxLearnPage({
  engine,
  lessonId,
}: {
  engine: CubeEngine;
  lessonId: string;
}) {
  const lesson = ADVANCED_ROUX_COURSE.find((l) => l.id === lessonId)!,
    detail = ADVANCED_ROUX_DETAILS[lessonId],
    index = ADVANCED_ROUX_COURSE.indexOf(lesson);
  const [selected, setSelected] = useState(detail.workedExamples[0].id),
    [section, setSection] = useState<StageId>(),
    [request, setRequest] = useState(0);
  const example = detail.workedExamples.find((e) => e.id === selected) ?? detail.workedExamples[0];
  const source = useMemo(() => createRouxLessonDemonstration(engine, example), [engine, example]),
    diagram = useMemo(() => advancedRouxExampleDiagram(engine, example), [engine, example]);
  const { progress, visitLesson, setPracticed } = useClubProgress();
  const headingTarget = useGuidanceTarget('advanced-roux.heading'),
    exampleTarget = useGuidanceTarget('advanced-roux.example');
  useEffect(() => visitLesson('roux-advanced', lessonId), [visitLesson, lessonId]);
  return (
    <LessonLayout method="roux-advanced" selected={lessonId} presentation="club">
      <MethodSelector method="roux-advanced" kind="learn" />
      <TourEntry tourId="advanced-roux" />
      <article className="advanced-roux-lesson">
        <div className="lesson-heading" ref={headingTarget}>
          <span className="eyebrow">CHAPTER {index + 1} / 9 · ADVANCED ROUX</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.goal}</p>
        </div>
        <p className="lesson-overview">{detail.overview}</p>
        {lessonId === 'intro' && (
          <p>
            <a href="#/learn/roux/intro">Review Beginner Roux</a> ·{' '}
            <a href="#/moves">Practice M / M′ in Moves</a>
          </p>
        )}
        <div className="roux-four-steps">
          {[
            ['Observe', lesson.observe],
            ['Prepare', lesson.prepare],
            ['Check', lesson.check],
            ['Practice', lesson.tip],
          ].map(([title, text]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </section>
          ))}
        </div>
        <section aria-label="Worked example" ref={exampleTarget}>
          <h2>Try it with your cube</h2>
          <label className="cmll-control">
            Worked example
            <select
              value={example.id}
              onChange={(e) => {
                setSelected(e.target.value);
                setSection(undefined);
              }}
            >
              {detail.workedExamples.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
          <p>{example.recognition}</p>
          <p>
            <strong>Physical hold:</strong> {example.frameId.split('-')[0]} bottom,{' '}
            {example.frameId.split('-')[1]} left.
          </p>
          <details>
            <summary>Practice setup from a solved cube</summary>
            <p>
              Start solved with white up and green front. Execute this setup, including its physical
              rotations. This is a teaching setup; the free solver accepts outer-face scramble
              notation.
            </p>
            <code className="cmll-formula">{example.setup.join(' ')}</code>
          </details>
          <div className="advanced-example-diagram">
            <RouxCaseDiagram model={diagram} label={example.title} />
          </div>
          {example.eolrBoundary !== undefined && (
            <div className="cmll-controls">
              <button
                onClick={() => {
                  setSection('ar-eolr');
                  setRequest((n) => n + 1);
                }}
              >
                EOLR start
              </button>
              <button
                onClick={() => {
                  setSection('ar-last-four');
                  setRequest((n) => n + 1);
                }}
              >
                Last four
              </button>
              <span>
                {example.eolrBoundary} + {example.moves.length - example.eolrBoundary} slice turns
                in this example.
              </span>
            </div>
          )}
          <PlaybackView
            engine={engine}
            source={source}
            section={section}
            sectionRequestId={request}
          />
        </section>
        <section className="advanced-checks">
          <h2>Check with your hands</h2>
          <ul>
            {detail.physicalChecks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <h2>If it does not match</h2>
          {detail.mistakes.map((m) => (
            <article key={m.symptom}>
              <h3>{m.symptom}</h3>
              <p>{m.explanation}</p>
              <p>{m.recovery}</p>
            </article>
          ))}
        </section>
        {lessonId === 'ar-cmll' && (
          <p>
            <a href="#/cmll">Browse all 42 CMLL cases and sources</a> ·{' '}
            <a href="#/cmll-practice">Practice a small selection</a>
          </p>
        )}
        {lessonId === 'practice-compare' && (
          <p>
            Roux Test Lab lets you pin routes and record two-block trials. Treat its execution model
            as a hypothesis to compare in your own hands.
          </p>
        )}
        <section className="club-lesson-progress">
          <label>
            <input
              type="checkbox"
              checked={progress.practiced['roux-advanced']?.includes(lessonId) ?? false}
              onChange={(e) => setPracticed('roux-advanced', lessonId, e.target.checked)}
            />
            Mark as practiced
          </label>
          <p>This is your own practice record, not a test of mastery.</p>
          <ProgressStatus />
        </section>
        <nav className="cmll-controls" aria-label="Chapter navigation">
          {index > 0 && (
            <a href={lessonRoute('roux-advanced', ADVANCED_ROUX_COURSE[index - 1].id)}>
              ← {ADVANCED_ROUX_COURSE[index - 1].shortTitle}
            </a>
          )}
          {index < 8 && (
            <a href={lessonRoute('roux-advanced', ADVANCED_ROUX_COURSE[index + 1].id)}>
              {ADVANCED_ROUX_COURSE[index + 1].shortTitle} →
            </a>
          )}
          <a href="#/solve/advanced-roux">Solve your own cube</a>
        </nav>
      </article>
    </LessonLayout>
  );
}
