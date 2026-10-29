import { useState } from 'react';
import transcript from './video-transcript.json';
import introTranscript from './intro-transcript.json';

const media = `${import.meta.env.BASE_URL}club-guide-video/`;

export function GuideVideo() {
  const [film, setFilm] = useState<'full' | 'intro'>('full');
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const intro = film === 'intro';
  const filename = intro ? 'club-intro-video-v2.mp4' : 'club-guide-video-v4.mp4';
  const poster = intro ? 'intro-poster-v2.png' : 'poster-v4.png';
  const title = intro ? '30-second introduction' : '5-minute guide';
  function selectFilm(next: 'full' | 'intro') {
    if (next === film) return;
    setFilm(next);
    setStarted(false);
    setFailed(false);
  }
  return (
    <section className="guide-video" aria-labelledby="guide-video-title">
      <div className="guide-video-heading">
        <p className="club-kicker">WATCH · TRY · COME BACK</p>
        <h2 id="guide-video-title">See the club. Try a step.</h2>
        <p>
          Take a quick look in 30 seconds, or follow the five-minute guide with your cube nearby.
        </p>
      </div>
      <div className="guide-video-choice" role="group" aria-label="Choose a video">
        <button type="button" aria-pressed={intro} onClick={() => selectFilm('intro')}>
          30-second introduction
        </button>
        <button type="button" aria-pressed={!intro} onClick={() => selectFilm('full')}>
          5-minute guide
        </button>
      </div>
      <div className="guide-video-screen">
        {started ? (
          <video
            key={film}
            controls
            autoPlay
            playsInline
            preload="none"
            poster={`${media}${poster}`}
            src={`${media}${filename}`}
            aria-label={`The ${title}, with English on-screen instructions, music${intro ? '' : ' and sound effects'}, and no narration`}
            onError={() => setFailed(true)}
          >
            Your browser cannot play this video. Use the download link below.
          </video>
        ) : (
          <button className="guide-video-play" onClick={() => setStarted(true)}>
            <img src={`${media}${poster}`} alt="" width={1280} height={720} />
            <span>
              <span aria-hidden="true">▶</span> Watch the {title}
            </span>
          </button>
        )}
      </div>
      <div className="guide-video-meta">
        <p>
          {intro
            ? '30 seconds · English on-screen instructions · Music · No narration'
            : '5 minutes · English on-screen instructions · Music & sound effects · No narration'}
        </p>
        <a
          href={`${media}${filename}`}
          download={
            intro ? 'Webb-Cubing-Club-Intro-Editorial.mp4' : 'Webb-Cubing-Club-Guide-Editorial.mp4'
          }
        >
          Download video ({intro ? 2 : 23} MB)
        </a>
      </div>
      <p className="guide-video-credits">
        Music:{' '}
        <a href="https://www.scottbuckley.com.au/library/origami/">Origami — Scott Buckley</a> (
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>). Guide sound effects:{' '}
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
        {(intro ? introTranscript : transcript).map((segment) => (
          <p key={segment.start}>
            <strong>{`${Math.floor(segment.start / 60)}:${String(segment.start % 60).padStart(2, '0')}`}</strong>{' '}
            {segment.text}
          </p>
        ))}
      </details>
    </section>
  );
}
