import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('A verified build commit is required.');
writeFileSync(
  'dist/build-info.json',
  JSON.stringify(
    {
      commit,
      release: 'V1.3 Advanced CFOP preview',
      teachingStatus: { lbl: 'accepted', 'cfop-beginner': 'accepted', 'cfop-advanced': 'preview' },
    },
    null,
    2,
  ) + '\n',
);
