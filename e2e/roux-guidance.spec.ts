import { expect, test } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
test('new Guide chapters, advanced tours and retained film work without altering old links', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/guide/advanced-roux');
  await expect(page.getByRole('heading', { name: 'Connect better Roux blocks' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Download video (36 MB)', exact: true }),
  ).toHaveAttribute('href', /club-guide-video-v2\.mp4$/);
  await page.getByRole('button', { name: 'Start Advanced Roux tour', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build on what you know' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Use the exact setup and hold' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'One turn at a time' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit tour', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Page tour', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Exit tour', exact: true }).click();
  await page.goto('club/#/guide/roux-lab');
  await expect(page.getByRole('heading', { name: 'Try Roux routes in your hands' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Roux Test Lab tour', exact: true }).click();
  for (const title of [
    'Bring a cube you can repeat',
    'Choose familiar holds',
    'Read the evidence',
    'Compare both blocks together',
    'Save, rehearse, then measure',
  ]) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await page
      .getByRole('button', {
        name: title === 'Save, rehearse, then measure' ? 'Finish tour' : 'Next',
        exact: true,
      })
      .click();
  }
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Page tour', exact: true })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toHaveCount(0);
  for (const section of ['roux', 'lab', 'timer', 'moves']) {
    await page.goto('club/#/guide/' + section);
    await expect(page.locator('#guide-' + section)).toBeFocused();
  }
  if (process.env.CUBESTEPS_PRODUCTION === '1') {
    const info = await page.request.get('build-info.json');
    expect(info.ok()).toBe(true);
    const build = await info.json();
    expect(build.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(build.teachingStatus['roux-advanced']).toBe('preview');
  }
  expect(errors).toEqual([]);
});
test('a missing Roux asset reports failure and can be retried without stale routes', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await context.route(/block-distance[^/]*\.bin(?:\?.*)?$/, (r) =>
    r.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.goto('club/#/roux-lab');
  await page.getByRole('button', { name: 'White / blue only' }).click();
  await page.getByLabel('Scramble sequence').fill('R F U');
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await expect(page.locator('[data-roux-phase]')).toHaveAttribute('data-roux-phase', 'failed', {
    timeout: 35000,
  });
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toHaveCount(0);
  await context.unroute(/block-distance[^/]*\.bin(?:\?.*)?$/);
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).toBeVisible({
    timeout: 35000,
  });
});
