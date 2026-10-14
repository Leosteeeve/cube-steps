import { dismissTutorialForTest } from './helpers/tutorial';
import { expect, test } from '@playwright/test';
test('keyboard timer arms, saves once, ignores controls and interrupts route changes', async ({
  page,
}) => {
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeEnabled({ timeout: 20000 });
  await expect(page.getByRole('checkbox', { name: '15-second inspection' })).not.toBeChecked();
  await surface.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'running');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeDisabled();
  await page.waitForTimeout(150);
  await page.keyboard.down('Space');
  await expect(surface).toHaveAttribute('data-phase', 'stopped');
  await page.keyboard.up('Space');
  await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await expect(page.getByRole('img', { name: 'Current scramble diagram' })).toBeVisible();
  await page.getByRole('checkbox', { name: '15-second inspection' }).focus();
  await page.keyboard.press('Space');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await page.getByRole('checkbox', { name: '15-second inspection' }).uncheck();
  await surface.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'running');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('link', { name: 'Timer', exact: false }).click();
  await expect(page.getByText('2 solves', { exact: true })).toBeVisible();
  await expect(page.locator('.timer-last')).toBeVisible();
});
test('pointer input and inspection cancellation do not create accidental times', async ({
  page,
}) => {
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeEnabled({ timeout: 20000 });
  await page.getByRole('checkbox', { name: '15-second inspection' }).check();
  await surface.click();
  await expect(surface).toHaveAttribute('data-phase', 'inspection');
  await page.keyboard.press('Escape');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await page.getByRole('checkbox', { name: '15-second inspection' }).uncheck();
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-phase', 'running');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
  await expect(page.locator('.timer-last')).toBeVisible();
});
test('slow generation disables timing and a failed next scramble keeps the completed result', async ({
  page,
}) => {
  await page.route(/\/src\/core\/scramble\.ts(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `let n=0; export async function generateScramble(){ await new Promise(r=>setTimeout(r,1000)); if(n++===1) throw new Error('Test generation failure'); return "R U R'"; }`,
    }),
  );
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeDisabled();
  await expect(surface).toBeEnabled();
  await surface.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Retry scramble' })).toBeVisible();
  await expect(surface).toBeDisabled();
  await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
  await expect(page.locator('.timer-last')).toContainText('Saved on this device');
  await page.getByRole('button', { name: 'Retry scramble' }).click();
  await expect(surface).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Current scramble diagram' })).toBeVisible();
});
test.describe('touchscreen', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('native touch starts inspection once and cancels without a record', async ({ page }) => {
    await page.goto('club/#/timer');
    const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
    await expect(surface).toBeEnabled({ timeout: 20000 });
    await page.getByRole('checkbox', { name: '15-second inspection' }).check();
    await surface.tap();
    await expect(surface).toHaveAttribute('data-phase', 'inspection');
    await page.keyboard.press('Escape');
    await expect(page.getByText('0 solves', { exact: true })).toBeVisible();
  });
});
test('moving keyboard focus out of an armed surface cancels that hold', async ({ page }) => {
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeEnabled({ timeout: 20000 });
  await surface.focus();
  await page.keyboard.down('Space');
  await page.getByRole('link', { name: 'Home', exact: true }).focus();
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await expect(page.getByText('0 solves', { exact: true })).toBeVisible();
});

test('restoring a persisted page prepares a new scramble after an interrupted solve', async ({
  page,
}) => {
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeEnabled({ timeout: 20000 });
  await surface.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'running');
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
  );
  await expect(surface).toHaveAttribute('data-phase', 'loading');
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
  await expect(page.locator('.timer-last')).toContainText('DNF');
});

test.beforeEach(async ({ page }) => {
  await page.goto('club/');
  await dismissTutorialForTest(page);
});
