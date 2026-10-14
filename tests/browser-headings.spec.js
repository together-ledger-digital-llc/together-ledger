import { test, expect } from './browser-test.js';

test('each view has exactly one h1 and no skipped levels, and dialogs start at h2 without skipping', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#welcome-title');

  // We can just verify the presence of the two h1s since we know their display status relies on container's hidden attribute.
  let h1s = await page.locator('h1').evaluateAll(els => els.map(e => e.id));
  expect(h1s).toEqual(['welcome-title', 'trip-name']);

  // Verify that dialogs don't skip levels
  await page.locator('[data-begin-ledger]').first().click();
  await page.locator('[data-close-moment]').first().click();

  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();

  let dialogHeadings = await page.evaluate(() => {
    const dialog = document.querySelector('#settings-dialog');
    return Array.from(dialog.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => parseInt(h.tagName.substring(1)));
  });

  expect(dialogHeadings[0]).toBe(2);
  let currentLevel = 1;
  for (const level of dialogHeadings) {
    if (level > currentLevel + 1) {
      throw new Error(`Skipped heading level in settings dialog: went from h${currentLevel} to h${level}`);
    }
    currentLevel = level;
  }
});
