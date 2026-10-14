import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useGuidanceScope, useGuidanceTarget } from '../ui/guidance';
import { getCourse } from '../content/courses';
import type { StageId, MethodId } from '../core/types';
import { getMethod } from '../methods/registry';
import { lessonRoute } from './routes';
export function LessonLayout({
  selected,
  children,
  free = false,
  onSelect,
  method = 'lbl',
  presentation,
}: {
  selected: string;
  children: ReactNode;
  free?: boolean;
  onSelect?: (id: StageId) => void;
  method?: MethodId;
  presentation?: 'club';
}) {
  const [pathOpen, setPathOpen] = useState(
    () => typeof matchMedia !== 'function' || matchMedia('(min-width: 851px)').matches,
  );
  const navTarget = useGuidanceTarget('lesson.navigation'),
    currentOpen = useRef(pathOpen);
  currentOpen.current = pathOpen;
  useGuidanceScope(
    'lesson-path',
    useCallback(() => {
      const saved = currentOpen.current;
      let live = true;
      if (!free) setPathOpen(true);
      return {
        restore() {
          if (live && !free) setPathOpen(saved);
        },
        dispose() {
          live = false;
        },
      };
    }, [free]),
  );
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(min-width: 851px)'),
      change = () => setPathOpen(media.matches);
    change();
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const lessons = free
    ? getMethod(method).stages.map((s) => ({ id: s.id, stageId: s.id, shortTitle: s.label }))
    : getCourse(method);
  const path = (
    <nav
      ref={!free ? navTarget : undefined}
      className="stage-nav"
      aria-label={free ? 'Solution stages' : 'Learning path'}
    >
      <div className="nav-heading">
        <span className="eyebrow">
          {free
            ? 'YOUR SOLUTION'
            : method === 'cfop-advanced'
              ? 'THE ADVANCED PATH'
              : 'THE BEGINNER PATH'}
        </span>
        <h2>
          {free
            ? getMethod(method).stages.length + ' clear stages'
            : 'A little progress.\nEvery step.'}
        </h2>
      </div>
      <ol>
        {lessons.map((lesson, index) => (
          <li key={lesson.id}>
            {free ? (
              <button
                className={selected === lesson.id ? 'stage-link active' : 'stage-link'}
                aria-current={selected === lesson.id ? 'step' : undefined}
                onClick={() => onSelect?.(lesson.stageId!)}
              >
                <span className="stage-index">{String(index + 1).padStart(2, '0')}</span>
                <span>{lesson.shortTitle}</span>
              </button>
            ) : (
              <a
                className={selected === lesson.id ? 'stage-link active' : 'stage-link'}
                href={lessonRoute(method, lesson.id)}
                aria-current={selected === lesson.id ? 'page' : undefined}
              >
                <span className="stage-index">
                  {index === 0 ? '·' : String(index).padStart(2, '0')}
                </span>
                <span>{lesson.shortTitle}</span>
              </a>
            )}
          </li>
        ))}
      </ol>
      <div className="club-note">
        <span aria-hidden="true">✳</span>
        <p>
          Made for the moment
          <br />
          when it finally clicks.
        </p>
        <small>Bring your cube. Take your time.</small>
      </div>
    </nav>
  );
  return (
    <div className={'lesson-layout' + (presentation === 'club' ? ' club-lesson-layout' : '')}>
      <details
        className={'lesson-path' + (presentation === 'club' ? ' club-path' : '')}
        open={pathOpen}
        onToggle={(e) => setPathOpen(e.currentTarget.open)}
      >
        <summary>
          {free ? 'Solution stages' : 'Learning path'}
          <span>
            {lessons.find((lesson) => lesson.id === selected)?.shortTitle ?? 'Choose a lesson'}
          </span>
        </summary>
        {path}
      </details>
      <div className="lesson-body">{children}</div>
    </div>
  );
}
