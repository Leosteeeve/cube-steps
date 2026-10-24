import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import media from '../../../scripts/tutorial/guide-video.json';
it('retains the accepted no-narration film until the replacement receives its own approval', () => {
  expect(media).toMatchObject({
    url: 'https://github.com/Leosteeeve/cube-steps/releases/download/club-guide-video-v2/club-guide-video-v2.mp4',
    bytes: 36235906,
    sha256: 'dbe35d78dedb27d9096f1c4f73938059848a4a16494eb65b74fce3fa5b5567b1',
  });
  expect(readFileSync(new URL('./GuideVideo.tsx', import.meta.url), 'utf8')).toContain(
    'club-guide-video-v2.mp4',
  );
});
