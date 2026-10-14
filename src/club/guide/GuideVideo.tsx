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
        <p>A gentle tour of Moves, lessons, solving help and Timer. Keep your cube nearby.</p>
      </div>
      <div className="guide-video-screen">
        {started ? (
          <video
            controls
            autoPlay
            playsInline
            preload="none"
            poster={`${media}poster.webp`}
            src={`${media}club-guide-video-v1.mp4`}
            aria-label="The five-minute club website guide, with English narration and captions"
            onError={() => setFailed(true)}
          >
            Your browser cannot play this video. Use the download link below.
          </video>
        ) : (
          <button className="guide-video-play" onClick={() => setStarted(true)}>
            <img src={`${media}poster.webp`} alt="" width={1280} height={720} />
            <span>
              <span aria-hidden="true">▶</span> Watch the 5-minute guide
            </span>
          </button>
        )}
      </div>
      <div className="guide-video-meta">
        <p>5 minutes · English narration & captions · AI narration</p>
        <a href={`${media}club-guide-video-v1.mp4`} download="Webb-Cubing-Club-Guide.mp4">
          Download video (37 MB)
        </a>
      </div>
      {failed && (
        <p role="status">
          The video could not load. Try the download link, or follow the written guide below.
        </p>
      )}
      <details className="guide-video-transcript">
        <summary>Read the video transcript</summary>
        {transcript.map((segment) => (
          <p key={segment.start}>{segment.text}</p>
        ))}
      </details>
    </section>
  );
}
