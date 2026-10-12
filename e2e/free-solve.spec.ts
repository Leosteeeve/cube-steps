import {test,expect} from '@playwright/test';
test('solves pasted, random and empty inputs while preserving useful parse errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('#/solve');const input=page.getByLabel('Scramble sequence');
 await input.fill("R U2 F'");await page.getByRole('button',{name:'Explain this solve',exact:true}).click();
 await expect(page.getByRole('button',{name:'Next move',exact:true})).toBeEnabled();
 await input.fill('R M');await page.getByRole('button',{name:'Explain this solve',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('character 3');
 await expect(page.getByTestId('move-position')).toBeVisible();
 await input.fill('');await page.getByRole('button',{name:'Explain this solve',exact:true}).click();
 await expect(page.getByTestId('move-position')).toHaveText('Move 0 of 0');
 await page.getByRole('button',{name:'Random scramble',exact:true}).click();await expect(input).not.toHaveValue('');
 await page.getByRole('button',{name:'Explain this solve',exact:true}).click();await expect(page.getByRole('button',{name:'Next move',exact:true})).toBeEnabled();
 expect(errors).toEqual([]);
});
