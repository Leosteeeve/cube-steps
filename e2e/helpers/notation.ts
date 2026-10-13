import { expect, type Page } from '@playwright/test';
import {
  NOTATION_ENTRIES,
  describeNotation,
  type NotationAmount,
} from '../../src/club/moves/catalog';
export async function selectNotation(page: Page, move: string) {
  const base = move.replace(/['2]$/, '');
  const entry = NOTATION_ENTRIES.find((value) => value.base === base)!;
  if (
    entry.family !== 'face' &&
    !(await page.locator('.moves-advanced').evaluate((el: HTMLDetailsElement) => el.open))
  )
    await page.getByText('Explore more moves', { exact: true }).click();
  await page.getByRole('button', { name: `${entry.base}, ${entry.name}`, exact: true }).click();
  const amount = move.slice(base.length) as NotationAmount;
  await page
    .getByRole('group', { name: 'Turn amount' })
    .getByRole('button', {
      name: describeNotation({ base: entry.base, amount }).spoken,
      exact: true,
    })
    .click();
  await expect(page.locator('.notation-player')).toHaveAttribute('data-notation-move', move);
}
export async function renderNotationFrame(page: Page) {
  await page.locator('twisty-player').evaluate(async (player: any) => {
    await player.experimentalCurrentThreeJSPuzzleObject();
    for (const vantage of await player.experimentalCurrentVantages()) await vantage.render();
  });
}
