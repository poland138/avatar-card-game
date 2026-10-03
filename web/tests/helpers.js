import { expect } from '@playwright/test';

export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

export async function dismissIntro(page, expectedText) {
  const dialog = page.getByRole('dialog');
  if (expectedText) await expect(dialog).toContainText(expectedText);
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).toHaveCount(0);
}

export async function startGame(page, query = '') {
  await page.goto(query);
  await page.getByRole('button', { name: /^Water/ }).click();
  await page.getByRole('button', { name: 'Begin Run' }).click();
  await dismissIntro(page, 'Free-for-all');
  // Fails if WebGL broke and the HTML fallback rendered instead.
  await expect(page.locator('[data-region="table"] canvas')).toBeVisible();
}

export async function expectTableHeight(page, min) {
  const h = await page.locator('[data-region="table"]').evaluate(el => el.getBoundingClientRect().height);
  expect(h).toBeGreaterThanOrEqual(min);
}

// Every [data-region] box must sit inside the viewport and not intersect any other.
export async function expectNoOverlap(page) {
  const { boxes, vw, vh, scrollW, scrollH } = await page.evaluate(() => ({
    boxes: [...document.querySelectorAll('[data-region]')].map(el => {
      const r = el.getBoundingClientRect();
      return { name: el.dataset.region, x: r.x, y: r.y, w: r.width, h: r.height };
    }),
    vw: window.innerWidth,
    vh: window.innerHeight,
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
  }));
  const problems = [];
  if (scrollW > vw + 1) problems.push(`page scrolls horizontally (${scrollW} > ${vw})`);
  if (scrollH > vh + 1) problems.push(`page scrolls vertically (${scrollH} > ${vh})`);
  for (const b of boxes) {
    if (b.w < 1 || b.h < 1) problems.push(`${b.name} has no size`);
    if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > vw + 0.5 || b.y + b.h > vh + 0.5) problems.push(`${b.name} is outside the viewport`);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.5 && oy > 0.5) problems.push(`${a.name} overlaps ${b.name}`);
    }
  }
  expect(boxes.length).toBe(8);
  expect(problems).toEqual([]);
}
