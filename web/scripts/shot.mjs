// Usage (dev server running): npm run shot [-- <url> <outDir>]
// Captures key screens at desktop and phone sizes for visual review.
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });

const sizes = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'laptop', width: 1366, height: 625 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone-short', width: 390, height: 664 },
];
const pause = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function startGame(page, query = '') {
  await page.goto(url + query);
  await page.getByRole('button', { name: /^Water/ }).click();
  await page.getByRole('button', { name: 'Begin Run' }).click();
  await pause(300);
}

async function dismissIntro(page) {
  const gotIt = page.getByRole('button', { name: 'Got it' });
  if (await gotIt.count()) await gotIt.click();
  await pause(300);
}

for (const s of sizes) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
  page.on('pageerror', e => console.error(`[${s.name}] pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') console.error(`[${s.name}] console: ${m.text()}`); });
  const shot = name => page.screenshot({ path: `${out}/${s.name}-${name}.png` });

  await page.goto(url);
  await shot('1-select');
  await startGame(page);
  await shot('2-intro');
  await dismissIntro(page);
  await page.keyboard.press('ArrowRight');
  await pause(500);
  await shot('3-picked');
  await page.keyboard.press('Enter');
  await pause(800);
  await shot('4-revealed');
  await page.getByRole('button', { name: 'Why?' }).click();
  await pause(300);
  await shot('4b-why');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Continue' }).click();
  await pause(220);
  await shot('4c-flying');
  await pause(1200);
  await shot('4d-absorbed');

  // Rebellion via the dev panel (skipped until Task 8 adds it).
  await startGame(page, '?debug');
  await dismissIntro(page);
  const devToggle = page.getByRole('button', { name: /^Dev/ });
  if (await devToggle.count()) {
    await devToggle.click();
    const devInputs = page.locator('.dev-panel input[type="number"]');
    for (const [i, v] of [5, 3, 3, 2].entries()) await devInputs.nth(i).fill(String(v));
    await page.getByRole('button', { name: /^Skip \(/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await pause(400);
    await shot('5-rebellion-intro');
    await dismissIntro(page);
    for (const key of ['ArrowRight', '1', 'ArrowRight', '2', 'ArrowRight', '3']) await page.keyboard.press(key);
    await pause(500);
    await shot('6-king-placed');
    await page.keyboard.press('Enter');
    await pause(1800);
    await shot('7-duel-resolved');
    const why = page.getByRole('button', { name: 'Why?' });
    if (await why.isVisible()) {
      await why.click();
      await pause(300);
      await shot('8-why');
    }
  }
  // Rebel view: an AI King on top, you defending the middle lane.
  await startGame(page, '?debug');
  await dismissIntro(page);
  if (await page.getByRole('button', { name: /^Dev/ }).count()) {
    await page.getByRole('button', { name: /^Dev/ }).click();
    const inputs = page.locator('.dev-panel input[type="number"]');
    for (const [i, v] of [2, 5, 3, 3].entries()) await inputs.nth(i).fill(String(v));
    await page.getByRole('button', { name: /^Skip \(/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await pause(400);
    await dismissIntro(page);
    await pause(1500);
    await shot('9-rebel-attacked');
    await page.keyboard.press('ArrowRight');
    await pause(500);
    await shot('10-rebel-picked');
    await page.keyboard.press('Enter');
    await pause(1500);
    await shot('11-rebel-resolved');
  }
  await page.close();
}
await browser.close();
console.log(`Screenshots written to ${out}/`);
