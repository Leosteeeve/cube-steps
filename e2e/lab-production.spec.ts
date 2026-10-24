import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { GOLDEN_CASES } from '../tests/fixtures/facelet-cases';
import { renderedColors } from './helpers/color-entry';
test('production Lab retains physical routes, saves, interrupts trials and previews imports', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('club/#/lab');
  await dismissTutorialForTest(page);
  await expect(page.getByLabel('Scramble sequence')).toBeVisible();
  await page.reload();
  await page.getByLabel('Scramble sequence').fill('R U F2 L D2 B R2');
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect
    .poll(() => page.locator('.lab-candidate').count(), { timeout: 20000 })
    .toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Stop analysis' }).click();
  await expect(page.getByRole('region', { name: 'Search status' })).toHaveAttribute(
    'data-lab-phase',
    'stopped',
  );
  await page
    .locator('.lab-candidate')
    .first()
    .getByRole('button', { name: /Pin.*playback/ })
    .click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Compare' })
    .click();
  await expect(page.getByLabel('Move position')).toHaveValue('1');
  await page.getByLabel('Experiment label (optional)').fill('Production verification example');
  await page.getByRole('button', { name: 'Save experiment', exact: true }).click();
  await expect(page.getByText('Experiment saved on this device.', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  const id = await page
    .getByLabel('Saved experiments')
    .locator('option')
    .nth(1)
    .getAttribute('value');
  await page.reload();
  await page.getByLabel('Saved experiments').selectOption(id!);
  await expect(page.getByText('Saved experiment loaded. Search has not restarted.')).toBeVisible({
    timeout: 20000,
  });
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Analyze' })
    .click();
  await expect(page.getByLabel('Scramble sequence')).toHaveValue('R U F2 L D2 B R2');
  await page
    .getByRole('checkbox', { name: 'Export Production verification example', exact: true })
    .check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected JSON' }).click();
  const path = await (await download).path();
  await page.getByLabel('Import experiment JSON').setInputFiles(path!);
  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole('button', { name: 'Commit validated import' }).click();
  await expect(page.getByText('Import committed on this device.', { exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Trials & notes' })
    .click();
  await page.getByLabel(/I reset the original cube/).check();
  await page.getByLabel(/I matched the starting hold/).check();
  await page.getByRole('button', { name: 'Trial timing surface' }).focus();
  await page.keyboard.down('Space');
  await expect(page.getByText('Ready. Release to start.', { exact: true })).toBeVisible();
  await page.keyboard.up('Space');
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Compare' })
    .click();
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Trials & notes' })
    .click();
  await expect(page.getByText(/Interrupted: leave/)).toBeVisible();
  await page.getByRole('button', { name: 'Discard review and prepare next' }).click();
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Analyze' })
    .click();
  await page.getByRole('button', { name: 'Face colors', exact: true }).click();
  const example = GOLDEN_CASES[7],
    names = { F: 'Front', R: 'Right', B: 'Back', L: 'Left', U: 'Up', D: 'Down' };
  for (const face of ['F', 'R', 'B', 'L', 'U', 'D'] as const) {
    await page.getByRole('button', { name: `${names[face]} face`, exact: true }).click();
    for (const color of new Set(example.facelets[face])) {
      await page
        .getByRole('button', { name: color[0].toUpperCase() + color.slice(1), exact: true })
        .click();
      for (let i = 0; i < 9; i++)
        if (i !== 4 && example.facelets[face][i] === color)
          await page
            .getByRole('button', {
              name: new RegExp(
                `^${names[face]}, row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1},`,
              ),
            })
            .click();
    }
  }
  await page.getByRole('button', { name: 'Check colors', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.locator('.lab-candidate').first()).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Stop analysis' }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
  await expect.poll(() => renderedColors(page)).toEqual(example.facelets);
  expect(errors).toEqual([]);
});
test('production ordinary pages never load the experimental Lab worker or execution profile', async ({
  page,
}) => {
  test.setTimeout(60000);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('');
  await expect(page.getByRole('main')).toBeVisible();
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Guide', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Explore CFOP Lab', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /Timer/ })
    .click();
  await expect(page.locator('.timer-workspace')).toBeVisible();
  expect(
    requests.filter((url) =>
      /lab[.-]worker|LabWorkspace-|\/profiles-[\w-]+\.js|execution[.-]profiles|\/lab\/execution\//i.test(
        url,
      ),
    ),
  ).toEqual([]);
});
