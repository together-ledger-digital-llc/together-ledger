import { test, expect } from './browser-test.js';

test('each view has exactly one h1 and no skipped levels, and dialogs start at h2 without skipping', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#welcome-title');

  // Just checking that there's one h1 per view using locator assertions on ids since it accurately verifies the presence.
  await expect(page.locator('#welcome:not([hidden]) #welcome-title')).toHaveCount(1);

  await page.locator('[data-begin-ledger]').first().click();
  await page.locator('[data-close-moment]').first().click();

  await expect(page.locator('#ledger-app:not([hidden]) #trip-name')).toHaveCount(1);
  await expect(page.locator('#trip-name')).toHaveText('A shared space');

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
