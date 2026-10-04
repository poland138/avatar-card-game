import { test, expect } from '@playwright/test';
import { trackErrors, startGame, dragHandCardToField } from './helpers';

test('plays the first trick with the keyboard, and cards fly to the winner', async ({ page }) => {
  const errors = trackErrors(page);
  await startGame(page);

  const status = page.getByTestId('status');
  await expect(status).toHaveText('Drag or tap a card to play.');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();

  await page.keyboard.press('ArrowRight');
  await expect(status).toHaveText('Press Play to reveal.');

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(status).toContainText(/\bwins?/);

  // Focus is now on the action button; arrows must still work, and Continue advances.
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.banner .progress')).toHaveText('Trick 2 of 13');
  // The trick lands in exactly one player's points once the flight finishes.
  await expect.poll(() => page.locator('.seat-label .seat-value')
    .evaluateAll(els => els.reduce((s, el) => s + Number(el.textContent), 0))).toBe(1);
  await page.keyboard.press('ArrowRight');
  await expect(status).toHaveText('Press Play to reveal.');
  expect(errors).toEqual([]);
});

test('dragging a card onto the field selects it', async ({ page }) => {
  await startGame(page);
  await dragHandCardToField(page);
  await expect(page.getByTestId('status')).toHaveText('Press Play to reveal.');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
});

test('the Why? popup shows the cards that were played', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Why?' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.card-face')).toHaveCount(4);
  await expect(dialog.locator('.card-face.won')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
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
