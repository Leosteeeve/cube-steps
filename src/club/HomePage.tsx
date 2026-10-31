import { HeroCube } from './hero/HeroCube';
import { ProgressStatus } from './learning/use-club-progress';
import { useGuidanceTarget } from '../ui/guidance';
import { SectionReveal } from './components/SectionReveal';

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
            Webb Cubing Club <span aria-hidden="true"> / </span> A student-led club at Webb
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
            Learn your first solve, share a different approach, or practice for a faster time.
            There’s room to start wherever you are.
          </p>
          <div className="club-actions">
            <a ref={start} className="club-primary" href={resumeHref ?? '#/find-your-route'}>
              {resumeHref ? 'Resume learning' : 'Find my starting point'}{' '}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
      <SectionReveal
        as="section"
        className="club-practice-spread club-container"
        aria-label="Inside the club"
      >
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
          <p className="club-kicker">Beyond the screen</p>
          <h2>
            Bring a cube.
            <br />
            Work it out together.
          </h2>
          <p>
            Our online practice space supports learning in club and at home. Bring a question, try a
            move, and share what clicks.
          </p>
          <dl className="club-how-it-works">
            <div>
              <dt>Learn</dt>
              <dd>Take turns explaining a tricky step.</dd>
            </div>
            <div>
              <dt>Compare</dt>
              <dd>Try two ways to solve the same pieces.</dd>
            </div>
            <div>
              <dt>Practice</dt>
              <dd>Pick up a lesson or time a few solves at home.</dd>
            </div>
          </dl>
          <ProgressStatus />
        </div>
      </SectionReveal>
      <SectionReveal
        as="section"
        className="club-pathways club-container"
        aria-labelledby="club-pathways-title"
      >
        <div className="club-section-heading">
          <div>
            <p className="club-kicker">Find your way in</p>
            <h2 id="club-pathways-title">Start where you are.</h2>
          </div>
          <a className="club-text-link" href="#/find-your-route">
            Not sure? Take the short quiz <span aria-hidden="true">↗</span>
          </a>
        </div>
        <ol className="club-path-list">
          <li className="club-path-row">
            <span className="club-path-index" aria-hidden="true">
              01
            </span>
            <h3>I’m learning my first solve.</h3>
            <p>Learn the notation, then build your first solve layer by layer.</p>
            <div className="club-path-action">
              <a ref={learn} className="club-text-link" href="#/learn/notation">
                Start with the basics <span aria-hidden="true">→</span>
              </a>
            </div>
          </li>
          <li className="club-path-row">
            <span className="club-path-index" aria-hidden="true">
              02
            </span>
            <h3>I can solve. Help me improve.</h3>
            <p>
              Learn more efficient moves: pair corners and edges with CFOP, or build blocks with
              Roux.
            </p>
            <div className="club-path-action">
              <a className="club-text-link" href="#/learn/cfop/intro">
                Learn CFOP <span aria-hidden="true">→</span>
              </a>
              <a className="club-text-link" href="#/learn/roux/intro">
                Learn Roux <span aria-hidden="true">→</span>
              </a>
            </div>
          </li>
          <li className="club-path-row">
            <span className="club-path-index" aria-hidden="true">
              03
            </span>
            <h3>I want focused practice.</h3>
            <p>Train case recognition, or work on Roux’s last-layer corners (CMLL).</p>
            <div className="club-path-action">
              <a className="club-text-link" href="#/practice">
                Recognition practice <span aria-hidden="true">→</span>
              </a>
              <a className="club-text-link" href="#/cmll-practice">
                CMLL practice <span aria-hidden="true">→</span>
              </a>
            </div>
          </li>
        </ol>
        <div className="club-lab-note">
          <p>
            <span className="club-inline-status">Experimental</span> Want to inspect a solve in
            detail? Compare generated routes and explore decisions in the Labs.
          </p>
          <div className="club-lab-links">
            <a className="club-text-link" href="#/lab">
              CFOP Lab <span aria-hidden="true">↗</span>
            </a>
            <a className="club-text-link" href="#/roux-lab">
              Roux Lab <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </SectionReveal>
      <SectionReveal as="section" className="club-tool-shelf" aria-labelledby="club-tools-title">
        <div className="club-container club-tool-layout">
          <div>
            <p className="club-kicker">The CubeSteps tools</p>
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
      </SectionReveal>
      <div ref={help} className="club-help-note club-container">
        <p>
          <strong>Need a hand getting started?</strong> Open Page tour for a short introduction,
          with Skip and Exit always available.
        </p>
        <a className="club-text-link" href="#/guide">
          Watch the website guide <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
