import { expect, type Page } from '@playwright/test';
export type TutorialScene =
  | 'home'
  | 'quiz'
  | 'moves'
  | 'lesson'
  | 'solve'
  | 'algorithms'
  | 'practice'
  | 'timer'
  | 'lab-analyze'
  | 'lab-compare'
  | 'lab-trials';
export async function renderTutorialFrame(page: Page) {
  await page.locator('twisty-player').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('twisty-player')
        .evaluate(
          async (player: any) => Array.from(await player.experimentalCurrentVantages()).length,
        ),
    )
    .toBeGreaterThan(0);
  await page.locator('twisty-player').evaluate(async (player: any) => {
    for (const vantage of await player.experimentalCurrentVantages()) await vantage.render();
    const canvases: HTMLCanvasElement[] = await player.experimentalCurrentCanvases();
    if (!canvases.length) throw Error('No rendered cube canvas');
    await Promise.all(
      canvases.flatMap((c) => c.getAnimations().map((a) => a.finished.catch(() => {}))),
    );
  });
}
export async function dismissCaptureWelcome(page: Page) {
  const welcome = page.getByRole('button', { name: "Don't ask again", exact: true });
  if (
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('cubesteps.club.tutorial.v1') ?? '{}').welcome === 'never',
    )
  )
    return;
  await expect(welcome).toBeVisible({ timeout: 30000 });
  await welcome.click();
}
export async function prepareTutorialScene(page: Page, scene: TutorialScene): Promise<void> {
  await dismissCaptureWelcome(page);
  if (scene === 'lab-analyze' || scene === 'lab-compare' || scene === 'lab-trials') {
    await page.getByLabel('Scramble sequence').fill("R U F2 L D2 B R2 U' F D L2");
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await expect
      .poll(() => page.locator('.lab-candidate').count(), { timeout: 30000 })
      .toBeGreaterThanOrEqual(2);
    await page.getByRole('button', { name: 'Stop analysis', exact: true }).click();
    const cards = page.locator('.lab-candidate');
    await cards
      .first()
      .getByRole('button', { name: /Pin.*playback/ })
      .click();
    await cards.nth(0).getByLabel('Compare this route').check();
    await cards.nth(1).getByLabel('Compare this route').check();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    if (scene === 'lab-compare')
      await page
        .getByRole('navigation', { name: 'Lab workspace' })
        .getByRole('link', { name: 'Compare' })
        .click();
    await renderTutorialFrame(page);
    if (scene === 'lab-trials') {
      await page.getByLabel('Experiment label (optional)').fill('Example session · sample routes');
      await page.getByRole('button', { name: 'Save experiment', exact: true }).click();
      await expect(page.getByText('Experiment saved on this device.', { exact: true })).toBeVisible(
        { timeout: 20000 },
      );
      await page
        .getByRole('navigation', { name: 'Lab workspace' })
        .getByRole('link', { name: 'Trials & notes' })
        .click();
      await page.getByText('Create a fixed A/B comparison', { exact: true }).click();
      await page.getByRole('button', { name: 'Create comparison and five blocks' }).click();
      await expect(page.getByLabel('Planned block slot')).toBeVisible();
      await page.getByText('Create a fixed A/B comparison', { exact: true }).click();
      await labelExample(page, '.lab-notebook');
    }
  }
  if (scene === 'home') {
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  }
  if (scene === 'moves') {
    await page.getByRole('button', { name: 'U, Up face', exact: true }).click();
    await page.getByRole('button', { name: /^U prime,/ }).click();
    await expect(page.getByRole('button', { name: 'Play move', exact: true })).toBeEnabled();
    await renderTutorialFrame(page);
  }
  if (scene === 'lesson') {
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Next move', exact: true }).click();
    await renderTutorialFrame(page);
  }
  if (scene === 'solve') {
    await page.getByLabel('Scramble sequence').fill("R U R' U' F2");
    await page.getByRole('button', { name: 'Explain with LBL', exact: true }).click();
    await expect(page.getByText('Verified LBL solution')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next move', exact: true })).toBeEnabled();
    await renderTutorialFrame(page);
  }
  if (scene === 'algorithms') {
    await page.getByLabel('Family').selectOption('oll');
    await page.getByRole('searchbox', { name: 'Search cases' }).fill('OLL 20');
    await expect(page.locator('.case-tile')).toHaveCount(1);
  }
  if (scene === 'practice') {
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await page.getByRole('checkbox', { name: 'OLL 20', exact: true }).check();
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Show solution', exact: true })).toBeVisible();
  }
  if (scene === 'timer') {
    await expect(page.getByRole('button', { name: 'Timing surface', exact: true })).toBeEnabled({
      timeout: 30000,
    });
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const q = indexedDB.open('cubesteps.club.timer', 1);
        q.onupgradeneeded = () => q.result.createObjectStore('attempts', { keyPath: 'id' });
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('attempts', 'readwrite');
        for (let i = 0; i < 12; i++)
          tx.objectStore('attempts').put({
            version: 1,
            id: `guide-example-${i}`,
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
            rawMs: 65000 - i * 1300 + (i % 3) * 900,
            scramble: "R U R' U'",
            inspectionMs: null,
            inspectionPenalty: 'none',
            manualPenalty: i === 3 ? 'dnf' : 'none',
            interruption: null,
            revision: 0,
            deletedAt: null,
          });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    await expect(page.getByText('12 solves', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timing surface', exact: true })).toBeEnabled({
      timeout: 30000,
    });
    await labelExample(page, '.timer-main-card');
    await labelExample(page, '.timer-bottom-grid');
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
export async function labelExample(page: Page, selector: string) {
  await page.locator(selector).evaluate((el) => {
    const label = document.createElement('p');
    label.textContent = 'EXAMPLE SESSION · SAMPLE DATA';
    label.style.cssText =
      'font:600 12px Segoe UI,sans-serif;letter-spacing:1px;padding:12px;color:#164a82;background:#eaf2ff;border-radius:6px;grid-column:1/-1;margin:0 0 12px';
    el.prepend(label);
  });
}
