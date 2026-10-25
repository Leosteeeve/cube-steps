import { useState } from 'react';
import transcript from './video-transcript.json';

const media = `${import.meta.env.BASE_URL}club-guide-video/`;

export function GuideVideo() {
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section className="guide-video" aria-labelledby="guide-video-title">
      <div className="guide-video-heading">
        <p className="club-kicker">WATCH · TRY · COME BACK</p>
        <h2 id="guide-video-title">Your first five minutes.</h2>
        <p>
          Find a learning route, try Moves and lessons, practise with Timer, and discover Roux. Keep
          your cube nearby.
        </p>
      </div>
      <div className="guide-video-screen">
        {started ? (
          <video
            controls
            autoPlay
            playsInline
            preload="none"
            poster={`${media}poster-v3.webp`}
            src={`${media}club-guide-video-v3.mp4`}
            aria-label="The five-minute club website guide, with English on-screen instructions, music and sound effects, and no narration"
            onError={() => setFailed(true)}
          >
            Your browser cannot play this video. Use the download link below.
          </video>
        ) : (
          <button className="guide-video-play" onClick={() => setStarted(true)}>
            <img src={`${media}poster-v3.webp`} alt="" width={1280} height={720} />
            <span>
              <span aria-hidden="true">▶</span> Watch the 5-minute guide
            </span>
          </button>
        )}
      </div>
      <div className="guide-video-meta">
        <p>5 minutes · English on-screen instructions · Music & sound effects · No narration</p>
        <a
          href={`${media}club-guide-video-v3.mp4`}
          download="Webb-Cubing-Club-Guide-Roux-Refresh.mp4"
        >
          Download video (28 MB)
        </a>
      </div>
      <p className="guide-video-credits">
        Music:{' '}
        <a href="https://www.scottbuckley.com.au/library/origami/">Origami — Scott Buckley</a> (
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>). Sound effects:{' '}
        <a href="https://kenney.nl/assets/interface-sounds">Kenney</a> (CC0).{' '}
        <a href={`${media}CREDITS.txt`}>Credits & edits</a>.
      </p>
      {failed && (
        <p role="status">
          The video could not load. Try the download link, or follow the written guide below.
        </p>
      )}
      <details className="guide-video-transcript">
        <summary>Read the on-screen guide</summary>
        {transcript.map((segment) => (
          <p key={segment.start}>
            <strong>{`${Math.floor(segment.start / 60)}:${String(segment.start % 60).padStart(2, '0')}`}</strong>{' '}
            {segment.text}
          </p>
        ))}
      </details>
    </section>
  );
}
