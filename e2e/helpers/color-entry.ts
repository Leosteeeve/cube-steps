import { expect, type Page } from '@playwright/test';
import type { FaceletSnapshot } from '../../src/core/types';
const names = { F: 'Front', R: 'Right', B: 'Back', L: 'Left', U: 'Up', D: 'Down' } as const;
export async function enterFacelets(page: Page, facelets: FaceletSnapshot): Promise<void> {
  await page.getByRole('button', { name: 'Enter colors', exact: true }).click();
  for (const face of ['F', 'R', 'B', 'L', 'U', 'D'] as const) {
    await page.getByRole('button', { name: `${names[face]} face`, exact: true }).click();
    for (const color of new Set(facelets[face])) {
      await page
        .getByRole('button', { name: color[0].toUpperCase() + color.slice(1), exact: true })
        .click();
      for (let index = 0; index < 9; index++)
        if (index !== 4 && facelets[face][index] === color)
          await page
            .getByRole('button', {
              name: new RegExp(
                `^${names[face]}, row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1},`,
              ),
            })
            .click();
    }
  }
  await expect(page.getByText('48 / 48 stickers entered')).toBeVisible();
}
export async function renderedColors(page: Page) {
  return page.evaluate(async () => {
    const player = document.querySelector('twisty-player') as any;
    const data = (await player.experimentalModel.currentPattern.get()).patternData;
    // Independent numeric facelet references checked against outside-view cube geometry.
    // C = corner, E = edge, M = center; number after ':' is its cyclic sticker index.
    const grids = {
      F: 'C3:2 E0:1 C0:1 E9:0 M2:0 E8:0 C5:1 E4:1 C4:2',
      R: 'C0:2 E1:1 C1:1 E8:1 M3:0 E10:1 C4:1 E5:1 C7:2',
      B: 'C1:2 E2:1 C2:1 E10:0 M4:0 E11:0 C7:1 E6:1 C6:2',
      L: 'C2:2 E3:1 C3:1 E11:1 M1:0 E9:1 C6:1 E7:1 C5:2',
      U: 'C2:0 E2:0 C1:0 E3:0 M0:0 E1:0 C3:0 E0:0 C0:0',
      D: 'C5:0 E4:0 C4:0 E7:0 M5:0 E5:0 C6:0 E6:0 C7:0',
    };
    const pieceColors = {
      C: ['WGR', 'WRB', 'WBO', 'WOG', 'YRG', 'YGO', 'YOB', 'YBR'],
      E: ['WG', 'WR', 'WB', 'WO', 'YG', 'YR', 'YB', 'YO', 'GR', 'GO', 'BR', 'BO'],
      M: ['W', 'O', 'G', 'R', 'B', 'Y'],
    };
    const colors: Record<string, string> = {
      W: 'white',
      Y: 'yellow',
      G: 'green',
      B: 'blue',
      R: 'red',
      O: 'orange',
    };
    return Object.fromEntries(
      Object.entries(grids).map(([face, cells]) => [
        face,
        cells.split(' ').map((ref) => {
          const kind = ref[0] as 'C' | 'E' | 'M',
            [slot, sticker] = ref.slice(1).split(':').map(Number);
          const orbit = data[{ C: 'CORNERS', E: 'EDGES', M: 'CENTERS' }[kind]],
            original = pieceColors[kind][orbit.pieces[slot]];
          return colors[
            original[(sticker + (kind === 'M' ? 0 : orbit.orientation[slot])) % original.length]
          ];
        }),
      ]),
    );
  });
}
export async function matchesBoundary(page: Page) {
  return page.evaluate(async () => {
    const player = document.querySelector('twisty-player') as any;
    const actual = (await player.experimentalModel.currentPattern.get()).patternData;
    const expected = JSON.parse(
      document.querySelector('[data-boundary-state]')!.getAttribute('data-boundary-state')!,
    );
    return JSON.stringify(actual) === JSON.stringify(expected);
  });
}
