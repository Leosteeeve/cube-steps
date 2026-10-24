import { test, expect } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
test('CMLL filters and variant/hold animation remain independent of CFOP', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('club/#/');
  await dismissTutorialForTest(page);
  await page.goto('club/#/cmll');
  await expect(page.locator('.cmll-card')).toHaveCount(42);
  await page.getByLabel('CMLL family').selectOption('H');
  await expect(page.locator('.cmll-card')).toHaveCount(4);
  await page.goto('club/#/cmll/cmll-o-1');
  const next = page.getByRole('button', { name: 'Next move', exact: true });
  await expect(next).toBeEnabled({ timeout: 30000 });
  for (const frame of [
    'white-blue',
    'white-green',
    'white-red',
    'white-orange',
    'yellow-blue',
    'yellow-green',
    'yellow-red',
    'yellow-orange',
  ]) {
    await page.getByLabel('Holding frame').selectOption(frame);
    for (const variant of ['cmll-o-1-primary', 'cmll-o-1-alternate']) {
      await page.getByLabel('Formula variant').selectOption(variant);
      await expect(page.getByLabel('Move position')).toHaveValue('0');
      await expect(next).toBeEnabled();
      await next.click();
      await expect(page.getByLabel('Move position')).toHaveValue('1');
      await page.getByLabel('Move position').focus();
      await page.keyboard.press('End');
      await expect(
        page.getByRole('heading', { name: 'CMLL complete.', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /^Replay formula/ })).toBeEnabled();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('cmll-phone.png'), fullPage: true });
  expect(await page.evaluate(() => Array.from(document.querySelectorAll('main *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1&&el.getBoundingClientRect().width>0).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right})))).toEqual([]);
  await page.goto('club/#/cmll/not-a-case');
  await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
  expect(errors).toEqual([]);
});
