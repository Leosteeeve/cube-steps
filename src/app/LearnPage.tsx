import { useEffect, useMemo, useState } from 'react';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
import { LBL_COURSE } from '../content/lbl-course';
import { HOLDING_BASICS, NOTATION_FACES } from '../content/notation-lesson';
import { LBL_ALGORITHMS } from '../methods/lbl/catalog';
import { CubePlayer } from '../player/CubePlayer';
import { createSolveClient } from './solve-client';
import { LessonLayout } from './LessonLayout';
export function LearnPage({ engine, lessonId }: { engine: CubeEngine; lessonId: string }) {
  const lesson = LBL_COURSE.find((l) => l.id === lessonId) ?? LBL_COURSE[0],
    client = useMemo(() => createSolveClient(), []);
  const [session, setSession] = useState<SolveSession | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setSession(null);
    setError('');
    if (lesson.stageId)
      void client.solveScramble(lesson.exampleScramble, 'lbl').then((result) => {
        if (!live) return;
        if (result.ok) setSession(result.session);
        else if (result.error.kind !== 'cancelled') setError(result.error.message);
      });
    return () => {
      live = false;
      client.cancel();
    };
  }, [client, lesson.id]);
  return (
    <LessonLayout selected={lesson.id}>
      <div className="lesson-heading">
        <span className="eyebrow">
          {lesson.stageId ? `LESSON ${LBL_COURSE.indexOf(lesson)} / 7` : 'BEFORE YOU BEGIN'}
        </span>
        <h1>{lesson.title}</h1>
        <p>{lesson.goal}</p>
      </div>
      {!lesson.stageId ? (
        <section className="notation-content">
          <div className="notation-intro">
            <span className="big-cube-mark" aria-hidden="true">
              ◈
            </span>
            <div>
              <h2>Six faces. A simple language.</h2>
              <p>
                You do not need to memorize a long solution. Learn a few small patterns, recognize
                when they fit, and take one move at a time.
              </p>
            </div>
          </div>
          <div className="face-grid">
            {NOTATION_FACES.map(([letter, name, description]) => (
              <div className="face-card" key={letter}>
                <strong>{letter}</strong>
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
          <div className="notation-rules">
            {HOLDING_BASICS.map((text, i) => (
              <div key={text}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="notation-example">
            <span className="eyebrow">YOUR FIRST PATTERN</span>
            <h2>Meet the right-hand trigger.</h2>
            <code>{LBL_ALGORITHMS['right-trigger'].moves.join(' ')}</code>
            <p>
              Right clockwise. Up clockwise. Right back. Up back.
              <br />
              You will use this same pattern throughout the course.
            </p>
          </div>
          <a className="primary-link" href="#/learn/white-cross">
            Start with the white cross <span>→</span>
          </a>
        </section>
      ) : (
        <>
          <details className="lesson-notes">
            <summary>
              How this stage works <span>Read before you play</span>
            </summary>
            <div className="notes-grid">
              <div>
                <h3>Recognize</h3>
                <p>{lesson.observe}</p>
              </div>
              <div>
                <h3>Prepare & solve</h3>
                <p>{lesson.prepare}</p>
              </div>
              <div>
                <h3>Check</h3>
                <p>{lesson.check}</p>
              </div>
            </div>
            <p className="lesson-tip">{lesson.tip}</p>
            {lesson.algorithmIds.map((id) => (
              <p className="formula-reference" key={id}>
                <strong>{LBL_ALGORITHMS[id].name}</strong>
                <code>{LBL_ALGORITHMS[id].moves.join(' ')}</code>
              </p>
            ))}
          </details>
          <details className="scramble-details">
            <summary>
              Follow along with a physical cube <span>View example scramble</span>
            </summary>
            <p>Start solved with white up and green front, then apply:</p>
            <code>{lesson.exampleScramble}</code>
            <p>
              This course follows one complete example. For a later lesson, finish the earlier
              stages first. A stage jump changes the on-screen cube instantly; it does not turn your
              physical cube.
            </p>
          </details>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {session ? (
            <CubePlayer
              key={lesson.id}
              engine={engine}
              session={session}
              stage={lesson.stageId as StageId}
            />
          ) : (
            !error && (
              <div className="loading-panel" role="status">
                Preparing your teaching example…
              </div>
            )
          )}
          <div className="lesson-footer">
            <p>
              <strong>Takeaway</strong> {lesson.tip}
            </p>
            {LBL_COURSE[LBL_COURSE.indexOf(lesson) + 1] ? (
              <a href={`#/learn/${LBL_COURSE[LBL_COURSE.indexOf(lesson) + 1].id}`}>Next lesson →</a>
            ) : (
              <a href="#/solve">Try your own scramble →</a>
            )}
          </div>
        </>
      )}
    </LessonLayout>
  );
}
