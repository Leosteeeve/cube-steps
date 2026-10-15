import { chromium, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyGuideManifest } from './capture-contract.mts';
import { prepareTutorialScene, renderTutorialFrame } from './capture-fixtures.mts';
import type { GuideScreenshot } from '../../src/club/guide/types.ts';
export type CaptureScenario = {
  id: string;
  route: string;
  viewport: { width: number; height: number };
  prepare(page: Page): Promise<void>;
  ready(page: Page): Promise<void>;
  target?: string;
  exampleData: boolean;
};
const desktop = { width: 1360, height: 1000 },
  phone = { width: 390, height: 844 };
const scenes: (CaptureScenario & { caption: string; alt: string })[] = [
  {
    id: 'lab-analyze',
    route: 'club/#/lab',
    target: '.lab-workspace',
    exampleData: true,
    caption:
      'Example analysis: a verified recommendation, exact cross references and pinned playback. Handling scores remain estimates.',
    alt: 'CFOP Lab example showing input colors, a route recommendation and physical cube playback',
    prepare: (p: Page) => prepareTutorialScene(p, 'lab-analyze'),
  },
  {
    id: 'lab-compare',
    route: 'club/#/lab',
    target: '.lab-workspace',
    exampleData: true,
    caption:
      'Example comparison: two routes for the same cube, with move counts, estimated handling and actual holds.',
    alt: 'CFOP Lab example comparison table and pinned route player',
    prepare: (p: Page) => prepareTutorialScene(p, 'lab-compare'),
  },
  {
    id: 'home',
    route: 'club/',
    target: '.club-hero',
    caption: 'Start with a route recommendation, or continue a lesson.',
    alt: 'Club home with learning entry and blue animated cube',
    prepare: (p: Page) => prepareTutorialScene(p, 'home'),
  },
  {
    id: 'quiz',
    route: 'club/#/find-your-route',
    target: '.club-quiz',
    caption: 'Choose the answer that fits today; there is no score.',
    alt: 'First question in the route recommendation',
    prepare: (p: Page) => prepareTutorialScene(p, 'quiz'),
  },
  {
    id: 'moves',
    route: 'club/#/moves',
    target: '.move-explorer',
    caption: 'U′ turns the upper layer counterclockwise when viewed from above.',
    alt: 'U prime selected with the cube and explanation',
    prepare: (p: Page) => prepareTutorialScene(p, 'moves'),
  },
  {
    id: 'lesson',
    route: 'club/#/learn/white-cross',
    target: '.lesson-layout',
    caption: 'Use one turn at a time and check the physical holding.',
    alt: 'White-cross lesson with player, stage path and explanation',
    prepare: (p: Page) => prepareTutorialScene(p, 'lesson'),
  },
  {
    id: 'solve',
    route: 'club/#/solve',
    target: 'main',
    caption: 'A verified solution retains the input that produced it.',
    alt: 'Scramble input with an explained LBL solution',
    prepare: (p: Page) => prepareTutorialScene(p, 'solve'),
  },
  {
    id: 'colors',
    route: 'club/#/solve',
    target: '.color-entry',
    caption: 'Copy each face using its holding guide, then check your colors.',
    alt: 'Six-face color entry with paint palette and face holding guide',
    prepare: async (p: Page) => {
      await prepareTutorialScene(p, 'quiz');
      await p.getByRole('button', { name: 'Enter colors', exact: true }).click();
      await p.getByRole('button', { name: 'Green', exact: true }).click();
      await p.getByRole('button', { name: /^Front, row 1, column 1,/ }).click();
    },
  },
  {
    id: 'algorithms',
    route: 'club/#/algorithms',
    target: '.algorithm-library',
    caption: 'Filter the library to a small set before choosing practice cases.',
    alt: 'Algorithm library filtered to OLL 20',
    prepare: (p: Page) => prepareTutorialScene(p, 'algorithms'),
  },
  {
    id: 'algorithm',
    route: 'club/#/algorithms/oll-20',
    target: '.case-detail-intro',
    caption: 'Read the holding and formula segments before copying a case.',
    alt: 'OLL 20 recognition diagram and formula segments',
    prepare: async (p: Page) => {
      await prepareTutorialScene(p, 'quiz');
      await expect(p.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
      await renderTutorialFrame(p);
    },
  },
  {
    id: 'practice',
    route: 'club/#/practice',
    target: '.practice-exercise',
    caption: 'Identify the case before revealing the answer.',
    alt: 'Unrevealed recognition exercise with setup instructions',
    prepare: (p: Page) => prepareTutorialScene(p, 'practice'),
  },
  {
    id: 'timer',
    route: 'club/#/timer',
    target: '.timer-workspace',
    exampleData: true,
    caption: 'Example session: the scramble, timing surface and matching six-face diagram.',
    alt: 'Timer surface and scramble net labeled as an example session',
    prepare: (p: Page) => prepareTutorialScene(p, 'timer'),
  },
  {
    id: 'timer-history',
    route: 'club/#/timer',
    target: '.timer-bottom-grid',
    exampleData: true,
    caption: 'Example results: inspect trends and correct individual attempts.',
    alt: 'Example session history and trend with twelve sample results',
    prepare: (p: Page) => prepareTutorialScene(p, 'timer'),
  },
  {
    id: 'tour',
    route: 'club/',
    caption: 'Page tours focus on one control and always offer Skip and Exit.',
    alt: 'Home page with an opt-in tutorial bubble',
    prepare: async (p: Page) => {
      await prepareTutorialScene(p, 'home');
      await p.getByRole('button', { name: 'Page tour', exact: true }).click();
      await expect(p.getByRole('dialog')).toBeVisible();
    },
  },
].map((s) => ({
  ...s,
  viewport: desktop,
  exampleData: s.exampleData ?? false,
  ready: async (p: Page) => {
    if (s.target) await expect(p.locator(s.target)).toBeVisible();
  },
}));
for (const id of ['home', 'moves', 'timer']) {
  const original = scenes.find((s) => s.id === id)!;
  scenes.push({
    ...original,
    id: id + '-phone',
    viewport: phone,
    caption: original.caption + ' Phone layout.',
  });
}
export async function captureGuide({
  baseUrl,
  outputDir,
  sourceRevision,
  only,
}: {
  baseUrl: string;
  outputDir: string;
  sourceRevision: string;
  only?: readonly string[];
}): Promise<GuideScreenshot[]> {
  if (only?.some((id) => !scenes.some((s) => s.id === id))) throw Error('Unknown capture scene');
  const root = resolve(outputDir);
  await mkdir(root, { recursive: true });
  if ((await realpath(root)) !== root) throw Error('Output directory must not be a symlink');
  const browser = await chromium.launch(),
    images: GuideScreenshot[] = [];
  try {
    for (const s of scenes) {
      if (only && !only.includes(s.id)) continue;
      const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 1 }),
        page = await context.newPage(),
        errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await page.goto(new URL(s.route, baseUrl).href);
        await s.prepare(page);
        await s.ready(page);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          );
        });
        const path = resolve(root, s.id + '.png'),
          rel = relative(root, path);
        if (rel.startsWith('..') || isAbsolute(rel)) throw Error('Unsafe capture path');
        const bytes = s.target
          ? await page.locator(s.target).screenshot({ path })
          : await page.screenshot({ path });
        if (errors.length) throw Error(errors.join('\n'));
        images.push({
          id: s.id,
          src: 'club-guide/' + s.id + '.png',
          alt: s.alt,
          caption: s.caption,
          route: s.route,
          width: bytes.readUInt32BE(16),
          height: bytes.readUInt32BE(20),
          sourceRevision,
          scenario: s.id,
          exampleData: s.exampleData,
        });
        console.log(`Captured ${s.id}: ${bytes.length} bytes`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const previous: GuideScreenshot[] = only
    ? JSON.parse(await readFile(resolve(root, 'capture-manifest.json'), 'utf8')).images
    : [];
  const merged = [...previous.filter((p) => !images.some((i) => i.id === p.id)), ...images];
  await writeFile(
    resolve(root, 'capture-manifest.json'),
    JSON.stringify({ version: 1, images: merged }, null, 2) + '\n',
  );
  return merged;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2),
    get = (key: string, fallback: string) =>
      args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
    manifest = resolve(repo, 'src/club/guide/screenshots.json');
  if (args.includes('--verify')) {
    const issues = await verifyGuideManifest(
      JSON.parse(await readFile(manifest, 'utf8')),
      resolve(repo, 'public'),
    );
    if (issues.length) throw Error(issues.join('\n'));
    console.log('Guide manifest verified.');
  } else {
    const images = await captureGuide({
      baseUrl: get('--base-url', 'http://127.0.0.1:4173/cube-steps/'),
      outputDir: resolve(get('--output-dir', 'public/club-guide')),
      sourceRevision: get('--revision', 'uncommitted'),
      only: args.includes('--only') ? get('--only', '').split(',') : undefined,
    });
    await writeFile(manifest, JSON.stringify({ version: 1, images }, null, 2) + '\n');
  }
}
