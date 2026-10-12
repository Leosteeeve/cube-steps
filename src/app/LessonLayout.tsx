import type { ReactNode } from 'react';
import { getCourse } from '../content/courses';
import type { StageId, MethodId } from '../core/types';
import { getMethod } from '../methods/registry';
export function LessonLayout({
  selected,
  children,
  free = false,
  onSelect,
  method = 'lbl',
}: {
  selected: string;
  children: ReactNode;
  free?: boolean;
  onSelect?: (id: StageId) => void;
  method?: MethodId;
}) {
  const lessons = free
    ? getMethod(method).stages.map((s) => ({ id: s.id, stageId: s.id, shortTitle: s.label }))
    : getCourse(method);
  return (
    <div className="lesson-layout">
      <nav className="stage-nav" aria-label={free ? 'Solution stages' : 'Learning path'}>
        <div className="nav-heading">
          <span className="eyebrow">{free ? 'YOUR SOLUTION' : 'THE BEGINNER PATH'}</span>
          <h2>{free ? 'Seven clear stages' : 'A little progress.\nEvery step.'}</h2>
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
                  href={`#/learn/${method === 'lbl' ? '' : 'cfop/'}${lesson.id}`}
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
      <div className="lesson-body">{children}</div>
    </div>
  );
}
