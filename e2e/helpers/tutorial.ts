import { expect, type Page } from '@playwright/test';
export async function dismissTutorialForTest(page: Page) {
  const choice = page.getByRole('button', { name: "Don't ask again", exact: true });
  // Subsequent visits use the real remembered preference, not a test-only switch.
  if (
    await page.evaluate(() => {
      try {
        return (
          JSON.parse(localStorage.getItem('cubesteps.club.tutorial.v1') ?? '{}').welcome === 'never'
        );
      } catch {
        return false;
      }
    })
  )
    return;
  await expect(choice).toBeVisible();
  await choice.click();
}
