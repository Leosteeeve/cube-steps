import { HeroCube } from './hero/HeroCube';
import { ProgressStatus } from './learning/use-club-progress';
export function HomePage({ resumeHref }: { resumeHref?: string }) {
  return (
    <div className="club-home">
      <section className="club-hero">
        <div className="club-hero-copy">
          <p className="club-kicker">● A PLACE FOR EVERY FIRST SOLVE</p>
          <h1>
            One turn.
            <br />A new <em>possibility.</em>
          </h1>
          <p className="club-intro">
            Your first solve starts with a little curiosity.
            <br />
            Learn at your pace. Get better together.
          </p>
          <div className="club-actions">
            <a className="club-primary" href={resumeHref ?? '#/find-your-route'}>
              {resumeHref ? 'Resume learning' : 'Find my starting point'}{' '}
              <span aria-hidden="true">↗</span>
            </a>
            <a className="club-secondary" href="#/learn/notation">
              Join a lesson
            </a>
          </div>
          <small>New to cubing? You’re in exactly the right place.</small>
        </div>
        <HeroCube />
      </section>
      <div className="club-home-progress">
        <ProgressStatus />
      </div>
      <section className="club-together">
        <div>
          <small>LEARN IT. PRACTICE IT. SHARE IT.</small>
          <h2>Better, together.</h2>
        </div>
        <p>
          Follow a lesson with the club.
          <br />
          Make it your own at home.
        </p>
        <a href="#/learn/notation">
          Open a club lesson <span aria-hidden="true">↗</span>
        </a>
      </section>
      <section className="club-welcome">
        <div className="club-section-heading">
          <h2>Make yourself at home.</h2>
          <p>
            ONE CLUB.
            <br />
            MANY STARTING POINTS.
          </p>
        </div>
        <div className="club-home-cards">
          <a href="#/find-your-route">
            <small>01 / LEARN</small>
            <span aria-hidden="true">↗</span>
            <h3>Your first solve</h3>
            <p>
              Small lessons. Clear moves.
              <br />A cube you can finally solve.
            </p>
          </a>
          <a href="#/learn/notation">
            <small>02 / TOGETHER</small>
            <span aria-hidden="true">↗</span>
            <h3>Follow a club lesson</h3>
            <p>
              Open your shared lesson and work
              <br />
              through each turn together.
            </p>
          </a>
          <a href="#/timer">
            <small>03 / PRACTICE</small>
            <span aria-hidden="true">↗</span>
            <h3>A little better, each time</h3>
            <p>
              Scramble, time, and see your progress.
              <br />
              Your own space to keep practicing.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
