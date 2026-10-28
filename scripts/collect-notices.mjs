import { readFileSync, readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd(),
  lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const rows = [],
  missing = [];
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location || entry.dev) continue;
  const directory = path.join(root, location),
    pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const files = readdirSync(directory, { withFileTypes: true }).filter(
    (file) => file.isFile() && /licen[sc]e|^copying|^notice|^copyright/i.test(file.name),
  );
  const slug = `${pkg.name.replace(/[^a-z0-9._-]/gi, '-')}-${pkg.version}`,
    destination = path.join(root, 'public', 'licenses', slug);
  mkdirSync(destination, { recursive: true });
  for (const file of files)
    copyFileSync(path.join(directory, file.name), path.join(destination, file.name));
  const retained = readdirSync(destination).filter((name) =>
    /licen[sc]e|^copying|^notice|^copyright/i.test(name),
  );
  if (!retained.length) missing.push(pkg.name);
  const license =
    typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license ?? 'See package');
  rows.push(
    `| ${pkg.name} | ${pkg.version} | ${license} | ${retained.map((name) => `[${name}](licenses/${slug}/${name})`).join(', ') || `[Package source](https://www.npmjs.com/package/${pkg.name}/v/${pkg.version})`} |`,
  );
}
const dependencyText = `# Third-party notices\n\nCubeSteps original code and documentation use the MIT license. Dependencies retain their own terms. This inventory covers the installed production dependency graph, including type-only packages that may not appear in browser bundles. It is generated from the committed lockfile.\n\ncubing.js is used under its MPL-2.0 option; its alternative GPL text and upstream notices are retained too. Unmodified package source, source maps, and notices are available in the [cubing 0.65.1 distribution](https://www.npmjs.com/package/cubing/v/0.65.1) and [upstream repository](https://github.com/cubing/cubing.js). Run npm ci to obtain exactly the locked dependency sources.\n\nThe beginner teaching route references [J Perm](https://www.jperm.net/3x3). Lesson wording and examples are original; no tutorial media are bundled.\n\n| Package | Version | Declared license | Retained license files |\n| --- | --- | --- | --- |\n${rows.sort().join('\n')}\n`;
const fontText = `
## Club typography

Manrope and IBM Plex Mono are self-hosted Latin WOFF2 subsets from Google Fonts, under the SIL Open Font License 1.1. The deployed site retains the [Manrope license](licenses/club-fonts/Manrope-OFL.txt) and [IBM Plex Mono license](licenses/club-fonts/IBMPlexMono-OFL.txt), including copyright notices. Sources: [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) and [IBM Plex Mono](https://github.com/google/fonts/tree/main/ofl/ibmplexmono). Font requests stay on this site's origin.
`;
const text = dependencyText + fontText;
writeFileSync('public/THIRD_PARTY_NOTICES.md', text);
writeFileSync('THIRD_PARTY_NOTICES.md', text.replaceAll('](licenses/', '](public/licenses/'));
console.log(
  `Retained notices for ${rows.length} production packages. Packages without a license file: ${missing.join(', ') || 'none'}.`,
);
