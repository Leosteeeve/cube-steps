import { useEffect } from 'react';
import { GUIDE_CHAPTERS, TOUR_DESTINATIONS } from './chapters';
import type { GuideSectionId, GuideScreenshot } from './types';
import screenshots from './screenshots.json';
import { GuideImage } from './GuideImage';
import { useClubTutorial } from '../tutorial/TutorialProvider';
import './guide.css';
export function GuidePage({ section }: { section?: GuideSectionId }) {
  const tutorial = useClubTutorial();
  useEffect(() => {
    if (!section) return;
    const heading = document.getElementById('guide-' + section);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ block: 'start' });
  }, [section]);
  return (
    <article className="club-guide">
      <header className="guide-heading">
        <p className="club-kicker">YOUR WEBSITE COMPANION</p>
        <h1>
          A little guidance.
          <br />
          <em>A lot to discover.</em>
        </h1>
        <p>Keep your cube nearby. Learn one thing, try it, then come back for the next.</p>
      </header>
      <div className="guide-layout">
        <nav className="guide-index" aria-label="Guide chapters">
          <p>IN THIS GUIDE</p>
          {GUIDE_CHAPTERS.map((c, i) => (
            <a
              key={c.id}
              href={`#/guide/${c.id}`}
              aria-current={section === c.id ? 'location' : undefined}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {c.title}
            </a>
          ))}
        </nav>
        <div className="guide-chapters">
          {GUIDE_CHAPTERS.map((c, i) => (
            <section className="guide-chapter" key={c.id} aria-labelledby={'guide-' + c.id}>
              <p className="club-kicker">
                {String(i + 1).padStart(2, '0')} / {c.id.toUpperCase()}
              </p>
              <h2 id={'guide-' + c.id} tabIndex={-1}>
                {c.title}
              </h2>
              <p className="guide-summary">{c.summary}</p>
              <ol className="guide-steps">
                {c.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <div className="guide-actions">
                {c.href && c.id !== 'help' && (
                  <a className="club-primary" href={c.href}>
                    Open{' '}
                    {c.id === 'start'
                      ? 'Home'
                      : c.id === 'lessons'
                        ? 'Lessons'
                        : c.id === 'solve'
                          ? 'Solve your cube'
                          : c.id === 'algorithms'
                            ? 'Algorithms'
                            : c.id === 'practice'
                              ? 'Practice'
                              : c.id === 'timer'
                                ? 'Timer'
                                : 'Moves'}{' '}
                    →
                  </a>
                )}
              </div>
              {!!c.tourIds.length && (
                <div className="guide-tour-directory" aria-label={`${c.title} tours`}>
                  {c.tourIds.map((id) => {
                    const saved = tutorial.preferences.tours[id],
                      dest = TOUR_DESTINATIONS[id];
                    return (
                      <div key={id}>
                        <strong>{dest.label}</strong>
                        <div>
                          <button
                            onClick={() =>
                              tutorial.openTour(
                                dest.href,
                                id,
                                saved && !saved.completed ? 'resume' : 'start',
                              )
                            }
                          >
                            {saved && !saved.completed ? 'Resume' : 'Start'} {dest.label} tour
                          </button>
                          {saved && (
                            <button onClick={() => tutorial.openTour(dest.href, id, 'restart')}>
                              Restart {dest.label} tour
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {c.screenshotIds.map((id) => {
                const image = (screenshots.images as GuideScreenshot[]).find((s) => s.id === id);
                return image ? <GuideImage key={id} image={image} /> : null;
              })}
              <details className="guide-controls">
                <summary>Every control, explained</summary>
                <dl>
                  {c.controls.map((x) => (
                    <div key={x.name}>
                      <dt>{x.name}</dt>
                      <dd>{x.description}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              {c.id === 'help' && (
                <div className="guide-reset">
                  <button onClick={tutorial.resetPreferences}>Reset tutorial choices</button>
                  <p>
                    This affects only the tours. Your learning progress and Timer history stay as
                    they are.
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
