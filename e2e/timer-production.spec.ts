import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('production timer uses real workers, matching diagrams, durable history and export', async ({
  page,
  request,
}) => {
  const errors: string[] = [],
    bad: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
  const metadata = await (await request.get('build-info.json')).json();
  expect(metadata.entries).toEqual({ global: './', club: './club/' });
  expect(metadata.teachingStatus).toMatchObject({
    lbl: 'accepted',
    'cfop-beginner': 'accepted',
    'cfop-advanced': 'preview',
  });
  expect(metadata.commit).toMatch(/^[a-f0-9]{40}$/);
  if (process.env.CUBESTEPS_EXPECTED_SHA) {
    expect(metadata.commit).toBe(process.env.CUBESTEPS_EXPECTED_SHA);
    expect(metadata.dirty).toBe(false);
  }
  await page.goto('club/#/timer');
  const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
  await expect(surface).toBeEnabled({ timeout: 25000 });
  const text = (await page.locator('.timer-scramble-text').innerText()).trim(),
    net = await page
      .locator('.timer-net [data-color]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-color')));
  expect(text.split(/\s+/).length).toBeGreaterThan(10);
  expect(net).toHaveLength(54);
  await surface.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(surface).toHaveAttribute('data-phase', 'running');
  await expect(page.locator('html')).toHaveAttribute('data-timing', 'active');
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-last')).toContainText('Saved on this device');
  await expect(surface).toHaveAttribute('data-phase', 'idle');
  await page.reload();
  await expect(surface).toBeEnabled({ timeout: 25000 });
  await page.getByRole('button', { name: /View solve 1:/ }).click();
  await expect(page.locator('.timer-record-details')).toContainText(text);
  const savedNet = await page
    .locator('.timer-record-details [data-color]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-color')));
  expect(savedNet).toEqual(net);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const exported = JSON.parse(await readFile((await (await event).path())!, 'utf8'));
  expect(exported.attempts).toHaveLength(1);
  expect(exported.attempts[0].scramble).toBe(text);
  expect(exported.unsavedIds).toEqual([]);
  await page.getByRole('link', { name: 'Learn', exact: true }).click();
  await expect(page).toHaveURL(/\/club\/#\/learn\/notation$/);
  await expect(page.getByRole('heading', { name: 'Meet your cube', exact: true })).toBeVisible();
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-edition', 'global');
  await expect(page.getByRole('heading', { name: 'Meet your cube', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});
test.describe('mobile production timing', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('touch inspection, input hold, saved result and reduced motion work together', async ({
    page,
    browserName,
    context,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('club/#/timer');
    const surface = page.getByRole('button', { name: 'Timing surface', exact: true });
    await expect(surface).toBeEnabled({ timeout: 25000 });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.getByRole('checkbox', { name: '15-second inspection' }).check();
    await surface.tap();
    await expect(surface).toHaveAttribute('data-phase', 'inspection');
    await surface.scrollIntoViewIfNeeded();
    const box = (await surface.boundingBox())!,
      x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    if (browserName === 'chromium') {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await page.waitForTimeout(350);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(surface).toHaveAttribute('data-phase', 'running');
      await page.waitForTimeout(100);
      await surface.tap();
      await cdp.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.waitForTimeout(350);
      await page.mouse.up();
      await expect(surface).toHaveAttribute('data-phase', 'running');
      await surface.tap();
    }
    await expect(page.getByText('1 solve', { exact: true })).toBeVisible();
    await expect(page.locator('.timer-last')).toContainText('Saved on this device');
    await expect(surface).toHaveAttribute('data-phase', 'idle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
});
