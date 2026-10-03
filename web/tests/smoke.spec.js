import { test, expect } from '@playwright/test';
import { trackErrors, startGame } from './helpers';

test('plays the first trick with the keyboard', async ({ page }) => {
  const errors = trackErrors(page);
  await startGame(page);

  const instruction = page.getByTestId('instruction');
  await expect(instruction).toHaveText('Pick a card to play.');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();

  await page.keyboard.press('ArrowRight');
  await expect(instruction).toHaveText('Press Play to reveal all cards at once.');

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByTestId('callout')).toContainText(/ wins?\b/);

  // Focus is now on the action button; arrows must still not break, and Continue works.
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.banner .progress')).toHaveText('Trick 2 of 13');
  await page.keyboard.press('ArrowRight');
  await expect(instruction).toHaveText('Press Play to reveal all cards at once.');
  expect(errors).toEqual([]);
});

test('rules and log open and close', async ({ page }) => {
  await startGame(page);
  await page.getByRole('button', { name: 'Rules' }).click();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Log' }).click();
  await expect(page.getByRole('dialog')).toContainText('Nothing played yet.');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
