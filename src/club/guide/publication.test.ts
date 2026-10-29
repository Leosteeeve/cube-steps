import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import media from '../../../scripts/tutorial/guide-video.json';
import accepted from '../../../docs/media/editorial-refresh/full-film-manifest.json';
import approval from '../../../docs/media/editorial-refresh/acceptance.json';
import transcript from './video-transcript.json';
import introMedia from '../../../scripts/tutorial/intro-video.json';
import intro from '../../../docs/media/editorial-refresh/short-film-manifest.json';
import introTranscript from './intro-transcript.json';

it('publishes exactly the owner-accepted replacement as a new versioned asset', () => {
  expect(approval).toMatchObject({
    status: 'accepted',
    films: {
      full: { sha256: accepted.sha256, bytes: accepted.bytes },
      short: { sha256: intro.sha256, bytes: intro.bytes },
    },
  });
  expect(media).toEqual({
    url: 'https://github.com/Leosteeeve/cube-steps/releases/download/club-guide-video-v4/club-guide-video-v4.mp4',
    bytes: accepted.bytes,
    sha256: accepted.sha256,
  });
  expect(readFileSync(new URL('./GuideVideo.tsx', import.meta.url), 'utf8')).toContain(
    'club-guide-video-v4.mp4',
  );
});

it('publishes the accepted short film and its complete prompts', () => {
  expect(introMedia).toEqual({
    url: 'https://github.com/Leosteeeve/cube-steps/releases/download/club-guide-video-v4/club-intro-video-v2.mp4',
    bytes: intro.bytes,
    sha256: intro.sha256,
  });
  expect(introTranscript).toEqual(intro.prompts);
  expect(readFileSync(new URL('./GuideVideo.tsx', import.meta.url), 'utf8')).toContain(
    'club-intro-video-v2.mp4',
  );
});

it('keeps the written on-screen guide synchronized with accepted prompts and the private closing', () => {
  expect(transcript.map((segment) => segment.start)).toEqual(
    accepted.prompts.map((prompt) => prompt.start),
  );
  for (const prompt of accepted.prompts) {
    expect(transcript.find((segment) => segment.start === prompt.start)?.text).toContain(
      prompt.text,
    );
  }
  expect(transcript.at(-1)?.text).toContain('Full guide: open Guide');
  expect(transcript.at(-1)?.text).not.toMatch(/leosteeeve|github\.io/i);
  expect(transcript.some((segment) => /Preview/.test(segment.text))).toBe(true);
  expect(transcript.some((segment) => /experimental/i.test(segment.text))).toBe(true);
});
