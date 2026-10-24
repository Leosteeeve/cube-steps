import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import media from '../../../scripts/tutorial/guide-video.json';
import accepted from '../../../docs/media/roux-refresh/film-manifest.json';
import approval from '../../../docs/media/roux-refresh/acceptance.json';
import transcript from './video-transcript.json';

it('publishes exactly the owner-accepted replacement as a new immutable asset', () => {
  expect(approval).toMatchObject({
    status: 'accepted',
    sha256: accepted.sha256,
    bytes: accepted.bytes,
  });
  expect(media).toEqual({
    url: 'https://github.com/Leosteeeve/cube-steps/releases/download/club-guide-video-v3/club-guide-video-v3.mp4',
    bytes: accepted.bytes,
    sha256: accepted.sha256,
  });
  expect(readFileSync(new URL('./GuideVideo.tsx', import.meta.url), 'utf8')).toContain(
    'club-guide-video-v3.mp4',
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
  expect(transcript.find((segment) => segment.start === 228)?.text).toContain('Preview');
  expect(transcript.find((segment) => segment.start === 248)?.text).toContain('EXPERIMENTAL');
});
