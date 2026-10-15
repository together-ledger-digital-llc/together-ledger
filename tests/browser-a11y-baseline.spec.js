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

test('accessibility checks against baseline for three dialogs (Light theme)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });

  // Navigate to ledger
  await page.goto('/');
  await page.waitForSelector('#welcome-title');
  await page.locator('[data-begin-ledger]').first().click();

  // Moment dialog is already open after clicking 'Start ledger' (data-begin-ledger opens it for initial config)
  // Let's close it first to ensure a consistent state, just like the previous test did
  await page.locator('[data-close-moment]').first().click();
  await expect(page.locator('#ledger-app:not([hidden]) #trip-name')).toHaveCount(1);

  // 1. Check moment-dialog
  await page.locator('[data-open-moment]:visible').first().click();
  await expect(page.locator('#moment-dialog')).toBeVisible();

  let { newFindings, staleBaselineEntries } = await checkAxeBaseline(page, 'moment-dialog');
  if (staleBaselineEntries.length > 0) {
    console.log(`\nStale baseline entries for 'moment-dialog' (can be removed from baseline.json):`, JSON.stringify(staleBaselineEntries, null, 2));
  }
  expect(newFindings, 'New accessibility violations found on the moment-dialog').toEqual([]);

  await page.locator('[data-close-moment]').first().click();
  await expect(page.locator('#moment-dialog')).toBeHidden();

  // 2. Check settings-dialog
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();

  ({ newFindings, staleBaselineEntries } = await checkAxeBaseline(page, 'settings-dialog'));
  if (staleBaselineEntries.length > 0) {
    console.log(`\nStale baseline entries for 'settings-dialog' (can be removed from baseline.json):`, JSON.stringify(staleBaselineEntries, null, 2));
  }
  expect(newFindings, 'New accessibility violations found on the settings-dialog').toEqual([]);

  await page.locator('[data-close-settings]').first().click();
  await expect(page.locator('#settings-dialog')).toBeHidden();

  // 3. Check account-dialog
  await page.locator('#account-button').click();
  await expect(page.locator('#account-dialog')).toBeVisible();

  ({ newFindings, staleBaselineEntries } = await checkAxeBaseline(page, 'account-dialog'));
  if (staleBaselineEntries.length > 0) {
    console.log(`\nStale baseline entries for 'account-dialog' (can be removed from baseline.json):`, JSON.stringify(staleBaselineEntries, null, 2));
  }
  expect(newFindings, 'New accessibility violations found on the account-dialog').toEqual([]);
});
