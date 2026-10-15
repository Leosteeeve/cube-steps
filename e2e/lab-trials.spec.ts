import { test, expect, type Page } from '@playwright/test';
import { dismissTutorialForTest } from './helpers/tutorial';
async function setup(page: Page) {
  await page.goto('club/');
  await dismissTutorialForTest(page);
  await page.evaluate(async () => {
    const hp = '/cube-steps/e2e/harnesses/lab-storage.ts',
      sp = '/cube-steps/src/lab/experiments/storage.ts';
    const { storageFixture } = await import(/* @vite-ignore */ hp),
      { openLabStore } = await import(/* @vite-ignore */ sp);
    const s = await openLabStore();
    await s.saveExperiment(await storageFixture());
    s.close();
  });
  await page.goto('club/#/lab/trials');
  await expect(page.getByRole('heading', { name: 'Set up the saved cube' })).toBeVisible({
    timeout: 15000,
  });
}
async function confirm(page: Page) {
  await page.getByLabel(/I reset the original cube/).check();
  await page.getByLabel(/I matched the starting hold/).check();
}
async function keyboardStart(page: Page) {
  await confirm(page);
  await page.getByRole('button', { name: 'Trial timing surface' }).focus();
  await page.keyboard.down('Space');
  await expect(page.getByText('Ready. Release to start.', { exact: true })).toBeVisible();
  await page.keyboard.up('Space');
  await expect(page.getByText('Timing Cross + F2L. Press to stop.', { exact: true })).toBeVisible();
}
test('moving keyboard focus while armed creates an interrupted review, never a late start', async ({
  page,
}) => {
  test.setTimeout(60000);
  await setup(page);
  await confirm(page);
  await page.getByRole('button', { name: 'Trial timing surface' }).focus();
  await page.keyboard.down('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Space');
  await expect(page.getByRole('heading', { name: 'Review this trial' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Outcome', exact: true })).toHaveValue(
    'interrupted',
  );
  await expect(page.getByText('Untimed', { exact: true })).toBeVisible();
});
test('a trial quiesces actual search/player work and a failed save remains retryable', async ({
  page,
}) => {
  test.setTimeout(90000);
  await setup(page);
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Analyze' })
    .click();
  await page.getByLabel('Scramble sequence').fill("R U F2 L D2 B R2 U' F D L2");
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(
    page.locator('.lab-pinned').getByRole('button', { name: 'Play', exact: true }),
  ).toBeEnabled({ timeout: 20000 });
  await page.locator('.lab-pinned').getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Trials & notes' })
    .click();
  await keyboardStart(page);
  await expect(page.getByText('Analysis stopped', { exact: true })).toBeVisible();
  await expect(page.locator('.lab-pinned .play-button')).toHaveText(/^Play/);
  await page.keyboard.press('Escape');
  await expect(page.getByText(/Interrupted: escape/)).toBeVisible();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).failAttempt = true;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'attempts' && (window as any).failAttempt)
        throw new DOMException('Example failed trial write', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Save trial', exact: true }).click();
  await expect(page.getByText('Unsaved work — keep this tab open.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Trial history' })).toContainText('No trials yet');
  await page.getByRole('button', { name: 'Discard review and prepare next' }).click();
  await page.evaluate(() => ((window as any).failAttempt = false));
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Trial history' })).toContainText('interrupted');
  await expect(page.getByText('Unsaved work — keep this tab open.')).toHaveCount(0);
});
test('keyboard timing requires review, excludes note typing and keeps navigation interruption recoverable', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  await page.getByLabel('Attempt kind').selectOption('measured');
  await keyboardStart(page);
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Review this trial' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save trial' })).toBeDisabled();
  await page.getByLabel('Trial note').fill('An example browser test, not physical calibration.');
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Review this trial' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Outcome', exact: true }).selectOption('followed');
  await page.getByRole('button', { name: 'Save trial' }).click();
  await expect(page.getByRole('region', { name: 'Trial history' })).toContainText('followed');
  await expect(page.getByLabel(/I reset the original cube/)).not.toBeChecked();
  await keyboardStart(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Guide', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'CFOP Lab', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'Lab workspace' })
    .getByRole('link', { name: 'Trials & notes' })
    .click();
  await expect(page.getByRole('heading', { name: 'Review this trial' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Outcome', exact: true })).toHaveValue(
    'interrupted',
  );
  await expect(page.getByRole('combobox', { name: 'Outcome', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Save trial' }).click();
  await expect(page.getByRole('region', { name: 'Trial history' })).toContainText('interrupted');
  expect(errors).toEqual([]);
});
test('pointer cancellation and hidden-document events never become successful times', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.getByLabel('Timing method').selectOption('touch');
  await confirm(page);
  const pad = page.getByRole('button', { name: 'Trial timing surface' });
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByText('Ready. Release to start.', { exact: true })).toBeVisible();
  await pad.dispatchEvent('pointerup', { pointerId: 999, pointerType: 'touch', isPrimary: false });
  await expect(page.getByText('Ready. Release to start.', { exact: true })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText('Timing Cross + F2L. Press to stop.', { exact: true })).toBeVisible();
  await pad.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  await expect(page.getByRole('combobox', { name: 'Outcome', exact: true })).toHaveValue(
    'interrupted',
  );
  await page.getByRole('button', { name: 'Discard review and prepare next' }).click();
  await page.getByLabel('Timing method').selectOption('keyboard');
  await keyboardStart(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete (document as any).hidden;
  });
  await expect(page.getByText(/Interrupted: hidden/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('five saved AB blocks produce descriptive medians and revision-aware delete and undo', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await setup(page);
  await page.getByLabel('Timing method').selectOption('external-manual');
  await page.getByLabel('Attempt kind').selectOption('measured');
  await page.getByText('Create a fixed A/B comparison', { exact: true }).click();
  await page.getByRole('button', { name: 'Create comparison and five blocks' }).click();
  await expect(page.getByLabel('Planned block slot')).toBeVisible();
  const expectedOrder = Array.from({ length: 5 }, (_, i) =>
    (i % 2 ? ['B', 'A'] : ['A', 'B']).map(
      (label) => `Block ${i + 1} · ${i % 2 ? 'BA' : 'AB'} · ${label}`,
    ),
  ).flat();
  await expect(page.getByLabel('Planned block slot').locator('option')).toHaveText(expectedOrder);
  const selectedComparison = await page
    .getByRole('combobox', { name: 'Comparison', exact: true })
    .inputValue();
  await page.reload();
  await page
    .getByRole('combobox', { name: 'Comparison', exact: true })
    .selectOption(selectedComparison);
  await expect(page.getByLabel('Planned block slot').locator('option')).toHaveText(expectedOrder);
  await page.getByLabel('Timing method').selectOption('external-manual');
  await page.getByLabel('Attempt kind').selectOption('measured');
  for (let i = 0; i < 10; i++) {
    await confirm(page);
    const option = await page
      .getByLabel('Planned block slot')
      .locator('option:checked')
      .innerText();
    await page
      .getByLabel('External time', { exact: true })
      .fill(option.endsWith('A') ? '10' : '12');
    await page.getByRole('button', { name: 'Review external time' }).click();
    await page.getByRole('combobox', { name: 'Outcome', exact: true }).selectOption('followed');
    await page.getByRole('button', { name: 'Save trial' }).click();
    await expect(page.getByRole('heading', { name: 'Review this trial' })).toHaveCount(0);
  }
  const summary = page.getByRole('region', { name: 'Matched comparison summary' });
  await expect(summary).toContainText('5 complete matched A/B blocks');
  await expect(summary).toContainText('Median paired B − A');
  await expect(summary).toContainText('2.00 s');
  await page.getByRole('button', { name: 'Delete trial', exact: true }).first().click();
  await expect(summary).toContainText('4 complete matched A/B blocks');
  await page.getByRole('button', { name: 'Undo last deletion' }).click();
  await expect(summary).toContainText('5 complete matched A/B blocks');
  await page.screenshot({
    path: `test-results/lab-trials-${info.project.name}.png`,
    fullPage: true,
  });
});
