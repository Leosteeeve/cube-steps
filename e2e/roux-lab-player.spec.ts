import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
import { matchesBoundary } from './helpers/color-entry';
test('Roux playback reverses the physical hold and verifies a separate basic LSE continuation', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/roux-lab');
  await page.getByRole('button', { name: 'White / blue only' }).click();
  await page.getByLabel('Scramble sequence').fill('R F U');
  await page.getByRole('button', { name: 'Analyze cube', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled({
    timeout: 35000,
  });
  await expect(page.getByLabel('Current centers',{exact:true})).toContainText('Centers now:');
  const old = await page
    .getByRole('region', { name: 'Selected Roux route' })
    .getAttribute('data-selected-route');
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByLabel('Move position')).toHaveValue('1');
  await page.getByRole('button', { name: 'Previous move', exact: true }).click();
  await expect(page.getByLabel('Move position')).toHaveValue('0');
  await expect.poll(() => matchesBoundary(page)).toBe(true);
  await page.getByLabel('Route section', { exact: true }).selectOption('ar-second-block');
  await page.getByRole('button', { name: /^Replay (action|formula|connected moves)/ }).click();
  const pause = page.getByRole('button', { name: /^Pause/ });
  if (await pause.isVisible()) await pause.click();
  await page.getByRole('button', { name: 'Show basic LSE as a separate route' }).click();
  await expect(page.getByRole('button', { name: 'Basic LSE route selected' })).toBeDisabled({
    timeout: 35000,
  });
  await expect(page.getByRole('region', { name: 'Selected Roux route' })).not.toHaveAttribute(
    'data-selected-route',
    old!,
  );
  await page.getByLabel('Move position').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { name: 'Cube solved.', exact: true })).toBeVisible();
  await expect.poll(() => matchesBoundary(page)).toBe(true);
});
