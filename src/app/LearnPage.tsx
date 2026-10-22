import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useGuidanceScope, useGuidanceTarget } from '../ui/guidance';
import type { CubeEngine, SolveSession, StageId, MethodId } from '../core/types';
import { getCourse } from '../content/courses';
import {
  CFOP_NOTATION,
  ADVANCED_NOTATION,
  HOLDING_BASICS,
  NOTATION_FACES,
} from '../content/notation-lesson';
import { LBL_ALGORITHMS } from '../methods/lbl/catalog';
import { CubePlayer } from '../player/CubePlayer';
import { createSolveClient } from './solve-client';
import { LessonLayout } from './LessonLayout';
import { getMethod } from '../methods/registry';
import { MethodSelector } from './MethodSelector';
import { CaseSelector } from './CaseSelector';
import { methodRoute, lessonRoute } from './routes';
import { ALGORITHM_REGISTRY } from '../algorithms/registry';
import { useEdition } from './edition';
import { FaceOverview } from './color-entry/FaceOverview';
const RouxLessonDetails = lazy(() =>
  import('../club/roux/RouxLessonDetails').then((m) => ({ default: m.RouxLessonDetails })),
);
export function LearnPage({
  engine,
  lessonId,
  method = 'lbl',
  footer,
  presentation: layoutPresentation,
}: {
  engine: CubeEngine;
  lessonId: string;
  method?: MethodId;
  footer?: ReactNode;
  presentation?: 'club';
}) {
  const edition = useEdition();
  const course = getCourse(method),
    presentation = getMethod(method);
  const lesson = course.find((l) => l.id === lessonId) ?? course[0],
    client = useMemo(() => createSolveClient(undefined, edition), [edition]);
  const [loaded, setLoaded] = useState<{ key: string; session: SolveSession } | null>(null),
    [error, setError] = useState(''),
    [selectedCase, setSelectedCase] = useState('guided');
  const example = lesson.examples?.find((e) => e.id === selectedCase),
    exampleScramble = example?.scramble ?? lesson.exampleScramble;
  const exampleInput = example?.input;
  const selectionKey = `${method}/${lesson.id}/${example?.id ?? 'guided'}`;
  const notesTarget = useGuidanceTarget('lesson.notes'),
    notes = useRef<HTMLDetailsElement | null>(null);
  const notesRef = useCallback(
    (node: HTMLDetailsElement | null) => {
      notes.current = node;
      return notesTarget(node);
    },
    [notesTarget],
  );
  useGuidanceScope(
    'lesson-notes',
    useCallback(() => {
      const node = notes.current,
        saved = node?.open;
      let live = true;
      if (node) node.open = true;
      return {
        restore() {
          if (live && node?.isConnected) node.open = saved ?? false;
        },
        dispose() {
          live = false;
        },
      };
    }, [selectionKey]),
  );
  const session = loaded?.key === selectionKey ? loaded.session : null;
  const lessonLink = (id: string) => lessonRoute(method, id);
  useEffect(() => {
    let live = true;
    setLoaded(null);
    setError('');
    if (lesson.stageId)
      void (
        exampleInput?.kind === 'facelets'
          ? client.solveFacelets(exampleInput.facelets, method)
          : client.solveScramble(
              exampleInput?.kind === 'scramble' ? exampleInput.moves.join(' ') : exampleScramble,
              method,
            )
      ).then((result) => {
        if (!live) return;
        if (result.ok) setLoaded({ key: selectionKey, session: result.session });
        else if (result.error.kind !== 'cancelled') setError(result.error.message);
      });
    return () => {
      live = false;
      client.cancel();
    };
  }, [client, lesson.id, selectionKey, exampleScramble, exampleInput, method]);
  return (
    <LessonLayout selected={lesson.id} method={method} presentation={layoutPresentation}>
      <MethodSelector method={method} kind="learn" />
      <div className="lesson-heading">
        <span className="eyebrow">
          {lesson.stageId
            ? `LESSON ${course.indexOf(lesson) + (method === 'roux-beginner' ? 1 : 0)} / ${presentation.stages.length}`
            : 'BEFORE YOU BEGIN'}
        </span>
        <h1>{lesson.title}</h1>
        <p>{lesson.goal}</p>
      </div>
      {!lesson.stageId ? (
        <section ref={notesTarget} className="notation-content">
          <div className="notation-intro">
            <span className="big-cube-mark" aria-hidden="true">
              ◈
            </span>
            <div>
              <h2>
                {method === 'lbl'
                  ? 'Six faces. A simple language.'
                  : 'Four phases. One clear path.'}
              </h2>
              <p>
                {method === 'lbl'
                  ? 'You do not need to memorize a long solution. Learn a few small patterns, recognize when they fit, and take one move at a time.'
                  : lesson.observe}
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
          {layoutPresentation === 'club' && (
            <p className="notation-explorer-link">
              <a href="#/moves">Explore moves in 3D</a> — see each letter turn, then try it in your
              hands.
            </p>
          )}
          <div className="notation-rules">
            {(method === 'lbl' ? HOLDING_BASICS : [...HOLDING_BASICS, lesson.check]).map(
              (text, i) => (
                <div key={text}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <p>{text}</p>
                </div>
              ),
            )}
          </div>
          {method !== 'lbl' && (
            <div className="notation-example">
              <span className="eyebrow">BEFORE THE LAST LAYER</span>
              <h2>
                {method === 'cfop-advanced'
                  ? 'Wide turns, slice turns and AUF.'
                  : 'M turns and AUF.'}
              </h2>
              {(method === 'cfop-advanced'
                ? [...ADVANCED_NOTATION, CFOP_NOTATION[1]]
                : CFOP_NOTATION
              ).map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          )}
          <div className="notation-example">
            <span className="eyebrow">YOUR FIRST PATTERN</span>
            <h2>{method === 'lbl' ? 'Meet the right-hand trigger.' : 'Keep the pair together.'}</h2>
            <code>
              {(method === 'lbl'
                ? LBL_ALGORITHMS['right-trigger']
                : presentation.algorithms[
                    method === 'cfop-advanced' ? 'f2l-01/main/fr' : 'f2l-right-toward'
                  ]
              ).moves.join(' ')}
            </code>
            <p>
              {method === 'lbl' ? (
                <>
                  Right clockwise. Up clockwise. Right back. Up back.
                  <br />
                  You will use this same pattern throughout the course.
                </>
              ) : (
                'This right-side insertion opens the slot, moves a correctly connected pair into it, and closes the slot. First recognize the pair and follow its setup; a formula belongs to a specific arrangement.'
              )}
            </p>
          </div>
          {method !== 'lbl' && <p className="notice">{lesson.tip}</p>}
          <a className="primary-link" href={lessonLink(presentation.stages[0].id)}>
            Start with the white cross <span>→</span>
          </a>
        </section>
      ) : (
        <>
          {lesson.examples && (
            <CaseSelector
              examples={lesson.examples}
              value={example?.id ?? 'guided'}
              onChange={(id) => {
                client.cancel();
                setLoaded(null);
                setError('');
                setSelectedCase(id);
              }}
            />
          )}
          {example && (
            <p className="notice" data-case-id={example.id}>
              Case: {example.title}{' '}
              {method === 'roux-beginner'
                ? 'The player starts at this stage in the verified solve.'
                : 'The player starts at the first matching action in this verified solve.'}
            </p>
          )}
          {method === 'roux-beginner' ? (
            <div ref={notesTarget}>
              <Suspense fallback={<p role="status">Loading the detailed Roux lesson…</p>}>
                <RouxLessonDetails engine={engine} lessonId={lesson.id} />
              </Suspense>
            </div>
          ) : (
            <details ref={notesRef} className="lesson-notes">
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
                  <strong>{presentation.algorithms[id].name}</strong>
                  <code>{presentation.algorithms[id].moves.join(' ')}</code>
                  {ALGORITHM_REGISTRY.variants[id] && (
                    <a href={'#/algorithms/' + ALGORITHM_REGISTRY.variants[id].caseId}>
                      Explore this case →
                    </a>
                  )}
                </p>
              ))}
            </details>
          )}
          <details className="scramble-details">
            <summary>
              Follow along with a physical cube{' '}
              <span>
                {exampleInput?.kind === 'facelets'
                  ? 'View example colors'
                  : 'View example scramble'}
              </span>
            </summary>
            {exampleInput?.kind === 'facelets' ? (
              <>
                <p>
                  This case uses a legal color snapshot in the input hold: white up, green front.
                  Use the diagram to identify the example; to follow your own physical cube, enter
                  its colors in Solve your cube.
                </p>
                <FaceOverview facelets={exampleInput.facelets} />
              </>
            ) : (
              <>
                <p>Start solved with white up and green front, then apply:</p>
                <code>{exampleScramble}</code>
              </>
            )}
            <p>
              {example && !exampleInput
                ? 'This selected case uses its own example scramble. '
                : 'The full guided example follows one complete solve. '}
              For a later stage or case, finish all earlier moves first. A jump changes the
              on-screen cube instantly; it does not turn your physical cube.
            </p>
          </details>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {session ? (
            <CubePlayer
              key={selectionKey}
              engine={engine}
              session={session}
              stage={lesson.stageId as StageId}
              caseId={example?.expectedCaseId}
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
            {course[course.indexOf(lesson) + 1] ? (
              <a href={lessonLink(course[course.indexOf(lesson) + 1].id)}>Next lesson →</a>
            ) : (
              <a href={methodRoute(method, 'solve')}>Try your own scramble →</a>
            )}
          </div>
        </>
      )}
      {footer}
    </LessonLayout>
  );
}
