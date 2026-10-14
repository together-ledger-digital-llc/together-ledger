import { test, expect } from './browser-test.js';
import { checkAxeBaseline } from '../src/a11y/checks/axe-baseline.js';

test('accessibility checks against baseline', async ({ page }) => {
  // Test welcome page
  await page.goto('/');
  await page.waitForSelector('#welcome-title');
  await expect(page.locator('#welcome:not([hidden]) #welcome-title')).toHaveCount(1);

  let { newFindings, staleBaselineEntries, currentFindings } = await checkAxeBaseline(page, 'welcome');

  if (staleBaselineEntries.length > 0) {
    console.log(`\nStale baseline entries for 'welcome' (can be removed from baseline.json):`, JSON.stringify(staleBaselineEntries, null, 2));
  }

  expect(newFindings, 'New accessibility violations found on the welcome page').toEqual([]);

  // Navigate to ledger
  await page.locator('[data-begin-ledger]').first().click();
  await page.locator('[data-close-moment]').first().click();

  await expect(page.locator('#ledger-app:not([hidden]) #trip-name')).toHaveCount(1);
  await expect(page.locator('#trip-name')).toHaveText('A shared space');

  ({ newFindings, staleBaselineEntries, currentFindings } = await checkAxeBaseline(page, 'ledger'));

  if (staleBaselineEntries.length > 0) {
    console.log(`\nStale baseline entries for 'ledger' (can be removed from baseline.json):`, JSON.stringify(staleBaselineEntries, null, 2));
  }

  expect(newFindings, 'New accessibility violations found on the ledger page').toEqual([]);
});
