import { test, expect } from '@playwright/test';
import { trackErrors, startGame, dismissIntro, expectNoOverlap, expectTableHeight } from './helpers';

test('dev bar is hidden by default and appears collapsed with backtick', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('.dev-panel')).toHaveCount(0);
  await page.keyboard.press('`');
  await expect(page.locator('.dev-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Dev/ })).toHaveAttribute('aria-expanded', 'false');
});

test('skip to rebellion as King, play a duel, layout holds', async ({ page }, testInfo) => {
  const errors = trackErrors(page);
  await startGame(page, '?debug');

  const devToggle = page.getByRole('button', { name: /^Dev/ });
  await devToggle.click();
  const inputs = page.locator('.dev-panel input[type="number"]');
  for (const [i, v] of [5, 3, 3, 2].entries()) await inputs.nth(i).fill(String(v));
  await page.getByRole('button', { name: 'Skip (13/13)' }).click();
  await expect(devToggle).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Continue' }).click();
  await dismissIntro(page, 'You are King!');
  await expectNoOverlap(page);
  await expectTableHeight(page, 240);

  const instruction = page.getByTestId('instruction');
  await expect(instruction).toContainText('Place an attack card in each lane (0/3)');
  for (const key of ['ArrowRight', '1', 'ArrowRight', '2', 'ArrowRight', '3']) await page.keyboard.press(key);
  await expect(instruction).toHaveText('Press Attack to launch all three lanes.');

  await page.getByRole('button', { name: 'Attack' }).click();
  const callout = page.getByTestId('callout');
  await expect(callout).toContainText(/takes? duel|is a draw/);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();

  // Wide screens list lane reasons inline; narrow screens put them behind "Why?".
  const why = page.getByRole('button', { name: 'Why?' });
  if (await why.isVisible()) {
    await why.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Lane 1');
    await expect(dialog).toContainText('Lane 3');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  } else {
    await expect(callout).toContainText('Lane 1');
    await expect(callout).toContainText('Lane 3');
  }

  await expectNoOverlap(page);
  await expectTableHeight(page, 240);
  await page.screenshot({ path: testInfo.outputPath('duel-resolved.png') });
  expect(errors).toEqual([]);
});
