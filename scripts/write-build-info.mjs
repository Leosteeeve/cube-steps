import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('A verified build commit is required.');
writeFileSync(
  'dist/build-info.json',
  JSON.stringify(
    {
      commit,
      dirty:
        execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
          encoding: 'utf8',
        }).trim().length > 0,
      release: 'CubeSteps club edition and human-friendly F2L preview',
      entries: { global: './', club: './club/' },
      teachingStatus: {
        lbl: 'accepted',
        'cfop-beginner': 'accepted',
        'cfop-advanced': 'preview',
        'roux-beginner': 'preview',
      },
    },
    null,
    2,
  ) + '\n',
);
