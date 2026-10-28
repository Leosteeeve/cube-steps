import { HeroCube } from './hero/HeroCube';
import { ProgressStatus } from './learning/use-club-progress';
import { useGuidanceTarget } from '../ui/guidance';

export function HomePage({ resumeHref }: { resumeHref?: string }) {
  const start = useGuidanceTarget('home.start'),
    learn = useGuidanceTarget('home.learn'),
    moves = useGuidanceTarget('home.moves'),
    timer = useGuidanceTarget('home.timer'),
    help = useGuidanceTarget('home.help');
  return (
    <div className="club-home">
      <section className="club-opening club-container" aria-labelledby="club-welcome-title">
        <div className="club-masthead">
          <p className="club-kicker">
            Webb Cubing Club <span aria-hidden="true"> / </span> Learn, practice, repeat.
          </p>
          <span className="club-facelets" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <h1 id="club-welcome-title">
          Pick up <span>a cube.</span>
        </h1>
        <div className="club-opening-bottom">
          <p className="club-intro">
            Your first solve. A move that finally makes sense. A few more tries before you put it
            down.
          </p>
          <div className="club-actions">
            <a ref={start} className="club-primary" href={resumeHref ?? '#/find-your-route'}>
              {resumeHref ? 'Resume learning' : 'Find my starting point'}{' '}
              <span aria-hidden="true">↗</span>
            </a>
            <a ref={learn} className="club-text-link" href="#/learn/notation">
              Start with the basics <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>
      <section className="club-practice-spread club-container" aria-label="Inside the club">
        <div className="club-cube-study">
          <div className="club-study-caption">
            <span>01 — The familiar 3 × 3</span>
            <span className="club-notation" aria-hidden="true">
              U · U′
            </span>
          </div>
          <HeroCube />
          <p>Same cube. A different way to see it.</p>
        </div>
        <div className="club-start-here">
          <p className="club-kicker">A student-led cubing club</p>
          <h2>
            Figure it out.
            <br />
            One turn at a time.
          </h2>
          <p>
            Follow the cube on screen, try the move in your hands, and come back to the parts that
            need another look.
          </p>
          <dl className="club-how-it-works">
            <div>
              <dt>See it</dt>
              <dd>Watch a move from every angle.</dd>
            </div>
            <div>
              <dt>Try it</dt>
              <dd>Work through a solve, step by step.</dd>
            </div>
            <div>
              <dt>Keep at it</dt>
              <dd>Save your place. Practice at your pace.</dd>
            </div>
          </dl>
          <ProgressStatus />
        </div>
      </section>
      <section className="club-pathways club-container" aria-labelledby="club-pathways-title">
        <div className="club-section-heading">
          <div>
            <p className="club-kicker">Find your way in</p>
            <h2 id="club-pathways-title">Start where you are.</h2>
          </div>
          <a className="club-text-link" href="#/find-your-route">
            Not sure? Take the short quiz <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="club-path-list">
          <a href="#/learn/notation">
            <span className="club-path-index">01</span>
            <h3>I’m new to this.</h3>
            <p>Learn the notation, then build your first solve layer by layer.</p>
            <span className="club-path-action">
              First-solve lessons <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a href="#/find-your-route">
            <span className="club-path-index">02</span>
            <h3>I can solve. What’s next?</h3>
            <p>Find a learning path that fits how you like to think and practice.</p>
            <span className="club-path-action">
              Find your route <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a href="#/lab">
            <span className="club-path-index">03</span>
            <h3>I want to look closer.</h3>
            <p>Compare CFOP solves, inspect decisions, and keep a practice notebook.</p>
            <span className="club-path-action">
              Explore the Lab <span className="club-inline-status">Experimental</span>
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        </div>
      </section>
      <section className="club-tool-shelf" aria-labelledby="club-tools-title">
        <div className="club-container club-tool-layout">
          <div>
            <p className="club-kicker">For the next scramble</p>
            <h2 id="club-tools-title">
              A little practice
              <br />
              goes a long way.
            </h2>
            <p>No account needed. Your learning progress and timer history stay in this browser.</p>
          </div>
          <div className="club-tool-list">
            <a ref={moves} href="#/moves">
              <span className="club-tool-symbol" aria-hidden="true">
                R′
              </span>
              <div>
                <h3>Move Explorer</h3>
                <p>A letter, a face, a turn. Watch how they connect.</p>
              </div>
              <span aria-hidden="true">↗</span>
            </a>
            <a ref={timer} href="#/timer">
              <span className="club-tool-symbol" aria-hidden="true">
                :00
              </span>
              <div>
                <h3>Practice timer</h3>
                <p>Generate a scramble. Time a solve. Review your own history.</p>
              </div>
              <span aria-hidden="true">↗</span>
            </a>
            <a href="#/algorithms">
              <span className="club-tool-symbol" aria-hidden="true">
                [ ]
              </span>
              <div>
                <h3>Algorithm library</h3>
                <p>Look up a case and follow the sequence on the cube.</p>
              </div>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
      <div ref={help} className="club-help-note club-container">
        <p>
          <strong>A hand getting started?</strong> Open Page tour for a short introduction, with
          Skip and Exit always available.
        </p>
        <a className="club-text-link" href="#/guide">
          Watch the website guide <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
