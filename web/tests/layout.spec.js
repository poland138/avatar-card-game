import { test, expect } from '@playwright/test';
import { startGame, expectNoOverlap, expectTableHeight } from './helpers';

test('element select fits without horizontal scroll', async ({ page }) => {
  await page.goto('');
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});

test('HUD regions never overlap during the free-for-all', async ({ page }, testInfo) => {
  await startGame(page);
  await expectNoOverlap(page);
  await expectTableHeight(page, 240);
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expectNoOverlap(page);
  await page.screenshot({ path: testInfo.outputPath('ffa-revealed.png') });
});
