import {test,expect} from '@playwright/test';
test('opens every lesson and keeps the mobile and desktop layouts usable',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('#/learn/notation');await expect(page.getByRole('heading',{name:'Meet your cube',exact:true})).toBeVisible();
 const stages=[['white-cross','Build the white cross'],['first-layer','Finish the first layer'],['middle-layer','Solve the middle edges'],['top-cross','Make the yellow cross'],['top-edges','Match the top edges'],['top-corners','Put the corners in place'],['corner-orientation','Finish the yellow corners']];
 for(const [stage,title] of stages){await page.locator(`a[href="#/learn/${stage}"]`).first().click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Next move',exact:true})).toBeEnabled();await expect(page.getByRole('heading',{name:'Observe',exact:true})).toBeVisible();}
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:950});await page.goto('#/learn/white-cross');await expect(page.getByRole('heading',{name:'Build the white cross',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Next move',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Next move',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByTestId('move-position')).not.toContainText('Move 0 of');
  await page.screenshot({path:`test-results/learning-${testInfo.project.name}-${width}.png`,fullPage:true});
 }
 await page.reload();await expect(page.getByRole('button',{name:'Next move',exact:true})).toBeEnabled();expect(errors).toEqual([]);
});
test('keyboard skip link keeps the selected route',async({page,browserName})=>{
 await page.goto('#/solve');const skip=page.getByRole('link',{name:'Skip to content'});await skip.waitFor({state:'attached'});
 // WebKit on Windows does not enable full keyboard access to links by default.
 if(browserName==='webkit')await skip.focus();else await page.keyboard.press('Tab');
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/#\/solve$/);
 await expect(page.locator('main')).toBeFocused();
});
