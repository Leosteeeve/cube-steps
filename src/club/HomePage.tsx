import { ProgressStatus } from './learning/use-club-progress';
function DecorativeCube() {
  const faces = [
    { origin: [68, 128], u: [164, 52], v: [0, 181], fill: '#2869CA' },
    { origin: [232, 180], u: [101, -57], v: [0, 181], fill: '#174C94' },
    { origin: [68, 128], u: [101, -57], v: [164, 52], fill: '#F8FBFF' },
  ];
  return (
    <div className="club-hero-art" aria-hidden="true">
      <div className="club-orbit" />
      <svg viewBox="0 0 410 420">
        <g stroke="#08264A" strokeWidth="3" strokeLinejoin="round">
          {faces.flatMap((f, k) =>
            Array.from({ length: 9 }, (_, i) => {
              const point = (x: number, y: number) =>
                [f.origin[0] + f.u[0] * x + f.v[0] * y, f.origin[1] + f.u[1] * x + f.v[1] * y].join(
                  ',',
                );
              const x = (i % 3) / 3,
                y = Math.floor(i / 3) / 3;
              return (
                <polygon
                  key={k + '-' + i}
                  points={[
                    point(x + 0.009, y + 0.009),
                    point(x + 1 / 3 - 0.009, y + 0.009),
                    point(x + 1 / 3 - 0.009, y + 1 / 3 - 0.009),
                    point(x + 0.009, y + 1 / 3 - 0.009),
                  ].join(' ')}
                  fill={k === 0 && i % 3 === 1 ? '#75A4E7' : f.fill}
                />
              );
            }),
          )}
        </g>
      </svg>
      <span className="club-art-note club-note-top">
        <small>A LITTLE CURIOSITY</small>
        <strong>A whole new skill.</strong>
      </span>
      <span className="club-art-note club-note-bottom">
        <small>YOUR FIRST MILESTONE</small>
        <strong>✦ Build a white daisy</strong>
      </span>
    </div>
  );
}
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
        <DecorativeCube />
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
